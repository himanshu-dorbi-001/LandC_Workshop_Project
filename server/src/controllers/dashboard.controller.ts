import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { EmployeeRepository } from '../repositories/implementations/EmployeeRepository';
import { AllocationRepository } from '../repositories/implementations/AllocationRepository';
import { UserRepository } from '../repositories/implementations/UserRepository';
import { sendSuccess } from '../utils/response';
import { parseId } from '../utils/parseId';
import { asyncHandler } from '../utils/asyncHandler';

const employeeService = new EmployeeService(
  new EmployeeRepository(),
  new AllocationRepository(),
  new UserRepository()
);

export class DashboardController {

  getResourceDashboard = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const team      = await employeeService.getResourceEmployees();
    const bench     = team.filter(e => e.status === 'BENCH');
    const allocated = team.filter(e => e.status === 'ALLOCATED');
    sendSuccess(res, {
      total:     team.length,
      bench:     bench.length,
      allocated: allocated.length,
      employees: team,
    });
  });

  getEmployeeDetail = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await employeeService.getEmployeeById(parseId(req.params.id)));
  });
}
