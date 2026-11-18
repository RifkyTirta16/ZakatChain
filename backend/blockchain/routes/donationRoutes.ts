import { Router } from 'express';
import { getDonations, getDonorHistory } from '../controllers/donationController.js';
import { authenticate, authorize, authorizeSelfOr } from '../middleware/auth.js';

const router = Router();

// The Evidence Graph fetches this list to build its graph.
router.get('/', authenticate, getDonations);

// A donor may read their own history; ADMIN/AUDITOR may read any.
// Previously any authenticated user could read any donor's history by id.
router.get('/donor/:donor_id', authenticate, authorizeSelfOr(['ADMIN', 'AUDITOR'], 'donor_id'), getDonorHistory);

export default router;
