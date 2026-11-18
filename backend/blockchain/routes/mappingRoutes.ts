import { Router } from 'express';
import { getRegionStats, getRegionalDistribution, importPovertyData, getRecommendations } from '../controllers/mappingController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, getRegionStats);
router.get('/recommendations', authenticate, getRecommendations);
router.get('/region/:region', authenticate, getRegionalDistribution);
router.post('/import', authenticate, authorize(['ADMIN', 'AMIL']), importPovertyData);

export default router;