import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { initDb } from '../models/db.js';
import { getTransactions, createTransaction, reconcileTransaction } from '../controllers/transactionController.js';
import { updateProofStatus } from '../controllers/proofController.js';
import { resolveAnomaly, getAnomalies, scanForAnomalies } from '../controllers/anomalyController.js';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { listMustahik } from '../controllers/mustahikController.js';
import { performReconciliation } from '../controllers/reconciliationController.js';
import { getCampaignDetail, createCampaign } from '../controllers/campaignController.js';
import { getDonationTrace } from '../controllers/donationController.js';
import { getRegionalDistribution } from '../controllers/mappingController.js';
import { exportTransactionsCSV } from '../controllers/exportController.js';
import { getAuditLogs } from '../controllers/auditController.js';
import { verifyReportProof } from '../controllers/explorerController.js';

function mockResponse() {
  const result: {
    statusCode: number;
    body: unknown;
    headers: Record<string, string>;
    sent: string | null;
  } = { statusCode: 200, body: undefined, headers: {}, sent: null };
  const response = {
    status(code: number) { result.statusCode = code; return response; },
    json(body: unknown) { result.body = body; return response; },
    setHeader(name: string, value: string) { result.headers[name] = value; return response; },
    send(payload: string) { result.sent = payload; return response; },
  };
  return { response: response as unknown as Response, result };
}

type Db = Awaited<ReturnType<typeof initDb>>;

const req = (db: Db, overrides: Partial<Request> = {}) =>
  ({ db, body: {}, params: {}, query: {}, ...overrides } as unknown as Request);

