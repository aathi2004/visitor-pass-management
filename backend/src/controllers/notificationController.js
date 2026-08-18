import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, parseInt(limit, 10) || 20);

  const filter = { user: req.user._id };
  if (unreadOnly === 'true') filter.read = false;

  const total = await Notification.countDocuments(filter);
  const data = await Notification.find(filter)
    .populate('visit', 'visitor.name date status')
    .sort({ timestamp: -1 })
    .skip((p - 1) * l)
    .limit(l)
    .lean();

  res.json({
    success: true,
    data,
    pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) || 0 },
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ success: true, data: { count } });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) throw new AppError('Notification not found.', 404);
  res.json({ success: true, data: notification });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { read: true }
  );
  res.json({ success: true, message: 'All notifications marked as read.' });
});
