
import { Router } from 'express';
import { getTransactions, createTransaction, reconcileTransaction } from '../controllers/transactionController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();
const uploadSingle = upload.single('proof_file');

router.get('/', authenticate, getTransactions);
router.post('/', authenticate, authorize(['USER', 'ADMIN']), uploadSingle, createTransaction);
router.patch('/:id/reconcile', authenticate, authorize(['ADMIN']), reconcileTransaction);

export default router;
