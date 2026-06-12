import { pool } from '../../database/connection';
import { IEmployeeRoleRepository } from '../interfaces/IEmployeeRoleRepository';
import { UserRole } from '../../models/interfaces/User';
import { RowDataPacket } from 'mysql2';

export class EmployeeRoleRepository implements IEmployeeRoleRepository {

  async getRoleForEmployee(employeeId: number): Promise<UserRole | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT r.name
      FROM employee_roles er
      JOIN roles r ON er.role_id = r.id
      WHERE er.employee_id = ?
      LIMIT 1
    `, [employeeId]);
    if ((rows as RowDataPacket[]).length === 0) return null;
    return (rows[0] as RowDataPacket).name as UserRole;
  }

  async getRoleIdByName(name: UserRole): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM roles WHERE name = ?', [name]
    );
    if ((rows as RowDataPacket[]).length === 0) {
      throw new Error(`Role '${name}' not found in roles table`);
    }
    return (rows[0] as RowDataPacket).id as number;
  }

  async assignRole(employeeId: number, roleName: UserRole, assignedByEmployeeId: number): Promise<void> {
    const roleId = await this.getRoleIdByName(roleName);
    await pool.execute(
      `INSERT INTO employee_roles (employee_id, role_id, assigned_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE role_id = VALUES(role_id), assigned_by = VALUES(assigned_by)`,
      [employeeId, roleId, assignedByEmployeeId]
    );
  }
}
