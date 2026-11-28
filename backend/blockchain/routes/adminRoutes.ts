import { Router } from 'express';
import { getAdminBlockchainTelemetry, getAdminOverview } from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/overview', authenticate, authorize(['ADMIN', 'AUDITOR']), getAdminOverview);
router.get('/blockchain/telemetry', authenticate, authorize(['ADMIN', 'AUDITOR']), getAdminBlockchainTelemetry);

export default router;
