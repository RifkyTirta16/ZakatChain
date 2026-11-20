import { Router } from 'express';
import { getDonations, getDonorHistory, getDonationTrace } from '../controllers/donationController.js';
import { authenticate, authorize, authorizeSelfOr } from '../middleware/auth.js';

const router = Router();

// Restricted to staff/oversight roles; donors read only their own rows via /donor/:donor_id.
router.get('/', authenticate, authorize(['AMIL', 'AUDITOR', 'ADMIN']), getDonations);

// A donor may read their own history; ADMIN/AUDITOR may read any.
// Previously any authenticated user could read any donor's history by id.
router.get('/donor/:donor_id', authenticate, authorizeSelfOr(['ADMIN', 'AUDITOR'], 'donor_id'), getDonorHistory);
router.get('/:id/trace', authenticate, getDonationTrace);

export default router;
