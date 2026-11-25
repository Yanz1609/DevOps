import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../db/index.js';
import { config } from '../config.js';
import { generateDownloadUrl } from '../services/storage.service.js';

/**
 * Create a public share link for a file
 */
export async function createPublicShare(req, res) {
  try {
    const { id } = req.params;
    const { permission = 'view', password, expires_in_hours } = req.body;
    const userId = req.user.id;

    // Check file ownership
    const fileRes = await query(
      'SELECT id, name FROM files WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
      [id, userId]
    );

    if (fileRes.rowCount === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate random 16-byte hex token (32 chars)
    const token = crypto.randomBytes(16).toString('hex');

    let passwordHash = null;
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    let expiresAt = null;
    if (expires_in_hours && parseInt(expires_in_hours, 10) > 0) {
      expiresAt = new Date(Date.now() + parseInt(expires_in_hours, 10) * 3600 * 1000);
    }

    const insertRes = await query(
      `INSERT INTO shares (file_id, token, permission, password_hash, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, file_id, token, permission, expires_at, created_at, (password_hash IS NOT NULL) as has_password`,
      [id, token, permission, passwordHash, expiresAt, userId]
    );

    return res.status(201).json({
      message: 'Share link created',
      share: insertRes.rows[0],
      shareUrl: `/s/${token}`,
    });
  } catch (err) {
    console.error('[Shares] createPublicShare error:', err);
    return res.status(500).json({ error: 'Failed to create share link', details: err.message });
  }
}

/**
 * List all share links for a file
 */
export async function getFileShares(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const sharesRes = await query(
      `SELECT s.id, s.token, s.permission, (s.password_hash IS NOT NULL) as has_password, s.expires_at, s.created_at
       FROM shares s
       INNER JOIN files f ON s.file_id = f.id
       WHERE s.file_id = $1 AND f.owner_id = $2
       ORDER BY s.created_at DESC`,
      [id, userId]
    );

    const userSharesRes = await query(
      `SELECT us.id, us.permission, us.created_at, u.email as shared_with_email, u.full_name as shared_with_name
       FROM user_shares us
       INNER JOIN users u ON us.shared_with_user_id = u.id
       INNER JOIN files f ON us.file_id = f.id
       WHERE us.file_id = $1 AND f.owner_id = $2
       ORDER BY us.created_at DESC`,
      [id, userId]
    );

    return res.json({
      publicShares: sharesRes.rows,
      userShares: userSharesRes.rows,
    });
  } catch (err) {
    console.error('[Shares] getFileShares error:', err);
    return res.status(500).json({ error: 'Failed to get file shares', details: err.message });
  }
}

/**
 * Revoke a public share link
 */
export async function revokePublicShare(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const delRes = await query(
      `DELETE FROM shares WHERE id = $1 AND created_by = $2 RETURNING id`,
      [id, userId]
    );

    if (delRes.rowCount === 0) {
      return res.status(404).json({ error: 'Share link not found or unauthorized' });
    }

    return res.json({ message: 'Share link revoked successfully' });
  } catch (err) {
    console.error('[Shares] revokePublicShare error:', err);
    return res.status(500).json({ error: 'Failed to revoke share link', details: err.message });
  }
}

/**
 * Access a public share by token (GET /s/:token)
 */
