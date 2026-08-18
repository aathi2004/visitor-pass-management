import VisitRequest, { VISIT_STATUS, ACTION } from '../models/VisitRequest.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import SystemConfig from '../models/SystemConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import {
  validateRegistration,
  canCheckIn,
  canCheckOut,
  addActivity,
  todayStr,
} from '../utils/visitRules.js';
import { logAudit } from '../utils/auditLog.js';
import {
  notifyVisitRegistered,
  notifyVisitApproved,
  notifyVisitRejected,
  notifyVisitCheckedIn,
  notifyVisitCheckedOut,
  notifyVisitCancelled,
} from '../utils/notify.js';
import { findAvailableEmployee, autoCompleteVisits } from '../controllers/slotController.js';

const ESCAPE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getVisitors = asyncHandler(async (req, res) => {
  await autoCompleteVisits();

  const {
    visitorName = '',
    employeeName = '',
    date = '',
    dateFrom = '',
    dateTo = '',
    status = '',
    department = '',
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

  if (date) {
    filter.date = date;
  } else if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = dateFrom;
    if (dateTo) filter.date.$lte = dateTo;
  }

  if (status) {
    const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }

  if (department) {
    const emps = await Employee.find({ department: new RegExp(ESCAPE(department), 'i') }).select('_id');
    if (filter.employee?.$in) {
      const empIds = emps.map((e) => e._id.toString());
      const existing = filter.employee.$in.map((id) => id.toString());
      const combined = existing.filter((id) => empIds.includes(id));
      filter.employee = { $in: combined };
    } else {
      filter.employee = { $in: emps.map((e) => e._id) };
    }
  }

  if (scope === 'employee') {
    const user = await User.findById(req.user._id);
    if (!user.employee) {
      return res.json({ success: true, data: [], pagination: { page: 1, limit, total: 0, pages: 0 } });
    }
    filter.employee = user.employee;
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, parseInt(limit, 10) || 10);
  const total = await VisitRequest.countDocuments(filter);
  const data = await VisitRequest.find(filter)
    .populate('employee', 'name employeeId department designation email')
    .populate('createdBy', 'name role email')
    .populate('activities.user', 'name role')
    .sort({ createdAt: -1 })
    .skip((p - 1) * l)
    .limit(l);

  res.json({ success: true, data, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) || 0 } });
});

export const getVisit = asyncHandler(async (req, res) => {
  await autoCompleteVisits();

  const visit = await VisitRequest.findById(req.params.id)
    .populate('employee', 'name employeeId department designation email')
    .populate('createdBy', 'name role email')
    .populate('activities.user', 'name role');
  if (!visit) throw new AppError('Visit request not found.', 404);
  res.json({ success: true, data: visit });
});

export const registerVisitor = asyncHandler(async (req, res) => {
  await validateRegistration(VisitRequest, req.body);

  const assignedEmp = await findAvailableEmployee(req.body.expectedArrivalTime);

  if (!assignedEmp) {
    throw new AppError('No employees are available for the selected arrival time. Please check employee working hours or try a different time.');
  }

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
    employee: assignedEmp ? assignedEmp._id : null,
    date: req.body.date,
    expectedArrivalTime: req.body.expectedArrivalTime,
    purpose: req.body.purpose,
    createdBy: req.user._id,
    currentTime: new Date(),
  });

  const empNote = assignedEmp ? ` Auto-assigned to ${assignedEmp.name}.` : ' No employee available for assignment.';
  addActivity(visit, ACTION.CREATED, req.user, `Visit request created for ${req.body.name}.${empNote}`);
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department designation email')
    .populate('createdBy', 'name role email')
    .populate('activities.user', 'name role');

  await logAudit({
    action: 'visit.created',
    entity: 'VisitRequest',
    entityId: visit._id,
    user: req.user,
    req,
    changes: { after: { visitor: visit.visitor, date: visit.date } },
  });

  res.status(201).json({ success: true, data: populated, message: 'Visit request registered and awaiting approval.' });
});

export const approveRequest = asyncHandler(async (req, res) => {
  const visit = await VisitRequest.findById(req.params.id);
  if (!visit) throw new AppError('Visit request not found.', 404);

  const isAdmin = req.user.role === 'admin';
  if (!isAdmin) {
    if (req.user.role !== 'employee') {
      throw new AppError('Only employees or administrators can review requests.', 403);
    }
    if (!req.user.employee || String(req.user.employee) !== String(visit.employee || '')) {
      if (visit.employee) {
        throw new AppError('You can only review requests addressed to you.', 403);
      }
    }
  }

  if (visit.status !== VISIT_STATUS.PENDING) {
    throw new AppError('Only pending requests can be approved.');
  }

  if (!visit.employee) {
    const assignedEmp = await findAvailableEmployee(visit.expectedArrivalTime);
    if (!assignedEmp) {
      throw new AppError('No employees available for assignment at this time. Please try again later.');
    }
    visit.employee = assignedEmp._id;
  }

  const config = await SystemConfig.getConfig();
  const now = new Date();
  const durationMs = config.slotUnit === 'seconds' ? config.slotDuration * 1000 : config.slotDuration * 60 * 1000;

  visit.status = VISIT_STATUS.APPROVED;
  visit.slotStartTime = now;
  visit.slotEndTime = new Date(now.getTime() + durationMs);

  addActivity(visit, ACTION.APPROVED, req.user, `Approved. Slot: ${now.toLocaleTimeString()} – ${visit.slotEndTime.toLocaleTimeString()}`);
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department email')
    .populate('createdBy', 'name role email')
    .populate('activities.user', 'name role');

  const empName = populated.employee?.name || 'Unknown';
  await logAudit({
    action: 'visit.approved',
    entity: 'VisitRequest',
    entityId: visit._id,
    user: req.user,
    req,
    changes: { before: { status: 'pending' }, after: { status: 'approved', employee: empName, slotEndTime: visit.slotEndTime } },
  });
  await notifyVisitApproved(populated, req.user);

  res.json({ success: true, data: populated, message: 'Visit request approved and employee assigned.' });
});

