import { Request, Response, NextFunction } from 'express';
import { AllocationService } from '../services/allocation.service';
import { AllocationRepository } from '../repositories/implementations/AllocationRepository';
import { ProjectRepository } from '../repositories/implementations/ProjectRepository';
import { EmployeeRepository } from '../repositories/implementations/EmployeeRepository';
import { sendSuccess, sendError } from '../utils/response';
import { parseId } from '../utils/parseId';
import { asyncHandler } from '../utils/asyncHandler';

const allocationService = new AllocationService(
  new AllocationRepository(),
  new ProjectRepository(),
  new EmployeeRepository()
);

export class AllocationController {

  getAllAllocations = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await allocationService.getAllAllocations());
  });

  createAllocation = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { employee_id, project_id, utilisation_pct, from_date, to_date } = req.body;
    if (!employee_id || !project_id || !utilisation_pct || !from_date || !to_date) {
      sendError(res, 'employee_id, project_id, utilisation_pct, from_date and to_date are required');
      return;
    }
    sendSuccess(res, await allocationService.createAllocation(req.body), 201);
  });

  endAllocation = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await allocationService.endAllocation(parseId(req.params.id), req.user!.employeeId!);
    sendSuccess(res, { message: 'Allocation ended.' });
  });

  getAllocationsByProject = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await allocationService.getAllocationsByProject(parseId(req.params.id)));
  });

  getMyAllocations = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await allocationService.getAllocationsByEmployee(req.user!.employeeId!));
  });
}
