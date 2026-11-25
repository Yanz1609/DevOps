import { Router } from 'express';
import {
  createPublicShare,
  getFileShares,
  revokePublicShare,
  getPublicShare,
  shareWithUser,
  revokeUserShare,
  getSharedWithMe,
} from '../controllers/shares.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Public link access (no auth required)
router.get('/s/:token', getPublicShare);

// User protected share routes
router.post('/files/:id/share', requireAuth, createPublicShare);
router.get('/files/:id/shares', requireAuth, getFileShares);
router.delete('/shares/:id', requireAuth, revokePublicShare);

router.post('/files/:id/user-share', requireAuth, shareWithUser);
router.delete('/shares/user-share/:id', requireAuth, revokeUserShare);
router.get('/shares/shared-with-me', requireAuth, getSharedWithMe);

export default router;