export const checkInVisitor = asyncHandler(async (req, res) => {
  await autoCompleteVisits();

  const visit = await VisitRequest.findById(req.params.id);
  canCheckIn(visit);

  visit.status = VISIT_STATUS.CHECKED_IN;
  visit.checkInTime = new Date();
  addActivity(visit, ACTION.CHECKED_IN, req.user, 'Visitor checked in');
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department email')
    .populate('activities.user', 'name role');

  await logAudit({
    action: 'visit.checked_in',
    entity: 'VisitRequest',
    entityId: visit._id,
    user: req.user,
    req,
  });
  await notifyVisitCheckedIn(populated, req.user);

  res.json({ success: true, data: populated, message: 'Visitor checked in successfully.' });
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
    .populate('employee', 'name employeeId department email')
    .populate('activities.user', 'name role');

  await logAudit({
    action: 'visit.checked_out',
    entity: 'VisitRequest',
    entityId: visit._id,
    user: req.user,
    req,
  });
  await notifyVisitCheckedOut(populated, req.user);

  res.json({ success: true, data: populated, message: 'Visitor checked out successfully.' });
});

export const cancelVisit = asyncHandler(async (req, res) => {
  const visit = await VisitRequest.findById(req.params.id);
  if (!visit) throw new AppError('Visit request not found.', 404);
  if (![VISIT_STATUS.PENDING, VISIT_STATUS.APPROVED].includes(visit.status)) {
    throw new AppError('Only pending or approved visits can be cancelled.');
  }

  const previousStatus = visit.status;
  visit.status = VISIT_STATUS.CANCELLED;
  addActivity(visit, ACTION.CANCELLED, req.user, 'Visit cancelled');
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department email')
    .populate('activities.user', 'name role');

  await logAudit({
    action: 'visit.cancelled',
    entity: 'VisitRequest',
    entityId: visit._id,
    user: req.user,
    req,
    changes: { before: { status: previousStatus }, after: { status: 'cancelled' } },
  });
  await notifyVisitCancelled(populated, req.user);

  res.json({ success: true, data: populated, message: 'Visit cancelled successfully.' });
});

export const rejectRequest = asyncHandler(async (req, res) => {
  const visit = await VisitRequest.findById(req.params.id);
  if (!visit) throw new AppError('Visit request not found.', 404);

  const isAdmin = req.user.role === 'admin';
  if (!isAdmin) {
    if (req.user.role !== 'employee') {
      throw new AppError('Only employees or administrators can review requests.', 403);
    }
    if (!req.user.employee || String(req.user.employee) !== String(visit.employee || '')) {
      if (visit.employee) {
        throw new AppError('You can only review requests addressed to you.', 403);
      }
    }
  }

  if (visit.status !== VISIT_STATUS.PENDING) {
    throw new AppError('Only pending requests can be rejected.');
  }

  visit.status = VISIT_STATUS.REJECTED;
  const reason = req.body.reason || 'No reason provided';
  visit.remark = reason;
  addActivity(visit, ACTION.REJECTED, req.user, reason);
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department email')
    .populate('createdBy', 'name role email')
    .populate('activities.user', 'name role');

  await logAudit({
    action: 'visit.rejected',
    entity: 'VisitRequest',
    entityId: visit._id,
    user: req.user,
    req,
    changes: { before: { status: 'pending' }, after: { status: 'rejected', remark: reason } },
  });
  await notifyVisitRejected(populated, req.user);

  res.json({ success: true, data: populated, message: 'Visit request rejected.' });
});

export const addRemark = asyncHandler(async (req, res) => {
  const visit = await VisitRequest.findById(req.params.id);
  if (!visit) throw new AppError('Visit request not found.', 404);

  if (visit.employee) {
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && req.user.role === 'employee') {
      if (!req.user.employee || String(req.user.employee) !== String(visit.employee)) {
        throw new AppError('You can only remark on requests addressed to you.', 403);
      }
    }
  }

  if (!req.body.remark || !req.body.remark.trim()) {
    throw new AppError('Remark text is required.');
  }

  visit.remark = req.body.remark.trim();
  addActivity(visit, ACTION.REMARKED, req.user, req.body.remark.trim());
  await visit.save();

  const populated = await VisitRequest.findById(visit._id)
    .populate('employee', 'name employeeId department email')
    .populate('activities.user', 'name role');
  res.json({ success: true, data: populated, message: 'Remark added successfully.' });
});

export const myPendingStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.employee) {
    return res.json({ success: true, data: { pending: 0, approvedToday: 0 } });
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
  res.json({ success: true, data: { pending, approvedToday } });
});
