import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Boots the real Express application against a temporary SQLite file and drives
 * it over HTTP. This covers the full middleware chain (auth, multer, validation,
 * the 404 handler and the central error handler) that the controller-level unit
 * tests bypass.
 */
async function startServer() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zakat-api-test-'));
  process.env.DATABASE_PATH = path.join(directory, 'test.sqlite');
  process.env.JWT_SECRET = 'integration-test-secret';
  process.env.NODE_ENV = 'test';
  process.env.BLOCKCHAIN_RPC_URL = 'http://127.0.0.1:1';

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

const request = async (
  base: string,
  method: string,
  routePath: string,
  options: { token?: string; json?: unknown; form?: FormData } = {}
) => {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.json);
  } else if (options.form) {
    body = options.form;
  }

  const requestInit: RequestInit = { method, headers };
  if (body !== undefined) requestInit.body = body;
  const response = await fetch(`${base}${routePath}`, requestInit);
  const text = await response.text();
  let parsed: any = undefined;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: response.status, body: parsed, text };
};

const loginAs = async (base: string, username: string, password: string) => {
  await request(base, 'POST', '/api/auth/register', { json: { username, password } });
  const login = await request(base, 'POST', '/api/auth/login', { json: { username, password } });
  return login.body?.token as string;
};

test('integration: health, 404 and JSON body parsing', async () => {
  const server = await startServer();
  try {
    const health = await request(server.base, 'GET', '/health');
    assert.equal(health.status, 200);
    assert.deepEqual(health.body, { status: 'ok' });

    const missing = await request(server.base, 'GET', '/api/does-not-exist');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error, 'Endpoint not found');
  } finally {
    await server.close();
  }
});

test('integration: endpoints require authentication', async () => {
  const server = await startServer();
  try {
    for (const route of ['/api/transactions', '/api/dashboard/stats', '/api/campaigns', '/api/donations']) {
      const anonymous = await request(server.base, 'GET', route);
      if (route === '/api/campaigns') {
        // Campaigns are intentionally public (Campaigns.tsx loads before login state settles).
        assert.equal(anonymous.status, 200, `${route} should be public`);
      } else {
        assert.equal(anonymous.status, 401, `${route} should require auth`);
      }
    }
  } finally {
    await server.close();
  }
});

test('integration: frontend payment routes exist and return the expected shape', async () => {
  const server = await startServer();
  try {
    const token = await loginAs(server.base, 'donor01', 'supersecret1');

    // Campaigns.tsx creates campaigns; CampaignDetail.tsx reads one back.
    const created = await request(server.base, 'POST', '/api/campaigns', {
      token,
      json: { title: 'Banjir Jakarta', target_amount: 200000000 },
    });
    // A freshly registered user is a USER, so this is expected to be forbidden.
    assert.equal(created.status, 403, 'only ADMIN/AMIL may create campaigns');

    // Seed a campaign directly through the same DB the app is using.
    const { initDb } = await import('../models/db.js');
    const db = await initDb(process.env.DATABASE_PATH as string);
    await db.run("INSERT INTO campaigns (title, target_amount, status) VALUES ('Banjir', 1000, 'ACTIVE')");
    await db.close();

    // DonationPayment.tsx: POST /api/payments/session then GET /api/payments/status/:id
    const session = await request(server.base, 'POST', '/api/payments/session', {
      token,
      json: { amount: '250000', donor_name: 'Ani', program_id: 'general' },
    });
    assert.equal(session.status, 201, session.text);
    assert.ok(session.body.session_id);
    assert.ok(session.body.qris_url);

    const status = await request(server.base, 'GET', `/api/payments/status/${session.body.session_id}`, { token });
    assert.equal(status.status, 200);
    assert.equal(status.body.status, 'PENDING');
    assert.equal(status.body.session_id, session.body.session_id);

    // PaymentModal.tsx: POST /api/payments/create then GET /api/payments/verify/:id
    const legacyCreate = await request(server.base, 'POST', '/api/payments/create', {
      token,
      json: { amount: 10000, program_id: 'Zakat-General', donor_name: 'Anonymous' },
    });
    assert.equal(legacyCreate.status, 201, legacyCreate.text);
    assert.ok(legacyCreate.body.qrCodeUrl, 'PaymentModal.tsx reads qrCodeUrl');
    assert.ok(legacyCreate.body.paymentId, 'PaymentModal.tsx reads paymentId');

    const legacyVerify = await request(server.base, 'GET', `/api/payments/verify/${legacyCreate.body.paymentId}`, { token });
    assert.equal(legacyVerify.status, 200);
    assert.equal(legacyVerify.body.status, 'PENDING');

    // CampaignDetail.tsx: POST /api/payment/generate (legacy singular prefix)
    const singular = await request(server.base, 'POST', '/api/payment/generate', {
      token,
      json: { campaign_id: 1, amount: 50000, donor_id: 999 },
    });
    assert.equal(singular.status, 201, singular.text);
    assert.ok(singular.body.session_id);
    assert.equal(singular.body.donationId > 0, true);

    const verificationDb = await initDb(process.env.DATABASE_PATH as string);
    const linkedDonation = await verificationDb.get(
      'SELECT donor_id FROM donations WHERE payment_reference = ?',
      [singular.body.session_id]
    );
    await verificationDb.close();
    assert.equal(linkedDonation.donor_id, 1, 'donation ownership must come from the authenticated user, not request data');
  } finally {
    await server.close();
  }
});

