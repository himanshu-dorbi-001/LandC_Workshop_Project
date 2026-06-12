import { pool } from '../../database/connection';
import { IEmployeeRepository } from '../interfaces/IEmployeeRepository';
import { UserRole } from '../../models/interfaces/User';
import {
  Employee, EmployeeWithDetails, EmployeeSkillDetail,
  Skill, UpdateEmployeeDTO, AddSkillDTO, UpdateSkillDTO,
} from '../../models/interfaces/Employee';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class EmployeeRepository implements IEmployeeRepository {

  async findById(id: number): Promise<Employee | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM employees WHERE id = ?', [id]
    );
    return (rows[0] as Employee) ?? null;
  }

  async findAll(): Promise<Employee[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM employees WHERE is_active = TRUE ORDER BY full_name'
    );
    return rows as Employee[];
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM employees WHERE email = ?', [email]
    );
    return (rows[0] as Employee) ?? null;
  }

  async findAllWithDetails(): Promise<EmployeeWithDetails[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT
        e.*,
        d.name  AS department_name,
        ua.username,
        r.name  AS role,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM allocations a
            WHERE a.employee_id = e.id AND a.is_active = TRUE
              AND a.from_date <= CURDATE() AND a.to_date >= CURDATE()
          ) THEN 'ALLOCATED'
          ELSE 'BENCH'
        END AS status
      FROM employees e
      JOIN departments d   ON e.department_id = d.id
      JOIN user_accounts ua ON ua.employee_id  = e.id
      JOIN employee_roles er ON er.employee_id = e.id
      JOIN roles r           ON er.role_id     = r.id
      WHERE e.is_active = TRUE
      ORDER BY e.full_name
    `);
    const employees = rows as EmployeeWithDetails[];
    for (const emp of employees) {
      emp.skills = await this.getSkills(emp.id);
    }
    return employees;
  }

  async findByRole(role: UserRole): Promise<EmployeeWithDetails[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT
        e.*,
        d.name  AS department_name,
        ua.username,
        r.name  AS role,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM allocations a
            WHERE a.employee_id = e.id AND a.is_active = TRUE
              AND a.from_date <= CURDATE() AND a.to_date >= CURDATE()
          ) THEN 'ALLOCATED'
          ELSE 'BENCH'
        END AS status
      FROM employees e
      JOIN departments d   ON e.department_id = d.id
      JOIN user_accounts ua ON ua.employee_id  = e.id
      JOIN employee_roles er ON er.employee_id = e.id
      JOIN roles r           ON er.role_id     = r.id
      WHERE r.name = ? AND e.is_active = TRUE
      ORDER BY e.full_name
    `, [role]);
    const employees = rows as EmployeeWithDetails[];
    for (const emp of employees) {
      emp.skills = await this.getSkills(emp.id);
    }
    return employees;
  }

  async findWithDetailsById(id: number): Promise<EmployeeWithDetails | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT
        e.*,
        d.name  AS department_name,
        ua.username,
        r.name  AS role,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM allocations a
            WHERE a.employee_id = e.id AND a.is_active = TRUE
              AND a.from_date <= CURDATE() AND a.to_date >= CURDATE()
          ) THEN 'ALLOCATED'
          ELSE 'BENCH'
        END AS status
      FROM employees e
      JOIN departments d   ON e.department_id = d.id
      JOIN user_accounts ua ON ua.employee_id  = e.id
      JOIN employee_roles er ON er.employee_id = e.id
      JOIN roles r           ON er.role_id     = r.id
      WHERE e.id = ?
    `, [id]);
    if ((rows as RowDataPacket[]).length === 0) return null;
    const emp = rows[0] as EmployeeWithDetails;
    emp.skills = await this.getSkills(emp.id);
    return emp;
  }

  async create(dto: { department_id: number; full_name: string; email: string }): Promise<Employee> {
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO employees (department_id, full_name, email) VALUES (?, ?, ?)',
      [dto.department_id, dto.full_name, dto.email]
    );
    const employee = await this.findById(result.insertId);
    if (!employee) throw new Error('Failed to retrieve created employee');
    return employee;
  }

  async update(id: number, dto: UpdateEmployeeDTO): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | boolean)[] = [];
    if (dto.full_name     !== undefined) { fields.push('full_name = ?');     values.push(dto.full_name); }
    if (dto.department_id !== undefined) { fields.push('department_id = ?'); values.push(dto.department_id); }
    if (dto.email         !== undefined) { fields.push('email = ?');         values.push(dto.email); }
    if (fields.length === 0) return;
    values.push(id);
    await pool.execute(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async setActive(id: number, isActive: boolean): Promise<void> {
    await pool.execute('UPDATE employees SET is_active = ? WHERE id = ?', [isActive, id]);
  }

  async getSkills(employeeId: number): Promise<EmployeeSkillDetail[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT s.id AS skill_id, s.skill_name, s.category, es.proficiency
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.id
      WHERE es.employee_id = ?
      ORDER BY s.skill_name
    `, [employeeId]);
    return rows as EmployeeSkillDetail[];
  }

  async findOrCreateSkill(name: string, category: string): Promise<Skill> {
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM skills WHERE skill_name = ?', [name]
    );
    if ((existing as RowDataPacket[]).length > 0) return existing[0] as Skill;

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO skills (skill_name, category) VALUES (?, ?)', [name, category]
    );
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM skills WHERE id = ?', [result.insertId]
    );
    return rows[0] as Skill;
  }

  async addSkill(employeeId: number, dto: AddSkillDTO): Promise<void> {
    const skill = await this.findOrCreateSkill(dto.skill_name, dto.category);
    await pool.execute(
      `INSERT INTO employee_skills (employee_id, skill_id, proficiency) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE proficiency = VALUES(proficiency)`,
      [employeeId, skill.id, dto.proficiency]
    );
  }

  async updateSkill(employeeId: number, skillId: number, dto: UpdateSkillDTO): Promise<void> {
    await pool.execute(
      'UPDATE employee_skills SET proficiency = ? WHERE employee_id = ? AND skill_id = ?',
      [dto.proficiency, employeeId, skillId]
    );
  }

  async removeSkill(employeeId: number, skillId: number): Promise<void> {
    await pool.execute(
      'DELETE FROM employee_skills WHERE employee_id = ? AND skill_id = ?',
      [employeeId, skillId]
    );
  }

  async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM employees WHERE id = ?', [id]);
  }
}
