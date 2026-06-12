import bcrypt from 'bcryptjs';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IEmployeeRoleRepository } from '../repositories/interfaces/IEmployeeRoleRepository';
import { CreateEmployeeDTO, EmployeeWithDetails } from '../models/interfaces/Employee';
import { NotFoundError, ValidationError, ConflictError } from '../exceptions';

export class UserService {
  constructor(
    private userRepo:         IUserRepository,
    private employeeRepo:     IEmployeeRepository,
    private employeeRoleRepo: IEmployeeRoleRepository
  ) {}

  async createEmployee(dto: CreateEmployeeDTO, createdByEmployeeId: number): Promise<EmployeeWithDetails> {
    this.validatePasswordStrength(dto.password);

    const existingByUsername = await this.userRepo.findByUsername(dto.username);
    if (existingByUsername) throw new ConflictError('Username already taken');

    const existingByEmail = await this.employeeRepo.findByEmail(dto.email);
    if (existingByEmail) throw new ConflictError('Email already registered');

    const employee = await this.employeeRepo.create({
      department_id: dto.department_id,
      full_name:     dto.full_name,
      email:         dto.email,
    });

    await this.userRepo.create({
      employee_id: employee.id,
      username:    dto.username,
      password:    dto.password,
    });

    await this.employeeRoleRepo.assignRole(employee.id, dto.role, createdByEmployeeId);

    const details = await this.employeeRepo.findWithDetailsById(employee.id);
    if (!details) throw new NotFoundError('Failed to retrieve created employee');
    return details;
  }

  async getAllEmployees(): Promise<EmployeeWithDetails[]> {
    return this.employeeRepo.findAllWithDetails();
  }

  async resetPassword(employeeId: number, newPassword: string): Promise<void> {
    this.validatePasswordStrength(newPassword);
    const account = await this.userRepo.findByEmployeeId(employeeId);
    if (!account) throw new NotFoundError('User account not found');
    const newHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.updatePassword(account.id, newHash);
    await this.userRepo.setForcePasswordChange(account.id, true);
  }

  async deactivateEmployee(employeeId: number): Promise<void> {
    const emp = await this.employeeRepo.findById(employeeId);
    if (!emp)           throw new NotFoundError('Employee not found');
    if (!emp.is_active) throw new ValidationError('Employee is already inactive');

    await this.employeeRepo.setActive(employeeId, false);
    await this.userRepo.setActiveByEmployeeId(employeeId, false);
  }

  async reactivateEmployee(employeeId: number): Promise<void> {
    const emp = await this.employeeRepo.findById(employeeId);
    if (!emp)          throw new NotFoundError('Employee not found');
    if (emp.is_active) throw new ValidationError('Employee is already active');

    await this.employeeRepo.setActive(employeeId, true);
    await this.userRepo.setActiveByEmployeeId(employeeId, true);
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8)      throw new ValidationError('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password))  throw new ValidationError('Password must contain at least one uppercase letter');
    if (!/[0-9]/.test(password))  throw new ValidationError('Password must contain at least one number');
  }
}
