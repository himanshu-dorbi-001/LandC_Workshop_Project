import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const ctrl   = new AuthController();

// Public
router.post('/login',                ctrl.login.bind(ctrl));

// Protected — must be logged in
router.post('/change-password',       authenticate, ctrl.changePassword.bind(ctrl));
router.post('/force-change-password', authenticate, ctrl.forceChangePassword.bind(ctrl));

export { router as authRoutes };
