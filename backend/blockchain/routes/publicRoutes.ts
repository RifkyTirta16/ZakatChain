import { Router } from 'express';
import { getPublicTransparency } from '../controllers/publicController.js';

const router = Router();

router.get('/transparency', getPublicTransparency);

export default router;
