import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/implementations/UserRepository';
import { EmployeeRepository } from '../repositories/implementations/EmployeeRepository';
import { EmployeeRoleRepository } from '../repositories/implementations/EmployeeRoleRepository';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const authService = new AuthService(
  new UserRepository(),
  new EmployeeRepository(),
  new EmployeeRoleRepository()
);

export class AuthController {

  login = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { username, password } = req.body;
    if (!username || !password) { sendError(res, 'username and password are required'); return; }
    sendSuccess(res, await authService.login(username, password));
  });

  changePassword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) { sendError(res, 'currentPassword and newPassword are required'); return; }
    await authService.changePassword(req.user!.userAccountId, currentPassword, newPassword);
    sendSuccess(res, { message: 'Password changed successfully.' });
  });

  forceChangePassword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { newPassword } = req.body;
    if (!newPassword) { sendError(res, 'newPassword is required'); return; }
    await authService.forceChangePassword(req.user!.userAccountId, newPassword);
    sendSuccess(res, { message: 'Password updated. You can now access the system.' });
  });
}
