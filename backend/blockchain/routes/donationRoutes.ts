import { Router } from 'express';
import {
  getDonations,
  getDonorHistory,
  getDonationTrace,
  getMuzakkiOverview,
} from '../controllers/donationController.js';
import { authenticate, authorize, authorizeSelfOr } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize(['AMIL', 'AUDITOR', 'ADMIN']), getDonations);
router.get('/me/overview', authenticate, getMuzakkiOverview);
router.get('/donor/:donor_id', authenticate, authorizeSelfOr(['ADMIN', 'AUDITOR'], 'donor_id'), getDonorHistory);
router.get('/:id/trace', authenticate, getDonationTrace);

export default router;
