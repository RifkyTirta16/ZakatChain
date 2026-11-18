import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import type { Request, Response } from 'express';
import { initDb } from '../models/db.js';
import { handlePaymentWebhook, createPaymentSession, getPaymentStatus } from '../controllers/paymentController.js';

function mockResponse() {
  const result: { statusCode: number; body: unknown } = { statusCode: 200, body: undefined };
  const response = {
    status(code: number) { result.statusCode = code; return response; },
    json(body: unknown) { result.body = body; return response; }
  };
  return { response: response as unknown as Response, result };
}

function signedRequest(payload: object, secret: string, db: Awaited<ReturnType<typeof initDb>>, signatureOverride?: string) {
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = signatureOverride ?? crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return {
    body: payload,
    db,
    rawBody,
    get(name: string) { return name.toLowerCase() === 'x-payment-signature' ? signature : undefined; }
  } as unknown as Request;
}

const withSecret = async (secret: string, run: () => Promise<void>) => {
  const oldSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  process.env.PAYMENT_WEBHOOK_SECRET = secret;
  try {
    await run();
  } finally {
    if (oldSecret === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
    else process.env.PAYMENT_WEBHOOK_SECRET = oldSecret;
  }
};

test('payment webhook verifies signature and processes each provider event once', async () => {
  const secret = 'test-only-webhook-secret';
  await withSecret(secret, async () => {
    const db = await initDb(':memory:');
    try {
      await db.run("INSERT INTO campaigns (title, target_amount) VALUES ('Test', 1000)");
      const inserted = await db.run("INSERT INTO donations (campaign_id, amount, status) VALUES (1, 100, 'PENDING')");
      const payload = { donation_id: inserted.lastID, status: 'SUCCESS', provider_tx_id: 'provider-1' };

      const firstResponse = mockResponse();
      await handlePaymentWebhook(signedRequest(payload, secret, db), firstResponse.response);
      assert.equal(firstResponse.result.statusCode, 200, JSON.stringify(firstResponse.result.body));
      assert.deepEqual(firstResponse.result.body, { status: 'EVENT_PROCESSED' });
      assert.equal((await db.get('SELECT status FROM donations WHERE id = ?', [inserted.lastID])).status, 'CONFIRMED');
      assert.equal((await db.get('SELECT COUNT(*) as count FROM payment_events')).count, 1);

      const repeatedResponse = mockResponse();
      await handlePaymentWebhook(signedRequest(payload, secret, db), repeatedResponse.response);
      assert.deepEqual(repeatedResponse.result.body, { status: 'ALREADY_PROCESSED' });
      assert.equal((await db.get('SELECT COUNT(*) as count FROM payment_events')).count, 1);

      const invalidResponse = mockResponse();
      await handlePaymentWebhook(signedRequest({ ...payload, provider_tx_id: 'provider-2' }, secret, db, '0'.repeat(64)), invalidResponse.response);
      assert.equal(invalidResponse.result.statusCode, 401);
      assert.equal((await db.get('SELECT COUNT(*) as count FROM payment_events')).count, 1);
    } finally {
      await db.close();
    }
  });
});

test('payment webhook rejects a missing signature and an unsigned body', async () => {
  const secret = 'test-only-webhook-secret';
  await withSecret(secret, async () => {
    const db = await initDb(':memory:');
    try {
      const nosig = { body: {}, db, rawBody: Buffer.from('{}'), get: () => undefined } as unknown as Request;
      const response = mockResponse();
      await handlePaymentWebhook(nosig, response.response);
      assert.equal(response.result.statusCode, 401);

      const noRawBody = { body: {}, db, get: () => 'a'.repeat(64) } as unknown as Request;
      const response2 = mockResponse();
      await handlePaymentWebhook(noRawBody, response2.response);
      assert.equal(response2.result.statusCode, 401);
    } finally {
      await db.close();
    }
  });
});

test('payment webhook rejects an invalid payload shape after signature verification', async () => {
  const secret = 'test-only-webhook-secret';
  await withSecret(secret, async () => {
    const db = await initDb(':memory:');
    try {
      for (const payload of [
        { donation_id: 1, status: 'MAYBE', provider_tx_id: 'x' },
        { donation_id: 1, status: 'SUCCESS', provider_tx_id: '' },
        { donation_id: -1, status: 'SUCCESS', provider_tx_id: 'x' },
      ]) {
        const response = mockResponse();
        await handlePaymentWebhook(signedRequest(payload, secret, db), response.response);
        assert.equal(response.result.statusCode, 400, JSON.stringify(payload));
      }
    } finally {
      await db.close();
    }
  });
});

test('payment webhook does not revive a donation that already reached a terminal status', async () => {
  const secret = 'test-only-webhook-secret';
  await withSecret(secret, async () => {
    const db = await initDb(':memory:');
    try {
      await db.run("INSERT INTO campaigns (title, target_amount) VALUES ('Test', 1000)");
      await db.run("INSERT INTO donations (campaign_id, amount, status) VALUES (1, 100, 'FAILED')");
      const response = mockResponse();
      await handlePaymentWebhook(
        signedRequest({ donation_id: 1, status: 'SUCCESS', provider_tx_id: 'later-1' }, secret, db),
        response.response
      );
      assert.equal(response.result.statusCode, 409);
      assert.equal((await db.get('SELECT status FROM donations WHERE id = 1')).status, 'FAILED');
      assert.equal((await db.get('SELECT COUNT(*) as count FROM payment_events')).count, 0);
    } finally {
      await db.close();
    }
  });
});

function jsonRequest(body: unknown, db: Awaited<ReturnType<typeof initDb>>, params: Record<string, string> = {}) {
  return { body, db, params } as unknown as Request;
}

test('payment session creation returns the fields both frontend clients read', async () => {
  const db = await initDb(':memory:');
  try {
    await db.run("INSERT INTO campaigns (title, target_amount, status) VALUES ('Banjir', 1000, 'ACTIVE')");
    const response = mockResponse();
    await createPaymentSession(jsonRequest({ campaign_id: 1, amount: 250000, donor_name: 'Ani' }, db), response.response);

    assert.equal(response.result.statusCode, 201, JSON.stringify(response.result.body));
    const body = response.result.body as any;
    // DonationPayment.tsx reads session_id/qris_url/expires_at; PaymentModal.tsx reads qrCodeUrl/paymentId.
    for (const key of ['session_id', 'paymentId', 'qris_url', 'qrCodeUrl', 'amount', 'expires_at']) {
      assert.ok(body[key] !== undefined, `response must include ${key}`);
    }
    assert.equal(body.amount, 250000);
    assert.equal((await db.get('SELECT status FROM donations WHERE campaign_id = 1')).status, 'PENDING');
    assert.equal((await db.get('SELECT status FROM payments')).status, 'PENDING');
  } finally {
    await db.close();
  }
});

test('payment session creation rejects an inactive or unknown campaign', async () => {
  const db = await initDb(':memory:');
  try {
    await db.run("INSERT INTO campaigns (title, target_amount, status) VALUES ('Closed', 1000, 'CLOSED')");
    for (const campaignId of [1, 999]) {
      const response = mockResponse();
      await createPaymentSession(jsonRequest({ campaign_id: campaignId, amount: 1000 }, db), response.response);
      assert.equal(response.result.statusCode, 404, `campaign ${campaignId}`);
    }
    const badAmount = mockResponse();
    await createPaymentSession(jsonRequest({ campaign_id: 1, amount: -5 }, db), badAmount.response);
    assert.equal(badAmount.result.statusCode, 400);
  } finally {
    await db.close();
  }
});

test('payment status maps internal states to the client vocabulary', async () => {
  const db = await initDb(':memory:');
  try {
    await db.run(
      "INSERT INTO payments (payment_session_id, amount, status, expires_at) VALUES ('ZCK-1', 1000, 'CONFIRMED', '2099-01-01T00:00:00.000Z')"
    );
    await db.run(
      "INSERT INTO payments (payment_session_id, amount, status, expires_at) VALUES ('ZCK-2', 1000, 'PENDING', '2099-01-01T00:00:00.000Z')"
    );
    await db.run(
      "INSERT INTO payments (payment_session_id, amount, status, expires_at) VALUES ('ZCK-3', 1000, 'PENDING', '2000-01-01T00:00:00.000Z')"
    );

    const confirmed = mockResponse();
    await getPaymentStatus(jsonRequest({}, db, { sessionId: 'ZCK-1' }), confirmed.response);
    assert.equal((confirmed.result.body as any).status, 'PAID');

    const pending = mockResponse();
    await getPaymentStatus(jsonRequest({}, db, { sessionId: 'ZCK-2' }), pending.response);
    assert.equal((pending.result.body as any).status, 'PENDING');

    const expired = mockResponse();
    await getPaymentStatus(jsonRequest({}, db, { sessionId: 'ZCK-3' }), expired.response);
    assert.equal((expired.result.body as any).status, 'EXPIRED');
    assert.equal((await db.get("SELECT status FROM payments WHERE payment_session_id = 'ZCK-3'")).status, 'EXPIRED');

    const missing = mockResponse();
    await getPaymentStatus(jsonRequest({}, db, { sessionId: 'NOPE' }), missing.response);
    assert.equal(missing.result.statusCode, 404);
  } finally {
    await db.close();
  }
});

test('webhook marks the matching payment session and its donation in one commit', async () => {
  const secret = 'test-only-webhook-secret';
  await withSecret(secret, async () => {
    const db = await initDb(':memory:');
    try {
      await db.run(
        "INSERT INTO payments (payment_session_id, amount, status, expires_at) VALUES ('ZCK-PAY', 1000, 'PENDING', '2099-01-01T00:00:00.000Z')"
      );
      await db.run("INSERT INTO campaigns (title, target_amount) VALUES ('X', 1000)");
      await db.run("INSERT INTO donations (campaign_id, amount, payment_reference, status) VALUES (1, 1000, 'ZCK-PAY', 'PENDING')");

      const response = mockResponse();
      await handlePaymentWebhook(
        signedRequest({ session_id: 'ZCK-PAY', donation_id: 1, status: 'SUCCESS', provider_tx_id: 'prov-9' }, secret, db),
        response.response
      );
      assert.deepEqual(response.result.body, { status: 'EVENT_PROCESSED' });
      assert.equal((await db.get("SELECT status FROM payments WHERE payment_session_id = 'ZCK-PAY'")).status, 'CONFIRMED');
      assert.equal((await db.get('SELECT status FROM donations WHERE id = 1')).status, 'CONFIRMED');
    } finally {
      await db.close();
    }
  });
});

test('webhook refuses to resolve an expired payment session', async () => {
  const secret = 'test-only-webhook-secret';
  await withSecret(secret, async () => {
    const db = await initDb(':memory:');
    try {
      await db.run(
        "INSERT INTO payments (payment_session_id, amount, status, expires_at) VALUES ('ZCK-OLD', 1000, 'PENDING', '2000-01-01T00:00:00.000Z')"
      );
      const response = mockResponse();
      await handlePaymentWebhook(
        signedRequest({ session_id: 'ZCK-OLD', status: 'SUCCESS', provider_tx_id: 'late-1' }, secret, db),
        response.response
      );
      assert.equal(response.result.statusCode, 409);
      assert.equal((await db.get('SELECT COUNT(*) as count FROM payment_events')).count, 0);
    } finally {
      await db.close();
    }
  });
});
