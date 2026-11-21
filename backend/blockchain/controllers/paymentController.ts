import { Request, Response } from 'express';
import crypto from 'node:crypto';
import os from 'node:os';
import { PaymentIntentSchema, formatIssues } from '../utils/validation.js';
import { runInTransaction } from '../models/db.js';
import {
  createDokuQrisCheckout,
  fetchDokuOrderStatus,
  getDokuConfig,
  isDokuConfigured,
  verifyDokuNotificationSignature,
} from '../utils/doku.js';
import type { AuthRequest } from '../middleware/auth.js';

// Sandbox payment provider. No real QRIS/acquirer call is made.
const QRIS_SANDBOX_CONFIG = {
  provider: 'ZakatChain-Sandbox-Pay',
  version: '1.0',
  merchantId: 'MCH-ZAKAT-001',
  sessionTtlMinutes: 15,
};

const isoFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

const getSandboxSigningKey = () =>
  process.env.PAYMENT_WEBHOOK_SECRET || process.env.JWT_SECRET || 'zakatchain-local-sandbox-key';

export const signSandboxSessionToken = (sessionId: string): string =>
  crypto.createHmac('sha256', getSandboxSigningKey()).update(sessionId).digest('hex').slice(0, 24);

const verifySandboxSessionToken = (sessionId: string, token: string | undefined): boolean => {
  if (!token || typeof token !== 'string') return false;
  const expected = signSandboxSessionToken(sessionId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const resolveFrontendOrigin = (req: Request): string => {
  const configured = process.env.PUBLIC_FRONTEND_URL?.trim();
  if (configured && /^https?:\/\/[^/\s]+$/.test(configured)) {
    return configured.replace(/\/$/, '');
  }
  const rawOrigin = typeof req.get === 'function' ? req.get('origin') : req.headers?.origin;
  const originHeader = Array.isArray(rawOrigin) ? rawOrigin[0]?.trim() : rawOrigin?.trim();
  if (originHeader && /^https?:\/\/[^/\s]+$/.test(originHeader)) {
    return originHeader.replace(/\/$/, '');
  }
  return 'http://localhost:5173';
};

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

const getFirstLanIpv4 = (): string | null => {
  const nets = os.networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const addr of iface ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return null;
};

const buildSessionPayload = (input: {
  sessionId: string;
  amount: number;
  expiresAt: string;
  frontendOrigin: string;
  dokuCheckoutUrl?: string | undefined;
}) => {
  const isProd = process.env.NODE_ENV === 'production';
  const token = signSandboxSessionToken(input.sessionId);
  const localSandboxUrl = `${input.frontendOrigin}/sandbox/pay/${input.sessionId}?t=${token}`;
  const qrisPayload = input.dokuCheckoutUrl
    ? input.dokuCheckoutUrl
    : isProd
      ? `https://qris.sandbox.id/pay/${input.sessionId}`
      : localSandboxUrl;

  let lanQrisUrl: string | undefined;
  if (!isProd && process.env.NODE_ENV !== 'test') {
    if (/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(input.frontendOrigin)) {
      const lanIp = getFirstLanIpv4();
      if (lanIp) {
        const portMatch = input.frontendOrigin.match(/:(\d+)$/);
        const portSuffix = portMatch ? `:${portMatch[1]}` : ':5173';
        lanQrisUrl = `http://${lanIp}${portSuffix}/sandbox/pay/${input.sessionId}?t=${token}`;
      }
    } else if (input.dokuCheckoutUrl) {
      lanQrisUrl = localSandboxUrl;
    }
  }

  return {
    session_id: input.sessionId,
    paymentId: input.sessionId,
    // Both keys are returned so DonationPayment.tsx (`qris_url`) and
    // PaymentModal.tsx (`qrCodeUrl`) keep working unchanged.
    qris_url: qrisPayload,
    qrCodeUrl: qrisPayload,
    qris_payload: qrisPayload,
    ...(input.dokuCheckoutUrl ? { doku_checkout_url: input.dokuCheckoutUrl } : {}),
    ...(lanQrisUrl ? { lan_qris_url: lanQrisUrl } : {}),
    amount: input.amount,
    expires_at: input.expiresAt,
    expiry: `${QRIS_SANDBOX_CONFIG.sessionTtlMinutes}m`,
    provider: input.dokuCheckoutUrl ? 'DOKU-Checkout-Sandbox' : QRIS_SANDBOX_CONFIG.provider,
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

      // Always record a linked donation row (campaign_id is nullable for Zakat Umum)
      // so all confirmed payments appear in MyDonations and platform donation totals.
      const donation = await (db as any).run(
        'INSERT INTO donations (campaign_id, donor_id, amount, payment_reference, status) VALUES (?, ?, ?, ?, ?)',
        [campaign_id ?? null, donorId, amount, sessionId, 'PENDING']
      );
      const donationId = donation.lastID as number;

      await (db as any).run(
        'INSERT INTO payment_events (donation_id, event_type, payload) VALUES (?, ?, ?)',
        [donationId, 'INTENT_CREATED', JSON.stringify({ sessionId, amount })]
      );

      return { paymentId: inserted.lastID as number, donationId };
    });

    const frontendOrigin = resolveFrontendOrigin(req);
    let dokuCheckoutUrl: string | undefined;
    if (isDokuConfigured() && process.env.NODE_ENV !== 'test') {
      try {
        const dokuRes = await createDokuQrisCheckout({
          invoiceNumber: sessionId,
          amount,
          callbackUrl: `${frontendOrigin}/donate`,
          customerName: donor_name ?? undefined,
          dueMinutes: QRIS_SANDBOX_CONFIG.sessionTtlMinutes,
        });
        dokuCheckoutUrl = dokuRes.checkoutUrl;
        await (db as any).run(
          'UPDATE payments SET provider_tx_id = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_session_id = ?',
          [`DOKU-SESSION:${dokuRes.tokenId}`, sessionId]
        );
        await (db as any).run(
          'INSERT INTO payment_events (donation_id, event_type, payload) VALUES (?, ?, ?)',
          [result.donationId, 'DOKU_CHECKOUT_CREATED', JSON.stringify({ sessionId, tokenId: dokuRes.tokenId })]
        );
      } catch (dokuErr: any) {
        console.warn('[DOKU CHECKOUT FALLBACK]', dokuErr?.message || 'DOKU sandbox unreachable');
      }
    }

    const sessionPayload = buildSessionPayload({
      sessionId,
      amount,
      expiresAt,
      frontendOrigin,
      dokuCheckoutUrl,
    });

    res.status(201).json({
      status: 'SUCCESS',
      paymentData: sessionPayload,
      donationId: result.donationId,
      ...sessionPayload,
    });
  } catch (error: any) {
    console.error('[PAYMENT SESSION ERROR]', error?.message);
    res.status(500).json({ error: 'Payment generation failed' });
  }
};

