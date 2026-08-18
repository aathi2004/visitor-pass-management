import { Router } from 'express';
import { query } from 'express-validator';
import { visitorReport, activityFeed } from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(protect, authorize('admin'));

const reportValidation = [
  query('range').optional().isIn(['today', 'week', 'month', 'custom']).withMessage('Invalid range'),
  query('from').optional().isISO8601().withMessage('From date must be YYYY-MM-DD'),
  query('to').optional().isISO8601().withMessage('To date must be YYYY-MM-DD'),
  query('status').optional().trim(),
  query('department').optional().trim(),
];

const activityValidation = [
  query('action').optional().trim(),
  query('from').optional().isISO8601().withMessage('From date must be YYYY-MM-DD'),
  query('to').optional().isISO8601().withMessage('To date must be YYYY-MM-DD'),
  query('user').optional().isMongoId().withMessage('Invalid user id'),
  query('department').optional().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
];

router.get('/visitors', reportValidation, validate, visitorReport);
router.get('/activities', activityValidation, validate, activityFeed);

export default router;
