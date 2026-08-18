import { Router } from 'express';
import { body } from 'express-validator';
import {
  getEmployees,
  getEmployee,
  getDepartments,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employeeController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(protect);

const employeeRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('employeeId').trim().notEmpty().withMessage('Employee ID is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('designation').trim().notEmpty().withMessage('Designation is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  body('workingHours').optional().isObject().withMessage('Working hours must be an object'),
  body('workingHours.start').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Start time must be HH:mm'),
  body('workingHours.end').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('End time must be HH:mm'),
];

router.get('/departments', getDepartments);
router.get('/', getEmployees);
router.get('/:id', getEmployee);
router.post('/', authorize('admin'), employeeRules, validate, createEmployee);
router.put(
  '/:id',
  authorize('admin'),
  employeeRules.map((r) => r.optional({ values: 'undefined' })),
  validate,
  updateEmployee
);
router.delete('/:id', authorize('admin'), deleteEmployee);

export default router;
