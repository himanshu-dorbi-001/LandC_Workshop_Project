import { pool } from '../../database/connection';
import { IAllocationRepository } from '../interfaces/IAllocationRepository';
import { Allocation, AllocationWithDetails, CreateAllocationDTO } from '../../models/interfaces/Allocation';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class AllocationRepository implements IAllocationRepository {

  async findById(id: number): Promise<Allocation | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM allocations WHERE id = ?', [id]
    );
    return (rows[0] as Allocation) ?? null;
  }

  async findAll(): Promise<Allocation[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM allocations ORDER BY id'
    );
    return rows as Allocation[];
  }

  async findAllWithDetails(): Promise<AllocationWithDetails[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT a.*, e.full_name AS employee_name, p.name AS project_name
      FROM allocations a
      JOIN employees e ON a.employee_id = e.id
      JOIN projects  p ON a.project_id  = p.id
      WHERE a.is_active = TRUE
      ORDER BY e.full_name, p.name
    `);
    return rows as AllocationWithDetails[];
  }

  async findByEmployeeId(employeeId: number): Promise<Allocation[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM allocations WHERE employee_id = ? ORDER BY from_date DESC', [employeeId]
    );
    return rows as Allocation[];
  }

  async findByEmployeeIdWithDetails(employeeId: number): Promise<AllocationWithDetails[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT a.*, e.full_name AS employee_name, p.name AS project_name
      FROM allocations a
      JOIN employees e ON a.employee_id = e.id
      JOIN projects  p ON a.project_id  = p.id
      WHERE a.employee_id = ? AND a.is_active = TRUE
      ORDER BY p.name
    `, [employeeId]);
    return rows as AllocationWithDetails[];
  }

  async findByProjectId(projectId: number): Promise<AllocationWithDetails[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT a.*, e.full_name AS employee_name, p.name AS project_name
      FROM allocations a
      JOIN employees e ON a.employee_id = e.id
      JOIN projects  p ON a.project_id  = p.id
      WHERE a.project_id = ? AND a.is_active = TRUE
      ORDER BY e.full_name
    `, [projectId]);
    return rows as AllocationWithDetails[];
  }

  async findActiveByEmployeeId(employeeId: number): Promise<Allocation[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM allocations WHERE employee_id = ? AND is_active = TRUE ORDER BY from_date',
      [employeeId]
    );
    return rows as Allocation[];
  }

  async create(dto: CreateAllocationDTO): Promise<Allocation> {
    const [result] = await pool.execute<ResultSetHeader>(`
      INSERT INTO allocations (employee_id, project_id, utilisation_pct, from_date, to_date)
      VALUES (?, ?, ?, ?, ?)`,
      [dto.employee_id, dto.project_id, dto.utilisation_pct, dto.from_date, dto.to_date]
    );
    const allocation = await this.findById(result.insertId);
    if (!allocation) throw new Error('Failed to retrieve created allocation');
    return allocation;
  }

  async endAllocation(id: number, endDate: string): Promise<void> {
    await pool.execute(
      'UPDATE allocations SET to_date = ?, is_active = FALSE WHERE id = ?',
      [endDate, id]
    );
  }

  async endAllActiveForEmployee(employeeId: number, endDate: string): Promise<void> {
    await pool.execute(
      'UPDATE allocations SET to_date = ?, is_active = FALSE WHERE employee_id = ? AND is_active = TRUE',
      [endDate, employeeId]
    );
  }

  async getTotalUtilisationInPeriod(
    employeeId: number, fromDate: string, toDate: string, excludeId?: number
  ): Promise<number> {
    const excludeClause = excludeId ? 'AND id != ?' : '';
    const params: (string | number)[] = [employeeId, fromDate, toDate, fromDate, toDate];
    if (excludeId) params.push(excludeId);

    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT COALESCE(SUM(utilisation_pct), 0) AS total
      FROM allocations
      WHERE employee_id = ?
        AND is_active = TRUE
        AND from_date <= ? AND to_date >= ?
        AND NOT (to_date < ? OR from_date > ?)
        ${excludeClause}
    `, params);
    return Number((rows[0] as RowDataPacket).total) || 0;
  }

  async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM allocations WHERE id = ?', [id]);
  }
}