/**
 * Reads a payment session. Backs GET /api/payments/status/:sessionId and
 * GET /api/payments/verify/:paymentId. When backed by DOKU Checkout, polls DOKU
 * Order Status so localhost demos without a public webhook URL still settle automatically.
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
  const { db } = req;
  const sessionId = req.params.sessionId ?? req.params.paymentId;

  if (!sessionId || Array.isArray(sessionId) || sessionId.length > 120) {
    return res.status(400).json({ error: 'A valid payment session ID is required' });
  }

  try {
    const payment = await (db as any).get(
      'SELECT payment_session_id, donor_name, amount, program_id, status, provider_tx_id, expires_at FROM payments WHERE payment_session_id = ?',
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
    } else if (
      status === 'PENDING' &&
      isDokuConfigured() &&
      process.env.NODE_ENV !== 'test' &&
      typeof payment.provider_tx_id === 'string' &&
      payment.provider_tx_id.startsWith('DOKU-SESSION:')
    ) {
      try {
        const dokuStatus = await fetchDokuOrderStatus(sessionId);
        if (dokuStatus.status === 'PAID') {
          const settled = await applyProviderSettlement(db, {
            sessionId,
            status: 'SUCCESS',
            providerTxId: `DOKU-${dokuStatus.originalRequestId || sessionId}`,
            eventType: 'DOKU_STATUS_PAID',
          });
          if (settled.code === 200) status = 'CONFIRMED';
        } else if (dokuStatus.status === 'FAILED') {
          const settled = await applyProviderSettlement(db, {
            sessionId,
            status: 'FAILED',
            providerTxId: `DOKU-FAIL-${dokuStatus.originalRequestId || sessionId}`,
            eventType: 'DOKU_STATUS_FAILED',
          });
          if (settled.code === 200) status = 'FAILED';
        } else if (dokuStatus.status === 'EXPIRED') {
          await (db as any).run(
            "UPDATE payments SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE payment_session_id = ? AND status = 'PENDING'",
            [sessionId]
          );
          status = 'EXPIRED';
        }
      } catch (syncErr: any) {
        console.warn('[DOKU STATUS SYNC]', syncErr?.message || 'Status lookup skipped');
      }
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

interface ProviderSettlementInput {
  donationId?: number | null;
  sessionId?: string | null;
  status: 'SUCCESS' | 'FAILED';
  providerTxId: string;
  eventType?: string;
}

const applyProviderSettlement = async (db: any, opts: ProviderSettlementInput) =>
  runInTransaction(db, async () => {
    const existingEvent = await db.get(
      'SELECT id FROM payment_events WHERE provider_tx_id = ?',
      [opts.providerTxId]
    );
    if (existingEvent) return { code: 200, body: { status: 'ALREADY_PROCESSED' } };

    let donation: any = null;
    if (opts.donationId !== undefined && opts.donationId !== null) {
      donation = await db.get(
        'SELECT id, campaign_id, amount, status FROM donations WHERE id = ?',
        [opts.donationId]
      );
      if (!donation) return { code: 404, body: { error: 'Donation not found' } };
      if (donation.status !== 'PENDING') {
        return { code: 409, body: { error: 'Donation has already reached a terminal status' } };
      }
    } else if (opts.sessionId) {
      donation = await db.get(
        'SELECT id, campaign_id, amount, status FROM donations WHERE payment_reference = ?',
        [opts.sessionId]
      );
      if (donation && donation.status !== 'PENDING') {
        return { code: 409, body: { error: 'Donation has already reached a terminal status' } };
      }
    }

    let payment: any = null;
    if (opts.sessionId) {
      payment = await db.get(
        'SELECT payment_session_id, status, expires_at FROM payments WHERE payment_session_id = ?',
        [opts.sessionId]
      );
      if (!payment) return { code: 404, body: { error: 'Payment session not found' } };
      // A late webhook must not resurrect an expired session.
      if (payment.status !== 'PENDING') {
        return { code: 409, body: { error: 'Payment session has already reached a terminal status' } };
      }
      if (payment.expires_at && Date.parse(payment.expires_at) < Date.now()) {
        await db.run(
          "UPDATE payments SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE payment_session_id = ?",
          [opts.sessionId]
        );
        return { code: 409, body: { error: 'Payment session has expired' } };
      }
    }

    await db.run(
      'INSERT INTO payment_events (donation_id, provider_tx_id, event_type, payload) VALUES (?, ?, ?, ?)',
      [
        donation?.id ?? null,
        opts.providerTxId,
        opts.eventType ?? opts.status,
        JSON.stringify({ session_id: opts.sessionId ?? null, status: opts.status }),
      ]
    );

    const nextDonationStatus = opts.status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';
    if (donation) {
      await db.run('UPDATE donations SET status = ? WHERE id = ?', [nextDonationStatus, donation.id]);
      if (nextDonationStatus === 'CONFIRMED' && donation.campaign_id) {
        await db.run(
          'UPDATE campaigns SET current_amount = COALESCE(current_amount, 0) + ? WHERE id = ?',
          [Number(donation.amount) || 0, donation.campaign_id]
        );
      }
    }

    const nextPaymentStatus = opts.status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';
    if (payment && opts.sessionId) {
      await db.run(
        `UPDATE payments SET status = ?, provider_tx_id = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_session_id = ?`,
        [nextPaymentStatus, opts.providerTxId, opts.sessionId]
      );
    }

    return { code: 200, body: { status: 'EVENT_PROCESSED' } };
  });

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
    const outcome = await applyProviderSettlement(db, {
      donationId,
      sessionId,
      status,
      providerTxId,
    });
    res.status(outcome.code).json(outcome.body);
  } catch (error: any) {
    console.error('[PAYMENT WEBHOOK ERROR]', error?.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * DOKU HTTP Notification handler (POST /api/payments/doku/notify).
 * Verifies DOKU HMACSHA256 signature over raw request body and components.
 */
