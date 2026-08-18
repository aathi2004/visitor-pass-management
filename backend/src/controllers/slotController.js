import SystemConfig from '../models/SystemConfig.js';
import Employee from '../models/Employee.js';
import VisitRequest, { VISIT_STATUS, ACTION } from '../models/VisitRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from '../utils/auditLog.js';
import { addActivity } from '../utils/visitRules.js';
import { notifyVisitCheckedOut } from '../utils/notify.js';

export const getConfig = asyncHandler(async (req, res) => {
  const config = await SystemConfig.getConfig();
  res.json({ success: true, data: config });
});

export const updateConfig = asyncHandler(async (req, res) => {
  const { slotDuration, slotUnit, maxQueueSize, maxVisitorsPerEmployee } = req.body;
  const config = await SystemConfig.getConfig();

  if (slotDuration !== undefined) {
    if (typeof slotDuration !== 'number' || slotDuration < 1) {
      throw new AppError('Slot duration must be a number >= 1.');
    }
    config.slotDuration = slotDuration;
  }
  if (slotUnit !== undefined) {
    if (!['seconds', 'minutes'].includes(slotUnit)) {
      throw new AppError('Slot unit must be "seconds" or "minutes".');
    }
    config.slotUnit = slotUnit;
  }
  if (maxQueueSize !== undefined) {
    if (typeof maxQueueSize !== 'number' || maxQueueSize < 1) {
      throw new AppError('Max queue size must be a number >= 1.');
    }
    config.maxQueueSize = maxQueueSize;
  }
  if (maxVisitorsPerEmployee !== undefined) {
    if (typeof maxVisitorsPerEmployee !== 'number' || maxVisitorsPerEmployee < 1) {
      throw new AppError('Max visitors per employee must be a number >= 1.');
    }
    config.maxVisitorsPerEmployee = maxVisitorsPerEmployee;
  }

  await config.save();

  await logAudit({
    action: 'config.updated',
    entity: 'SystemConfig',
    entityId: config._id,
    user: req.user,
    req,
    changes: { after: { slotDuration: config.slotDuration, slotUnit: config.slotUnit, maxQueueSize: config.maxQueueSize, maxVisitorsPerEmployee: config.maxVisitorsPerEmployee } },
  });

  res.json({ success: true, data: config, message: 'Configuration updated.' });
});

export const getQueueStatus = asyncHandler(async (req, res) => {
  const config = await SystemConfig.getConfig();
  const current = await VisitRequest.countDocuments({
    status: { $in: [VISIT_STATUS.PENDING, VISIT_STATUS.APPROVED, VISIT_STATUS.CHECKED_IN] },
  });
  res.json({ success: true, data: { current, max: config.maxQueueSize } });
});

function toMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export async function findAvailableEmployee() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const config = await SystemConfig.getConfig();
  const maxPerEmp = config.maxVisitorsPerEmployee || 3;

  const activeEmployees = await Employee.find({ status: 'active' }).lean();
  if (!activeEmployees.length) return null;

  const hasActiveVisit = async (empId) => {
    return !!(await VisitRequest.exists({
      employee: empId,
      status: { $in: [VISIT_STATUS.APPROVED, VISIT_STATUS.CHECKED_IN] },
      date: today,
    }));
  };

  const withinHours = (emp) => {
    const start = toMinutes(emp.workingHours?.start || '09:00');
    const end = toMinutes(emp.workingHours?.end || '17:00');
    return nowMin >= start && nowMin < end;
  };

  const countToday = async (empId) => {
    return VisitRequest.countDocuments({
      employee: empId,
      date: today,
      status: { $in: [VISIT_STATUS.PENDING, VISIT_STATUS.APPROVED, VISIT_STATUS.CHECKED_IN] },
    });
  };

  let candidates = [];
  for (const emp of activeEmployees) {
    const c = await countToday(emp._id);
    if (c < maxPerEmp && withinHours(emp) && !(await hasActiveVisit(emp._id))) {
      candidates.push({ emp, count: c });
    }
  }

  if (!candidates.length) {
    for (const emp of activeEmployees) {
      const c = await countToday(emp._id);
      if (c < maxPerEmp && !(await hasActiveVisit(emp._id))) {
        candidates.push({ emp, count: c });
      }
    }
  }

  if (!candidates.length) {
    for (const emp of activeEmployees) {
      const c = await countToday(emp._id);
      if (c < maxPerEmp) {
        candidates.push({ emp, count: c });
      }
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => a.count - b.count);
  return candidates[0].emp;
}