test('integration: distribution upload flows end to end and rejects bad files', async () => {
  const server = await startServer();
  try {
    let token = await loginAs(server.base, 'amil01', 'supersecret1');

    // POST /api/transactions is AMIL/ADMIN only; promote via the same DB the app uses.
    const { initDb } = await import('../models/db.js');
    const promoteDb = await initDb(process.env.DATABASE_PATH as string);
    await promoteDb.run("UPDATE users SET role = 'AMIL' WHERE username = 'amil01'");
    await promoteDb.close();
    const amilLogin = await request(server.base, 'POST', '/api/auth/login', { json: { username: 'amil01', password: 'supersecret1' } });
    token = amilLogin.body.token;

    const form = new FormData();
    form.append('amount', '500000');
    form.append('donor_name', 'Hamba Allah');
    form.append('recipient_name', 'Budi Santoso');
    form.append('category', 'Konsumsi');
    form.append('region', 'Jawa Barat, Bandung');
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
    form.append('proof_file', new Blob([pngBytes], { type: 'image/png' }), 'proof.png');

    const created = await request(server.base, 'POST', '/api/transactions', { token, form });
    assert.equal(created.status, 201, created.text);
    assert.equal(created.body.blockchain_status, 'PENDING_BLOCKCHAIN');
    assert.match(created.body.audit_hash, /^[a-f0-9]{64}$/);

    const listed = await request(server.base, 'GET', '/api/transactions', { token });
    assert.equal(listed.status, 200);
    const stored = listed.body.find((row: any) => row.id === created.body.id);
    assert.ok(stored);
    assert.ok(stored.file_hash, 'the uploaded file must be hashed');
    assert.equal(stored.anomaly_flag, 0, 'a record with proof is not an anomaly');
    assert.match(stored.proof_url, /^\/uploads\/[a-f0-9]{32}\.png$/);

    // The stored proof must actually be served.
    const proof = await fetch(`${server.base}${stored.proof_url}`);
    assert.equal(proof.status, 200);

    // A file whose content is not a real image must be rejected.
    const evilForm = new FormData();
    evilForm.append('amount', '1000');
    evilForm.append('recipient_name', 'Budi Santoso');
    evilForm.append('category', 'Konsumsi');
    evilForm.append('region', 'Jawa Barat');
    evilForm.append('proof_file', new Blob([new TextEncoder().encode('<script>alert(1)</script>')], { type: 'image/png' }), 'evil.png');
    const rejected = await request(server.base, 'POST', '/api/transactions', { token, form: evilForm });
    assert.equal(rejected.status, 400, rejected.text);
    assert.match(rejected.body.error, /tidak valid/i);

    // Validation failures return path-tagged details for the form UI.
    const invalidForm = new FormData();
    invalidForm.append('amount', 'abc');
    invalidForm.append('recipient_name', 'Bu');
    invalidForm.append('category', 'Nope');
    invalidForm.append('region', 'J');
    const invalid = await request(server.base, 'POST', '/api/transactions', { token, form: invalidForm });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error, 'Validation failed');
    assert.ok(Array.isArray(invalid.body.details));
    assert.ok(invalid.body.details.length > 0);
  } finally {
    await server.close();
  }
});