export async function getPublicShare(req, res) {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const shareRes = await query(
      `SELECT s.*, f.name, f.size, f.mime_type, f.object_key, f.thumbnail_key, f.thumb_status, u.full_name as owner_name, u.email as owner_email
       FROM shares s
       INNER JOIN files f ON s.file_id = f.id
       INNER JOIN users u ON f.owner_id = u.id
       WHERE s.token = $1 AND f.deleted_at IS NULL`,
      [token]
    );

    if (shareRes.rowCount === 0) {
      return res.status(404).json({ error: 'Share link not found or file has been deleted' });
    }

    const share = shareRes.rows[0];

    // Check expiration
    if (share.expires_at && new Date() > new Date(share.expires_at)) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    // Check password protection
    if (share.password_hash) {
      if (!password) {
        return res.json({
          requiresPassword: true,
          fileName: share.name,
          ownerName: share.owner_name || share.owner_email,
        });
      }

      const match = await bcrypt.compare(password, share.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Incorrect password', requiresPassword: true });
      }
    }

    // Generate download URL
    const downloadUrl = await generateDownloadUrl(
      config.minio.filesBucket,
      share.object_key,
      share.name,
      3600
    );

    let viewUrl = null;
    if (share.mime_type.startsWith('image/') || share.mime_type.includes('pdf')) {
      viewUrl = await generateDownloadUrl(
        config.minio.filesBucket,
        share.object_key,
        null,
        3600
      );
    }

    return res.json({
      requiresPassword: false,
      token: share.token,
      permission: share.permission,
      file: {
        id: share.file_id,
        name: share.name,
        size: share.size,
        mime_type: share.mime_type,
        owner: share.owner_name || share.owner_email,
        created_at: share.created_at,
      },
      downloadUrl,
      viewUrl,
    });
  } catch (err) {
    console.error('[Shares] getPublicShare error:', err);
    return res.status(500).json({ error: 'Failed to access share', details: err.message });
  }
}

/**
 * Share file directly with another user by email
 */
export async function shareWithUser(req, res) {
  try {
    const { id } = req.params;
    const { email, permission = 'view' } = req.body;
    const userId = req.user.id;

    if (!email) {
      return res.status(400).json({ error: 'Target user email is required' });
    }

    // Verify file owner
    const fileRes = await query(
      'SELECT id FROM files WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
      [id, userId]
    );

    if (fileRes.rowCount === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Find target user
    const targetUserRes = await query('SELECT id, email, full_name FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (targetUserRes.rowCount === 0) {
      return res.status(404).json({ error: `User with email "${email}" not found` });
    }

    const targetUser = targetUserRes.rows[0];
    if (targetUser.id === userId) {
      return res.status(400).json({ error: 'You cannot share a file with yourself' });
    }

    // Upsert user share
    const upsertRes = await query(
      `INSERT INTO user_shares (file_id, shared_with_user_id, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (file_id, shared_with_user_id)
       DO UPDATE SET permission = EXCLUDED.permission
       RETURNING *`,
      [id, targetUser.id, permission]
    );

    return res.status(201).json({
      message: `File shared with ${targetUser.email}`,
      share: {
        ...upsertRes.rows[0],
        shared_with_email: targetUser.email,
        shared_with_name: targetUser.full_name,
      },
    });
  } catch (err) {
    console.error('[Shares] shareWithUser error:', err);
    return res.status(500).json({ error: 'Failed to share file with user', details: err.message });
  }
}

/**
 * Revoke user-to-user share
 */
export async function revokeUserShare(req, res) {
  try {
    const { id } = req.params; // user_shares id
    const userId = req.user.id;

    const delRes = await query(
      `DELETE FROM user_shares us
       USING files f
       WHERE us.file_id = f.id AND us.id = $1 AND f.owner_id = $2
       RETURNING us.id`,
      [id, userId]
    );

    if (delRes.rowCount === 0) {
      return res.status(404).json({ error: 'User share not found or unauthorized' });
    }

    return res.json({ message: 'User share revoked' });
  } catch (err) {
    console.error('[Shares] revokeUserShare error:', err);
    return res.status(500).json({ error: 'Failed to revoke user share', details: err.message });
  }
}

/**
 * List all files shared with the current user ("Được chia sẻ với tôi")
 */
export async function getSharedWithMe(req, res) {
  try {
    const userId = req.user.id;

    const filesRes = await query(
      `SELECT f.id, f.name, f.size, f.mime_type, f.object_key, f.thumbnail_key, f.thumb_status,
              us.permission as share_permission, us.created_at as shared_at,
              u.email as owner_email, u.full_name as owner_name
       FROM user_shares us
       INNER JOIN files f ON us.file_id = f.id
       INNER JOIN users u ON f.owner_id = u.id
       WHERE us.shared_with_user_id = $1 AND f.deleted_at IS NULL
       ORDER BY us.created_at DESC`,
      [userId]
    );

    return res.json({ files: filesRes.rows });
  } catch (err) {
    console.error('[Shares] getSharedWithMe error:', err);
    return res.status(500).json({ error: 'Failed to get shared files', details: err.message });
  }
}

