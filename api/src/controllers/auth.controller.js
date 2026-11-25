import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { config } from '../config.js';

export async function register(req, res) {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check existing
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertRes = await query(
      `INSERT INTO users (email, password_hash, full_name, quota_bytes, used_bytes)
       VALUES ($1, $2, $3, $4, 0)
       RETURNING id, email, full_name, quota_bytes, used_bytes, created_at`,
      [email.toLowerCase().trim(), passwordHash, full_name || null, config.defaultQuotaBytes]
    );

    const user = insertRes.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user,
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    return res.status(500).json({ error: 'Registration failed', details: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userRes = await query(
      `SELECT id, email, password_hash, full_name, quota_bytes, used_bytes, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    delete user.password_hash;

    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    return res.json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'Login failed', details: err.message });
  }
}

export async function getMe(req, res) {
  try {
    const userRes = await query(
      `SELECT id, email, full_name, quota_bytes, used_bytes, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: userRes.rows[0] });
  } catch (err) {
    console.error('[Auth] getMe error:', err);
    return res.status(500).json({ error: 'Failed to get profile', details: err.message });
  }
}

