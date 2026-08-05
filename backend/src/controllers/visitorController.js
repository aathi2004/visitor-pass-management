import VisitRequest, { VISIT_STATUS, ACTION } from '../models/VisitRequest.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import {
  validateRegistration,
  canCheckIn,
  canCheckOut,
  addActivity,
  todayStr,
} from '../utils/visitRules.js';

const ESCAPE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Search / filter shared by all visitor list screens.
 * Combos: visitor name, employee name, visit date, status.
 */
export const getVisitors = asyncHandler(async (req, res) => {
  const {
    visitorName = '',
    employeeName = '',
    date = '',
    status = '',
    page = 1,
    limit = 10,
    scope,
  } = req.query;

  const filter = {};

  if (visitorName) filter['visitor.name'] = new RegExp(ESCAPE(visitorName), 'i');

  if (employeeName) {
    const empRe = new RegExp(ESCAPE(employeeName), 'i');
    const emps = await Employee.find({ $or: [{ name: empRe }, { employeeId: empRe }] }).select('_id');
    filter.employee = { $in: emps.map((e) => e._id) };
  }

  if (date) filter.date = date;
  if (status) filter.status = status;

  // Employee scope: only requests for the logged-in employee.
  if (scope === 'employee') {
    const user = await User.findById(req.user._id);
    if (!user.employee) {
      return res.json({ data: [], pagination: { page: 1, limit, total: 0, pages: 0 } });
    }
    filter.employee = user.employee;
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, parseInt(limit, 10) || 10);
  const total = await VisitRequest.countDocuments(filter);
  const data = await VisitRequest.find(filter)
    .populate('employee', 'name employeeId department designation')
    .populate('createdBy', 'name role')
    .populate('activities.user', 'name role')
    .sort({ createdAt: -1 })
    .skip((p - 1) * l)
    .limit(l);

  res.json({ data, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) || 0 } });
});

export const getVisit = asyncHandler(async (req, res) => {
  const visit = await VisitRequest.findById(req.params.id)
    .populate('employee', 'name employeeId department designation')
    .populate('createdBy', 'name role')
    .populate('activities.user', 'name role');
  if (!visit) throw new AppError('Visit request not found.', 404);
  res.json({ data: visit });
});

export const registerVisitor = asyncHandler(async (req, res) => {
  await validateRegistration(VisitRequest, req.body);

  const visit = await VisitRequest.create({
    visitor: {
      name: req.body.name,
      email: req.body.email || '',
      phone: req.body.phone,
      company: req.body.company || '',
      address: req.body.address || '',
      idType: req.body.idType || '',
      idNumber: req.body.idNumber || '',
    },
    employee: req.body.employee,
    date: req.body.date,
    expectedArrivalTime: req.body.expectedArrivalTime,
    expectedDepartureTime: req.body.expectedDepartureTime,
    purpose: req.body.purpose,
    createdBy: req.user._id,
  });

  addActivity(visit, ACTION.CREATED, req.user, `Visit request created for ${req.body.name}`);
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department designation')
    .populate('createdBy', 'name role')
    .populate('activities.user', 'name role');

  res.status(201).json({ data: populated, message: 'Visit request registered and awaiting employee approval.' });
});

export const checkInVisitor = asyncHandler(async (req, res) => {
  const visit = await VisitRequest.findById(req.params.id);
  canCheckIn(visit);

  visit.status = VISIT_STATUS.CHECKED_IN;
  visit.checkInTime = new Date();
  addActivity(visit, ACTION.CHECKED_IN, req.user, 'Visitor checked in');
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department')
    .populate('activities.user', 'name role');
  res.json({ data: populated, message: 'Visitor checked in successfully.' });
});

export const checkOutVisitor = asyncHandler(async (req, res) => {
  const visit = await VisitRequest.findById(req.params.id);
  const checkOutTime = new Date();
  canCheckOut(visit, checkOutTime);

  visit.status = VISIT_STATUS.CHECKED_OUT;
  visit.checkOutTime = checkOutTime;
  addActivity(visit, ACTION.CHECKED_OUT, req.user, 'Visitor checked out');
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department')
    .populate('activities.user', 'name role');
  res.json({ data: populated, message: 'Visitor checked out successfully.' });
});

export const cancelVisit = asyncHandler(async (req, res) => {
  const visit = await VisitRequest.findById(req.params.id);
  if (!visit) throw new AppError('Visit request not found.', 404);
  if (![VISIT_STATUS.PENDING, VISIT_STATUS.APPROVED].includes(visit.status)) {
    throw new AppError('Only pending or approved visits can be cancelled.');
  }

  visit.status = VISIT_STATUS.CANCELLED;
  addActivity(visit, ACTION.CANCELLED, req.user, 'Visit cancelled');
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department')
    .populate('activities.user', 'name role');
  res.json({ data: populated, message: 'Visit cancelled successfully.' });
});

const canDecide = (req, visit) => {
  const isAdmin = req.user.role === 'admin';
  if (isAdmin) return;
  if (req.user.role !== 'employee') {
    throw new AppError('Only employees or administrators can review requests.', 403);
  }
  if (!req.user.employee || String(req.user.employee) !== String(visit.employee)) {
    throw new AppError('You can only review requests addressed to you.', 403);
  }
};

export const approveRequest = asyncHandler(async (req, res) => {
  const visit = await VisitRequest.findById(req.params.id);
  if (!visit) throw new AppError('Visit request not found.', 404);
  canDecide(req, visit);

  if (visit.status !== VISIT_STATUS.PENDING) {
    throw new AppError('Only pending requests can be approved.');
  }

  visit.status = VISIT_STATUS.APPROVED;
  addActivity(visit, ACTION.APPROVED, req.user, req.body.remark || 'Request approved');
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department')
    .populate('activities.user', 'name role');
  res.json({ data: populated, message: 'Visit request approved.' });
});

export const rejectRequest = asyncHandler(async (req, res) => {
  const visit = await VisitRequest.findById(req.params.id);
  if (!visit) throw new AppError('Visit request not found.', 404);
  canDecide(req, visit);

  if (visit.status !== VISIT_STATUS.PENDING) {
    throw new AppError('Only pending requests can be rejected.');
  }

  visit.status = VISIT_STATUS.REJECTED;
  const reason = req.body.reason || 'No reason provided';
  visit.remark = reason;
  addActivity(visit, ACTION.REJECTED, req.user, reason);
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department')
    .populate('activities.user', 'name role');
  res.json({ data: populated, message: 'Visit request rejected.' });
});

export const addRemark = asyncHandler(async (req, res) => {
  const visit = await VisitRequest.findById(req.params.id);
  if (!visit) throw new AppError('Visit request not found.', 404);
  canDecide(req, visit);

  if (!req.body.remark || !req.body.remark.trim()) {
    throw new AppError('Remark text is required.');
  }

  visit.remark = req.body.remark.trim();
  addActivity(visit, ACTION.REMARKED, req.user, req.body.remark.trim());
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department')
    .populate('activities.user', 'name role');
  res.json({ data: populated, message: 'Remark added successfully.' });
});

export const myPendingStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.employee) {
    return res.json({ data: { pending: 0, approvedToday: 0 } });
  }
  const pending = await VisitRequest.countDocuments({
    employee: user.employee,
    status: VISIT_STATUS.PENDING,
  });
  const approvedToday = await VisitRequest.countDocuments({
    employee: user.employee,
    status: { $in: [VISIT_STATUS.APPROVED, VISIT_STATUS.CHECKED_IN] },
    date: todayStr(),
  });
  res.json({ data: { pending, approvedToday } });
});
