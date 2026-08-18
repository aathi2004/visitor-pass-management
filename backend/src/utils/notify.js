import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendEmail, visitApprovedEmail, visitRejectedEmail, visitRegisteredEmail, visitCheckedInEmail, visitCheckedOutEmail, visitCancelledEmail } from './email.js';

const ACTOR_NAME = (user) => user?.name || 'System';

export async function createNotification({ user, type, title, message, visit = null }) {
  try {
    await Notification.create({ user, type, title, message, visit, timestamp: new Date() });
  } catch (err) {
    console.error('[Notification] Failed to create notification:', err.message);
  }
}

async function resolveUserEmail(userId) {
  try {
    const user = await User.findById(userId).select('email').lean();
    return user?.email || null;
  } catch {
    return null;
  }
}

export async function notifyVisitRegistered(visit, actor) {
  const employeeUserId = visit.employee?._doc?.user || visit.employee?.user || null;
  if (!employeeUserId) return;

  const title = 'New Visit Request';
  const message = `${ACTOR_NAME(actor)} registered a visit request for ${visit.visitor?.name} on ${visit.date}.`;

  await createNotification({
    user: employeeUserId,
    type: 'visit_registered',
    title,
    message,
    visit: visit._id,
  });

  if (visit.employee?._doc?.email) {
    await sendEmail(visitRegisteredEmail(visit.employee._doc.email, visit, actor));
  }
}

export async function notifyVisitApproved(visit, actor) {
  const createdByUserId = visit.createdBy?._doc?._id || visit.createdBy?._id || visit.createdBy;
  if (!createdByUserId) return;

  const title = 'Visit Request Approved';
  const message = `${ACTOR_NAME(actor)} approved the visit request for ${visit.visitor?.name} on ${visit.date}.`;

  await createNotification({
    user: createdByUserId,
    type: 'visit_approved',
    title,
    message,
    visit: visit._id,
  });

  const creatorEmail = visit.createdBy?._doc?.email || visit.createdBy?.email || await resolveUserEmail(createdByUserId);
  if (creatorEmail) {
    await sendEmail(visitApprovedEmail(creatorEmail, visit, actor));
  }
}

export async function notifyVisitRejected(visit, actor) {
  const createdByUserId = visit.createdBy?._doc?._id || visit.createdBy?._id || visit.createdBy;
  if (!createdByUserId) return;

  const title = 'Visit Request Rejected';
  const message = `${ACTOR_NAME(actor)} rejected the visit request for ${visit.visitor?.name} on ${visit.date}.${visit.remark ? ` Reason: ${visit.remark}` : ''}`;

  await createNotification({
    user: createdByUserId,
    type: 'visit_rejected',
    title,
    message,
    visit: visit._id,
  });

  const creatorEmail = visit.createdBy?._doc?.email || visit.createdBy?.email || await resolveUserEmail(createdByUserId);
  if (creatorEmail) {
    await sendEmail(visitRejectedEmail(creatorEmail, visit, actor));
  }
}

export async function notifyVisitCheckedIn(visit, actor) {
  const employeeUserId = visit.employee?._doc?.user || visit.employee?.user || null;
  if (!employeeUserId) return;

  await createNotification({
    user: employeeUserId,
    type: 'visit_checked_in',
    title: 'Visitor Checked In',
    message: `${visit.visitor?.name} has checked in for their visit with ${visit.employee?.name || 'you'}.`,
    visit: visit._id,
  });

  const empEmail = visit.employee?._doc?.email || visit.employee?.email || null;
  if (empEmail) {
    await sendEmail(visitCheckedInEmail(empEmail, visit));
  }
}

export async function notifyVisitCheckedOut(visit, actor) {
  const employeeUserId = visit.employee?._doc?.user || visit.employee?.user || null;
  if (!employeeUserId) return;

  await createNotification({
    user: employeeUserId,
    type: 'visit_checked_out',
    title: 'Visitor Checked Out',
    message: `${visit.visitor?.name} has checked out from their visit.`,
    visit: visit._id,
  });

  const empEmail = visit.employee?._doc?.email || visit.employee?.email || null;
  if (empEmail) {
    await sendEmail(visitCheckedOutEmail(empEmail, visit));
  }
}

export async function notifyVisitCancelled(visit, actor) {
  const employeeUserId = visit.employee?._doc?.user || visit.employee?.user || null;
  if (employeeUserId) {
    await createNotification({
      user: employeeUserId,
      type: 'visit_cancelled',
      title: 'Visit Request Cancelled',
      message: `${ACTOR_NAME(actor)} cancelled the visit request for ${visit.visitor?.name} on ${visit.date}.`,
      visit: visit._id,
    });

    const empEmail = visit.employee?._doc?.email || visit.employee?.email || null;
    if (empEmail) {
      await sendEmail(visitCancelledEmail(empEmail, visit, actor));
    }
  }
}
