export type TimesheetStatus = 'SUBMITTED' | 'MISSED' | 'IN_PROGRESS';

export interface Timesheet {
  id:              number;
  employee_id:     number;
  week_start_date: Date;
  status:          TimesheetStatus;
  total_hours:     number;
  created_at:      Date;
  updated_at:      Date;
}

export interface TimesheetEntry {
  id:            number;
  timesheet_id:  number;
  project_id:    number;
  hours_worked:  number;
  activity_tags: string[];
  created_at:    Date;
}

export interface TimesheetWithEntries extends Timesheet {
  entries: TimesheetEntryWithProject[];
}

export interface TimesheetEntryWithProject extends TimesheetEntry {
  project_name: string;
}

export interface SubmitTimesheetDTO {
  week_start_date: string;
  entries: {
    project_id:    number;
    hours_worked:  number;
    activity_tags: string[];
  }[];
}
