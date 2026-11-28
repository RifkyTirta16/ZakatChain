import { Router } from 'express';
import {
  performReconciliation,
  getReconciliationHistory,
  getThreeWayReconciliation,
} from '../controllers/reconciliationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/run', authenticate, authorize(['ADMIN']), performReconciliation);
router.get('/history', authenticate, authorize(['ADMIN', 'AUDITOR']), getReconciliationHistory);
router.get('/three-way', authenticate, authorize(['ADMIN', 'AUDITOR']), getThreeWayReconciliation);

export default router;
