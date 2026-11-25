import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function initDb(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[DB] Connecting to PostgreSQL at ${config.db.host}:${config.db.port} (Attempt ${attempt}/${retries})...`);
      const client = await pool.connect();
      try {
        const sqlPath = path.join(__dirname, 'init.sql');
        if (fs.existsSync(sqlPath)) {
          const sql = fs.readFileSync(sqlPath, 'utf8');
          await client.query(sql);
          console.log('[DB] Database tables initialized successfully.');
        } else {
          console.warn('[DB] init.sql not found at', sqlPath);
        }
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`[DB] Connection failed: ${err.message}`);
      if (attempt === retries) {
        throw new Error(`Failed to initialize database after ${retries} attempts: ${err.message}`);
      }
      console.log(`[DB] Retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL) {
    console.log('[SQL]', { text, duration, rows: res.rowCount });
  }
  return res;
}

