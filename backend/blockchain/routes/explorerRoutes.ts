import { Router } from 'express';
import { verifyReportProof } from '../controllers/explorerController.js';

const router = Router();

// Public endpoint for verification
router.get('/verify/lookup/:query', verifyReportProof);
router.get('/verify/:id', verifyReportProof);
router.get('/verify/hash/:hash', verifyReportProof);

export default router;
