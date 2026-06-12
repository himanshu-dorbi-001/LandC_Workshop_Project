import nodemailer from 'nodemailer';
import { ENV } from '../config/env';
import { schedulerLogger as log } from '../utils/logger';

interface MailOptions {
  to:      string | string[];
  subject: string;
  html:    string;
}

function createTransporter() {
  if (!ENV.SMTP_USER || !ENV.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host:   ENV.SMTP_HOST,
    port:   ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASS,
    },
  });
}

export async function sendMail(opts: MailOptions): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    log.info(`[EMAIL SKIP] No SMTP config — would send to ${opts.to}: ${opts.subject}`);
    return false;
  }
  try {
    await transporter.sendMail({
      from:    ENV.EMAIL_FROM,
      to:      Array.isArray(opts.to) ? opts.to.join(',') : opts.to,
      subject: opts.subject,
      html:    opts.html,
    });
    log.info(`[EMAIL SENT] To: ${opts.to} | Subject: ${opts.subject}`);
    return true;
  } catch (err) {
    log.error(`[EMAIL FAIL] ${(err as Error).message}`);
    return false;
  }
}

export function buildReminderEmail(params: {
  employeeName:  string;
  weekStartDate: string;
  reminderNum:   1 | 2;
}): { subject: string; html: string } {
  const { employeeName, weekStartDate, reminderNum } = params;
  const subject = reminderNum === 1
    ? `[PRM] Timesheet Reminder — Week of ${weekStartDate}`
    : `[PRM] Final Timesheet Reminder — Week of ${weekStartDate}`;

  const warning = reminderNum === 2
    ? '<p style="color:#c0392b;font-weight:bold;">⚠️ This is your final reminder. Failure to submit will result in your timesheet access being frozen.</p>'
    : '';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px">
      <h2 style="color:#2c3e50">Timesheet Submission Required</h2>
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>Your timesheet for the week starting <strong>${weekStartDate}</strong> has not been submitted yet.</p>
      ${warning}
      <p>Please log in to the PRM Tool and submit your timesheet as soon as possible.</p>
      <p style="color:#7f8c8d;font-size:12px">This is an automated message from the PRM Tool.</p>
    </div>`;

  return { subject, html };
}

export function buildManagerReminderEmail(params: {
  managerName:   string;
  employeeName:  string;
  weekStartDate: string;
  reminderNum:   1 | 2;
}): { subject: string; html: string } {
  const { managerName, employeeName, weekStartDate, reminderNum } = params;
  const subject = `[PRM] Team Member Timesheet Reminder ${reminderNum} — ${employeeName}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px">
      <h2 style="color:#2c3e50">Team Timesheet Alert</h2>
      <p>Hi <strong>${managerName}</strong>,</p>
      <p>This is an automated notice that <strong>${employeeName}</strong> has not submitted their timesheet
         for the week starting <strong>${weekStartDate}</strong>.</p>
      <p>Reminder <strong>#${reminderNum}</strong> has been sent to the employee.</p>
      ${reminderNum === 2 ? '<p style="color:#c0392b">If the timesheet remains unsubmitted, access will be frozen.</p>' : ''}
      <p style="color:#7f8c8d;font-size:12px">This is an automated message from the PRM Tool.</p>
    </div>`;
  return { subject, html };
}

export function buildFreezeEmail(params: {
  employeeName:  string;
  weekStartDate: string;
}): { subject: string; html: string } {
  const { employeeName, weekStartDate } = params;
  const subject = `[PRM] Timesheet Access Frozen — Week of ${weekStartDate}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px">
      <h2 style="color:#c0392b">Timesheet Access Frozen</h2>
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>Your timesheet submission access has been <strong>frozen</strong> because the timesheet for the week
         starting <strong>${weekStartDate}</strong> was not submitted after two reminders.</p>
      <p>You can still log in and view your records, but you cannot submit timesheets until a manager restores your access.</p>
      <p>Please contact your reporting manager to resolve this.</p>
      <p style="color:#7f8c8d;font-size:12px">This is an automated message from the PRM Tool.</p>
    </div>`;
  return { subject, html };
}

export function buildManagerFreezeEmail(params: {
  managerName:   string;
  employeeName:  string;
  weekStartDate: string;
}): { subject: string; html: string } {
  const { managerName, employeeName, weekStartDate } = params;
  const subject = `[PRM] Timesheet Access Frozen — ${employeeName}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px">
      <h2 style="color:#c0392b">Team Member Access Frozen</h2>
      <p>Hi <strong>${managerName}</strong>,</p>
      <p><strong>${employeeName}</strong>'s timesheet submission access has been automatically <strong>frozen</strong>
         after two unanswered reminders for the week starting <strong>${weekStartDate}</strong>.</p>
      <p>As their reporting manager, you can restore their access from the PRM Tool employee management screen.</p>
      <p style="color:#7f8c8d;font-size:12px">This is an automated message from the PRM Tool.</p>
    </div>`;
  return { subject, html };
}
