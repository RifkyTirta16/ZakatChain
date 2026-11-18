import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initDb, runInTransaction } from '../models/db.js';

test('database bootstrap creates reconciliation tables and required transaction columns', async () => {
  const db = await initDb(':memory:');
  try {
    const transactionColumns = await db.all('PRAGMA table_info(transactions)');
    const names = new Set(transactionColumns.map((column: { name: string }) => column.name));
    assert.ok(names.has('proof_status'));
    assert.ok(names.has('proof_rejection_reason'));
    assert.ok(names.has('is_reconciled'));
    assert.ok(names.has('blockchain_status'));
    assert.ok(names.has('tx_hash'));
    assert.ok(names.has('block_number'));

    const tables = await db.all("SELECT name FROM sqlite_master WHERE type = 'table'");
    const tableNames = new Set(tables.map((table: { name: string }) => table.name));
    assert.ok(tableNames.has('donations'));
    assert.ok(tableNames.has('payments'));
    assert.ok(tableNames.has('reconciliation_logs'));

    await db.run(
      `INSERT INTO transactions (amount, recipient_name, audit_hash, blockchain_status)
       VALUES (?, ?, ?, ?)`,
      [100, 'Penerima Uji', 'audit-test', 'PENDING_BLOCKCHAIN']
    );
    const row = await db.get('SELECT proof_status, is_reconciled FROM transactions WHERE id = 1');
    assert.equal(row.proof_status, 'PENDING');
    assert.equal(row.is_reconciled, 0);
  } finally {
    await db.close();
  }
});

test('database bootstrap creates the audit_logs table used by the audit logger and API', async () => {
  // Regression: audit_logs was written by utils/auditLogger.ts and read by
  // controllers/auditController.ts but never created, so GET /api/audit always
  // returned 500 and every proof-review audit entry was silently dropped.
  const db = await initDb(':memory:');
  try {
    const table = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audit_logs'");
    assert.ok(table, 'audit_logs table must exist');

    const columns = await db.all('PRAGMA table_info(audit_logs)');
    const names = new Set(columns.map((column: { name: string }) => column.name));
    for (const column of ['actor_id', 'action', 'entity_type', 'entity_id', 'old_value', 'new_value', 'ip_address']) {
      assert.ok(names.has(column), `audit_logs.${column} must exist`);
    }

    await db.run(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [null, 'UPDATE_PROOF_STATUS', 'TRANSACTION', 1, '"PENDING"', '"APPROVED"', '127.0.0.1']
    );
    const row = await db.get('SELECT action, entity_type FROM audit_logs');
    assert.equal(row.action, 'UPDATE_PROOF_STATUS');
    assert.equal(row.entity_type, 'TRANSACTION');
  } finally {
    await db.close();
  }
});

test('foreign key constraints are enforced', async () => {
  const db = await initDb(':memory:');
  try {
    const enabled = await db.get('PRAGMA foreign_keys');
    assert.equal(Number(Object.values(enabled)[0]), 1);

    await assert.rejects(
      () => db.run("INSERT INTO donations (campaign_id, amount) VALUES (999, 100)"),
      /FOREIGN KEY constraint failed/
    );

    await db.run("INSERT INTO campaigns (title, target_amount) VALUES ('Sehat', 1000)");
    await db.run('INSERT INTO donations (campaign_id, amount) VALUES (1, 100)');
    const donation = await db.get('SELECT campaign_id FROM donations WHERE id = 1');
    assert.equal(donation.campaign_id, 1);
  } finally {
    await db.close();
  }
});

test('provider_tx_id is unique so a webhook event cannot be recorded twice', async () => {
  const db = await initDb(':memory:');
  try {
    await db.run(
      "INSERT INTO payment_events (donation_id, provider_tx_id, event_type) VALUES (NULL, 'tx-1', 'SUCCESS')"
    );
    await assert.rejects(
      () => db.run("INSERT INTO payment_events (donation_id, provider_tx_id, event_type) VALUES (NULL, 'tx-1', 'SUCCESS')"),
      /UNIQUE constraint failed/
    );

    // Rows without a provider reference (e.g. INTENT_CREATED) must not collide.
    await db.run("INSERT INTO payment_events (donation_id, event_type) VALUES (NULL, 'INTENT_CREATED')");
    await db.run("INSERT INTO payment_events (donation_id, event_type) VALUES (NULL, 'INTENT_CREATED')");
    const count = await db.get("SELECT COUNT(*) as total FROM payment_events WHERE event_type = 'INTENT_CREATED'");
    assert.equal(count.total, 2);
  } finally {
    await db.close();
  }
});

test('audit_hash is not unique because identical distributions are legitimate', async () => {
  const db = await initDb(':memory:');
  try {
    const insert = () => db.run(
      `INSERT INTO transactions (amount, recipient_name, category, region, audit_hash)
       VALUES (500000, 'Budi', 'Konsumsi', 'Jakarta', 'same-hash')`
    );
    await insert();
    await insert();
    const count = await db.get("SELECT COUNT(*) as total FROM transactions WHERE audit_hash = 'same-hash'");
    assert.equal(count.total, 2);
  } finally {
    await db.close();
  }
});

test('runInTransaction commits on success and rolls back on failure', async () => {
  const db = await initDb(':memory:');
  try {
    await runInTransaction(db, async () => {
      await db.run("INSERT INTO campaigns (title, target_amount) VALUES ('Committed', 1)");
    });
    assert.equal((await db.get('SELECT COUNT(*) as total FROM campaigns')).total, 1);

    await assert.rejects(() =>
      runInTransaction(db, async () => {
        await db.run("INSERT INTO campaigns (title, target_amount) VALUES ('RolledBack', 1)");
        throw new Error('boom');
      })
    );
    assert.equal((await db.get('SELECT COUNT(*) as total FROM campaigns')).total, 1);
  } finally {
    await db.close();
  }
});

test('database additive migration is safe to run more than once', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zakat-db-test-'));
  const filename = path.join(directory, 'legacy.sqlite');
  const db = await (await import('sqlite')).open({
    filename,
    driver: (await import('sqlite3')).default.Database
  });
  try {
    await db.exec(`CREATE TABLE transactions (
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
      blockchain_status TEXT,
      tx_hash TEXT,
      block_number INTEGER
    )`);
    await db.run("INSERT INTO transactions (amount, recipient_name, audit_hash) VALUES (50, 'Lama', 'keep-me')");
    await db.close();

    const migrated = await initDb(filename);
    try {
      const columns = await migrated.all('PRAGMA table_info(transactions)');
      assert.equal(columns.filter((column: { name: string }) => column.name === 'proof_status').length, 1);
      const row = await migrated.get("SELECT amount, recipient_name, audit_hash, proof_status FROM transactions WHERE audit_hash = 'keep-me'");
      assert.equal(row.amount, 50);
      assert.equal(row.recipient_name, 'Lama');
      assert.equal(row.proof_status, 'PENDING');
      await migrated.close();

      const repeated = await initDb(filename);
      const proofColumns = await repeated.all('PRAGMA table_info(transactions)');
      assert.equal(proofColumns.filter((column: { name: string }) => column.name === 'proof_status').length, 1);
      // The second boot must also have created the formerly missing table.
      const auditTable = await repeated.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audit_logs'");
      assert.ok(auditTable);
      await repeated.close();
    } finally {
      // Both handles are closed before the temporary database is removed.
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
