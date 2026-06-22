import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IAllocationRepository } from '../repositories/interfaces/IAllocationRepository';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import {
  EmployeeWithDetails, EmployeeSkillDetail,
  UpdateEmployeeDTO, AddSkillDTO, UpdateSkillDTO,
} from '../models/interfaces/Employee';
import { ITimesheetReminderRepository } from '../repositories/interfaces/ITimesheetReminderRepository';
import { NotFoundError, ValidationError, ForbiddenError } from '../exceptions';

export class EmployeeService {
  constructor(
    private employeeRepo:   IEmployeeRepository,
    private allocationRepo: IAllocationRepository,
    private userRepo:       IUserRepository,
    private reminderRepo:   ITimesheetReminderRepository
  ) {}

  async getAllEmployees(): Promise<EmployeeWithDetails[]> {
    return this.employeeRepo.findAllWithDetails();
  }

  async getResourceEmployees(): Promise<EmployeeWithDetails[]> {
    return this.employeeRepo.findByRole('RESOURCE');
  }

  async getEmployeeById(id: number): Promise<EmployeeWithDetails> {
    const emp = await this.employeeRepo.findWithDetailsById(id);
    if (!emp) throw new NotFoundError('Employee not found');
    return emp;
  }

  async updateEmployee(id: number, dto: UpdateEmployeeDTO): Promise<void> {
    const emp = await this.employeeRepo.findById(id);
    if (!emp) throw new NotFoundError('Employee not found');
    await this.employeeRepo.update(id, dto);
  }

  async deactivateEmployee(id: number): Promise<void> {
    const emp = await this.employeeRepo.findById(id);
    if (!emp)           throw new NotFoundError('Employee not found');
    if (!emp.is_active) throw new ValidationError('Employee is already inactive');

    const today = new Date().toISOString().split('T')[0];
    await this.allocationRepo.endAllActiveForEmployee(id, today);
    await this.employeeRepo.setActive(id, false);
    await this.userRepo.setActiveByEmployeeId(id, false);
  }

  async getActiveAllocationsForEmployee(id: number) {
    return this.allocationRepo.findActiveByEmployeeId(id);
  }

  async getSkills(employeeId: number): Promise<EmployeeSkillDetail[]> {
    const emp = await this.employeeRepo.findById(employeeId);
    if (!emp) throw new NotFoundError('Employee not found');
    return this.employeeRepo.getSkills(employeeId);
  }

  async addSkill(employeeId: number, dto: AddSkillDTO): Promise<void> {
    const emp = await this.employeeRepo.findById(employeeId);
    if (!emp) throw new NotFoundError('Employee not found');
    if (!dto.skill_name?.trim()) throw new ValidationError('Skill name is required');
    await this.employeeRepo.addSkill(employeeId, dto);
  }

  async updateSkill(employeeId: number, skillId: number, dto: UpdateSkillDTO): Promise<void> {
    const skills = await this.employeeRepo.getSkills(employeeId);
    if (!skills.find(s => s.skill_id === skillId)) throw new NotFoundError('Skill not found for this employee');
    await this.employeeRepo.updateSkill(employeeId, skillId, dto);
  }

  async removeSkill(employeeId: number, skillId: number): Promise<void> {
    const skills = await this.employeeRepo.getSkills(employeeId);
    if (!skills.find(s => s.skill_id === skillId)) throw new NotFoundError('Skill not found for this employee');
    await this.employeeRepo.removeSkill(employeeId, skillId);
  }

  async restoreTimesheetAccess(employeeId: number, restoredBy: number): Promise<void> {
    const emp = await this.employeeRepo.findById(employeeId);
    if (!emp) throw new NotFoundError('Employee not found');

    const account = await this.userRepo.findByEmployeeId(employeeId);
    if (!account?.timesheet_frozen) throw new ForbiddenError('Timesheet access is not currently frozen for this employee');

    await this.userRepo.setTimesheetFrozen(employeeId, false);

    // Record the unfreeze on the most recent frozen reminder row
    const today = new Date().toISOString().split('T')[0];
    const lastMonday = getLastMonday(today);
    const reminder = await this.reminderRepo.findByEmployeeAndWeek(employeeId, lastMonday);
    if (reminder?.frozen_at) {
      await this.reminderRepo.setUnfrozen(employeeId, lastMonday, new Date(), restoredBy);
    }
  }
}

function getLastMonday(fromDate: string): string {
  const d = new Date(fromDate);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff - 7);
  return d.toISOString().split('T')[0];
}
