import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/implementations/UserRepository';
import { EmployeeRepository } from '../repositories/implementations/EmployeeRepository';
import { EmployeeRoleRepository } from '../repositories/implementations/EmployeeRoleRepository';
import { sendSuccess, sendError } from '../utils/response';
import { parseId } from '../utils/parseId';
import { asyncHandler } from '../utils/asyncHandler';

const userService = new UserService(
  new UserRepository(),
  new EmployeeRepository(),
  new EmployeeRoleRepository()
);

export class UserController {

  createEmployee = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { username, email, password, role, full_name, department_id } = req.body;
    if (!username || !email || !password || !role || !full_name || !department_id) {
      sendError(res, 'username, email, password, role, full_name, department_id are all required');
      return;
    }
    if (!['ADMIN', 'MANAGER', 'RESOURCE'].includes(role)) {
      sendError(res, 'role must be ADMIN, MANAGER or RESOURCE');
      return;
    }
    const employee = await userService.createEmployee(
      { username, email, password, role, full_name, department_id: Number(department_id) },
      req.user!.employeeId
    );
    sendSuccess(res, employee, 201);
  });

  getAllEmployees = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await userService.getAllEmployees());
  });

  resetPassword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { newPassword } = req.body;
    if (!newPassword) { sendError(res, 'newPassword is required'); return; }
    await userService.resetPassword(parseId(req.params.id), newPassword);
    sendSuccess(res, { message: 'Password reset. Employee will be prompted to change it on next login.' });
  });

  deactivateEmployee = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await userService.deactivateEmployee(parseId(req.params.id));
    sendSuccess(res, { message: 'Employee deactivated.' });
  });

  reactivateEmployee = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await userService.reactivateEmployee(parseId(req.params.id));
    sendSuccess(res, { message: 'Employee reactivated.' });
  });
}
