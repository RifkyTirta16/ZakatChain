import { Router } from 'express';
import { listUsers, updateUserRole } from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize(['ADMIN']), listUsers);
router.patch('/:id/role', authenticate, authorize(['ADMIN']), updateUserRole);

export default router;
