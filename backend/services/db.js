/**
 * Postgres persistence layer for pool-name overrides.
 * Enabled when DATABASE_URL env var is set (e.g. from Neon).
 *
 * Falls back to no-op if DATABASE_URL is missing — the file-based
 * override in store.js keeps working locally.
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Neon needs SSL, self-signed OK
    max: 3,                              // Small pool, low traffic
    idleTimeoutMillis: 30_000,
  });
  pool.on('error', (err) => {
    console.error('[db] pool error:', err.message);
  });
}

async function init() {
  if (!pool) return false;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pool_overrides (
        wallet     TEXT NOT NULL,
        pool_id    TEXT NOT NULL,
        name       TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (wallet, pool_id)
      )
    `);
    console.log('[db] Postgres initialized');
    return true;
  } catch (err) {
    console.error('[db] init failed:', err.message);
    return false;
  }
}

async function loadAllOverrides() {
  if (!pool) return {};
  try {
    const { rows } = await pool.query('SELECT wallet, pool_id, name FROM pool_overrides');
    const result = {};
    for (const r of rows) {
      if (!result[r.wallet]) result[r.wallet] = {};
      result[r.wallet][r.pool_id] = { name: r.name };
    }
    console.log(`[db] loaded ${rows.length} pool-name overrides`);
    return result;
  } catch (err) {
    console.error('[db] load failed:', err.message);
    return {};
  }
}

async function saveOverride(wallet, poolId, name) {
  if (!pool) return false;
  try {
    await pool.query(`
      INSERT INTO pool_overrides (wallet, pool_id, name, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (wallet, pool_id) DO UPDATE
        SET name = EXCLUDED.name, updated_at = NOW()
    `, [wallet, poolId, name]);
    return true;
  } catch (err) {
    console.error('[db] save failed:', err.message);
    return false;
  }
}

module.exports = { init, loadAllOverrides, saveOverride, enabled: !!pool };
