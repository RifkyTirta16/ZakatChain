import { Router } from 'express';
import { listUsers, updateUserRole, unlockUser } from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize(['ADMIN']), listUsers);
router.patch('/:id/role', authenticate, authorize(['ADMIN']), updateUserRole);
router.patch('/:id/unlock', authenticate, authorize(['ADMIN']), unlockUser);

export default router;
