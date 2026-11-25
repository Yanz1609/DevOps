import { Router } from 'express';
import {
  listItems,
  getUploadPresignedUrl,
  confirmUpload,
  getDownloadUrl,
  getViewUrl,
  updateFile,
  deleteFile,
  restoreFile,
  permanentlyDeleteFile,
} from '../controllers/files.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', listItems);
router.post('/upload-url', getUploadPresignedUrl);
router.post('/confirm', confirmUpload);
router.get('/:id/download', getDownloadUrl);
router.get('/:id/view', getViewUrl);
router.patch('/:id', updateFile);
router.delete('/:id', deleteFile);
router.post('/:id/restore', restoreFile);
router.delete('/:id/permanent', permanentlyDeleteFile);

export default router;

