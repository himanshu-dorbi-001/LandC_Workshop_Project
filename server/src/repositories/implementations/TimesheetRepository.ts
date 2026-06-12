import { pool } from '../../database/connection';
import { ITimesheetRepository } from '../interfaces/ITimesheetRepository';
import {
  Timesheet, TimesheetWithEntries,
  TimesheetEntryWithProject,
  SubmitTimesheetDTO,
} from '../../models/interfaces/Timesheet';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class TimesheetRepository implements ITimesheetRepository {

  async findById(id: number): Promise<Timesheet | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM timesheets WHERE id = ?', [id]
    );
    return (rows[0] as Timesheet) ?? null;
  }

  async findAll(): Promise<Timesheet[]> {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM timesheets ORDER BY week_start_date DESC');
    return rows as Timesheet[];
  }

  async findByEmployeeId(employeeId: number): Promise<Timesheet[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM timesheets WHERE employee_id = ? ORDER BY week_start_date DESC', [employeeId]
    );
    return rows as Timesheet[];
  }

  async findByEmployeeAndWeek(employeeId: number, weekStart: string): Promise<Timesheet | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM timesheets WHERE employee_id = ? AND week_start_date = ?',
      [employeeId, weekStart]
    );
    return (rows[0] as Timesheet) ?? null;
  }

  async findWithEntries(timesheetId: number): Promise<TimesheetWithEntries | null> {
    const timesheet = await this.findById(timesheetId);
    if (!timesheet) return null;

    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT te.*, p.name AS project_name
      FROM timesheet_entries te
      JOIN projects p ON te.project_id = p.id
      WHERE te.timesheet_id = ?
    `, [timesheetId]);

    const entries = (rows as RowDataPacket[]).map(r => ({
      ...r,
      activity_tags: typeof r.activity_tags === 'string' ? JSON.parse(r.activity_tags) : r.activity_tags,
    })) as TimesheetEntryWithProject[];

    return { ...timesheet, entries };
  }

  async findTeamTimesheets(_managerEmployeeId: number, weekStart: string): Promise<TimesheetEntryWithProject[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT te.*, p.name AS project_name, e.full_name AS employee_name,
             t.status AS timesheet_status, t.week_start_date
      FROM employees e
      JOIN employee_roles er ON er.employee_id = e.id
      JOIN roles r           ON er.role_id     = r.id AND r.name = 'RESOURCE'
      LEFT JOIN timesheets t ON t.employee_id = e.id AND t.week_start_date = ?
      LEFT JOIN timesheet_entries te ON te.timesheet_id = t.id
      LEFT JOIN projects p ON te.project_id = p.id
      WHERE e.is_active = TRUE
      ORDER BY e.full_name
    `, [weekStart]);

    return (rows as RowDataPacket[]).map(r => ({
      ...r,
      activity_tags: r.activity_tags
        ? (typeof r.activity_tags === 'string' ? JSON.parse(r.activity_tags) : r.activity_tags)
        : [],
    })) as TimesheetEntryWithProject[];
  }

  async submit(employeeId: number, dto: SubmitTimesheetDTO, maxWeeklyHours: number): Promise<Timesheet> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const totalHours = dto.entries.reduce((sum, e) => sum + e.hours_worked, 0);

      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO timesheets (employee_id, week_start_date, status, total_hours) VALUES (?, ?, ?, ?)',
        [employeeId, dto.week_start_date, 'SUBMITTED', totalHours]
      );
      const timesheetId = result.insertId;

      for (const entry of dto.entries) {
        await connection.execute(
          'INSERT INTO timesheet_entries (timesheet_id, project_id, hours_worked, activity_tags) VALUES (?, ?, ?, ?)',
          [timesheetId, entry.project_id, entry.hours_worked, JSON.stringify(entry.activity_tags)]
        );
      }

      await connection.commit();
      const timesheet = await this.findById(timesheetId);
      if (!timesheet) throw new Error('Failed to retrieve submitted timesheet');
      return timesheet;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async markMissed(employeeId: number, weekStart: string): Promise<void> {
    await pool.execute(
      `INSERT INTO timesheets (employee_id, week_start_date, status, total_hours)
       VALUES (?, ?, 'MISSED', 0)
       ON DUPLICATE KEY UPDATE status = 'MISSED'`,
      [employeeId, weekStart]
    );
  }

  async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM timesheets WHERE id = ?', [id]);
  }
}
