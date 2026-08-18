import AuditLog from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { action, entity, user, from, to, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (user) filter.user = user;

  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(`${from}T00:00:00`);
    if (to) filter.timestamp.$lte = new Date(`${to}T23:59:59`);
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, parseInt(limit, 10) || 20);

  const total = await AuditLog.countDocuments(filter);
  const data = await AuditLog.find(filter)
    .populate('user', 'name role')
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

export const getAuditLogById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id)
    .populate('user', 'name role')
    .lean();
  if (!log) throw new AppError('Audit log entry not found.', 404);
  res.json({ success: true, data: log });
});

export const getAuditActions = asyncHandler(async (req, res) => {
  const actions = await AuditLog.distinct('action');
  res.json({ success: true, data: actions.sort() });
});
