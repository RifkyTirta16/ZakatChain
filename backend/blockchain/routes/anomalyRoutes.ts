import { Router } from 'express';
import { scanForAnomalies, getAnomalies, resolveAnomaly } from '../controllers/anomalyController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize(['ADMIN', 'AUDITOR']), getAnomalies);
router.post('/scan', authenticate, authorize(['ADMIN', 'AUDITOR']), scanForAnomalies);
router.patch('/:id/resolve', authenticate, authorize(['ADMIN', 'AUDITOR']), resolveAnomaly);

export default router;