export const handleDokuNotification = async (req: Request, res: Response) => {
  const { db } = req;
  const cfg = getDokuConfig();
  if (!cfg.secretKey) {
    return res.status(503).json({ error: 'DOKU webhook is not configured' });
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  const requestTarget = (req.originalUrl || '/api/payments/doku/notify').split('?')[0] ?? '/api/payments/doku/notify';
  const validSig =
    rawBody &&
    verifyDokuNotificationSignature({
      clientIdHeader: req.get('client-id') || '',
      requestIdHeader: req.get('request-id') || '',
      timestampHeader: req.get('request-timestamp') || '',
      signatureHeader: req.get('signature') || '',
      requestTarget,
      rawBody,
      secretKey: cfg.secretKey,
      expectedClientId: cfg.clientId || undefined,
    });

  if (!validSig) {
    return res.status(401).json({ error: 'Invalid DOKU signature' });
  }

  const body = req.body ?? {};
  const invoiceNumber = typeof body?.order?.invoice_number === 'string' ? body.order.invoice_number.trim() : '';
  const txStatus = String(body?.transaction?.status || '').toUpperCase();
  const providerTxId =
    typeof body?.transaction?.original_request_id === 'string' && body.transaction.original_request_id.trim()
      ? `DOKU-${body.transaction.original_request_id.trim()}`
      : invoiceNumber
        ? `DOKU-NOTIFY-${invoiceNumber}-${txStatus}`
        : '';

  if (!invoiceNumber || !providerTxId) {
    return res.status(400).json({ error: 'Invalid DOKU notification payload' });
  }
  if (txStatus === 'PENDING') {
    return res.status(200).json({ status: 'IGNORED_PENDING' });
  }
  if (!['SUCCESS', 'PAID', 'FAILED', 'EXPIRED'].includes(txStatus)) {
    return res.status(400).json({ error: 'Unsupported DOKU transaction status' });
  }

  try {
    const mappedStatus: 'SUCCESS' | 'FAILED' = txStatus === 'SUCCESS' || txStatus === 'PAID' ? 'SUCCESS' : 'FAILED';
    const outcome = await applyProviderSettlement(db, {
      sessionId: invoiceNumber,
      status: mappedStatus,
      providerTxId,
      eventType: `DOKU_NOTIFY_${txStatus}`,
    });
    res.status(outcome.code).json(outcome.body);
  } catch (error: any) {
    console.error('[DOKU WEBHOOK ERROR]', error?.message);
    res.status(500).json({ error: 'DOKU webhook processing failed' });
  }
};

interface SandboxConfirmOptions {
  sessionId: string;
  providerPrefix: string;
  eventType: string;
  requester?: AuthRequest['user'];
  idempotentPaid?: boolean;
}

const confirmSandboxSession = async (db: any, opts: SandboxConfirmOptions) =>
  runInTransaction(db, async () => {
    const payment = await db.get(
      'SELECT payment_session_id, amount, status, expires_at FROM payments WHERE payment_session_id = ?',
      [opts.sessionId]
    );
    if (!payment) return { code: 404, body: { error: 'Payment session not found' } };
    if (opts.idempotentPaid && (payment.status === 'CONFIRMED' || payment.status === 'PAID')) {
      return { code: 200, body: { status: 'PAID', session_id: opts.sessionId, already_confirmed: true } };
    }
    if (payment.status !== 'PENDING') {
      return { code: 409, body: { error: 'Payment session is no longer pending' } };
    }
    if (payment.expires_at && Date.parse(payment.expires_at) < Date.now()) {
      await db.run(
        "UPDATE payments SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE payment_session_id = ?",
        [opts.sessionId]
      );
      return { code: 409, body: { error: 'Payment session has expired' } };
    }

    const donation = await db.get(
      'SELECT id, donor_id, campaign_id, amount, status FROM donations WHERE payment_reference = ?',
      [opts.sessionId]
    );
    if (
      opts.requester &&
      donation &&
      donation.donor_id !== null &&
      opts.requester.role !== 'ADMIN' &&
      donation.donor_id !== opts.requester.id
    ) {
      return { code: 403, body: { error: 'Insufficient permissions' } };
    }

    const providerTxId = `${opts.providerPrefix}-${opts.sessionId}`;
    await db.run(
      `UPDATE payments SET status = 'CONFIRMED', provider_tx_id = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_session_id = ?`,
      [providerTxId, opts.sessionId]
    );
    if (donation && donation.status === 'PENDING') {
      await db.run("UPDATE donations SET status = 'CONFIRMED' WHERE id = ?", [donation.id]);
      if (donation.campaign_id) {
        await db.run(
          'UPDATE campaigns SET current_amount = COALESCE(current_amount, 0) + ? WHERE id = ?',
          [Number(donation.amount) || 0, donation.campaign_id]
        );
      }
    }
    await db.run(
      'INSERT INTO payment_events (donation_id, provider_tx_id, event_type, payload) VALUES (?, ?, ?, ?)',
      [donation?.id ?? null, providerTxId, opts.eventType, JSON.stringify({ session_id: opts.sessionId })]
    );

    return { code: 200, body: { status: 'PAID', session_id: opts.sessionId, provider_tx_id: providerTxId } };
  });

/**
 * Local development / demo sandbox helper to mark an active PENDING session as PAID.
 * Strictly disabled in production.
 */
export const sandboxConfirmPayment = async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Sandbox confirmation is disabled in production' });
  }
  const { db } = req;
  const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId : '';
  if (!sessionId || sessionId.length > 120) {
    return res.status(400).json({ error: 'A valid payment session ID is required' });
  }

  try {
    const outcome = await confirmSandboxSession(db as any, {
      sessionId,
      providerPrefix: 'SANDBOX',
      eventType: 'SANDBOX_CONFIRMED',
      requester: (req as AuthRequest).user,
    });
    res.status(outcome.code).json(outcome.body);
  } catch (error: any) {
    console.error('[SANDBOX CONFIRM ERROR]', error?.message);
    res.status(500).json({ error: 'Sandbox payment confirmation failed' });
  }
};