const seedTransaction = (db: Db, values: Record<string, unknown> = {}) => {
  const row = {
    amount: 500000,
    donor_name: 'Hamba Allah',
    recipient_name: 'Budi Santoso',
    category: 'Konsumsi',
    region: 'Jawa Barat, Bandung',
    audit_hash: 'a'.repeat(64),
    blockchain_status: 'PENDING_BLOCKCHAIN',
    proof_url: '/uploads/x.png',
    ...values,
  };
  return db.run(
    `INSERT INTO transactions (amount, donor_name, recipient_name, category, region, audit_hash, blockchain_status, proof_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.amount, row.donor_name, row.recipient_name, row.category, row.region, row.audit_hash, row.blockchain_status, row.proof_url]
  );
};

/* ------------------------------- transactions ------------------------------ */

test('GET /api/transactions returns rows and applies literal filters', async () => {
  const db = await initDb(':memory:');
  try {
    await seedTransaction(db);
    await seedTransaction(db, { recipient_name: 'Siti', category: 'Pendidikan', region: 'DKI Jakarta' });

    const all = mockResponse();
    await getTransactions(req(db), all.response);
    assert.equal(all.result.statusCode, 200);
    assert.equal((all.result.body as unknown[]).length, 2);

    const filtered = mockResponse();
    await getTransactions(req(db, { query: { category: 'Pendidikan' } as any }), filtered.response);
    assert.equal((filtered.result.body as unknown[]).length, 1);

    // A `%` in the search term must be matched literally, not as a wildcard.
    const wildcard = mockResponse();
    await getTransactions(req(db, { query: { search: '%' } as any }), wildcard.response);
    assert.equal((wildcard.result.body as unknown[]).length, 0);
  } finally {
    await db.close();
  }
});

test('POST /api/transactions rejects invalid input with path-tagged issue details', async () => {
  const db = await initDb(':memory:');
  try {
    const response = mockResponse();
    await createTransaction(
      req(db, { body: { amount: '-1', recipient_name: 'Bu', category: 'Nope', region: 'J' } }),
      response.response
    );
    assert.equal(response.result.statusCode, 400);
    const body = response.result.body as any;
    assert.equal(body.error, 'Validation failed');
    // Regression: zod v4 removed `.errors`, so this was previously undefined and
    // the frontend could not render per-field messages.
    assert.ok(Array.isArray(body.details));
    assert.ok(body.details.length > 0);
    assert.ok(Array.isArray(body.details[0].path));
  } finally {
    await db.close();
  }
});

test('POST /api/transactions persists a pending record when the chain is unreachable', async () => {
  const db = await initDb(':memory:');
  const previousRpc = process.env.BLOCKCHAIN_RPC_URL;
  // Port 1 is closed, so the RPC call fails immediately.
  process.env.BLOCKCHAIN_RPC_URL = 'http://127.0.0.1:1';
  try {
    const response = mockResponse();
    await createTransaction(
      req(db, {
        body: {
          amount: '250000',
          recipient_name: 'Budi Santoso',
          category: 'Konsumsi',
          region: 'Jawa Barat, Bandung',
        },
      }),
      response.response
    );

    assert.equal(response.result.statusCode, 201, JSON.stringify(response.result.body));
    const body = response.result.body as any;
    assert.equal(body.blockchain_status, 'PENDING_BLOCKCHAIN');
    assert.equal(body.tx_hash, null);
    assert.match(body.audit_hash, /^[a-f0-9]{64}$/);

    const stored = await db.get('SELECT * FROM transactions WHERE id = ?', [body.id]);
    assert.equal(stored.amount, 250000);
    assert.equal(stored.audit_hash, body.audit_hash);
    // No proof uploaded -> anomaly flagged, and the row stays retryable.
    assert.equal(stored.anomaly_flag, 1);
    assert.equal(stored.is_reconciled, 0);
  } finally {
    if (previousRpc === undefined) delete process.env.BLOCKCHAIN_RPC_URL;
    else process.env.BLOCKCHAIN_RPC_URL = previousRpc;
    await db.close();
  }
});

test('POST /api/transactions produces a distinct audit hash for identical content', async () => {
  const db = await initDb(':memory:');
  const previousRpc = process.env.BLOCKCHAIN_RPC_URL;
  process.env.BLOCKCHAIN_RPC_URL = 'http://127.0.0.1:1';
  try {
    const payload = {
      amount: '100000',
      recipient_name: 'Budi Santoso',
      category: 'Konsumsi',
      region: 'Jawa Barat, Bandung',
    };
    const first = mockResponse();
    await createTransaction(req(db, { body: { ...payload } }), first.response);
    const second = mockResponse();
    await createTransaction(req(db, { body: { ...payload } }), second.response);

    const firstHash = (first.result.body as any).audit_hash;
    const secondHash = (second.result.body as any).audit_hash;
    assert.notEqual(firstHash, secondHash);
    assert.equal((await db.get('SELECT COUNT(*) as total FROM transactions')).total, 2);
  } finally {
    if (previousRpc === undefined) delete process.env.BLOCKCHAIN_RPC_URL;
    else process.env.BLOCKCHAIN_RPC_URL = previousRpc;
    await db.close();
  }
});

/* ---------------------------------- proofs --------------------------------- */

test('PATCH /api/proofs/verify/:id validates status, id and requires a rejection reason', async () => {
  const db = await initDb(':memory:');
  try {
    const inserted = await seedTransaction(db);

    const approved = mockResponse();
    await updateProofStatus(
      req(db, { params: { id: String(inserted.lastID) } as any, body: { status: 'APPROVED' } }),
      approved.response
    );
    assert.equal(approved.result.statusCode, 200);
    assert.equal((await db.get('SELECT proof_status FROM transactions WHERE id = ?', [inserted.lastID])).proof_status, 'APPROVED');

    // Rejection without a reason is refused.
    const noReason = mockResponse();
    await updateProofStatus(
      req(db, { params: { id: String(inserted.lastID) } as any, body: { status: 'REJECTED' } }),
      noReason.response
    );
    assert.equal(noReason.result.statusCode, 400);

    const rejected = mockResponse();
    await updateProofStatus(
      req(db, { params: { id: String(inserted.lastID) } as any, body: { status: 'REJECTED', reason: 'Foto buram' } }),
      rejected.response
    );
    assert.equal(rejected.result.statusCode, 200);
    const stored = await db.get('SELECT proof_status, proof_rejection_reason FROM transactions WHERE id = ?', [inserted.lastID]);
    assert.equal(stored.proof_status, 'REJECTED');
    assert.equal(stored.proof_rejection_reason, 'Foto buram');

    const badStatus = mockResponse();
    await updateProofStatus(
      req(db, { params: { id: String(inserted.lastID) } as any, body: { status: 'WHATEVER' } }),
      badStatus.response
    );
    assert.equal(badStatus.result.statusCode, 400);

    const badId = mockResponse();
    await updateProofStatus(req(db, { params: { id: 'abc' } as any, body: { status: 'APPROVED' } }), badId.response);
    assert.equal(badId.result.statusCode, 400);

    const missing = mockResponse();
    await updateProofStatus(req(db, { params: { id: '9999' } as any, body: { status: 'APPROVED' } }), missing.response);
    assert.equal(missing.result.statusCode, 404);

    // The review action must be recorded in audit_logs.
    const auditCount = await db.get('SELECT COUNT(*) as total FROM audit_logs');
    assert.ok(auditCount.total >= 2, 'proof status changes must be audited');
  } finally {
    await db.close();
  }
});

/* --------------------------------- anomalies ------------------------------- */

test('PATCH /api/anomalies/:id/resolve validates status and reports missing rows', async () => {
  const db = await initDb(':memory:');
  try {
    await db.run(
      "INSERT INTO anomalies (transaction_id, type, reason, priority, status) VALUES (NULL, 'MISSING_PROOF', 'x', 'HIGH', 'OPEN')"
    );

    const ok = mockResponse();
    await resolveAnomaly(req(db, { params: { id: '1' } as any, body: { status: 'RESOLVED', follow_up: 'Checked' } }), ok.response);
    assert.equal(ok.result.statusCode, 200);
    const stored = await db.get('SELECT status, follow_up FROM anomalies WHERE id = 1');
    assert.equal(stored.status, 'RESOLVED');
    assert.equal(stored.follow_up, 'Checked');

    for (const body of [{ status: 'NOPE' }, {}]) {
      const bad = mockResponse();
      await resolveAnomaly(req(db, { params: { id: '1' } as any, body }), bad.response);
      assert.equal(bad.result.statusCode, 400);
    }

    const missing = mockResponse();
    await resolveAnomaly(req(db, { params: { id: '4321' } as any, body: { status: 'CLOSED' } }), missing.response);
    assert.equal(missing.result.statusCode, 404);
  } finally {
    await db.close();
  }
});

test('GET /api/anomalies does not drop rows whose transaction is missing', async () => {
  const db = await initDb(':memory:');
  try {
    await db.run(
      "INSERT INTO anomalies (transaction_id, type, reason, priority, status) VALUES (NULL, 'ORPHAN', 'x', 'LOW', 'OPEN')"
    );
    const response = mockResponse();
    await getAnomalies(req(db), response.response);
    // A plain INNER JOIN previously hid this row entirely.
    assert.equal((response.result.body as unknown[]).length, 1);
  } finally {
    await db.close();
  }
});

/* ----------------------------------- audit --------------------------------- */

test('GET /api/audit returns logs with the actor username', async () => {
  const db = await initDb(':memory:');
  try {
    await db.run("INSERT INTO users (username, password, role) VALUES ('auditor1', 'x', 'AUDITOR')");
    await db.run(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value, ip_address)
       VALUES (1, 'UPDATE_PROOF_STATUS', 'TRANSACTION', 5, '"PENDING"', '"APPROVED"', '127.0.0.1')`
    );
    const response = mockResponse();
    await getAuditLogs(req(db), response.response);
    assert.equal(response.result.statusCode, 200);
    const rows = response.result.body as any[];
    assert.equal(rows.length, 1);
    assert.equal(rows[0].actor_username, 'auditor1');
    assert.equal(rows[0].action, 'UPDATE_PROOF_STATUS');
  } finally {
    await db.close();
  }
});

