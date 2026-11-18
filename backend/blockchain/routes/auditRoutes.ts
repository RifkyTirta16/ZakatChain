import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize(['ADMIN', 'AUDITOR']), getAuditLogs);

export default router;