/**
 * Public non-production lookup for a QRIS sandbox payment page opened via QR scan.
 * Requires a valid HMAC token (`t`) bound to the sessionId. Exposes no PII.
 */
export const getSandboxSessionInfo = async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Sandbox QR page is disabled in production' });
  }
  const { db } = req;
  const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId : '';
  const token = typeof req.query.t === 'string' ? req.query.t : '';
  if (!sessionId || sessionId.length > 120) {
    return res.status(400).json({ error: 'A valid payment session ID is required' });
  }
  if (!verifySandboxSessionToken(sessionId, token)) {
    return res.status(403).json({ error: 'Token QR sandbox tidak valid' });
  }

  try {
    const row = await (db as any).get(
      `SELECT p.payment_session_id, p.amount, p.program_id, p.status, p.expires_at,
              c.title AS campaign_title
       FROM payments p
       LEFT JOIN donations d ON d.payment_reference = p.payment_session_id
       LEFT JOIN campaigns c ON c.id = d.campaign_id
       WHERE p.payment_session_id = ?`,
      [sessionId]
    );
    if (!row) {
      return res.status(404).json({ error: 'Sesi pembayaran tidak ditemukan' });
    }
    res.json({
      session_id: row.payment_session_id,
      amount: row.amount,
      program_id: row.program_id,
      campaign_title: row.campaign_title ?? null,
      status: toClientStatus(row.status, row.expires_at),
      expires_at: row.expires_at,
      provider: QRIS_SANDBOX_CONFIG.provider,
      merchant_id: QRIS_SANDBOX_CONFIG.merchantId,
    });
  } catch (error: any) {
    console.error('[SANDBOX SESSION LOOKUP ERROR]', error?.message);
    res.status(500).json({ error: 'Gagal memuat sesi sandbox' });
  }
};

/**
 * Public non-production QR scan confirmation endpoint.
 * Authenticity is proven by the HMAC token embedded in the scanned QR URL.
 */
export const scanConfirmSandboxPayment = async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Sandbox QR confirmation is disabled in production' });
  }
  const { db } = req;
  const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId : '';
  const token = typeof req.body?.token === 'string'
    ? req.body.token
    : typeof req.query.t === 'string'
      ? req.query.t
      : '';
  if (!sessionId || sessionId.length > 120) {
    return res.status(400).json({ error: 'A valid payment session ID is required' });
  }
  if (!verifySandboxSessionToken(sessionId, token)) {
    return res.status(403).json({ error: 'Token QR sandbox tidak valid' });
  }

  try {
    const outcome = await confirmSandboxSession(db as any, {
      sessionId,
      providerPrefix: 'SANDBOX-QR',
      eventType: 'SANDBOX_QR_SCANNED',
      idempotentPaid: true,
    });
    res.status(outcome.code).json(outcome.body);
  } catch (error: any) {
    console.error('[SANDBOX QR CONFIRM ERROR]', error?.message);
    res.status(500).json({ error: 'Konfirmasi QR sandbox gagal' });
  }
};