/* ----------------------------------- export -------------------------------- */

test('GET /api/export/csv escapes quotes, newlines and formula prefixes', async () => {
  const db = await initDb(':memory:');
  try {
    await seedTransaction(db, {
      recipient_name: '=cmd|calc',
      donor_name: 'Quote " inside',
      region: 'Line1\nLine2',
    });
    const response = mockResponse();
    await exportTransactionsCSV(req(db), response.response);

    assert.equal(response.result.statusCode, 200);
    const csv = response.result.sent as string;
    // A formula-leading value must be neutralised.
    assert.ok(csv.includes(`"'=cmd|calc"`), 'formula prefix must be escaped');
    // Embedded quotes are doubled and the newline stays inside the quoted field.
    assert.ok(csv.includes(`"Quote "" inside"`));
    assert.ok(csv.includes('"Line1\nLine2"'));
    assert.match(response.result.headers['Content-Type'] ?? '', /text\/csv/);
  } finally {
    await db.close();
  }
});

test('GET /api/export/csv returns 404 when there is nothing to export', async () => {
  const db = await initDb(':memory:');
  try {
    const response = mockResponse();
    await exportTransactionsCSV(req(db), response.response);
    assert.equal(response.result.statusCode, 404);
  } finally {
    await db.close();
  }
});

