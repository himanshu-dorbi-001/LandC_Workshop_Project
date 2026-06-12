import { pool } from '../../database/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { ITimesheetReminderRepository } from '../interfaces/ITimesheetReminderRepository';
import { TimesheetReminder, ReminderWithEmployee } from '../../models/interfaces/TimesheetReminder';

export class TimesheetReminderRepository implements ITimesheetReminderRepository {

  async findByEmployeeAndWeek(employeeId: number, weekStartDate: string): Promise<TimesheetReminder | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM timesheet_reminders WHERE employee_id = ? AND week_start_date = ?',
      [employeeId, weekStartDate]
    );
    return (rows[0] as TimesheetReminder) ?? null;
  }

  /**
   * Returns rows for employees who:
   *   1. Have a MISSED timesheet for this week
   *   2. Are not yet fully frozen (frozen_at IS NULL) or need a reminder
   * Joins employee name + email + manager info.
   */
  async findPendingForWeek(weekStartDate: string): Promise<ReminderWithEmployee[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT
        COALESCE(tr.id, 0)                 AS id,
        e.id                               AS employee_id,
        ?                                  AS week_start_date,
        tr.reminder_1_sent_at,
        tr.reminder_2_sent_at,
        tr.frozen_at,
        tr.unfrozen_at,
        tr.unfrozen_by,
        COALESCE(tr.created_at, NOW())     AS created_at,
        e.full_name,
        e.email
      FROM timesheets t
      JOIN employees  e  ON e.id = t.employee_id
      LEFT JOIN timesheet_reminders tr
             ON tr.employee_id = t.employee_id AND tr.week_start_date = t.week_start_date
      WHERE t.week_start_date = ?
        AND t.status = 'MISSED'
        AND (tr.frozen_at IS NULL OR tr.unfrozen_at IS NOT NULL)
    `, [weekStartDate, weekStartDate]);
    return rows as ReminderWithEmployee[];
  }

  async upsert(employeeId: number, weekStartDate: string): Promise<TimesheetReminder> {
    await pool.execute<ResultSetHeader>(`
      INSERT INTO timesheet_reminders (employee_id, week_start_date)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE employee_id = employee_id
    `, [employeeId, weekStartDate]);

    const record = await this.findByEmployeeAndWeek(employeeId, weekStartDate);
    return record!;
  }

  async setReminder1Sent(employeeId: number, weekStartDate: string, sentAt: Date): Promise<void> {
    await pool.execute(
      'UPDATE timesheet_reminders SET reminder_1_sent_at = ? WHERE employee_id = ? AND week_start_date = ?',
      [sentAt, employeeId, weekStartDate]
    );
  }

  async setReminder2Sent(employeeId: number, weekStartDate: string, sentAt: Date): Promise<void> {
    await pool.execute(
      'UPDATE timesheet_reminders SET reminder_2_sent_at = ? WHERE employee_id = ? AND week_start_date = ?',
      [sentAt, employeeId, weekStartDate]
    );
  }

  async setFrozen(employeeId: number, weekStartDate: string, frozenAt: Date): Promise<void> {
    await pool.execute(
      'UPDATE timesheet_reminders SET frozen_at = ? WHERE employee_id = ? AND week_start_date = ?',
      [frozenAt, employeeId, weekStartDate]
    );
  }

  async setUnfrozen(employeeId: number, weekStartDate: string, unfrozenAt: Date, unfrozenBy: number): Promise<void> {
    await pool.execute(
      'UPDATE timesheet_reminders SET unfrozen_at = ?, unfrozen_by = ? WHERE employee_id = ? AND week_start_date = ?',
      [unfrozenAt, unfrozenBy, employeeId, weekStartDate]
    );
  }
}
