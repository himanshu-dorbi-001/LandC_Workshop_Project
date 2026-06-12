import { IBaseRepository } from './IBaseRepository';
import { UserRole } from '../../models/interfaces/User';
import {
  Employee, EmployeeWithDetails, EmployeeSkillDetail,
  CreateEmployeeDTO, UpdateEmployeeDTO,
  Skill, AddSkillDTO, UpdateSkillDTO,
} from '../../models/interfaces/Employee';

export interface IEmployeeRepository extends IBaseRepository<Employee> {
  findByEmail(email: string): Promise<Employee | null>;
  findAllWithDetails(): Promise<EmployeeWithDetails[]>;
  findByRole(role: UserRole): Promise<EmployeeWithDetails[]>;
  findWithDetailsById(id: number): Promise<EmployeeWithDetails | null>;
  create(dto: Omit<CreateEmployeeDTO, 'username' | 'password' | 'role'>): Promise<Employee>;
  update(id: number, dto: UpdateEmployeeDTO): Promise<void>;
  setActive(id: number, isActive: boolean): Promise<void>;

  // Skills
  getSkills(employeeId: number): Promise<EmployeeSkillDetail[]>;
  addSkill(employeeId: number, dto: AddSkillDTO): Promise<void>;
  updateSkill(employeeId: number, skillId: number, dto: UpdateSkillDTO): Promise<void>;
  removeSkill(employeeId: number, skillId: number): Promise<void>;
  findOrCreateSkill(name: string, category: string): Promise<Skill>;
}