/* --------------------------------- campaigns ------------------------------- */

test('POST /api/campaigns validates fields and returns the created id', async () => {
  const db = await initDb(':memory:');
  try {
    const ok = mockResponse();
    await createCampaign(req(db, { body: { title: '  Beasiswa  ', target_amount: '1000000', description: '  Yo  ' } }), ok.response);
    assert.equal(ok.result.statusCode, 201);
    assert.ok((ok.result.body as any).id);
    const stored = await db.get('SELECT title, target_amount FROM campaigns WHERE id = 1');
    assert.equal(stored.title, 'Beasiswa');
    assert.equal(stored.target_amount, 1000000);

    for (const body of [{ target_amount: 100 }, { title: 'X', target_amount: 0 }, { title: 'X', target_amount: 10, deadline: 'nope' }]) {
      const bad = mockResponse();
      await createCampaign(req(db, { body }), bad.response);
      assert.equal(bad.result.statusCode, 400, JSON.stringify(body));
    }
  } finally {
    await db.close();
  }
});

test('GET /api/campaigns/:id aggregates confirmed totals in SQL', async () => {
  const db = await initDb(':memory:');
  try {
    await db.run("INSERT INTO campaigns (title, target_amount) VALUES ('X', 1000)");
    await db.run("INSERT INTO donations (campaign_id, amount, status) VALUES (1, 100, 'CONFIRMED')");
    await db.run("INSERT INTO donations (campaign_id, amount, status) VALUES (1, 900, 'PENDING')");

    const response = mockResponse();
    await getCampaignDetail(req(db, { params: { id: '1' } as any }), response.response);
    assert.equal(response.result.statusCode, 200);
    const body = response.result.body as any;
    assert.equal(body.total_confirmed, 100);
    assert.equal(body.donation_count, 2);
    assert.equal(body.donations.length, 2);

    const bad = mockResponse();
    await getCampaignDetail(req(db, { params: { id: 'abc' } as any }), bad.response);
    assert.equal(bad.result.statusCode, 400);

    const missing = mockResponse();
    await getCampaignDetail(req(db, { params: { id: '99' } as any }), missing.response);
    assert.equal(missing.result.statusCode, 404);
  } finally {
    await db.close();
  }
});

/* ---------------------------------- explorer ------------------------------- */

test('GET /api/explorer/verify/:id validates the id and reports chain outages explicitly', async () => {
  const db = await initDb(':memory:');
  const previousRpc = process.env.BLOCKCHAIN_RPC_URL;
  process.env.BLOCKCHAIN_RPC_URL = 'http://127.0.0.1:1';
  try {
    const invalid = mockResponse();
    await verifyReportProof(req(db, { params: { id: 'abc' } as any }), invalid.response);
    assert.equal(invalid.result.statusCode, 400);

    const missing = mockResponse();
    await verifyReportProof(req(db, { params: { id: '999' } as any }), missing.response);
    assert.equal(missing.result.statusCode, 404);

    const inserted = await seedTransaction(db, { audit_hash: 'b'.repeat(64) });
    const found = mockResponse();
    await verifyReportProof(req(db, { params: { id: String(inserted.lastID) } as any }), found.response);
    assert.equal(found.result.statusCode, 200);
    const body = found.result.body as any;
    // An unreachable RPC must not be reported as a false NOT_FOUND_ON_CHAIN.
    assert.equal(body.status, 'CHAIN_UNAVAILABLE');
    assert.equal(body.verified, false);
    assert.equal(body.database.id, inserted.lastID);
    assert.equal(body.data.id, inserted.lastID);
  } finally {
    if (previousRpc === undefined) delete process.env.BLOCKCHAIN_RPC_URL;
    else process.env.BLOCKCHAIN_RPC_URL = previousRpc;
    await db.close();
  }
});

