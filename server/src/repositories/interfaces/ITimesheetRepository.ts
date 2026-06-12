import { IBaseRepository } from './IBaseRepository';
import {
  Timesheet, TimesheetWithEntries,
  TimesheetEntryWithProject,
  SubmitTimesheetDTO,
} from '../../models/interfaces/Timesheet';

export interface ITimesheetRepository extends IBaseRepository<Timesheet> {
  findByEmployeeId(employeeId: number): Promise<Timesheet[]>;
  findByEmployeeAndWeek(employeeId: number, weekStart: string): Promise<Timesheet | null>;
  findWithEntries(timesheetId: number): Promise<TimesheetWithEntries | null>;
  findTeamTimesheets(managerEmployeeId: number, weekStart: string): Promise<TimesheetEntryWithProject[]>;
  submit(employeeId: number, dto: SubmitTimesheetDTO, maxWeeklyHours: number): Promise<Timesheet>;
  markMissed(employeeId: number, weekStart: string): Promise<void>;
}
