import { Router } from 'express';
import { getTrash, emptyTrash } from '../controllers/trash.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getTrash);
router.post('/empty', emptyTrash);

export default router;

