import { Router } from 'express';
import { visitorReport, activityFeed } from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/visitors', visitorReport);
router.get('/activities', activityFeed);

export default router;