test('integration: POST /api/transactions allows AMIL, rejects USER with 403 and anonymous with 401', async () => {
  const server = await startServer();
  try {
    const distributionForm = () => {
      const form = new FormData();
      form.append('amount', '500000');
      form.append('recipient_name', 'Budi Santoso');
      form.append('category', 'Konsumsi');
      form.append('region', 'Jawa Barat, Bandung');
      return form;
    };

    // Anonymous: 401 before any role check.
    const anonymous = await request(server.base, 'POST', '/api/transactions', { form: distributionForm() });
    assert.equal(anonymous.status, 401);

    // Registered user (role USER): authenticated but forbidden.
    const userToken = await loginAs(server.base, 'donorRole', 'supersecret1');
    const asUser = await request(server.base, 'POST', '/api/transactions', { token: userToken, form: distributionForm() });
    assert.equal(asUser.status, 403);

    // AMIL: allowed to create distribution records.
    const { initDb } = await import('../models/db.js');
    const promoteDb = await initDb(process.env.DATABASE_PATH as string);
    await promoteDb.run("UPDATE users SET role = 'AMIL' WHERE username = 'donorRole'");
    await promoteDb.close();
    const amilLogin = await request(server.base, 'POST', '/api/auth/login', { json: { username: 'donorRole', password: 'supersecret1' } });
    const amilToken = amilLogin.body.token;

    const asAmil = await request(server.base, 'POST', '/api/transactions', { token: amilToken, form: distributionForm() });
    assert.equal(asAmil.status, 201, asAmil.text);
    assert.equal(asAmil.body.blockchain_status, 'PENDING_BLOCKCHAIN');
  } finally {
    await server.close();
  }
});

