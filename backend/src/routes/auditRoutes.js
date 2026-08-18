import { Router } from 'express';
import { getAuditLogs, getAuditLogById, getAuditActions } from '../controllers/auditController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/', getAuditLogs);
router.get('/actions', getAuditActions);
router.get('/:id', getAuditLogById);

export default router;
