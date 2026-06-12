import { Request, Response, NextFunction } from 'express';
import { TimesheetService } from '../services/timesheet.service';
import { TimesheetRepository } from '../repositories/implementations/TimesheetRepository';
import { AllocationRepository } from '../repositories/implementations/AllocationRepository';
import { SystemConfigRepository } from '../repositories/implementations/SystemConfigRepository';
import { UserRepository } from '../repositories/implementations/UserRepository';
import { sendSuccess, sendError } from '../utils/response';
import { parseId } from '../utils/parseId';
import { asyncHandler } from '../utils/asyncHandler';

const timesheetService = new TimesheetService(
  new TimesheetRepository(),
  new AllocationRepository(),
  new SystemConfigRepository(),
  new UserRepository()
);

export class TimesheetController {

  submitTimesheet = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { week_start_date, entries } = req.body;
    if (!week_start_date || !entries || !Array.isArray(entries) || entries.length === 0) {
      sendError(res, 'week_start_date and entries array are required');
      return;
    }
    sendSuccess(res, await timesheetService.submitTimesheet(req.user!.employeeId!, req.body), 201);
  });

  getMyTimesheets = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const employeeId = req.user!.employeeId!;
    const timesheets = await timesheetService.getMyTimesheets(employeeId);
    const missedWeek = await timesheetService.getMissedWeekForEmployee(employeeId);
    sendSuccess(res, { timesheets, missed_week_reminder: missedWeek });
  });

  getTimesheetDetail = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await timesheetService.getTimesheetDetail(req.user!.employeeId!, parseId(req.params.id)));
  });

  getTeamTimesheets = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const weekStart = (req.query.week as string) || getCurrentWeekMonday();
    sendSuccess(res, await timesheetService.getTeamTimesheets(req.user!.employeeId!, weekStart));
  });
}

function getCurrentWeekMonday(): string {
  const now  = new Date();
  const diff = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split('T')[0];
}
