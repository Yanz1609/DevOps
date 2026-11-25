import { query } from '../db/index.js';

export async function getUsage(req, res) {
  try {
    const userId = req.user.id;

    const userRes = await query(
      'SELECT quota_bytes, used_bytes FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { quota_bytes, used_bytes } = userRes.rows[0];

    // Count and category stats
    const statsRes = await query(
      `SELECT
         COUNT(*) as total_files,
         COALESCE(SUM(CASE WHEN mime_type LIKE 'image/%' THEN size ELSE 0 END), 0) as image_bytes,
         COALESCE(SUM(CASE WHEN mime_type LIKE '%pdf%' OR mime_type LIKE '%document%' OR mime_type LIKE '%word%' OR mime_type LIKE '%text%' THEN size ELSE 0 END), 0) as document_bytes,
         COALESCE(SUM(CASE WHEN mime_type LIKE 'video/%' THEN size ELSE 0 END), 0) as video_bytes,
         COALESCE(SUM(CASE WHEN mime_type LIKE 'audio/%' THEN size ELSE 0 END), 0) as audio_bytes,
         COALESCE(SUM(CASE WHEN mime_type LIKE '%zip%' OR mime_type LIKE '%tar%' OR mime_type LIKE '%rar%' THEN size ELSE 0 END), 0) as archive_bytes
       FROM files
       WHERE owner_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    const stats = statsRes.rows[0];
    const quota = parseInt(quota_bytes, 10);
    const used = parseInt(used_bytes, 10);
    const percent = quota > 0 ? ((used / quota) * 100).toFixed(2) : 0;

    return res.json({
      quota_bytes: quota,
      used_bytes: used,
      used_percent: parseFloat(percent),
      total_files: parseInt(stats.total_files, 10),
      breakdown: {
        images: parseInt(stats.image_bytes, 10),
        documents: parseInt(stats.document_bytes, 10),
        videos: parseInt(stats.video_bytes, 10),
        audio: parseInt(stats.audio_bytes, 10),
        archives: parseInt(stats.archive_bytes, 10),
        other: Math.max(
          0,
          used -
            (parseInt(stats.image_bytes, 10) +
              parseInt(stats.document_bytes, 10) +
              parseInt(stats.video_bytes, 10) +
              parseInt(stats.audio_bytes, 10) +
              parseInt(stats.archive_bytes, 10))
        ),
      },
    });
  } catch (err) {
    console.error('[User] getUsage error:', err);
    return res.status(500).json({ error: 'Failed to retrieve storage usage', details: err.message });
  }
}

