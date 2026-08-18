import VisitRequest, { VISIT_STATUS } from '../models/VisitRequest.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

const toDate = (s) => {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new AppError(`Invalid date: ${s}`);
  return s;
};

const RANGE = {
  today: () => {
    const d = new Date();
    return [toDateStr(d), toDateStr(d)];
  },
  week: () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return [toDateStr(start), toDateStr(end)];
  },
  month: () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    return [toDateStr(start), toDateStr(end)];
  },
};

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const VALID_RANGES = Object.keys(RANGE);
const VALID_STATUSES = Object.values(VISIT_STATUS);

export const visitorReport = asyncHandler(async (req, res) => {
  const { range = 'week', from, to, status = '', department = '' } = req.query;

  if (range && !VALID_RANGES.includes(range) && range !== 'custom') {
    throw new AppError(`Invalid range. Use one of: ${VALID_RANGES.join(', ')}, or custom with from/to.`);
  }

  if (status && !VALID_STATUSES.includes(status)) {
    throw new AppError(`Invalid status. Use one of: ${VALID_STATUSES.join(', ')}`);
  }

  let start, end;
  if (from && to) {
    start = toDate(from);
    end = toDate(to);
  } else {
    const fn = RANGE[range];
    if (!fn) throw new AppError('Invalid report range. Use today, week or month.');
    [start, end] = fn();
  }
  if (start > end) throw new AppError('Start date cannot be after end date.');

  const filter = { date: { $gte: start, $lte: end } };
  if (status) filter.status = status;

  let visits = await VisitRequest.find(filter)
    .populate('employee', 'name employeeId department designation')
    .lean();

  if (department) {
    const deptLower = department.toLowerCase();
    visits = visits.filter((v) => v.employee?.department?.toLowerCase() === deptLower);
  }

  const sum = (arr) => arr.length;
  const summary = {
    range: { from: start, to: end },
    total: visits.length,
    pending: sum(visits.filter((v) => v.status === VISIT_STATUS.PENDING)),
    approved: sum(visits.filter((v) => v.status === VISIT_STATUS.APPROVED)),
    checkedIn: sum(visits.filter((v) => v.status === VISIT_STATUS.CHECKED_IN)),
    checkedOut: sum(visits.filter((v) => v.status === VISIT_STATUS.CHECKED_OUT)),
    rejected: sum(visits.filter((v) => v.status === VISIT_STATUS.REJECTED)),
    cancelled: sum(visits.filter((v) => v.status === VISIT_STATUS.CANCELLED)),
    uniqueVisitors: new Set(
      visits.map((v) => v.visitor.email || v.visitor.phone || v.visitor.name)
    ).size,
    averageDurationMinutes: null,
  };

  const durations = visits
    .filter((v) => v.checkInTime && v.checkOutTime)
    .map((v) => (new Date(v.checkOutTime) - new Date(v.checkInTime)) / 60000);
  if (durations.length) {
    summary.averageDurationMinutes = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  }

  const byDate = [];
  const dateMap = new Map();
  visits.forEach((v) => {
    const key = v.date;
    if (!dateMap.has(key)) {
      dateMap.set(key, { date: key, total: 0, checkedIn: 0, checkedOut: 0 });
    }
    const row = dateMap.get(key);
    row.total += 1;
    if (v.status === VISIT_STATUS.CHECKED_IN) row.checkedIn += 1;
    if (v.status === VISIT_STATUS.CHECKED_OUT) row.checkedOut += 1;
  });
  dateMap.forEach((row) => byDate.push(row));
  byDate.sort((a, b) => (a.date < b.date ? -1 : 1));

  const empMap = new Map();
  visits.forEach((v) => {
    const key = v.employee ? v.employee._id.toString() : 'none';
    if (!empMap.has(key)) {
      empMap.set(key, {
        employee: v.employee ? v.employee.name : 'Unassigned',
        employeeId: v.employee ? v.employee.employeeId : '',
        total: 0,
      });
    }
    empMap.get(key).total += 1;
  });
  const topEmployees = [...empMap.values()].sort((a, b) => b.total - a.total).slice(0, 8);

  const companyMap = new Map();
  visits.forEach((v) => {
    const c = (v.visitor.company || 'Not specified').trim();
    companyMap.set(c, (companyMap.get(c) || 0) + 1);
  });
  const topCompanies = [...companyMap.entries()]
    .map(([company, total]) => ({ company, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const deptMap = new Map();
  visits.forEach((v) => {
    const d = v.employee?.department || 'Unassigned';
    deptMap.set(d, (deptMap.get(d) || 0) + 1);
  });
  const byDepartment = [...deptMap.entries()]
    .map(([department, total]) => ({ department, total }))
    .sort((a, b) => b.total - a.total);

  res.json({ success: true, data: { summary, byDate, topEmployees, topCompanies, byDepartment } });
});

export const activityFeed = asyncHandler(async (req, res) => {
  const { action = '', from, to, user = '', department = '', page = 1, limit = 20 } = req.query;

  const match = {};
  if (action) match['activities.action'] = action;

  if (from || to) {
    match['activities.timestamp'] = {};
    if (from) match['activities.timestamp'].$gte = new Date(`${from}T00:00:00`);
    if (to) match['activities.timestamp'].$lte = new Date(`${to}T23:59:59`);
  }

  if (user) match['activities.user'] = user;

  let employeeIds = null;
  if (department) {
    const emps = await Employee.find({ department: new RegExp(department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).select('_id');
    employeeIds = emps.map((e) => e._id);
    if (employeeIds.length === 0) {
      return res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    }
    match.employee = { $in: employeeIds };
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, parseInt(limit, 10) || 20);

  const aggregate = await VisitRequest.aggregate([
    { $match: match },
    { $unwind: '$activities' },
    { $match: { 'activities.action': match['activities.action'] || { $exists: true }, ...(match['activities.timestamp'] ? { 'activities.timestamp': match['activities.timestamp'] } : {}), ...(match['activities.user'] ? { 'activities.user': match['activities.user'] } : {}) } },
    {
      $lookup: {
        from: 'users',
        localField: 'activities.user',
        foreignField: '_id',
        as: 'actor',
      },
    },
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee',
      },
    },
    { $unwind: { path: '$actor', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    { $sort: { 'activities.timestamp': -1 } },
    {
      $facet: {
        data: [
          {
            $project: {
              visitorName: '$visitor.name',
              visitorPhone: '$visitor.phone',
              employeeName: '$employee.name',
              employeeDepartment: '$employee.department',
              date: 1,
              status: 1,
              action: '$activities.action',
              note: '$activities.note',
              timestamp: '$activities.timestamp',
              actorName: { $ifNull: ['$actor.name', 'Unknown'] },
              actorRole: { $ifNull: ['$actor.role', 'unknown'] },
            },
          },
          { $skip: (p - 1) * l },
          { $limit: l },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const [{ data, total }] = aggregate;
  const count = total.length ? total[0].count : 0;
  res.json({ success: true, data, pagination: { page: p, limit: l, total: count, pages: Math.ceil(count / l) || 0 } });
});
