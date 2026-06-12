import { ITimesheetRepository } from '../repositories/interfaces/ITimesheetRepository';
import { IAllocationRepository } from '../repositories/interfaces/IAllocationRepository';
import { ISystemConfigRepository } from '../repositories/interfaces/ISystemConfigRepository';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { Timesheet, TimesheetWithEntries, SubmitTimesheetDTO } from '../models/interfaces/Timesheet';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../exceptions';

export class TimesheetService {
  constructor(
    private timesheetRepo:  ITimesheetRepository,
    private allocationRepo: IAllocationRepository,
    private configRepo:     ISystemConfigRepository,
    private userRepo:       IUserRepository
  ) {}

  async submitTimesheet(employeeId: number, dto: SubmitTimesheetDTO): Promise<Timesheet> {
    const userAccount = await this.userRepo.findByEmployeeId(employeeId);
    if (userAccount?.timesheet_frozen) {
      throw new ForbiddenError(
        'Your timesheet submission access has been frozen. Please contact your manager to restore access.'
      );
    }

    const config = await this.configRepo.getAll();
    const maxWeeklyHours = config.max_weekly_hours;

    const weekStart  = new Date(dto.week_start_date);
    const today      = new Date();
    today.setHours(0, 0, 0, 0);
    if (weekStart > today) throw new ValidationError('Cannot submit a timesheet for a future week');

    const existing = await this.timesheetRepo.findByEmployeeAndWeek(employeeId, dto.week_start_date);
    if (existing && existing.status === 'SUBMITTED') {
      throw new ConflictError('Timesheet for this week has already been submitted');
    }

    let totalHours = 0;
    for (const entry of dto.entries) {
      const allocations = await this.allocationRepo.findActiveByEmployeeId(employeeId);
      const allocation = allocations.find(a => {
        const from = new Date(a.from_date);
        const to   = new Date(a.to_date);
        return a.project_id === entry.project_id && from <= weekStart && to >= weekStart;
      });

      if (!allocation) {
        throw new ForbiddenError(`You are not allocated to project ${entry.project_id} for this week`);
      }

      const maxForProject = (allocation.utilisation_pct / 100) * maxWeeklyHours;
      if (entry.hours_worked > maxForProject) {
        throw new ValidationError(
          `Hours for project ${entry.project_id} cannot exceed ${maxForProject} ` +
          `(${allocation.utilisation_pct}% of ${maxWeeklyHours}h)`
        );
      }

      totalHours += entry.hours_worked;
    }

    if (totalHours > maxWeeklyHours) {
      throw new ValidationError(`Total hours (${totalHours}) exceed the maximum of ${maxWeeklyHours} per week`);
    }

    return this.timesheetRepo.submit(employeeId, dto, maxWeeklyHours);
  }

  async getMyTimesheets(employeeId: number): Promise<Timesheet[]> {
    const timesheets = await this.timesheetRepo.findByEmployeeId(employeeId);

    const currentWeek = getCurrentWeekMonday();
    const hasCurrentWeek = timesheets.some(
      t => String(t.week_start_date).slice(0, 10) === currentWeek
    );

    if (!hasCurrentWeek) {
      const allocs   = await this.allocationRepo.findActiveByEmployeeId(employeeId);
      const weekDate = new Date(currentWeek);
      const isAllocated = allocs.some(a => {
        const from = new Date(a.from_date);
        const to   = new Date(a.to_date);
        return from <= weekDate && to >= weekDate;
      });

      if (isAllocated) {
        const virtual: Timesheet = {
          id:              0,
          employee_id:     employeeId,
          week_start_date: new Date(currentWeek),
          status:          'IN_PROGRESS',
          total_hours:     0,
          created_at:      new Date(),
          updated_at:      new Date(),
        };
        timesheets.unshift(virtual);
      }
    }

    return timesheets;
  }

  async getTimesheetDetail(employeeId: number, timesheetId: number): Promise<TimesheetWithEntries> {
    const ts = await this.timesheetRepo.findWithEntries(timesheetId);
    if (!ts) throw new NotFoundError('Timesheet not found');
    if (ts.employee_id !== employeeId) throw new ForbiddenError('Access denied');
    return ts;
  }

  async getTeamTimesheets(managerEmployeeId: number, weekStart: string) {
    return this.timesheetRepo.findTeamTimesheets(managerEmployeeId, weekStart);
  }

  async getMissedWeekForEmployee(employeeId: number): Promise<string | null> {
    const now       = new Date();
    const dayOfWeek = now.getDay();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) - 7);
    lastMonday.setHours(0, 0, 0, 0);
    const weekStr = lastMonday.toISOString().split('T')[0];

    const existing = await this.timesheetRepo.findByEmployeeAndWeek(employeeId, weekStr);
    if (!existing) return weekStr;
    return null;
  }
}

function getCurrentWeekMonday(): string {
  const now  = new Date();
  const diff = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}
