import { schedule as cronSchedule, ScheduledTask } from 'node-cron';
import { pool } from '../database/connection';
import { RowDataPacket } from 'mysql2';
import { schedulerLogger as log } from '../utils/logger';
import { LLMFactory } from '../ai/llm.factory';
import { LLMProvider } from '../models/interfaces/SystemConfig';
import {
  sendMail,
  buildReminderEmail, buildManagerReminderEmail,
  buildFreezeEmail, buildManagerFreezeEmail,
  buildAtRiskEmail,
} from '../services/email.service';

let scheduledTask: ScheduledTask | null = null;
let lastRunAt: Date | null = null;

// ── Config ────────────────────────────────────────────────────────────────────

async function getSchedulerIntervalMinutes(): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT config_value FROM system_config WHERE config_key = 'scheduler_interval'"
  );
  const row = (rows as RowDataPacket[])[0];
  const val = row ? parseInt(row.config_value as string, 10) : 60;
  return isNaN(val) || val < 1 ? 60 : val;
}

async function getLLMConfig(): Promise<{ provider: LLMProvider; apiKey: string } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT config_key, config_value FROM system_config WHERE config_key IN ('llm_provider','llm_api_key')"
  );
  const map: Record<string, string> = {};
  for (const r of rows as RowDataPacket[]) map[r.config_key as string] = r.config_value as string;
  if (!map.llm_api_key) return null;
  return { provider: (map.llm_provider || 'gemini') as LLMProvider, apiKey: map.llm_api_key };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLastMonday(): string {
  const now       = new Date();
  const dayOfWeek = now.getDay();
  const daysBack  = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday    = new Date(now);
  monday.setDate(now.getDate() - daysBack - 7);
  return monday.toISOString().split('T')[0];
}

function workingDaysSince(from: Date): number {
  const now = new Date();
  let count = 0;
  const d   = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d <= now) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// ── Job 1: Flag Project Health + AT_RISK emails ───────────────────────────────

async function flagProjectHealth(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const [projects] = await pool.execute<RowDataPacket[]>(
    "SELECT id, name, end_date, health_status, manager_id FROM projects WHERE status IN ('ACTIVE', 'PLANNED')"
  );

  for (const project of projects as RowDataPacket[]) {
    const projectId    = project.id as number;
    const previousHealth = project.health_status as string;
    let health = 'ON_TRACK';

    const [overdue] = await pool.execute<RowDataPacket[]>(`
      SELECT COUNT(*) AS cnt FROM milestones
      WHERE project_id = ? AND status != 'DONE' AND due_date < ?
    `, [projectId, today]);

    if ((overdue[0] as RowDataPacket).cnt > 0) {
      health = 'AT_RISK';
    } else {
      const lastMonday = getLastMonday();
      const [lowEffort] = await pool.execute<RowDataPacket[]>(`
        SELECT COUNT(*) AS cnt
        FROM allocations a
        JOIN employees e ON a.employee_id = e.id
        LEFT JOIN (
          SELECT te.project_id, t.employee_id, SUM(te.hours_worked) AS logged_hours
          FROM timesheet_entries te
          JOIN timesheets t ON te.timesheet_id = t.id
          WHERE t.week_start_date = ?
          GROUP BY te.project_id, t.employee_id
        ) ts ON ts.project_id = a.project_id AND ts.employee_id = a.employee_id
        JOIN system_config sc ON sc.config_key = 'max_weekly_hours'
        WHERE a.project_id = ? AND a.is_active = TRUE
          AND COALESCE(ts.logged_hours, 0) < (a.utilisation_pct / 100) * CAST(sc.config_value AS DECIMAL) * 0.5
      `, [lastMonday, projectId]);

      if ((lowEffort[0] as RowDataPacket).cnt > 0) {
        health = 'ATTENTION';
      }
    }

    await pool.execute(
      'UPDATE projects SET health_status = ? WHERE id = ?',
      [health, projectId]
    );

    // Send AT_RISK email only when transitioning into AT_RISK
    if (health === 'AT_RISK' && previousHealth !== 'AT_RISK' && project.manager_id) {
      sendAtRiskEmail(projectId, project.name as string, project.end_date as string, project.manager_id as number)
        .catch(err => log.error(`AT_RISK email failed for project ${projectId}: ${(err as Error).message}`));
    }
  }
}

