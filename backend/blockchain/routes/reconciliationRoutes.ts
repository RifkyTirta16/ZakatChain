import { Router } from 'express';
import { performReconciliation, getReconciliationHistory } from '../controllers/reconciliationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/run', authenticate, authorize(['ADMIN']), performReconciliation);
router.get('/history', authenticate, authorize(['ADMIN', 'AUDITOR']), getReconciliationHistory);

export default router;