test('GET /api/explorer/verify/hash/:hash accepts a 0x-prefixed audit hash', async () => {
  const db = await initDb(':memory:');
  const previousRpc = process.env.BLOCKCHAIN_RPC_URL;
  process.env.BLOCKCHAIN_RPC_URL = 'http://127.0.0.1:1';
  try {
    const hash = 'c'.repeat(64);
    await seedTransaction(db, { audit_hash: hash });

    // Regression: the explorer routes 0x-prefixed queries here, but the prefix
    // was rejected as malformed.
    const prefixed = mockResponse();
    await verifyReportProof(req(db, { params: { hash: `0x${hash}` } as any }), prefixed.response);
    assert.equal(prefixed.result.statusCode, 200);
    assert.equal((prefixed.result.body as any).database.id, 1);

    const bare = mockResponse();
    await verifyReportProof(req(db, { params: { hash } as any }), bare.response);
    assert.equal(bare.result.statusCode, 200);

    const malformed = mockResponse();
    await verifyReportProof(req(db, { params: { hash: 'zz' } as any }), malformed.response);
    assert.equal(malformed.result.statusCode, 400);
  } finally {
    if (previousRpc === undefined) delete process.env.BLOCKCHAIN_RPC_URL;
    else process.env.BLOCKCHAIN_RPC_URL = previousRpc;
    await db.close();
  }
});

/* ------------------------------ package 1 fixes ---------------------------- */

test('createCampaign accepts null deadline and getCampaignDetail omits donor_id & payment_reference', async () => {
  const db = await initDb(':memory:');
  try {
    const created = mockResponse();
    await createCampaign(
      req(db, { body: { title: 'Beasiswa Santri', description: 'Bantuan pendidikan', target_amount: 1000000, deadline: null } }),
      created.response
    );
    assert.equal(created.result.statusCode, 201);

    await db.run("INSERT INTO users (username, password, role) VALUES ('donor_camp', 'hash', 'USER')");
    await db.run(
      "INSERT INTO donations (campaign_id, donor_id, amount, payment_reference, status) VALUES (1, 1, 250000, 'SECRET-REF-1', 'CONFIRMED')"
    );
    const detail = mockResponse();
    await getCampaignDetail(req(db, { params: { id: '1' } as any }), detail.response);
    assert.equal(detail.result.statusCode, 200);
    const body = detail.result.body as any;
    assert.equal(body.donations.length, 1);
    assert.equal('donor_id' in body.donations[0], false);
    assert.equal('payment_reference' in body.donations[0], false);
  } finally {
    await db.close();
  }
});

test('PATCH /api/proofs/verify/:id refuses APPROVED when proof_url is missing', async () => {
  const db = await initDb(':memory:');
  try {
    const inserted = await seedTransaction(db, { proof_url: null });
    const blocked = mockResponse();
    await updateProofStatus(
      req(db, { params: { id: String(inserted.lastID) } as any, body: { status: 'APPROVED' } }),
      blocked.response
    );
    assert.equal(blocked.result.statusCode, 409);

    const rejected = mockResponse();
    await updateProofStatus(
      req(db, { params: { id: String(inserted.lastID) } as any, body: { status: 'REJECTED', reason: 'Belum ada foto bukti' } }),
      rejected.response
    );
    assert.equal(rejected.result.statusCode, 200);
  } finally {
    await db.close();
  }
});

