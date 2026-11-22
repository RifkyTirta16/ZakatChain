import { Router } from 'express';
import { getPublicNetwork, getPublicTransparency } from '../controllers/publicController.js';

const router = Router();

router.get('/transparency', getPublicTransparency);
router.get('/network', getPublicNetwork);

export default router;
