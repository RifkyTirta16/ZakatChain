import { Router } from 'express';
import { updateProofStatus } from '../controllers/proofController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.patch('/verify/:id', authenticate, authorize(['ADMIN', 'AUDITOR']), updateProofStatus);

export default router;
