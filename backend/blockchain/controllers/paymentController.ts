import { Request, Response } from 'express';
import crypto from 'node:crypto';
import { PaymentIntentSchema, formatIssues } from '../utils/validation.js';
import { runInTransaction } from '../models/db.js';
import type { AuthRequest } from '../middleware/auth.js';

// Sandbox payment provider. No real QRIS/acquirer call is made.
const QRIS_SANDBOX_CONFIG = {
  provider: 'ZakatChain-Sandbox-Pay',
  version: '1.0',
  merchantId: 'MCH-ZAKAT-001',
  sessionTtlMinutes: 15,
};

const isoFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

/**
 * Normalises the internal payment state to the vocabulary the frontend reads.
 * PENDING -> PENDING, CONFIRMED/PAID -> PAID, FAILED -> FAILED, expired window -> EXPIRED.
 */
const toClientStatus = (status: string, expiresAt: string | null): 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED' => {
  const normalized = String(status || 'PENDING').toUpperCase();
  if (normalized === 'CONFIRMED' || normalized === 'PAID' || normalized === 'SUCCESS') return 'PAID';
  if (normalized === 'FAILED') return 'FAILED';
  if (normalized === 'EXPIRED') return 'EXPIRED';
  if (expiresAt && Date.parse(expiresAt) < Date.now()) return 'EXPIRED';
  return 'PENDING';
};

const buildSessionPayload = (input: {
  sessionId: string;
  amount: number;
  expiresAt: string;
}) => {
  const qrisPayload = `https://qris.sandbox.id/pay/${input.sessionId}`;
  return {
    session_id: input.sessionId,
    paymentId: input.sessionId,
    // Both keys are returned so DonationPayment.tsx (`qris_url`) and
    // PaymentModal.tsx (`qrCodeUrl`) keep working unchanged.
    qris_url: qrisPayload,
    qrCodeUrl: qrisPayload,
    qris_payload: qrisPayload,
    amount: input.amount,
    expires_at: input.expiresAt,
    expiry: `${QRIS_SANDBOX_CONFIG.sessionTtlMinutes}m`,
    provider: QRIS_SANDBOX_CONFIG.provider,
  };
};

