import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required. Set it to your Supabase Postgres connection string.');
}

const shouldUseSsl =
  !/localhost|127\.0\.0\.1/i.test(connectionString) &&
  process.env.PGSSLMODE !== 'disable';

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
});

function normalizeQuery(text) {
  let index = 0;
  return text.replace(/\?/g, () => `$${++index}`);
}

async function execSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#6366f1',
      status TEXT NOT NULL DEFAULT 'offline',
      status_message TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'direct',
      name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS message_reads (
      message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (message_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages(conversation_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_contacts_user
      ON contacts(user_id);
  `);
}

export async function initDb() {
  await execSchema();
  const info = getDbInfo();
  console.log(`Postgres database: ${info.host}/${info.database}`);
}

export async function query(text, params = []) {
  return pool.query(normalizeQuery(text), params);
}

export async function get(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

export async function all(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

export async function run(text, params = []) {
  const result = await query(text, params);
  return result.rowCount;
}

export async function runTransaction(fn) {
  const client = await pool.connect();
  const tx = {
    query(text, params = []) {
      return client.query(normalizeQuery(text), params);
    },
    async get(text, params = []) {
      const result = await client.query(normalizeQuery(text), params);
      return result.rows[0] || null;
    },
    async all(text, params = []) {
      const result = await client.query(normalizeQuery(text), params);
      return result.rows;
    },
    async run(text, params = []) {
      const result = await client.query(normalizeQuery(text), params);
      return result.rowCount;
    },
  };

  try {
    await client.query('BEGIN');
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function getDbInfo() {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.replace(/^\//, ''),
    provider: url.hostname.includes('supabase.co') ? 'supabase-postgres' : 'postgres',
  };
}

export default { query, get, all, run };
