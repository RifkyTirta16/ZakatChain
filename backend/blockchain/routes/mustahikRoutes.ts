import { Router } from 'express';
import {
  listMustahik,
  getMustahikDetail,
  createMustahik,
  updateMustahikStatus,
} from '../controllers/mustahikController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Restricted to Amil, Auditor (read-only), and Admin; beneficiary PII is never public.
router.get('/', authenticate, authorize(['AMIL', 'AUDITOR', 'ADMIN']), listMustahik);
router.get('/:id', authenticate, authorize(['AMIL', 'AUDITOR', 'ADMIN']), getMustahikDetail);
router.post('/', authenticate, authorize(['AMIL', 'ADMIN']), createMustahik);
router.patch('/:id', authenticate, authorize(['AMIL', 'ADMIN']), updateMustahikStatus);

export default router;
