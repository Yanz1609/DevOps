import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/index.js';
import { config } from '../config.js';
import {
  generateUploadUrl,
  generateDownloadUrl,
  getObjectMetadata,
  deleteObject,
} from '../services/storage.service.js';
import { enqueueThumbnailJob } from '../services/queue.service.js';

/**
 * List files and subfolders in current folder (or root)
 */
export async function listItems(req, res) {
  try {
    const userId = req.user.id;
    const { folder_id, search, type } = req.query;

    const currentFolderId = folder_id && folder_id !== 'root' && folder_id !== 'null' ? folder_id : null;

    // Current folder info & breadcrumb path
    let currentFolder = null;
    let breadcrumbs = [{ id: null, name: 'My Drive' }];

    if (currentFolderId) {
      const folderRes = await query(
        'SELECT id, name, parent_id FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
        [currentFolderId, userId]
      );
      if (folderRes.rowCount === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }
      currentFolder = folderRes.rows[0];

      // Build breadcrumbs path upwards
      let curr = currentFolder;
      const pathList = [curr];
      while (curr.parent_id) {
        const parentRes = await query(
          'SELECT id, name, parent_id FROM folders WHERE id = $1 AND owner_id = $2',
          [curr.parent_id, userId]
        );
        if (parentRes.rowCount > 0) {
          curr = parentRes.rows[0];
          pathList.unshift(curr);
        } else {
          break;
        }
      }
      breadcrumbs = [{ id: null, name: 'My Drive' }, ...pathList];
    }

    // Folders query
    let foldersQuery = `
      SELECT id, name, parent_id, created_at, updated_at
      FROM folders
      WHERE owner_id = $1 AND deleted_at IS NULL
    `;
    const folderParams = [userId];

    if (search) {
      foldersQuery += ` AND name ILIKE $2`;
      folderParams.push(`%${search}%`);
    } else {
      if (currentFolderId) {
        foldersQuery += ` AND parent_id = $2`;
        folderParams.push(currentFolderId);
      } else {
        foldersQuery += ` AND parent_id IS NULL`;
      }
    }
    foldersQuery += ' ORDER BY name ASC';
    const foldersRes = await query(foldersQuery, folderParams);

    // Files query
    let filesQuery = `
      SELECT id, name, size, mime_type, object_key, thumbnail_key, thumb_status, folder_id, created_at, updated_at
      FROM files
      WHERE owner_id = $1 AND deleted_at IS NULL
    `;
    const fileParams = [userId];

    if (search) {
      filesQuery += ` AND name ILIKE $${fileParams.length + 1}`;
      fileParams.push(`%${search}%`);
    } else {
      if (currentFolderId) {
        filesQuery += ` AND folder_id = $${fileParams.length + 1}`;
        fileParams.push(currentFolderId);
      } else {
        filesQuery += ` AND folder_id IS NULL`;
      }
    }

    // Filter by type
    if (type) {
      if (type === 'image') {
        filesQuery += ` AND mime_type LIKE 'image/%'`;
      } else if (type === 'document') {
        filesQuery += ` AND (mime_type LIKE '%pdf%' OR mime_type LIKE '%word%' OR mime_type LIKE '%document%' OR mime_type LIKE '%text%' OR mime_type LIKE '%sheet%')`;
      } else if (type === 'video') {
        filesQuery += ` AND mime_type LIKE 'video/%'`;
      } else if (type === 'audio') {
        filesQuery += ` AND mime_type LIKE 'audio/%'`;
      } else if (type === 'archive') {
        filesQuery += ` AND (mime_type LIKE '%zip%' OR mime_type LIKE '%tar%' OR mime_type LIKE '%rar%' OR mime_type LIKE '%7z%')`;
      }
    }

    filesQuery += ' ORDER BY created_at DESC';
    const filesRes = await query(filesQuery, fileParams);

    // For files with ready thumbnails, generate presigned thumbnail URLs
    const filesWithThumbnails = await Promise.all(
      filesRes.rows.map(async (f) => {
        let thumbnailUrl = null;
        if (f.thumb_status === 'ready' && f.thumbnail_key) {
          try {
            thumbnailUrl = await generateDownloadUrl(
              config.minio.thumbnailsBucket,
              f.thumbnail_key,
              null,
              3600
            );
          } catch {
            thumbnailUrl = null;
          }
        }
        return {
          ...f,
          thumbnail_url: thumbnailUrl,
        };
      })
    );

    return res.json({
      folder: currentFolder,
      breadcrumbs,
      folders: foldersRes.rows,
      files: filesWithThumbnails,
    });
  } catch (err) {
    console.error('[Files] listItems error:', err);
    return res.status(500).json({ error: 'Failed to list items', details: err.message });
  }
}