async function sendAtRiskEmail(
  projectId:   number,
  projectName: string,
  endDate:     string,
  managerId:   number
): Promise<void> {
  // Manager details
  const [mgrRows] = await pool.execute<RowDataPacket[]>(
    'SELECT full_name, email FROM employees WHERE id = ?', [managerId]
  );
  const mgr = (mgrRows as RowDataPacket[])[0];
  if (!mgr || !mgr.email) return;

  // Overdue milestone count
  const today = new Date().toISOString().split('T')[0];
  const [overdueRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS cnt FROM milestones WHERE project_id = ? AND status != ? AND due_date < ?',
    [projectId, 'DONE', today]
  );
  const overdueCount = (overdueRows[0] as RowDataPacket).cnt as number;

  // All milestones
  const [milestoneRows] = await pool.execute<RowDataPacket[]>(
    'SELECT name, due_date, status FROM milestones WHERE project_id = ? ORDER BY due_date',
    [projectId]
  );
  const milestones = (milestoneRows as RowDataPacket[]).map(m => ({
    name:     m.name as string,
    due_date: String(m.due_date),
    status:   m.status as string,
  }));

  // Bench employees
  const [benchRows] = await pool.execute<RowDataPacket[]>(`
    SELECT e.full_name AS name,
           GROUP_CONCAT(s.skill_name ORDER BY s.skill_name SEPARATOR ', ') AS skills
    FROM employees e
    LEFT JOIN employee_skills es ON es.employee_id = e.id
    LEFT JOIN skills s           ON s.id = es.skill_id
    WHERE e.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM allocations a
        WHERE a.employee_id = e.id AND a.is_active = TRUE
          AND a.from_date <= CURDATE() AND a.to_date >= CURDATE()
      )
    GROUP BY e.id, e.full_name
    ORDER BY e.full_name
  `);
  const benchEmployees = (benchRows as RowDataPacket[]).map(b => ({
    name:   b.name as string,
    skills: b.skills as string ?? '',
  }));

  // AI risk summary (optional)
  let aiSummary: string | null = null;
  try {
    const llmConfig = await getLLMConfig();
    if (llmConfig) {
      const llm     = LLMFactory.create(llmConfig.provider, llmConfig.apiKey);
      const context = JSON.stringify({
        project_name: projectName,
        end_date:     endDate,
        overdue_milestones: overdueCount,
        milestones,
        bench_employees: benchEmployees.slice(0, 5),
      });
      aiSummary = await llm.riskSummary(context);
    }
  } catch (err) {
    log.error(`AI summary for AT_RISK email failed: ${(err as Error).message}`);
  }

  const { subject, html } = buildAtRiskEmail({
    managerName:    mgr.full_name as string,
    projectName,
    endDate,
    overdueCount,
    milestones,
    benchEmployees,
    aiSummary,
  });

  await sendMail({ to: mgr.email as string, subject, html });
  log.info(`AT_RISK email sent to ${mgr.email} for project "${projectName}"`);
}

// ── Job 2: Mark Missed Timesheets ─────────────────────────────────────────────

async function markMissedTimesheets(): Promise<void> {
  const lastMonday = getLastMonday();
  const today      = new Date();

  if (today.getDay() === 1) return;

  const [missing] = await pool.execute<RowDataPacket[]>(`
    SELECT DISTINCT e.id AS employee_id
    FROM employees e
    JOIN employee_roles er ON er.employee_id = e.id
    JOIN roles r           ON er.role_id     = r.id AND r.name = 'RESOURCE'
    JOIN allocations a     ON a.employee_id  = e.id
    WHERE e.is_active  = TRUE
      AND a.is_active  = TRUE
      AND a.from_date <= ? AND a.to_date >= ?
      AND NOT EXISTS (
        SELECT 1 FROM timesheets t
        WHERE t.employee_id = e.id AND t.week_start_date = ?
      )
  `, [lastMonday, lastMonday, lastMonday]);

  for (const row of missing as RowDataPacket[]) {
    await pool.execute(
      `INSERT INTO timesheets (employee_id, week_start_date, status, total_hours)
       VALUES (?, ?, 'MISSED', 0)
       ON DUPLICATE KEY UPDATE status = 'MISSED'`,
      [row.employee_id, lastMonday]
    );
  }
}

// ── Job 3: Timesheet Reminders & Account Freeze ───────────────────────────────

