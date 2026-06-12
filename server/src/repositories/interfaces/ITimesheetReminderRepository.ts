import { TimesheetReminder, ReminderWithEmployee } from '../../models/interfaces/TimesheetReminder';

export interface ITimesheetReminderRepository {
  findByEmployeeAndWeek(employeeId: number, weekStartDate: string): Promise<TimesheetReminder | null>;

  /** Employees who missed last week and whose reminder/freeze state needs processing */
  findPendingForWeek(weekStartDate: string): Promise<ReminderWithEmployee[]>;

  upsert(employeeId: number, weekStartDate: string): Promise<TimesheetReminder>;
  setReminder1Sent(employeeId: number, weekStartDate: string, sentAt: Date): Promise<void>;
  setReminder2Sent(employeeId: number, weekStartDate: string, sentAt: Date): Promise<void>;
  setFrozen(employeeId: number, weekStartDate: string, frozenAt: Date): Promise<void>;
  setUnfrozen(employeeId: number, weekStartDate: string, unfroznAt: Date, unfroznBy: number): Promise<void>;
}
