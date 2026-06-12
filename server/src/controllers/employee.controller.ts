import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { EmployeeRepository } from '../repositories/implementations/EmployeeRepository';
import { AllocationRepository } from '../repositories/implementations/AllocationRepository';
import { UserRepository } from '../repositories/implementations/UserRepository';
import { sendSuccess, sendError } from '../utils/response';
import { parseId } from '../utils/parseId';
import { asyncHandler } from '../utils/asyncHandler';

const employeeService = new EmployeeService(
  new EmployeeRepository(),
  new AllocationRepository(),
  new UserRepository()
);

export class EmployeeController {

  getAllEmployees = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await employeeService.getAllEmployees());
  });

  getEmployeeById = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await employeeService.getEmployeeById(parseId(req.params.id)));
  });

  updateEmployee = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await employeeService.updateEmployee(parseId(req.params.id), req.body);
    sendSuccess(res, { message: 'Employee updated.' });
  });

  deactivateEmployee = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const id          = parseId(req.params.id);
    const allocations = await employeeService.getActiveAllocationsForEmployee(id);
    await employeeService.deactivateEmployee(id);
    sendSuccess(res, { message: 'Employee deactivated.', allocations_ended: allocations.length });
  });

  getSkills = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await employeeService.getSkills(parseId(req.params.id)));
  });

  addSkill = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { skill_name, category, proficiency } = req.body;
    if (!skill_name || !category || !proficiency) {
      sendError(res, 'skill_name, category and proficiency are required');
      return;
    }
    await employeeService.addSkill(parseId(req.params.id), { skill_name, category, proficiency });
    sendSuccess(res, { message: 'Skill added.' }, 201);
  });

  updateSkill = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { proficiency } = req.body;
    if (!proficiency) { sendError(res, 'proficiency is required'); return; }
    await employeeService.updateSkill(
      parseId(req.params.id),
      parseId(req.params.skillId),
      { proficiency }
    );
    sendSuccess(res, { message: 'Skill updated.' });
  });

  removeSkill = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await employeeService.removeSkill(parseId(req.params.id), parseId(req.params.skillId));
    sendSuccess(res, { message: 'Skill removed.' });
  });
}
