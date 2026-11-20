import { Router } from 'express';
import {
  createPaymentSession,
  getPaymentStatus,
  handlePaymentWebhook,
  sandboxConfirmPayment,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

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

// Legacy singular prefix used by CampaignDetail.tsx (POST /api/payment/generate).
// Mounted separately in index.ts.

// Provider-facing webhook. Unauthenticated by design; authenticity is proven by
// the HMAC signature over the raw request body.
router.post('/webhook', handlePaymentWebhook);

export default router;
