import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.host || !config.smtp.user) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();
  if (!transport) {
    console.warn('[Email] SMTP not configured. Skipping email send.');
    return null;
  }
  try {
    const result = await transport.sendMail({
      from: config.emailFrom,
      to,
      subject,
      html,
    });
    return result;
  } catch (err) {
    console.error('[Email] Failed to send email:', err.message);
    return null;
  }
}

export function visitApprovedEmail(toEmail, visit, actor) {
  return {
    to: toEmail,
    subject: `Visit Request Approved - ${visit.visitor?.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Visit Request Approved</h2>
        <p>Hello,</p>
        <p>Your visitor request has been <strong>approved</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #64748b;">Visitor</td><td style="padding: 8px; font-weight: 600;">${visit.visitor?.name}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Date</td><td style="padding: 8px;">${visit.date}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Time</td><td style="padding: 8px;">${visit.expectedArrivalTime} - ${visit.expectedDepartureTime}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Approved by</td><td style="padding: 8px;">${actor?.name || 'Administrator'}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 12px;">Visitor Pass Management System</p>
      </div>
    `,
  };
}

export function visitRejectedEmail(toEmail, visit, actor) {
  return {
    to: toEmail,
    subject: `Visit Request Rejected - ${visit.visitor?.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Visit Request Rejected</h2>
        <p>Hello,</p>
        <p>Your visitor request has been <strong>rejected</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #64748b;">Visitor</td><td style="padding: 8px; font-weight: 600;">${visit.visitor?.name}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Date</td><td style="padding: 8px;">${visit.date}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Reason</td><td style="padding: 8px;">${visit.remark || 'No reason provided'}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Rejected by</td><td style="padding: 8px;">${actor?.name || 'Administrator'}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 12px;">Visitor Pass Management System</p>
      </div>
    `,
  };
}

export function visitCheckedInEmail(toEmail, visit) {
  return {
    to: toEmail,
    subject: `Visitor Checked In - ${visit.visitor?.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Visitor Checked In</h2>
        <p>Hello,</p>
        <p>Your visitor <strong>${visit.visitor?.name}</strong> has checked in.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #64748b;">Visitor</td><td style="padding: 8px; font-weight: 600;">${visit.visitor?.name}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Company</td><td style="padding: 8px;">${visit.visitor?.company || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Date</td><td style="padding: 8px;">${visit.date}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Check-in Time</td><td style="padding: 8px;">${visit.checkInTime ? new Date(visit.checkInTime).toLocaleString() : 'N/A'}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Expected Departure</td><td style="padding: 8px;">${visit.expectedDepartureTime}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 12px;">Visitor Pass Management System</p>
      </div>
    `,
  };
}

export function visitCheckedOutEmail(toEmail, visit) {
  return {
    to: toEmail,
    subject: `Visitor Checked Out - ${visit.visitor?.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Visitor Checked Out</h2>
        <p>Hello,</p>
        <p>Your visitor <strong>${visit.visitor?.name}</strong> has checked out.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #64748b;">Visitor</td><td style="padding: 8px; font-weight: 600;">${visit.visitor?.name}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Date</td><td style="padding: 8px;">${visit.date}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Check-in Time</td><td style="padding: 8px;">${visit.checkInTime ? new Date(visit.checkInTime).toLocaleString() : 'N/A'}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Check-out Time</td><td style="padding: 8px;">${visit.checkOutTime ? new Date(visit.checkOutTime).toLocaleString() : 'N/A'}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 12px;">Visitor Pass Management System</p>
      </div>
    `,
  };
}

export function visitCancelledEmail(toEmail, visit, actor) {
  return {
    to: toEmail,
    subject: `Visit Cancelled - ${visit.visitor?.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Visit Cancelled</h2>
        <p>Hello,</p>
        <p>The visit for <strong>${visit.visitor?.name}</strong> has been cancelled.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #64748b;">Visitor</td><td style="padding: 8px; font-weight: 600;">${visit.visitor?.name}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Date</td><td style="padding: 8px;">${visit.date}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Cancelled by</td><td style="padding: 8px;">${actor?.name || 'System'}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 12px;">Visitor Pass Management System</p>
      </div>
    `,
  };
}

export function visitRegisteredEmail(toEmail, visit, actor) {
  return {
    to: toEmail,
    subject: `New Visit Request - ${visit.visitor?.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Visit Request</h2>
        <p>Hello,</p>
        <p>A new visit request has been registered for you.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #64748b;">Visitor</td><td style="padding: 8px; font-weight: 600;">${visit.visitor?.name}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Company</td><td style="padding: 8px;">${visit.visitor?.company || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Phone</td><td style="padding: 8px;">${visit.visitor?.phone || 'N/A'}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Date</td><td style="padding: 8px;">${visit.date}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Time</td><td style="padding: 8px;">${visit.expectedArrivalTime} - ${visit.expectedDepartureTime}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Purpose</td><td style="padding: 8px;">${visit.purpose}</td></tr>
        </table>
        <p>Please review and approve or reject this request.</p>
        <p style="color: #64748b; font-size: 12px;">Visitor Pass Management System</p>
      </div>
    `,
  };
}