/**
 * Step 1 of direct upload: Request a Presigned PUT URL
 */
export async function getUploadPresignedUrl(req, res) {
  try {
    const { name, size, mime_type, folder_id } = req.body;
    const userId = req.user.id;

    if (!name || size === undefined || size === null) {
      return res.status(400).json({ error: 'File name and size are required' });
    }

    const fileSize = parseInt(size, 10);
    if (isNaN(fileSize) || fileSize <= 0) {
      return res.status(400).json({ error: 'Invalid file size' });
    }

    // Check quota
    const userRes = await query('SELECT quota_bytes, used_bytes FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    const newUsedBytes = parseInt(user.used_bytes, 10) + fileSize;

    if (newUsedBytes > parseInt(user.quota_bytes, 10)) {
      return res.status(400).json({
        error: 'Storage quota exceeded',
        quota_bytes: user.quota_bytes,
        used_bytes: user.used_bytes,
        required_bytes: fileSize,
      });
    }

    // Generate safe unique object key in bucket
    const cleanName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `users/${userId}/${Date.now()}-${cleanName}`;
    const contentType = mime_type || 'application/octet-stream';

    // MinIO presigned PUT url
    const uploadUrl = await generateUploadUrl(objectKey, contentType);

    return res.json({
      uploadUrl,
      objectKey,
      name,
      size: fileSize,
      mime_type: contentType,
      folder_id: folder_id || null,
    });
  } catch (err) {
    console.error('[Files] getUploadPresignedUrl error:', err);
    return res.status(500).json({ error: 'Failed to generate upload URL', details: err.message });
  }
}

/**
 * Step 2 of direct upload: Client confirms file was uploaded successfully to MinIO
 */
export async function confirmUpload(req, res) {
  try {
    const { name, size, mime_type, folder_id, object_key } = req.body;
    const userId = req.user.id;

    if (!name || !object_key) {
      return res.status(400).json({ error: 'Missing file metadata or object key' });
    }

    const fileSize = parseInt(size, 10) || 0;

    // Verify file actually exists in MinIO
    try {
      await getObjectMetadata(config.minio.filesBucket, object_key);
    } catch (s3Err) {
      return res.status(400).json({
        error: 'File object not found in storage. Upload may have failed or timed out.',
        details: s3Err.message,
      });
    }

    // Verify folder if specified
    const targetFolderId = folder_id && folder_id !== 'root' && folder_id !== 'null' ? folder_id : null;
    if (targetFolderId) {
      const folderRes = await query(
        'SELECT id FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
        [targetFolderId, userId]
      );
      if (folderRes.rowCount === 0) {
        return res.status(400).json({ error: 'Target folder does not exist' });
      }
    }

    // Determine if thumbnail processing is required
    const isImage = (mime_type || '').toLowerCase().startsWith('image/');
    const thumbStatus = isImage ? 'pending' : 'none';

    // Insert file metadata into database
    const insertRes = await query(
      `INSERT INTO files (owner_id, folder_id, name, size, mime_type, object_key, thumb_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, targetFolderId, name, fileSize, mime_type || 'application/octet-stream', object_key, thumbStatus]
    );

    const file = insertRes.rows[0];

    // Update user used_bytes
    await query('UPDATE users SET used_bytes = used_bytes + $1 WHERE id = $2', [fileSize, userId]);

    // Enqueue thumbnail generation if image
    if (isImage) {
      enqueueThumbnailJob({
        fileId: file.id,
        objectKey: file.object_key,
        mimeType: file.mime_type,
        name: file.name,
      });
    }

    return res.status(201).json({
      message: 'File confirmed and saved successfully',
      file,
    });
  } catch (err) {
    console.error('[Files] confirmUpload error:', err);
    return res.status(500).json({ error: 'Failed to confirm file upload', details: err.message });
  }
}

/**
 * Download file via presigned GET URL
 */
export async function getDownloadUrl(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check ownership or shared access
    const fileRes = await query(
      `SELECT f.* FROM files f
       LEFT JOIN user_shares us ON us.file_id = f.id AND us.shared_with_user_id = $2
       WHERE f.id = $1 AND (f.owner_id = $2 OR us.id IS NOT NULL) AND f.deleted_at IS NULL`,
      [id, userId]
    );

    if (fileRes.rowCount === 0) {
      return res.status(404).json({ error: 'File not found or permission denied' });
    }

    const file = fileRes.rows[0];
    const downloadUrl = await generateDownloadUrl(
      config.minio.filesBucket,
      file.object_key,
      file.name,
      3600
    );

    return res.json({
      downloadUrl,
      fileName: file.name,
      mimeType: file.mime_type,
      size: file.size,
    });
  } catch (err) {
    console.error('[Files] getDownloadUrl error:', err);
    return res.status(500).json({ error: 'Failed to get download URL', details: err.message });
  }
}

/**
 * Inline view/preview URL (presigned GET with inline disposition)
 */
export async function getViewUrl(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const fileRes = await query(
      `SELECT f.* FROM files f
       LEFT JOIN user_shares us ON us.file_id = f.id AND us.shared_with_user_id = $2
       WHERE f.id = $1 AND (f.owner_id = $2 OR us.id IS NOT NULL) AND f.deleted_at IS NULL`,
      [id, userId]
    );

    if (fileRes.rowCount === 0) {
      return res.status(404).json({ error: 'File not found or permission denied' });
    }

    const file = fileRes.rows[0];
    const viewUrl = await generateDownloadUrl(
      config.minio.filesBucket,
      file.object_key,
      null, // inline
      3600
    );

    return res.json({
      viewUrl,
      fileName: file.name,
      mimeType: file.mime_type,
      size: file.size,
    });
  } catch (err) {
    console.error('[Files] getViewUrl error:', err);
    return res.status(500).json({ error: 'Failed to get view URL', details: err.message });
  }
}

/**
 * Rename or Move file
 */
export async function updateFile(req, res) {
  try {
    const { id } = req.params;
    const { name, folder_id } = req.body;
    const userId = req.user.id;

    const fileRes = await query(
      'SELECT id, name, folder_id FROM files WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
      [id, userId]
    );

    if (fileRes.rowCount === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const updates = [];
    const values = [];

    if (name && name.trim()) {
      values.push(name.trim());
      updates.push(`name = $${values.length}`);
    }

    if (folder_id !== undefined) {
      const targetFolderId = folder_id === 'root' || folder_id === null ? null : folder_id;
      if (targetFolderId) {
        const fRes = await query('SELECT id FROM folders WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL', [targetFolderId, userId]);
        if (fRes.rowCount === 0) {
          return res.status(400).json({ error: 'Target folder does not exist' });
        }
      }
      values.push(targetFolderId);
      updates.push(`folder_id = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, userId);
    const updateRes = await query(
      `UPDATE files SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length - 1} AND owner_id = $${values.length}
       RETURNING *`,
      values
    );

    return res.json({ message: 'File updated successfully', file: updateRes.rows[0] });
  } catch (err) {
    console.error('[Files] updateFile error:', err);
    return res.status(500).json({ error: 'Failed to update file', details: err.message });
  }
}

/**
 * Soft delete file (move to trash)
 */
export async function deleteFile(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const updateRes = await query(
      `UPDATE files SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
       RETURNING id, name, deleted_at`,
      [id, userId]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'File not found or already in trash' });
    }

    return res.json({ message: 'File moved to trash', file: updateRes.rows[0] });
  } catch (err) {
    console.error('[Files] deleteFile error:', err);
    return res.status(500).json({ error: 'Failed to delete file', details: err.message });
  }
}

