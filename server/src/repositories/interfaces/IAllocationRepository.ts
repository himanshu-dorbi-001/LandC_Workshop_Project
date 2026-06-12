import { IBaseRepository } from './IBaseRepository';
import { Allocation, AllocationWithDetails, CreateAllocationDTO } from '../../models/interfaces/Allocation';

export interface IAllocationRepository extends IBaseRepository<Allocation> {
  findAllWithDetails(): Promise<AllocationWithDetails[]>;
  findByEmployeeId(employeeId: number): Promise<Allocation[]>;
  findByEmployeeIdWithDetails(employeeId: number): Promise<AllocationWithDetails[]>;
  findByProjectId(projectId: number): Promise<AllocationWithDetails[]>;
  findActiveByEmployeeId(employeeId: number): Promise<Allocation[]>;
  create(dto: CreateAllocationDTO): Promise<Allocation>;
  endAllocation(id: number, endDate: string): Promise<void>;
  endAllActiveForEmployee(employeeId: number, endDate: string): Promise<void>;
  getTotalUtilisationInPeriod(employeeId: number, fromDate: string, toDate: string, excludeId?: number): Promise<number>;
}