const SYSTEM_USER = '000000000000000000000000';

export async function autoCompleteVisits() {
  const now = new Date();

  const expired = await VisitRequest.find({
    status: VISIT_STATUS.CHECKED_IN,
    slotEndTime: { $lte: now, $ne: null },
  }).populate('employee', 'name employeeId department email');

  for (const visit of expired) {
    try {
      visit.status = VISIT_STATUS.CHECKED_OUT;
      visit.checkOutTime = now;
      visit.autoCompleted = true;
      visit.activities.push({
        action: ACTION.CHECKED_OUT,
        user: SYSTEM_USER,
        timestamp: now,
        note: 'Auto-completed: time slot expired',
      });
      await visit.save();

      await logAudit({
        action: 'visit.auto_completed',
        entity: 'VisitRequest',
        entityId: visit._id,
        user: null,
        changes: { after: { status: 'checked_out', autoCompleted: true } },
      });

      if (visit.employee) {
        await notifyVisitCheckedOut(visit, { _id: SYSTEM_USER, name: 'System' }).catch(() => {});
      }
    } catch (err) {
      console.error('[autoComplete] Failed to complete visit', visit._id, err.message);
    }
  }

  const staleApproved = await VisitRequest.find({
    status: VISIT_STATUS.APPROVED,
    slotEndTime: { $lte: now, $ne: null },
  });

  for (const visit of staleApproved) {
    try {
      visit.status = VISIT_STATUS.CANCELLED;
      visit.autoCompleted = true;
      visit.activities.push({
        action: ACTION.CANCELLED,
        user: SYSTEM_USER,
        timestamp: now,
        note: 'Auto-cancelled: slot expired before check-in',
      });
      await visit.save();

      await logAudit({
        action: 'visit.auto_cancelled',
        entity: 'VisitRequest',
        entityId: visit._id,
        user: null,
        changes: { after: { status: 'cancelled', autoCompleted: true } },
      });
    } catch (err) {
      console.error('[autoComplete] Failed to cancel stale visit', visit._id, err.message);
    }
  }

  return expired.length + staleApproved.length;
}

export const getEmployeeAssignments = asyncHandler(async (req, res) => {
  await autoCompleteVisits();

  const { date } = req.query;
  const today = date || new Date().toISOString().slice(0, 10);
  const config = await SystemConfig.getConfig();
  const maxPerEmp = config.maxVisitorsPerEmployee || 3;

  const activeEmployees = await Employee.find({ status: 'active' }).sort({ name: 1 }).lean();

  const visits = await VisitRequest.find({ date: today })
    .populate('employee', 'name employeeId department designation email')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const empVisitMap = new Map();
  for (const v of visits) {
    const empId = v.employee?._id?.toString() || v.employee?.toString() || 'unassigned';
    if (!empVisitMap.has(empId)) empVisitMap.set(empId, []);
    empVisitMap.get(empId).push(v);
  }

  const result = activeEmployees.map((emp) => {
    const empVisits = empVisitMap.get(emp._id.toString()) || [];
    return {
      employee: {
        _id: emp._id,
        name: emp.name,
        employeeId: emp.employeeId,
        department: emp.department,
        designation: emp.designation,
        email: emp.email,
        workingHours: emp.workingHours,
      },
      assignedCount: empVisits.length,
      maxAllowed: maxPerEmp,
      remaining: Math.max(0, maxPerEmp - empVisits.length),
      visits: empVisits,
    };
  });

  const unassigned = empVisitMap.get('unassigned') || [];
  if (unassigned.length) {
    result.push({
      employee: { _id: null, name: 'Unassigned', employeeId: '—', department: '—', designation: '—', email: '—', workingHours: null },
      assignedCount: unassigned.length,
      maxAllowed: maxPerEmp,
      remaining: 0,
      visits: unassigned,
    });
  }

  res.json({ success: true, data: { date: today, maxPerEmp, employees: result } });
});