test('integration: proof review, audit trail, anomaly scan and explorer are wired', async () => {
  const server = await startServer();
  try {
    const userToken = await loginAs(server.base, 'donor02', 'supersecret1');
    const { initDb } = await import('../models/db.js');
    const db = await initDb(process.env.DATABASE_PATH as string);
    // Promote to ADMIN directly; there is no admin-creation endpoint by design.
    await db.run("UPDATE users SET role = 'ADMIN' WHERE username = 'donor02'");
    await db.run(
      `INSERT INTO transactions (amount, recipient_name, category, region, audit_hash, proof_url, blockchain_status)
       VALUES (500000, 'Budi Santoso', 'Konsumsi', 'Jawa Barat', ?, '/uploads/x.png', 'PENDING_BLOCKCHAIN')`,
      ['d'.repeat(64)]
    );
    await db.run(
      `INSERT INTO transactions (amount, recipient_name, category, region, blockchain_status)
       VALUES (250000, 'Siti Aminah', 'Kesehatan', 'Jawa Barat', 'PENDING_BLOCKCHAIN')`
    );
    await db.close();

    const login = await request(server.base, 'POST', '/api/auth/login', { json: { username: 'donor02', password: 'supersecret1' } });
    const adminToken = login.body.token;

    const approved = await request(server.base, 'PATCH', '/api/proofs/verify/1', {
      token: adminToken,
      json: { status: 'APPROVED' },
    });
    assert.equal(approved.status, 200, approved.text);

    const rejectionWithoutReason = await request(server.base, 'PATCH', '/api/proofs/verify/1', {
      token: adminToken,
      json: { status: 'REJECTED' },
    });
    assert.equal(rejectionWithoutReason.status, 400);

    const audit = await request(server.base, 'GET', '/api/audit', { token: adminToken });
    assert.equal(audit.status, 200, audit.text);
    assert.ok(Array.isArray(audit.body));
    assert.ok(audit.body.some((entry: any) => entry.action === 'UPDATE_PROOF_STATUS'));

    const scan = await request(server.base, 'POST', '/api/anomalies/scan', { token: adminToken, json: {} });
    assert.equal(scan.status, 200, scan.text);
    // Anomaly count must reflect real findings, not a permanently-zero counter.
    assert.equal(typeof scan.body.anomaliesFound, 'number');
    assert.ok(scan.body.anomaliesFound > 0, 'a transaction without proof should be flagged');

    const anomalies = await request(server.base, 'GET', '/api/anomalies', { token: adminToken });
    assert.equal(anomalies.status, 200);
    assert.ok(anomalies.body.length > 0);

    const explorer = await request(server.base, 'GET', '/api/explorer/verify/1');
    assert.equal(explorer.status, 200);
    assert.equal(explorer.body.status, 'CHAIN_UNAVAILABLE', 'the RPC is intentionally unreachable in tests');
    assert.equal(explorer.body.data.id, 1, 'PublicVerify.tsx reads result.data');

    const explorerByHash = await request(server.base, 'GET', `/api/explorer/verify/hash/0x${'d'.repeat(64)}`);
    assert.equal(explorerByHash.status, 200, 'OnChainExplorer sends a 0x-prefixed hash');

    const csv = await fetch(`${server.base}/api/export/csv`, { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.equal(csv.status, 200);
    const csvText = await csv.text();
    assert.ok(csvText.startsWith('id,amount,'), 'decoded CSV must include a header');
  } finally {
    await server.close();
  }
});

test('integration: a donor cannot read another donor history', async () => {
  const server = await startServer();
  try {
    const token = await loginAs(server.base, 'donor03', 'supersecret1');
    const { initDb } = await import('../models/db.js');
    const db = await initDb(process.env.DATABASE_PATH as string);
    await db.run("INSERT INTO campaigns (title, target_amount) VALUES ('X', 1000)");
    await db.run("INSERT INTO users (username, password, role) VALUES ('other-donor', 'unused-test-hash', 'USER')");
    await db.run("INSERT INTO donations (campaign_id, donor_id, amount) VALUES (1, 2, 500)");
    await db.close();

    // Own history is allowed.
    const own = await request(server.base, 'GET', '/api/donations/donor/1', { token });
    assert.equal(own.status, 200);

    // Another donor's history must be refused.
    const other = await request(server.base, 'GET', '/api/donations/donor/2', { token });
    assert.equal(other.status, 403);

    const malformed = await request(server.base, 'GET', '/api/donations/donor/abc', { token });
    assert.equal(malformed.status, 403, 'unauthorized callers do not receive donor-id validation details');
  } finally {
    await server.close();
  }
});

test('integration: webhook signature verification rejects unsigned and tampered bodies', async () => {
  const server = await startServer();
  try {
    process.env.PAYMENT_WEBHOOK_SECRET = 'integration-webhook-secret';

    const unsigned = await request(server.base, 'POST', '/api/payments/webhook', {
      json: { donation_id: 1, status: 'SUCCESS', provider_tx_id: 'p1' },
    });
    assert.equal(unsigned.status, 401);

    const tampered = await fetch(`${server.base}/api/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-payment-signature': 'f'.repeat(64) },
      body: JSON.stringify({ donation_id: 1, status: 'SUCCESS', provider_tx_id: 'p1' }),
    });
    assert.equal(tampered.status, 401);

    const crypto = await import('node:crypto');
    const payload = JSON.stringify({ donation_id: 1, status: 'SUCCESS', provider_tx_id: 'p1' });
    const signature = crypto.createHmac('sha256', 'integration-webhook-secret').update(Buffer.from(payload)).digest('hex');
    const signed = await fetch(`${server.base}/api/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-payment-signature': signature },
      body: payload,
    });
    // Signature is valid, but donation 1 does not exist in this fresh database.
    assert.equal(signed.status, 404);
  } finally {
    await server.close();
  }
});
