import { Router } from 'express';
import { body } from 'express-validator';
import { getConfig, updateConfig, getQueueStatus, getEmployeeAssignments } from '../controllers/slotController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(protect);

router.get('/config', getConfig);
router.put(
  '/config',
  authorize('admin'),
  [
    body('slotDuration').optional().isInt({ min: 1 }).withMessage('Slot duration must be >= 1'),
    body('slotUnit').optional().isIn(['seconds', 'minutes']).withMessage('Invalid slot unit'),
    body('maxQueueSize').optional().isInt({ min: 1 }).withMessage('Max queue size must be >= 1'),
    body('maxVisitorsPerEmployee').optional().isInt({ min: 1 }).withMessage('Max visitors per employee must be >= 1'),
  ],
  validate,
  updateConfig
);
router.get('/queue-status', getQueueStatus);
router.get('/employee-assignments', authorize('admin', 'receptionist'), getEmployeeAssignments);

export default router;
