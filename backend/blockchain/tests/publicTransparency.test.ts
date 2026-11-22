import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initDb } from '../models/db.js';

async function startPublicServer() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zakat-public-test-'));
  const dbPath = path.join(directory, 'test.sqlite');
  process.env.DATABASE_PATH = dbPath;
  process.env.JWT_SECRET = 'public-test-secret';
  process.env.NODE_ENV = 'test';
  process.env.BLOCKCHAIN_RPC_URL = 'http://127.0.0.1:1';

  const db = await initDb(dbPath);
  await db.run(
    `INSERT INTO transactions (amount, donor_name, recipient_name, category, region, proof_url, audit_hash, blockchain_status, proof_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      750000,
      'Rahasia Muzakki',
      'Nama Rahasia Mustahik',
      'Konsumsi',
      'Jawa Barat, Bandung',
      '/uploads/secret-proof.jpg',
      'e'.repeat(64),
      'CONFIRMED',
      'APPROVED',
    ],
  );
  // Seed a rejected report (no file) that must stay excluded from public totals, categories, pending count & recent list.
  await db.run(
    `INSERT INTO transactions (amount, donor_name, recipient_name, category, region, proof_url, audit_hash, blockchain_status, proof_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      200000,
      'Rahasia Muzakki 2',
      'Rahasia Mustahik 2',
      'Konsumsi',
      'Jawa Barat, Bogor',
      null,
      'f'.repeat(64),
      'PENDING_BLOCKCHAIN',
      'REJECTED',
    ],
  );
  await db.close();

  const { app, resetDbForTests } = await import('../index.js');
  await resetDbForTests();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    base: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await resetDbForTests();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

test('GET /api/public/transparency returns aggregate KPIs without beneficiary/donor PII', async () => {
  const server = await startPublicServer();
  try {
    const response = await fetch(`${server.base}/api/public/transparency`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as any;

    assert.equal(body.kpis.totalDistributed, 750000);
    assert.equal(body.kpis.totalReports, 1);
    assert.equal(body.kpis.verifiedReports, 1);
    assert.equal(body.kpis.pendingReports, 0);
    assert.equal(body.categoryDistribution.length, 1);
    assert.equal(body.categoryDistribution[0].total, 750000);
    assert.equal(body.networkStatus.rpc, 'Unreachable');
    assert.ok(typeof body.networkStatus.contractAddress === 'string');

    assert.equal(body.recentTransactions.length, 1);
    const tx = body.recentTransactions[0];
    assert.equal(tx.amount, 750000);
    assert.equal(tx.audit_hash, 'e'.repeat(64));
    assert.equal('recipient_name' in tx, false, 'Mustahik name must never be exposed publicly');
    assert.equal('donor_name' in tx, false, 'Donor name must never be exposed publicly');
    assert.equal('proof_url' in tx, false, 'Proof URL must never be exposed publicly');

    const netRes = await fetch(`${server.base}/api/public/network`);
    assert.equal(netRes.status, 200);
    const netBody = (await netRes.json()) as any;
    assert.equal(netBody.networkStatus.rpc, 'Unreachable');
  } finally {
    await server.close();
  }
});
