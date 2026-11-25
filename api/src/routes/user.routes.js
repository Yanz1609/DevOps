import { Router } from 'express';
import { getUsage } from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/usage', requireAuth, getUsage);

export default router;

