import { Router } from 'express';
import {
  createFolder,
  updateFolder,
  deleteFolder,
  restoreFolder,
  permanentlyDeleteFolder,
} from '../controllers/folders.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/', createFolder);
router.patch('/:id', updateFolder);
router.delete('/:id', deleteFolder);
router.post('/:id/restore', restoreFolder);
router.delete('/:id/permanent', permanentlyDeleteFolder);

export default router;

