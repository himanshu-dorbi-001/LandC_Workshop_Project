import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IEmployeeRoleRepository } from '../repositories/interfaces/IEmployeeRoleRepository';
import { AuthPayload } from '../middleware/auth';
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '../exceptions';

export class AuthService {
  constructor(
    private userRepo:         IUserRepository,
    private employeeRepo:     IEmployeeRepository,
    private employeeRoleRepo: IEmployeeRoleRepository
  ) {}

  async login(username: string, password: string): Promise<{
    token:               string;
    forcePasswordChange: boolean;
    role:                string;
    fullName:            string;
  }> {
    const account = await this.userRepo.findByUsername(username);
    if (!account)           throw new UnauthorizedError('Invalid username or password');
    if (!account.is_active) throw new ForbiddenError('Account is deactivated. Contact Admin.');

    const match = await bcrypt.compare(password, account.password_hash);
    if (!match) throw new UnauthorizedError('Invalid username or password');

    const employee = await this.employeeRepo.findById(account.employee_id);
    if (!employee) throw new NotFoundError('Employee record not found');

    const role = await this.employeeRoleRepo.getRoleForEmployee(account.employee_id);
    if (!role) throw new ForbiddenError('No role assigned to this account');

    const payload: AuthPayload = {
      userAccountId: account.id,
      employeeId:    account.employee_id,
      username:      account.username,
      role,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return {
      token,
      forcePasswordChange: account.force_password_change,
      role,
      fullName: employee.full_name,
    };
  }

  async changePassword(
    userAccountId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const account = await this.userRepo.findById(userAccountId);
    if (!account) throw new NotFoundError('Account not found');

    const match = await bcrypt.compare(currentPassword, account.password_hash);
    if (!match) throw new UnauthorizedError('Current password is incorrect');

    this.validatePasswordStrength(newPassword);
    const newHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.updatePassword(userAccountId, newHash);
    await this.userRepo.setForcePasswordChange(userAccountId, false);
  }

  async forceChangePassword(userAccountId: number, newPassword: string): Promise<void> {
    this.validatePasswordStrength(newPassword);
    const newHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.updatePassword(userAccountId, newHash);
    await this.userRepo.setForcePasswordChange(userAccountId, false);
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8)      throw new ValidationError('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password))  throw new ValidationError('Password must contain at least one uppercase letter');
    if (!/[0-9]/.test(password))  throw new ValidationError('Password must contain at least one number');
  }
}
