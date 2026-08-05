import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getVisitors,
  getVisit,
  registerVisitor,
  checkInVisitor,
  checkOutVisitor,
  cancelVisit,
  approveRequest,
  rejectRequest,
  addRemark,
  myPendingStats,
} from '../controllers/visitorController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(protect);

const registrationRules = [
  body('name').trim().notEmpty().withMessage('Visitor name is required'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Valid visitor email is required'),
  body('phone').trim().notEmpty().withMessage('Visitor phone is required'),
  body('company').optional({ values: 'falsy' }).trim(),
  body('address').optional({ values: 'falsy' }).trim(),
  body('idType').optional({ values: 'falsy' }).trim(),
  body('idNumber').optional({ values: 'falsy' }).trim(),
  body('employee').isMongoId().withMessage('Select an employee to visit'),
  body('date').isISO8601().withMessage('Visit date must be in YYYY-MM-DD format'),
  body('expectedArrivalTime')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Expected arrival time must be HH:mm'),
  body('expectedDepartureTime')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Expected departure time must be HH:mm')
    .custom((val, { req }) => {
      const [ah, am] = req.body.expectedArrivalTime.split(':').map(Number);
      const [dh, dm] = val.split(':').map(Number);
      if (dh * 60 + dm <= ah * 60 + am) {
        throw new Error('Expected departure time must be later than arrival time');
      }
      return true;
    }),
  body('purpose').trim().notEmpty().withMessage('Purpose of visit is required'),
];

const idParam = [param('id').isMongoId().withMessage('Invalid visit id')];

// Public list (role aware). Receptionist/admin see all, employee scoped automatically.
router.get('/', getVisitors);
router.get('/my/stats', myPendingStats);
router.get('/:id', idParam, validate, getVisit);

router.post(
  '/register',
  authorize('admin', 'receptionist'),
  registrationRules,
  validate,
  registerVisitor
);

router.post('/:id/check-in', authorize('admin', 'receptionist'), idParam, validate, checkInVisitor);
router.post('/:id/check-out', authorize('admin', 'receptionist'), idParam, validate, checkOutVisitor);
router.post('/:id/cancel', authorize('admin', 'receptionist', 'employee'), idParam, validate, cancelVisit);

router.post(
  '/:id/approve',
  authorize('admin', 'employee'),
  idParam,
  [body('remark').optional().trim()],
  validate,
  approveRequest
);

router.post(
  '/:id/reject',
  authorize('admin', 'employee'),
  idParam,
  [body('reason').optional().trim()],
  validate,
  rejectRequest
);

router.post(
  '/:id/remark',
  authorize('admin', 'employee'),
  idParam,
  [body('remark').trim().notEmpty().withMessage('Remark is required')],
  validate,
  addRemark
);

export default router;