/**
 * Restore file from trash
 */
export async function restoreFile(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const updateRes = await query(
      `UPDATE files SET deleted_at = NULL
       WHERE id = $1 AND owner_id = $2 AND deleted_at IS NOT NULL
       RETURNING id, name`,
      [id, userId]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'File not found in trash' });
    }

    return res.json({ message: 'File restored successfully', file: updateRes.rows[0] });
  } catch (err) {
    console.error('[Files] restoreFile error:', err);
    return res.status(500).json({ error: 'Failed to restore file', details: err.message });
  }
}

/**
 * Permanently delete file from DB and MinIO
 */
export async function permanentlyDeleteFile(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const fileRes = await query(
      'SELECT id, name, size, object_key, thumbnail_key FROM files WHERE id = $1 AND owner_id = $2',
      [id, userId]
    );

    if (fileRes.rowCount === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileRes.rows[0];

    // Delete from MinIO
    try {
      await deleteObject(config.minio.filesBucket, file.object_key);
      if (file.thumbnail_key) {
        await deleteObject(config.minio.thumbnailsBucket, file.thumbnail_key);
      }
    } catch (s3Err) {
      console.warn('[Files] Could not delete MinIO object:', s3Err.message);
    }

    // Delete row and decrement used quota
    await query('DELETE FROM files WHERE id = $1', [id]);
    await query(
      'UPDATE users SET used_bytes = GREATEST(0, used_bytes - $1) WHERE id = $2',
      [file.size, userId]
    );

    return res.json({ message: 'File permanently deleted', id });
  } catch (err) {
    console.error('[Files] permanentlyDeleteFile error:', err);
    return res.status(500).json({ error: 'Failed to permanently delete file', details: err.message });
  }
}

