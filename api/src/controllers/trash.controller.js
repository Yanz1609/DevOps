import { query } from '../db/index.js';
import { config } from '../config.js';
import { deleteObject } from '../services/storage.service.js';

export async function getTrash(req, res) {
  try {
    const userId = req.user.id;

    const foldersRes = await query(
      'SELECT id, name, deleted_at, created_at FROM folders WHERE owner_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC',
      [userId]
    );

    const filesRes = await query(
      'SELECT id, name, size, mime_type, object_key, thumbnail_key, thumb_status, deleted_at, created_at FROM files WHERE owner_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC',
      [userId]
    );

    return res.json({
      folders: foldersRes.rows,
      files: filesRes.rows,
    });
  } catch (err) {
    console.error('[Trash] getTrash error:', err);
    return res.status(500).json({ error: 'Failed to get trash items', details: err.message });
  }
}

export async function emptyTrash(req, res) {
  try {
    const userId = req.user.id;

    // Get all deleted files for user
    const filesRes = await query(
      'SELECT id, size, object_key, thumbnail_key FROM files WHERE owner_id = $1 AND deleted_at IS NOT NULL',
      [userId]
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
        console.warn(`[Trash] Error deleting object ${f.object_key}:`, err.message);
      }
    }

    // Delete records
    await query('DELETE FROM files WHERE owner_id = $1 AND deleted_at IS NOT NULL', [userId]);
    await query('DELETE FROM folders WHERE owner_id = $1 AND deleted_at IS NOT NULL', [userId]);

    if (freedBytes > 0) {
      await query(
        'UPDATE users SET used_bytes = GREATEST(0, used_bytes - $1) WHERE id = $2',
        [freedBytes, userId]
      );
    }

    return res.json({ message: 'Trash emptied successfully' });
  } catch (err) {
    console.error('[Trash] emptyTrash error:', err);
    return res.status(500).json({ error: 'Failed to empty trash', details: err.message });
  }
}