test('GET /api/donations/:id/trace withholds distribution estimates until payment is CONFIRMED', async () => {
  const db = await initDb(':memory:');
  try {
    await db.run("INSERT INTO users (username, password, role) VALUES ('donor_a', 'hash', 'USER')");
    await db.run("INSERT INTO donations (donor_id, amount, payment_reference, status) VALUES (1, 100000, 'REF-PENDING', 'PENDING')");
    await seedTransaction(db, { campaign_id: null, proof_status: 'APPROVED', blockchain_status: 'CONFIRMED' });

    const res = mockResponse();
    await getDonationTrace(req(db, { params: { id: '1' } as any, user: { id: 1, username: 'donor_a', role: 'USER' } } as any), res.response);
    assert.equal(res.result.statusCode, 200);
    const body = res.result.body as any;
    assert.deepEqual(body.regions, []);
    assert.deepEqual(body.reports, []);
    assert.equal(body.pool_distributed_total, 0);
  } finally {
    await db.close();
  }
});

test('GET /api/mapping/region/:region normalizes province names and strips PII for USER role', async () => {
  const db = await initDb(':memory:');
  try {
    await seedTransaction(db, { region: 'Jawa Barat, Bandung', proof_status: 'APPROVED', blockchain_status: 'CONFIRMED' });

    const userRes = mockResponse();
    await getRegionalDistribution(
      req(db, { params: { region: 'Jawa Barat' } as any, user: { id: 2, username: 'u', role: 'USER' } } as any),
      userRes.response
    );
    assert.equal(userRes.result.statusCode, 200);
    const userRows = userRes.result.body as any[];
    assert.equal(userRows.length, 1);
    assert.equal('recipient_name' in userRows[0], false);
    assert.equal('donor_name' in userRows[0], false);
    assert.equal('proof_url' in userRows[0], false);

    const amilRes = mockResponse();
    await getRegionalDistribution(
      req(db, { params: { region: 'Jawa Barat' } as any, user: { id: 3, username: 'a', role: 'AMIL' } } as any),
      amilRes.response
    );
    assert.equal(amilRes.result.statusCode, 200);
    const amilRows = amilRes.result.body as any[];
    assert.equal(amilRows.length, 1);
    assert.equal(amilRows[0].recipient_name, 'Budi Santoso');

    // City-specific query matches Bandung cleanly and excludes Bogor
    const bandungRes = mockResponse();
    await getRegionalDistribution(
      req(db, { params: { region: 'Bandung' } as any, user: { id: 2, username: 'u', role: 'USER' } } as any),
      bandungRes.response
    );
    assert.equal((bandungRes.result.body as any[]).length, 1);

    const bogorRes = mockResponse();
    await getRegionalDistribution(
      req(db, { params: { region: 'Jawa Barat, Bogor' } as any, user: { id: 2, username: 'u', role: 'USER' } } as any),
      bogorRes.response
    );
    assert.equal((bogorRes.result.body as any[]).length, 0);
  } finally {
    await db.close();
  }
});