async function processTimesheetReminders(): Promise<void> {
  const lastMonday = getLastMonday();
  const now        = new Date();

  // All employees with MISSED timesheet for last week (still unsubmitted)
  const [missed] = await pool.execute<RowDataPacket[]>(`
    SELECT e.id AS employee_id, e.full_name, e.email,
           tr.reminder_1_sent_at, tr.reminder_2_sent_at, tr.frozen_at, tr.unfrozen_at
    FROM timesheets t
    JOIN employees  e ON e.id = t.employee_id
    LEFT JOIN timesheet_reminders tr
           ON tr.employee_id = t.employee_id AND tr.week_start_date = t.week_start_date
    WHERE t.week_start_date = ? AND t.status = 'MISSED'
  `, [lastMonday]);

  for (const row of missed as RowDataPacket[]) {
    const employeeId  = row.employee_id as number;
    const fullName    = row.full_name as string;
    const email       = row.email as string;
    const r1SentAt    = row.reminder_1_sent_at ? new Date(row.reminder_1_sent_at as string) : null;
    const r2SentAt    = row.reminder_2_sent_at ? new Date(row.reminder_2_sent_at as string) : null;
    const frozenAt    = row.frozen_at          ? new Date(row.frozen_at as string)          : null;
    const unfrozenAt  = row.unfrozen_at        ? new Date(row.unfrozen_at as string)        : null;

    // Skip if currently frozen and not yet unfrozen
    if (frozenAt && !unfrozenAt) continue;

    // Ensure reminder record exists
    await pool.execute(
      `INSERT INTO timesheet_reminders (employee_id, week_start_date)
       VALUES (?, ?) ON DUPLICATE KEY UPDATE employee_id = employee_id`,
      [employeeId, lastMonday]
    );

    // Find reporting manager (via project allocation)
    const manager = await getReportingManager(employeeId);

    if (!r1SentAt) {
      // Send Reminder 1
      const { subject, html } = buildReminderEmail({ employeeName: fullName, weekStartDate: lastMonday, reminderNum: 1 });
      await sendMail({ to: email, subject, html });

      if (manager) {
        const mgr = buildManagerReminderEmail({ managerName: manager.name, employeeName: fullName, weekStartDate: lastMonday, reminderNum: 1 });
        await sendMail({ to: manager.email, subject: mgr.subject, html: mgr.html });
      }

      await pool.execute(
        'UPDATE timesheet_reminders SET reminder_1_sent_at = ? WHERE employee_id = ? AND week_start_date = ?',
        [now, employeeId, lastMonday]
      );
      log.info(`Reminder 1 sent to ${email} (week ${lastMonday})`);

    } else if (!r2SentAt && workingDaysSince(r1SentAt) >= 1) {
      // Send Reminder 2
      const { subject, html } = buildReminderEmail({ employeeName: fullName, weekStartDate: lastMonday, reminderNum: 2 });
      await sendMail({ to: email, subject, html });

      if (manager) {
        const mgr = buildManagerReminderEmail({ managerName: manager.name, employeeName: fullName, weekStartDate: lastMonday, reminderNum: 2 });
        await sendMail({ to: manager.email, subject: mgr.subject, html: mgr.html });
      }

      await pool.execute(
        'UPDATE timesheet_reminders SET reminder_2_sent_at = ? WHERE employee_id = ? AND week_start_date = ?',
        [now, employeeId, lastMonday]
      );
      log.info(`Reminder 2 sent to ${email} (week ${lastMonday})`);

    } else if (r1SentAt && r2SentAt && !frozenAt && workingDaysSince(r2SentAt) >= 1) {
      // Freeze
      await pool.execute(
        'UPDATE user_accounts SET timesheet_frozen = 1 WHERE employee_id = ?',
        [employeeId]
      );
      await pool.execute(
        'UPDATE timesheet_reminders SET frozen_at = ? WHERE employee_id = ? AND week_start_date = ?',
        [now, employeeId, lastMonday]
      );

      const { subject, html } = buildFreezeEmail({ employeeName: fullName, weekStartDate: lastMonday });
      await sendMail({ to: email, subject, html });

      if (manager) {
        const mgr = buildManagerFreezeEmail({ managerName: manager.name, employeeName: fullName, weekStartDate: lastMonday });
        await sendMail({ to: manager.email, subject: mgr.subject, html: mgr.html });
      }

      log.info(`Account frozen for employee ${employeeId} (week ${lastMonday})`);
    }
  }
}

async function getReportingManager(employeeId: number): Promise<{ name: string; email: string } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(`
    SELECT mgr.full_name AS name, mgr.email
    FROM allocations a
    JOIN projects  p   ON p.id  = a.project_id
    JOIN employees mgr ON mgr.id = p.manager_id
    WHERE a.employee_id = ? AND a.is_active = TRUE
      AND a.from_date <= CURDATE() AND a.to_date >= CURDATE()
      AND p.manager_id IS NOT NULL
    LIMIT 1
  `, [employeeId]);
  const row = (rows as RowDataPacket[])[0];
  if (!row) return null;
  return { name: row.name as string, email: row.email as string };
}

// ── Main run loop ─────────────────────────────────────────────────────────────

async function runJobs(): Promise<void> {
  try {
    const intervalMinutes = await getSchedulerIntervalMinutes();
    const intervalMs      = intervalMinutes * 60 * 1000;
    const now             = new Date();

    if (lastRunAt && (now.getTime() - lastRunAt.getTime()) < intervalMs) {
      return;
    }

    lastRunAt = now;
    await flagProjectHealth();
    await markMissedTimesheets();
    await processTimesheetReminders();
    log.info(`Jobs completed at ${now.toISOString()} (interval: ${intervalMinutes}min)`);
  } catch (err) {
    log.error(`Job failed: ${(err as Error).message}`);
  }
}

export async function startScheduler(): Promise<void> {
  const intervalMinutes = await getSchedulerIntervalMinutes();
  scheduledTask = cronSchedule('* * * * *', runJobs);
  log.info(`Started — checking every minute, running every ${intervalMinutes}min`);
  await runJobs();
}

export function stopScheduler(): void {
  scheduledTask?.stop();
}
