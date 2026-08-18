import AuditLog from '../models/AuditLog.js';

export async function logAudit({ action, entity, entityId, user, req, changes = null }) {
  try {
    await AuditLog.create({
      action,
      entity,
      entityId: entityId || null,
      user: user?._id || user,
      changes,
      ip: req?.ip || req?.connection?.remoteAddress || '',
      userAgent: req?.get?.('user-agent') || '',
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit entry:', err.message);
  }
}