test('Paket 5: dashboard, mustahik, and anomaly scan exclude REJECTED/REVOKED reports; reconcile rejects REJECTED and logs audit', async () => {
  const prevRpc = process.env.BLOCKCHAIN_RPC_URL;
  process.env.BLOCKCHAIN_RPC_URL = 'http://127.0.0.1:1';
  const db = await initDb(':memory:');
  try {
    await db.run("INSERT INTO users (username, password, role) VALUES ('auditor_p5', 'hash', 'AUDITOR')");
    await db.run("INSERT INTO users (username, password, role) VALUES ('admin_p5', 'hash', 'ADMIN')");
    await db.run(
      "INSERT INTO mustahik (full_name, category_asnaf, region, verification_status) VALUES ('Siti Aminah', 'Fakir', 'Jawa Barat, Bandung', 'VERIFIED')"
    );
    await db.run(
      "INSERT INTO donations (amount, payment_reference, status) VALUES (2000000, 'REF-P5', 'CONFIRMED')"
    );

    // 1 confirmed+approved tx (1.000.000), 1 rejected missing-proof tx (200.000), 1 revoked tx (500.000)
    await db.run(
      `INSERT INTO transactions (amount, donor_name, recipient_name, category, region, proof_url, audit_hash, proof_status, blockchain_status, tx_hash, mustahik_id)
       VALUES (1000000, 'Donor', 'Siti Aminah', 'Pendidikan', 'Jawa Barat, Bandung', '/uploads/ok.png', '${'b'.repeat(63)}1', 'APPROVED', 'CONFIRMED', '0xtxok', 1)`
    );
    await db.run(
      `INSERT INTO transactions (amount, donor_name, recipient_name, category, region, proof_url, audit_hash, proof_status, blockchain_status, mustahik_id)
       VALUES (200000, 'Donor', 'Siti Aminah', 'Konsumsi', 'Jawa Barat, Bandung', NULL, '${'b'.repeat(63)}2', 'REJECTED', 'PENDING_BLOCKCHAIN', 1)`
    );
    await db.run(
      `INSERT INTO transactions (amount, donor_name, recipient_name, category, region, proof_url, audit_hash, proof_status, blockchain_status, tx_hash, mustahik_id)
       VALUES (500000, 'Donor', 'Siti Aminah', 'Konsumsi', 'Jawa Barat, Bandung', '/uploads/rev.png', '${'b'.repeat(63)}3', 'REJECTED', 'REVOKED', '0xtxrev', 1)`
    );

    // Dashboard KPIs & categoryDistribution must exclude REJECTED/REVOKED
    const dashRes = mockResponse();
    await getDashboardStats(req(db), dashRes.response);
    assert.equal(dashRes.result.statusCode, 200);
    const dash = dashRes.result.body as any;
    assert.equal(dash.kpis.totalDistributed, 1000000);
    assert.equal(dash.kpis.totalReports, 1);
    assert.equal(dash.kpis.verifiedReports, 1);
    assert.equal(dash.kpis.pendingReports, 0);
    assert.equal(dash.categoryDistribution.length, 1);
    assert.equal(dash.categoryDistribution[0].category, 'Pendidikan');
    assert.equal(dash.categoryDistribution[0].total, 1000000);

    // Mustahik summary must count only non-rejected, non-revoked distributions
    const mustahikRes = mockResponse();
    await listMustahik(req(db), mustahikRes.response);
    const mRows = mustahikRes.result.body as any[];
    assert.equal(mRows.length, 1);
    assert.equal(mRows[0].distribution_count, 1);
    assert.equal(mRows[0].total_received, 1000000);

    // Anomaly scan must not raise MISSING_PROOF on already-REJECTED tx #2
    const scanRes = mockResponse();
    await scanForAnomalies(req(db), scanRes.response);
    assert.equal(scanRes.result.statusCode, 200);
    assert.equal((scanRes.result.body as any).anomaliesFound, 0);

    // Reconcile must reject REJECTED tx #2 (409) and log audit on confirmed tx #1
    const rejReconcileRes = mockResponse();
    await reconcileTransaction(
      req(db, { params: { id: '2' } as any, user: { id: 2, username: 'admin_p5', role: 'ADMIN' } } as any),
      rejReconcileRes.response
    );
    assert.equal(rejReconcileRes.result.statusCode, 409);

    const okReconcileRes = mockResponse();
    await reconcileTransaction(
      req(db, { params: { id: '1' } as any, user: { id: 2, username: 'admin_p5', role: 'ADMIN' } } as any),
      okReconcileRes.response
    );
    assert.equal(okReconcileRes.result.statusCode, 200);

    // Run global reconciliation and verify audit_logs captured both actions
    const runReconRes = mockResponse();
    await performReconciliation(
      req(db, { body: { period: 'Nov 2026' }, user: { id: 2, username: 'admin_p5', role: 'ADMIN' } } as any),
      runReconRes.response
    );
    assert.equal(runReconRes.result.statusCode, 200);

    const logs = await db.all('SELECT action, entity_type FROM audit_logs ORDER BY id ASC');
    assert.deepEqual(
      logs.map((l: any) => l.action),
      ['RECONCILE_TRANSACTION', 'RUN_RECONCILIATION']
    );
  } finally {
    if (prevRpc === undefined) delete process.env.BLOCKCHAIN_RPC_URL;
    else process.env.BLOCKCHAIN_RPC_URL = prevRpc;
    await db.close();
  }
});
