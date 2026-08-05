import VisitRequest, { VISIT_STATUS } from '../models/VisitRequest.js';
import { AppError } from './AppError.js';

/**
 * Date/time helpers (local server time).
 */
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
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Rule 3 - Visit date cannot be earlier than the current date.
 * Rule 4 - For today's registrations, expected arrival time cannot be earlier
 *          than the current time.
 */
export function validateVisitTiming({ date, expectedArrivalTime }) {
  const today = todayStr();
  if (date < today) {
    throw new AppError('Visit date cannot be earlier than the current date.');
  }
  if (date === today && toMinutes(expectedArrivalTime) < nowMinutes()) {
    throw new AppError(
      'Expected arrival time for today cannot be earlier than the current time.'
    );
  }
}

function visitorMatch(body) {
  const or = [];
  if (body.email) or.push({ 'visitor.email': body.email.toLowerCase().trim() });
  if (body.phone) or.push({ 'visitor.phone': body.phone.trim() });
  if (body.idNumber) or.push({ 'visitor.idNumber': body.idNumber.trim() });
  return or;
}

/**
 * Rule 2 - Duplicate visitor registrations for the same visitor on the same
 *          date should not be allowed.
 * Rule 1 - A visitor cannot have more than one active visit at the same time.
 * Rule 5 - An employee cannot have more than three pending requests.
 */
export async function validateRegistration(VisitRequestModel, body, excludeId = null) {
  const { date, expectedArrivalTime, expectedDepartureTime } = body;
  const today = todayStr();
  validateVisitTiming(body);

  const match = visitorMatch(body);
  if (!match.length) {
    throw new AppError('Provide at least one of email, phone or ID number.');
  }

  const idFilter = excludeId ? { _id: { $ne: excludeId } } : {};
  const sameVisitor = await VisitRequestModel.find({ $and: [{ $or: match }, idFilter] });

  // Rule 2 - same visitor, same date, request not cancelled.
  const duplicate = sameVisitor.find(
    (v) => v.date === date && v.status !== VISIT_STATUS.CANCELLED
  );
  if (duplicate) {
    throw new AppError(
      `Duplicate registration not allowed. This visitor already has a registration for ${date}.`
    );
  }

  // Rule 1 - overlapping active visit (pending / approved / checked_in).
  const arrivalMin = toMinutes(expectedArrivalTime);
  const departMin = toMinutes(expectedDepartureTime);

  const overlaps = sameVisitor.filter((v) => {
    if (![VISIT_STATUS.PENDING, VISIT_STATUS.APPROVED, VISIT_STATUS.CHECKED_IN].includes(v.status)) {
      return false;
    }
    if (v.date !== date) return false;
    const vA = toMinutes(v.expectedArrivalTime);
    const vD = toMinutes(v.expectedDepartureTime);
    return arrivalMin < vD && departMin > vA;
  });

  if (overlaps.length) {
    throw new AppError(
      'This visitor already has an active visit during the requested time slot.'
    );
  }

  // Rule 5 - employee max 3 pending requests.
  if (body.employee) {
    const pendingCount = await VisitRequestModel.countDocuments({
      employee: body.employee,
      status: VISIT_STATUS.PENDING,
    });
    if (pendingCount >= 3) {
      throw new AppError(
        'This employee already has 3 pending visitor requests awaiting approval.'
      );
    }
  }
}

/**
 * Rules 6, 7, 9 - Only approved visitors can be checked in; a checked-in
 * visitor cannot be checked in again; rejected requests cannot be checked in.
 */
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

/**
 * Rule 8 - Check-out time must always be later than check-in time.
 * Rule 7 - Cannot check out without being checked in.
 */
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

/**
 * Helper to append an activity entry to a visit request.
 */
export function addActivity(visit, action, user, note = '') {
  visit.activities.push({
    action,
    user: user._id || user,
    timestamp: new Date(),
    note,
  });
}
