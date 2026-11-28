import { Router } from 'express';
import {
  getTransactions,
  getTransactionDetail,
  createTransaction,
  reconcileTransaction,
  reconcileTransactionsBatch,
  revokeTransactionOnChain,
} from '../controllers/transactionController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();
const uploadSingle = upload.single('proof_file');

router.get('/', authenticate, authorize(['AMIL', 'AUDITOR', 'ADMIN']), getTransactions);
router.post('/reconcile-batch', authenticate, authorize(['ADMIN']), reconcileTransactionsBatch);
router.get('/:id', authenticate, authorize(['AMIL', 'AUDITOR', 'ADMIN']), getTransactionDetail);
router.post('/', authenticate, authorize(['AMIL', 'ADMIN']), uploadSingle, createTransaction);
router.patch('/:id/reconcile', authenticate, authorize(['ADMIN']), reconcileTransaction);
router.patch('/:id/revoke', authenticate, authorize(['ADMIN']), revokeTransactionOnChain);

export default router;
