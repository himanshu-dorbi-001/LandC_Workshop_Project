import { apiCall } from './api';

export interface MyAllocation {
  id:              number;
  employee_id:     number;
  project_id:      number;
  employee_name:   string;
  project_name:    string;
  utilisation_pct: number;
  from_date:       string;
  to_date:         string;
  is_active:       boolean;
}

export interface MyTimesheet {
  id:              number;
  employee_id:     number;
  week_start_date: string;
  status:          string;
  total_hours:     number;
  created_at:      string;
}

export interface MyTimesheetsResponse {
  timesheets:            MyTimesheet[];
  missed_week_reminder:  string | null;
}

export interface TimesheetEntryDetail {
  id:            number;
  timesheet_id:  number;
  project_id:    number;
  project_name:  string;
  hours_worked:  number;
  activity_tags: string[];
}

export interface TimesheetDetail extends MyTimesheet {
  entries: TimesheetEntryDetail[];
}

export interface TimesheetEntry {
  project_id:    number;
  hours_worked:  number;
  activity_tags: string[];
}

export interface SubmitTimesheetPayload {
  week_start_date: string;
  entries:         TimesheetEntry[];
}

export async function getMyAllocations(): Promise<MyAllocation[]> {
  return apiCall<MyAllocation[]>('GET', '/api/resource/allocations');
}

export async function getMyTimesheets(): Promise<MyTimesheetsResponse> {
  return apiCall<MyTimesheetsResponse>('GET', '/api/resource/timesheets');
}

export async function getTimesheetDetail(id: number): Promise<TimesheetDetail> {
  return apiCall<TimesheetDetail>('GET', `/api/resource/timesheets/${id}`);
}

export async function submitTimesheet(data: SubmitTimesheetPayload): Promise<MyTimesheet> {
  return apiCall<MyTimesheet>('POST', '/api/resource/timesheets', data);
}
