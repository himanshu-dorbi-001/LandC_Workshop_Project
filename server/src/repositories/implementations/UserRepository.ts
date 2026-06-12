import { pool } from '../../database/connection';
import { IUserRepository } from '../interfaces/IUserRepository';
import { UserAccount, CreateUserAccountDTO } from '../../models/interfaces/User';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class UserRepository implements IUserRepository {

  async findById(id: number): Promise<UserAccount | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM user_accounts WHERE id = ?', [id]
    );
    return (rows[0] as UserAccount) ?? null;
  }

  async findAll(): Promise<UserAccount[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM user_accounts ORDER BY id'
    );
    return rows as UserAccount[];
  }

  async findByUsername(username: string): Promise<UserAccount | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM user_accounts WHERE username = ?', [username]
    );
    return (rows[0] as UserAccount) ?? null;
  }

  async findByEmployeeId(employeeId: number): Promise<UserAccount | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM user_accounts WHERE employee_id = ?', [employeeId]
    );
    return (rows[0] as UserAccount) ?? null;
  }

  async create(dto: CreateUserAccountDTO): Promise<UserAccount> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO user_accounts (employee_id, username, password_hash, is_active, force_password_change)
       VALUES (?, ?, ?, TRUE, TRUE)`,
      [dto.employee_id, dto.username, passwordHash]
    );
    const account = await this.findById(result.insertId);
    if (!account) throw new Error('Failed to retrieve created user account');
    return account;
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await pool.execute(
      'UPDATE user_accounts SET password_hash = ? WHERE id = ?',
      [passwordHash, id]
    );
  }

  async setForcePasswordChange(id: number, value: boolean): Promise<void> {
    await pool.execute(
      'UPDATE user_accounts SET force_password_change = ? WHERE id = ?',
      [value, id]
    );
  }

  async setActive(id: number, isActive: boolean): Promise<void> {
    await pool.execute(
      'UPDATE user_accounts SET is_active = ? WHERE id = ?',
      [isActive, id]
    );
  }

  async setActiveByEmployeeId(employeeId: number, isActive: boolean): Promise<void> {
    await pool.execute(
      'UPDATE user_accounts SET is_active = ? WHERE employee_id = ?',
      [isActive, employeeId]
    );
  }

  async setTimesheetFrozen(employeeId: number, frozen: boolean): Promise<void> {
    await pool.execute(
      'UPDATE user_accounts SET timesheet_frozen = ? WHERE employee_id = ?',
      [frozen, employeeId]
    );
  }

  async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM user_accounts WHERE id = ?', [id]);
  }
}
