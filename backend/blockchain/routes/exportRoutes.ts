import { Router } from 'express';
import { exportTransactionsCSV } from '../controllers/exportController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/csv', authenticate, authorize(['ADMIN', 'AUDITOR']), exportTransactionsCSV);

export default router;
