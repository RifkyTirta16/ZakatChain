import express from 'express';
import { register, login, logout, getCurrentUser, changePassword } from '../controllers/authController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', optionalAuthenticate, logout);
router.get('/me', authenticate, getCurrentUser);
router.patch('/password', authenticate, changePassword);

export default router;
