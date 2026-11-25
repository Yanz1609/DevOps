import { query } from '../db/index.js';
import { config } from '../config.js';
import { deleteObject } from '../services/storage.service.js';

export async function createFolder(req, res) {
  try {
    const { name, parent_id } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const targetParentId = parent_id && parent_id !== 'root' && parent_id !== 'null' ? parent_id : null;

    if (targetParentId) {
      const parentRes = await query(
        'SELECT id FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
        [targetParentId, userId]
      );
      if (parentRes.rowCount === 0) {
        return res.status(400).json({ error: 'Parent folder does not exist' });
      }
    }

    const insertRes = await query(
      `INSERT INTO folders (owner_id, parent_id, name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, targetParentId, name.trim()]
    );

    return res.status(201).json({
      message: 'Folder created successfully',
      folder: insertRes.rows[0],
    });
  } catch (err) {
    console.error('[Folders] createFolder error:', err);
    return res.status(500).json({ error: 'Failed to create folder', details: err.message });
  }
}

export async function updateFolder(req, res) {
  try {
    const { id } = req.params;
    const { name, parent_id } = req.body;
    const userId = req.user.id;

    const folderRes = await query(
      'SELECT id, name, parent_id FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
      [id, userId]
    );

    if (folderRes.rowCount === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const updates = [];
    const values = [];

    if (name && name.trim()) {
      values.push(name.trim());
      updates.push(`name = $${values.length}`);
    }

    if (parent_id !== undefined) {
      const targetParentId = parent_id === 'root' || parent_id === null ? null : parent_id;
      if (targetParentId === id) {
        return res.status(400).json({ error: 'A folder cannot be its own parent' });
      }
      values.push(targetParentId);
      updates.push(`parent_id = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, userId);
    const updateRes = await query(
      `UPDATE folders SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length - 1} AND owner_id = $${values.length}
       RETURNING *`,
      values
    );

    return res.json({ message: 'Folder updated successfully', folder: updateRes.rows[0] });
  } catch (err) {
    console.error('[Folders] updateFolder error:', err);
    return res.status(500).json({ error: 'Failed to update folder', details: err.message });
  }
}

export async function deleteFolder(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Soft delete the folder
    const updateRes = await query(
      `UPDATE folders SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
       RETURNING id, name`,
      [id, userId]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Folder not found or already in trash' });
    }

    // Soft delete all files inside this folder recursively (common in drive systems)
    await query(
      `WITH RECURSIVE subfolders AS (
         SELECT id FROM folders WHERE id = $1
         UNION ALL
         SELECT f.id FROM folders f INNER JOIN subfolders sf ON f.parent_id = sf.id
       )
       UPDATE files SET deleted_at = CURRENT_TIMESTAMP
       WHERE folder_id IN (SELECT id FROM subfolders) AND deleted_at IS NULL`,
      [id]
    );

    return res.json({ message: 'Folder moved to trash', folder: updateRes.rows[0] });
  } catch (err) {
    console.error('[Folders] deleteFolder error:', err);
    return res.status(500).json({ error: 'Failed to delete folder', details: err.message });
  }
}

export async function restoreFolder(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const updateRes = await query(
      `UPDATE folders SET deleted_at = NULL
       WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL
       RETURNING id, name`,
      [id, userId]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Folder not found in trash' });
    }

    // Restore files inside
    await query(
      `WITH RECURSIVE subfolders AS (
         SELECT id FROM folders WHERE id = $1
         UNION ALL
         SELECT f.id FROM folders f INNER JOIN subfolders sf ON f.parent_id = sf.id
       )
       UPDATE files SET deleted_at = NULL
       WHERE folder_id IN (SELECT id FROM subfolders) AND deleted_at IS NOT NULL`,
      [id]
    );

    return res.json({ message: 'Folder restored successfully', folder: updateRes.rows[0] });
  } catch (err) {
    console.error('[Folders] restoreFolder error:', err);
    return res.status(500).json({ error: 'Failed to restore folder', details: err.message });
  }
}

export async function permanentlyDeleteFolder(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find all files in this folder & subfolders to delete from S3
    const filesRes = await query(
      `WITH RECURSIVE subfolders AS (
         SELECT id FROM folders WHERE id = $1 AND owner_id = $2
         UNION ALL
         SELECT f.id FROM folders f INNER JOIN subfolders sf ON f.parent_id = sf.id
       )
       SELECT id, size, object_key, thumbnail_key FROM files
       WHERE folder_id IN (SELECT id FROM subfolders)`,
      [id, userId]
    );

    let freedBytes = 0;
    for (const f of filesRes.rows) {
      freedBytes += parseInt(f.size, 10);
      try {
        await deleteObject(config.minio.filesBucket, f.object_key);
        if (f.thumbnail_key) {
          await deleteObject(config.minio.thumbnailsBucket, f.thumbnail_key);
        }
      } catch (err) {
        console.warn(`[Folders] Error deleting file object ${f.object_key}:`, err.message);
      }
    }

    // Delete folder (cascade will delete files and subfolders)
    await query('DELETE FROM folders WHERE id = $1 AND owner_id = $2', [id, userId]);

    if (freedBytes > 0) {
      await query(
        'UPDATE users SET used_bytes = GREATEST(0, used_bytes - $1) WHERE id = $2',
        [freedBytes, userId]
      );
    }

    return res.json({ message: 'Folder and contents permanently deleted' });
  } catch (err) {
    console.error('[Folders] permanentlyDeleteFolder error:', err);
    return res.status(500).json({ error: 'Failed to permanently delete folder', details: err.message });
  }
}

