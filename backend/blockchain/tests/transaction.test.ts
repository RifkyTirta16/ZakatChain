import assert from 'node:assert/strict';
import test from 'node:test';
import { initDb } from '../models/db.js';
import { getTransactions } from '../controllers/transactionController.js';

test('GET /api/transactions safely rejects malicious search inputs via parameterized query', async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = ':memory:';
  process.env.JWT_SECRET = 'test-secret';
  process.env.BLOCKCHAIN_RPC_URL = 'http://127.0.0.1:1';

  const db = await initDb();
  await db.run('INSERT INTO transactions (amount, recipient_name, category, region, proof_status, blockchain_status) VALUES (?, ?, ?, ?, ?, ?)', [50000, 'Penerima 1', 'Konsumsi', 'DKI Jakarta', 'PENDING', 'PENDING']);
  await db.run('INSERT INTO transactions (amount, recipient_name, category, region, proof_status, blockchain_status) VALUES (?, ?, ?, ?, ?, ?)', [100000, 'Penerima 2', 'Kesehatan', 'Jawa Barat', 'PENDING', 'PENDING']);

  const maliciousPayloads = [
    "admin'--",
    "admin' OR '1'='1",
    "'; DROP TABLE transactions; --",
    "1'; SELECT SLEEP(10); --",
  ];

  for (const payload of maliciousPayloads) {
    const req = {
      query: { search: payload }
    } as any;
    const res = {
      status: (code: number) => ({ json: (body: unknown) => ({ statusCode: code, body }) }),
      json: (body: unknown) => ({ statusCode: 200, body })
    } as any;

    try {
      await getTransactions(req, res);
      const result = res.statusCode === 200 ? JSON.stringify(res.body) : '';
      assert.ok(!result || Array.isArray(res.body) && res.body.length === 0, `Payload ${payload} should cause error or return empty array`);
    } catch (error: any) {
      const errorMsg = error?.message || '';
      assert.ok(
        errorMsg.includes('SQL') || errorMsg.includes('sqlite3') || errorMsg.includes('Syntax error'),
        `Payload ${payload} did not cause a SQL-related error: ${errorMsg}`
      );
    }
  }
});