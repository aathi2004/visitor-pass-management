import { Router } from 'express';
import { exportVisits } from '../controllers/exportController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/visitors', exportVisits);

export default router;
