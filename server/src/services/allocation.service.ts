import { IAllocationRepository } from '../repositories/interfaces/IAllocationRepository';
import { IProjectRepository } from '../repositories/interfaces/IProjectRepository';
import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { Allocation, AllocationWithDetails, CreateAllocationDTO } from '../models/interfaces/Allocation';
import { NotFoundError, ValidationError, ForbiddenError } from '../exceptions';

export class AllocationService {
  constructor(
    private allocationRepo: IAllocationRepository,
    private projectRepo:    IProjectRepository,
    private employeeRepo:   IEmployeeRepository
  ) {}

  async getAllAllocations(): Promise<AllocationWithDetails[]> {
    return this.allocationRepo.findAllWithDetails();
  }

  async getAllocationsByProject(projectId: number): Promise<AllocationWithDetails[]> {
    return this.allocationRepo.findByProjectId(projectId);
  }

  async getAllocationsByEmployee(employeeId: number): Promise<AllocationWithDetails[]> {
    return this.allocationRepo.findByEmployeeIdWithDetails(employeeId);
  }

  async createAllocation(dto: CreateAllocationDTO): Promise<Allocation> {
    const project = await this.projectRepo.findById(dto.project_id);
    if (!project) throw new NotFoundError('Project not found');
    if (!['ACTIVE', 'PLANNED'].includes(project.status)) {
      throw new ValidationError('Can only allocate to ACTIVE or PLANNED projects');
    }

    const employee = await this.employeeRepo.findById(dto.employee_id);
    if (!employee) throw new NotFoundError('Employee not found');
    if (!employee.is_active) throw new ValidationError('Cannot allocate an inactive employee');

    if (new Date(dto.from_date) >= new Date(dto.to_date)) {
      throw new ValidationError('from_date must be before to_date');
    }
    if (dto.utilisation_pct < 1 || dto.utilisation_pct > 100) {
      throw new ValidationError('Utilisation must be between 1 and 100');
    }

    const existingTotal = await this.allocationRepo.getTotalUtilisationInPeriod(
      dto.employee_id, dto.from_date, dto.to_date
    );
    if (existingTotal + dto.utilisation_pct > 100) {
      throw new ValidationError(
        `Over-allocation: employee already has ${existingTotal}% in this period. ` +
        `Adding ${dto.utilisation_pct}% would exceed 100%.`
      );
    }

    return this.allocationRepo.create(dto);
  }

  async endAllocation(allocationId: number, managerId: number): Promise<void> {
    const allocation = await this.allocationRepo.findById(allocationId);
    if (!allocation) throw new NotFoundError('Allocation not found');
    if (!allocation.is_active) throw new ValidationError('Allocation is already ended');

    const project = await this.projectRepo.findById(allocation.project_id);
    if (!project || project.manager_id !== managerId) {
      throw new ForbiddenError('You can only end allocations on your own projects');
    }

    const today = new Date().toISOString().split('T')[0];
    await this.allocationRepo.endAllocation(allocationId, today);
  }
}
