import { Router } from 'express';
import { body } from 'express-validator';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '../models/User.js';

const router = Router();

router.use(protect, authorize('admin'));

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username').trim().notEmpty().withMessage('Username is required').isLength({ min: 3, max: 50 }),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(ROLES).withMessage('Invalid role'),
  body('employee').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid employee id'),
];

const updateRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('username').optional().trim().notEmpty().isLength({ min: 3, max: 50 }),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(ROLES).withMessage('Invalid role'),
  body('employee').optional({ values: 'falsy' }).custom((v) => v === '' || true),
  body('isActive').optional().isBoolean().withMessage('Invalid isActive value'),
];

router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', createRules, validate, createUser);
router.put('/:id', updateRules, validate, updateUser);
router.delete('/:id', deleteUser);

export default router;
