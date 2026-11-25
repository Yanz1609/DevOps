import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/index.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      return res.status(401).json({ error: 'Token expired or invalid', details: err.message });
    }

    // Verify user still exists in database
    const userRes = await query(
      'SELECT id, email, full_name, quota_bytes, used_bytes FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'User associated with token not found' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Authentication internal error', details: err.message });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret);
      const userRes = await query(
        'SELECT id, email, full_name FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (userRes.rowCount > 0) {
        req.user = userRes.rows[0];
      }
    }
  } catch {
    // Ignore error for optional auth
  }
  next();
}

