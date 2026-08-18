import VisitRequest, { VISIT_STATUS } from '../models/VisitRequest.js';
import SystemConfig from '../models/SystemConfig.js';
import { AppError } from './AppError.js';

export const todayStr = () => toDateStr(new Date());

export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export function toMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return -1;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function validateVisitTiming({ date, expectedArrivalTime }) {
  const today = todayStr();
  if (date < today) {
    throw new AppError('Visit date cannot be earlier than the current date.');
  }
  if (date === today && toMinutes(expectedArrivalTime) < nowMinutes() - 1) {
    throw new AppError('Expected arrival time for today cannot be earlier than the current time.');
  }
}

function visitorMatch(body) {
  const or = [];
  if (body.email) or.push({ 'visitor.email': body.email.toLowerCase().trim() });
  if (body.phone) or.push({ 'visitor.phone': body.phone.trim() });
  if (body.idNumber) or.push({ 'visitor.idNumber': body.idNumber.trim() });
  return or;
}

export async function validateRegistration(VisitRequestModel, body, excludeId = null) {
  const { date, expectedArrivalTime } = body;
  validateVisitTiming(body);

  const match = visitorMatch(body);
  if (!match.length) {
    throw new AppError('Provide at least one of email, phone or ID number.');
  }

  const idFilter = excludeId ? { _id: { $ne: excludeId } } : {};
  const sameVisitor = await VisitRequestModel.find({ $and: [{ $or: match }, idFilter] });

  const duplicate = sameVisitor.find(
    (v) => v.date === date && v.status !== VISIT_STATUS.CANCELLED
  );
  if (duplicate) {
    throw new AppError(`Duplicate registration not allowed. This visitor already has a registration for ${date}.`);
  }

  const arrivalMin = toMinutes(expectedArrivalTime);
  const overlaps = sameVisitor.filter((v) => {
    if (![VISIT_STATUS.PENDING, VISIT_STATUS.APPROVED, VISIT_STATUS.CHECKED_IN].includes(v.status)) {
      return false;
    }
    if (v.date !== date) return false;
    const vA = toMinutes(v.expectedArrivalTime);
    const vD = v.slotEndTime ? new Date(v.slotEndTime).getHours() * 60 + new Date(v.slotEndTime).getMinutes() : vA + 60;
    return arrivalMin < vD;
  });

  if (overlaps.length) {
    throw new AppError('This visitor already has an active visit during the requested time slot.');
  }

  const config = await SystemConfig.getConfig();
  const activeCount = await VisitRequestModel.countDocuments({
    status: { $in: [VISIT_STATUS.PENDING, VISIT_STATUS.APPROVED, VISIT_STATUS.CHECKED_IN] },
  });
  if (activeCount >= config.maxQueueSize) {
    throw new AppError(`System queue is full. Maximum ${config.maxQueueSize} active visits allowed.`);
  }
}

export function canCheckIn(visit) {
  if (!visit) throw new AppError('Visit request not found.', 404);
  if (visit.status === VISIT_STATUS.CANCELLED) {
    throw new AppError('This visit was cancelled and cannot be checked in.');
  }
  if (visit.status === VISIT_STATUS.REJECTED) {
    throw new AppError('This visit was rejected and cannot be checked in.');
  }
  if (visit.status === VISIT_STATUS.CHECKED_OUT) {
    throw new AppError('This visit has already been completed.');
  }
  if (visit.status === VISIT_STATUS.CHECKED_IN && visit.checkInTime) {
    throw new AppError('This visitor is already checked in and cannot be checked in again until checked out.');
  }
  if (visit.status !== VISIT_STATUS.APPROVED) {
    throw new AppError('Visitors can only be checked in after their request is approved.');
  }
}

export function canCheckOut(visit, checkOutTime) {
  if (!visit) throw new AppError('Visit request not found.', 404);
  if (!visit.checkInTime) {
    throw new AppError('This visitor has not been checked in yet.');
  }
  if (visit.checkOutTime) {
    throw new AppError('This visitor is already checked out.');
  }
  if (checkOutTime <= new Date(visit.checkInTime)) {
    throw new AppError('Check-out time must be later than check-in time.');
  }
}

export function addActivity(visit, action, user, note = '') {
  visit.activities.push({
    action,
    user: user?._id || user,
    timestamp: new Date(),
    note,
  });
}
