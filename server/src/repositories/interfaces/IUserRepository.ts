import { IBaseRepository } from './IBaseRepository';
import { UserAccount, CreateUserAccountDTO } from '../../models/interfaces/User';

export interface IUserRepository extends IBaseRepository<UserAccount> {
  findByUsername(username: string): Promise<UserAccount | null>;
  findByEmployeeId(employeeId: number): Promise<UserAccount | null>;
  create(dto: CreateUserAccountDTO): Promise<UserAccount>;
  updatePassword(id: number, passwordHash: string): Promise<void>;
  setForcePasswordChange(id: number, value: boolean): Promise<void>;
  setActive(id: number, isActive: boolean): Promise<void>;
  setActiveByEmployeeId(employeeId: number, isActive: boolean): Promise<void>;
  setTimesheetFrozen(employeeId: number, frozen: boolean): Promise<void>;
}
