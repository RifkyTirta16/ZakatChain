import { Router } from 'express';
import { getCampaigns, createCampaign, getCampaignDetail, updateCampaign } from '../controllers/campaignController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', getCampaigns);
router.post('/', authenticate, authorize(['ADMIN', 'AMIL']), createCampaign);
router.get('/:id', getCampaignDetail);
router.patch('/:id', authenticate, authorize(['ADMIN', 'AMIL']), updateCampaign);

export default router;