
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

type Db = Awaited<ReturnType<typeof open>>;

async function ensureColumn(db: Db, table: string, column: string, definition: string) {
  const columns = await db.all(`PRAGMA table_info(${table})`);
  if (!columns.some((item: { name: string }) => item.name === column)) {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/**
 * Creates a UNIQUE index only when the existing data cannot violate it.
 * The guard query returns the number of offending rows; anything above zero
 * means the migration is skipped and reported instead of failing startup.
 * This keeps legacy databases bootable even if they already contain duplicates.
 */
async function ensureUniqueIndex(db: Db, name: string, column: string, guardSql: string) {
  const conflict = await db.get(guardSql);
  const conflicts = Number(Object.values(conflict ?? {})[0] ?? 0);
  if (conflicts > 0) {
    console.warn(`[MIGRATION] Skipping unique index ${name}: ${conflicts} conflicting row(s) already exist.`);
    return;
  }
  await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${name} ON ${column}`);
}

export const initDb = async (filename = process.env.DATABASE_PATH || path.join(backendRoot, 'database.sqlite')) => {
  const db = await open({
    filename,
    driver: sqlite3.Database
  });

  // Enforce the foreign keys that were already declared but never applied.
  await db.exec('PRAGMA foreign_keys = ON');
  await db.exec('PRAGMA busy_timeout = 5000');

  // WAL improves concurrent read/write behaviour for the webhook path.
  // File-backed databases only: ':memory:' does not support WAL.
  if (filename !== ':memory:' && !filename.startsWith('file::memory:')) {
    try {
      await db.exec('PRAGMA journal_mode = WAL');
    } catch (error) {
      console.warn('[MIGRATION] WAL mode unavailable, continuing with default journal.', error);
    }
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      donor_name TEXT,
      recipient_name TEXT,
      category TEXT,
      region TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      proof_url TEXT,
      file_hash TEXT,
      audit_hash TEXT,
      is_reconciled BOOLEAN DEFAULT 0,
      anomaly_flag BOOLEAN DEFAULT 0,
      anomaly_reason TEXT,
      tx_hash TEXT,
      blockchain_status TEXT,
      block_number INTEGER
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_session_id TEXT UNIQUE NOT NULL,
      donor_name TEXT,
      amount REAL NOT NULL,
      program_id TEXT,
      status TEXT DEFAULT 'PENDING',
      provider_tx_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS reconciliation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reconciliation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_donations REAL,
      total_distributions REAL,
      balance REAL,
      status TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      type TEXT,
      reason TEXT,
      priority TEXT,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'OPEN',
      follow_up TEXT,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS poverty_stats (
      region_code TEXT PRIMARY KEY,
      region_name TEXT NOT NULL,
      province_name TEXT NOT NULL,
      poverty_rate REAL NOT NULL,
      poor_population INTEGER,
      poverty_line REAL,
      reference_year INTEGER,
      source_name TEXT,
      source_url TEXT,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      deadline DATETIME,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      donor_id INTEGER,
      amount REAL NOT NULL,
      payment_reference TEXT,
      status TEXT DEFAULT 'PENDING',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (donor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donation_id INTEGER,
      provider_tx_id TEXT,
      event_type TEXT,
      payload TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (donation_id) REFERENCES donations(id)
    );

    -- Required by utils/auditLogger.ts and controllers/auditController.ts.
    -- Previously missing, which made GET /api/audit fail for every request.
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actor_id) REFERENCES users(id)
    );
  `);

  // Additive migrations keep existing SQLite files and records intact.
  await ensureColumn(db, 'transactions', 'proof_status', "TEXT DEFAULT 'PENDING'");
  await ensureColumn(db, 'transactions', 'proof_rejection_reason', 'TEXT');
  await ensureColumn(db, 'transactions', 'is_reconciled', 'BOOLEAN DEFAULT 0');
  await ensureColumn(db, 'transactions', 'blockchain_status', 'TEXT');
  await ensureColumn(db, 'transactions', 'tx_hash', 'TEXT');
  await ensureColumn(db, 'transactions', 'block_number', 'INTEGER');

  // Lookup indexes. `audit_hash` is intentionally NOT unique: two legitimate
  // distributions to the same recipient for the same amount produce identical
  // hashes, so uniqueness would reject valid records.
  await db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_audit_hash ON transactions(audit_hash)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_region ON transactions(region)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(blockchain_status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_anomalies_transaction ON anomalies(transaction_id, type, status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_payment_events_provider_tx ON payment_events(provider_tx_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(payment_session_id)');

  // `provider_tx_id` is the webhook idempotency key. SQLite treats NULLs as
  // distinct, so INTENT_CREATED rows without a provider reference are unaffected.
  await ensureUniqueIndex(
    db,
    'idx_payment_events_provider_tx_unique',
    'payment_events(provider_tx_id)',
    `SELECT COUNT(*) AS total FROM (
       SELECT provider_tx_id FROM payment_events
       WHERE provider_tx_id IS NOT NULL
       GROUP BY provider_tx_id HAVING COUNT(*) > 1
     )`
  );

  return db;
};

/**
 * Runs `operation` inside an IMMEDIATE transaction so a failure cannot leave a
 * partially applied multi-statement write behind.
 */
export async function runInTransaction<T>(db: Db, operation: () => Promise<T>): Promise<T> {
  await (db as any).exec('BEGIN IMMEDIATE');
  try {
    const result = await operation();
    await (db as any).exec('COMMIT');
    return result;
  } catch (error) {
    try {
      await (db as any).exec('ROLLBACK');
    } catch {
      // Preserve the original failure.
    }
    throw error;
  }
}

export type Database = Db;
