import { schedule as cronSchedule, ScheduledTask } from 'node-cron';
import { pool } from '../database/connection';
import { RowDataPacket } from 'mysql2';
import { schedulerLogger as log } from '../utils/logger';

let scheduledTask: ScheduledTask | null = null;
let lastRunAt: Date | null = null;

async function getSchedulerIntervalMinutes(): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT config_value FROM system_config WHERE config_key = 'scheduler_interval'"
  );
  const row = (rows as RowDataPacket[])[0];
  const val = row ? parseInt(row.config_value as string, 10) : 60;
  return isNaN(val) || val < 1 ? 60 : val;
}

async function flagProjectHealth(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const [projects] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM projects WHERE status IN ('ACTIVE', 'PLANNED')"
  );

  for (const project of projects as RowDataPacket[]) {
    const projectId = project.id;
    let   health    = 'ON_TRACK';

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
  }
}

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

function getLastMonday(): string {
  const now      = new Date();
  const dayOfWeek = now.getDay();
  const daysBack  = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday    = new Date(now);
  monday.setDate(now.getDate() - daysBack - 7);
  return monday.toISOString().split('T')[0];
}

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