const generateSessionId = () =>
  `ZCK-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

/**
 * Creates a payment session.
 *
 * Backs POST /api/payments/session (DonationPayment.tsx) and
 * POST /api/payments/create (PaymentModal.tsx). When `campaign_id` is supplied
 * it also records a PENDING donation, preserving the behaviour of
 * POST /api/payments/generate.
 */
export const createPaymentSession = async (req: Request, res: Response) => {
  const { db } = req;

  const parsed = PaymentIntentSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: formatIssues(parsed.error) });
  }
  const { amount, donor_name, campaign_id, program_id } = parsed.data;
  const donorId = (req as AuthRequest).user?.id ?? null;

  try {
    if (campaign_id !== undefined) {
      const campaign = await (db as any).get('SELECT id, status FROM campaigns WHERE id = ?', [campaign_id]);
      if (!campaign || campaign.status !== 'ACTIVE') {
        return res.status(404).json({ error: 'Active campaign not found' });
      }
    }

    const sessionId = generateSessionId();
    const expiresAt = isoFromNow(QRIS_SANDBOX_CONFIG.sessionTtlMinutes);

    const result = await runInTransaction(db as any, async () => {
      const inserted = await (db as any).run(
        `INSERT INTO payments (payment_session_id, donor_name, amount, program_id, status, expires_at)
         VALUES (?, ?, ?, ?, 'PENDING', ?)`,
        [sessionId, donor_name ?? null, amount, program_id ?? (campaign_id !== undefined ? String(campaign_id) : null), expiresAt]
      );

      let donationId: number | null = null;
      if (campaign_id !== undefined) {
        const donation = await (db as any).run(
          'INSERT INTO donations (campaign_id, donor_id, amount, payment_reference, status) VALUES (?, ?, ?, ?, ?)',
          [campaign_id, donorId, amount, sessionId, 'PENDING']
        );
        donationId = donation.lastID as number;
      }

      await (db as any).run(
        'INSERT INTO payment_events (donation_id, event_type, payload) VALUES (?, ?, ?)',
        [donationId, 'INTENT_CREATED', JSON.stringify({ sessionId, amount })]
      );

      return { paymentId: inserted.lastID as number, donationId };
    });

    res.status(201).json({
      status: 'SUCCESS',
      paymentData: buildSessionPayload({ sessionId, amount, expiresAt }),
      donationId: result.donationId,
      ...buildSessionPayload({ sessionId, amount, expiresAt }),
    });
  } catch (error: any) {
    console.error('[PAYMENT SESSION ERROR]', error?.message);
    res.status(500).json({ error: 'Payment generation failed' });
  }
};

/**
 * Reads a payment session. Backs GET /api/payments/status/:sessionId and
 * GET /api/payments/verify/:paymentId.
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
  const { db } = req;
  const sessionId = req.params.sessionId ?? req.params.paymentId;

  if (!sessionId || Array.isArray(sessionId) || sessionId.length > 120) {
    return res.status(400).json({ error: 'A valid payment session ID is required' });
  }

  try {
    const payment = await (db as any).get(
      'SELECT payment_session_id, donor_name, amount, program_id, status, expires_at FROM payments WHERE payment_session_id = ?',
      [sessionId]
    );
    if (!payment) {
      return res.status(404).json({ error: 'Payment session not found' });
    }

    let status = payment.status;
    if (status === 'PENDING' && payment.expires_at && Date.parse(payment.expires_at) < Date.now()) {
      // Persist the expiry so a later webhook cannot revive a dead session.
      await (db as any).run(
        "UPDATE payments SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE payment_session_id = ? AND status = 'PENDING'",
        [sessionId]
      );
      status = 'EXPIRED';
    }

    res.json({
      session_id: payment.payment_session_id,
      paymentId: payment.payment_session_id,
      amount: payment.amount,
      program_id: payment.program_id,
      expires_at: payment.expires_at,
      status: toClientStatus(status, payment.expires_at),
      raw_status: status,
    });
  } catch (error: any) {
    console.error('[PAYMENT STATUS ERROR]', error?.message);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
};

/**
 * Provider webhook.
 *
 * The provider event id (`provider_tx_id`) is the idempotency key: a duplicate
 * delivery of the same event is acknowledged with ALREADY_PROCESSED and never
 * applied twice. Both the session and any linked donation are updated inside a
 * single IMMEDIATE transaction.
 */
export const handlePaymentWebhook = async (req: Request, res: Response) => {
  const { db } = req;
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'Payment webhook is not configured' });

  const signatureHeader = req.get('x-payment-signature') || '';
  const signature = signatureHeader.replace(/^sha256=/i, '');
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody || !/^[a-f0-9]{64}$/i.test(signature)) {
    return res.status(401).json({ error: 'Valid payment signature is required' });
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  const supplied = Buffer.from(signature, 'hex');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).json({ error: 'Invalid payment signature' });
  }

  const body = req.body ?? {};
  const donationId = body.donation_id === undefined ? null : Number(body.donation_id);
  const sessionId = typeof body.session_id === 'string' ? body.session_id : (typeof body.payment_session_id === 'string' ? body.payment_session_id : null);
  const status = body.status;
  const providerTxId = body.provider_tx_id;

  if ((donationId !== null && (!Number.isSafeInteger(donationId) || donationId < 1)) ||
      (donationId === null && !sessionId) ||
      !['SUCCESS', 'FAILED'].includes(status) ||
      typeof providerTxId !== 'string' || providerTxId.trim().length < 1 || providerTxId.length > 200) {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  try {
    const outcome = await runInTransaction(db as any, async () => {
      const existingEvent = await (db as any).get(
        'SELECT id FROM payment_events WHERE provider_tx_id = ?',
        [providerTxId]
      );
      if (existingEvent) return { code: 200, body: { status: 'ALREADY_PROCESSED' } };

      let donation: any = null;
      if (donationId !== null) {
        donation = await (db as any).get('SELECT id, status FROM donations WHERE id = ?', [donationId]);
        if (!donation) return { code: 404, body: { error: 'Donation not found' } };
        if (donation.status !== 'PENDING') {
          return { code: 409, body: { error: 'Donation has already reached a terminal status' } };
        }
      }

      let payment: any = null;
      if (sessionId) {
        payment = await (db as any).get(
          'SELECT payment_session_id, status, expires_at FROM payments WHERE payment_session_id = ?',
          [sessionId]
        );
        if (!payment) return { code: 404, body: { error: 'Payment session not found' } };
        // A late webhook must not resurrect an expired session.
        if (payment.status !== 'PENDING') {
          return { code: 409, body: { error: 'Payment session has already reached a terminal status' } };
        }
        if (payment.expires_at && Date.parse(payment.expires_at) < Date.now()) {
          await (db as any).run(
            "UPDATE payments SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE payment_session_id = ?",
            [sessionId]
          );
          return { code: 409, body: { error: 'Payment session has expired' } };
        }
      }

      await (db as any).run(
        'INSERT INTO payment_events (donation_id, provider_tx_id, event_type, payload) VALUES (?, ?, ?, ?)',
        [donation?.id ?? null, providerTxId, status, JSON.stringify({ session_id: sessionId, status })]
      );

      const nextDonationStatus = status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';
      if (donation) {
        await (db as any).run('UPDATE donations SET status = ? WHERE id = ?', [nextDonationStatus, donation.id]);
      }

      const nextPaymentStatus = status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';
      if (payment) {
        await (db as any).run(
          `UPDATE payments SET status = ?, provider_tx_id = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_session_id = ?`,
          [nextPaymentStatus, providerTxId, sessionId]
        );
      }

      return { code: 200, body: { status: 'EVENT_PROCESSED' } };
    });

    res.status(outcome.code).json(outcome.body);
  } catch (error: any) {
    console.error('[PAYMENT WEBHOOK ERROR]', error?.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
