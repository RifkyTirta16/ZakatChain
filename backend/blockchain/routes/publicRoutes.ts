import { Router } from 'express';
import {
  getPublicDistributions,
  getPublicNetwork,
  getPublicTransparency,
} from '../controllers/publicController.js';

const router = Router();

router.get('/transparency', getPublicTransparency);
router.get('/distributions', getPublicDistributions);
router.get('/network', getPublicNetwork);

export default router;
