import { Router } from 'express';
import {
  createPaymentSession,
  getPaymentStatus,
  handlePaymentWebhook,
  handleDokuNotification,
  sandboxConfirmPayment,
  getSandboxSessionInfo,
  scanConfirmSandboxPayment,
  listPayments,
  getPaymentEvents,
} from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Admin/Auditor payment monitoring & webhook audit logs
router.get('/', authenticate, authorize(['ADMIN', 'AUDITOR']), listPayments);
router.get('/:sessionId/events', authenticate, authorize(['ADMIN', 'AUDITOR']), getPaymentEvents);

// User-facing payment session creation.
// `generate` is the pre-existing path; `session` and `create` are aliases the
// frontend already calls (DonationPayment.tsx, PaymentModal.tsx).
router.post('/generate', authenticate, createPaymentSession);
router.post('/session', authenticate, createPaymentSession);
router.post('/create', authenticate, createPaymentSession);

// Session status lookups. `status` and `verify` are aliases.
router.get('/status/:sessionId', authenticate, getPaymentStatus);
router.get('/verify/:paymentId', authenticate, getPaymentStatus);
router.post('/sandbox/confirm/:sessionId', authenticate, sandboxConfirmPayment);
// Scannable QR sandbox endpoints (non-production only, protected by per-session HMAC token).
router.get('/sandbox/session/:sessionId', getSandboxSessionInfo);
router.post('/sandbox/scan-confirm/:sessionId', scanConfirmSandboxPayment);

// Legacy singular prefix used by CampaignDetail.tsx (POST /api/payment/generate).
// Mounted separately in index.ts.

// Provider-facing webhooks. Unauthenticated by design; authenticity is proven by
// the HMAC signature over the raw request body.
router.post('/webhook', handlePaymentWebhook);
router.post('/doku/notify', handleDokuNotification);

export default router;
