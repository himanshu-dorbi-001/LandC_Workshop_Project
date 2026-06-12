import { UserRole } from '../../models/interfaces/User';

export interface IEmployeeRoleRepository {
  getRoleForEmployee(employeeId: number): Promise<UserRole | null>;
  getRoleIdByName(name: UserRole): Promise<number>;
  assignRole(employeeId: number, roleName: UserRole, assignedByEmployeeId: number): Promise<void>;
}
