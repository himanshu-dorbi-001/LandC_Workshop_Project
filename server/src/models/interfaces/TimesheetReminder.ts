export interface TimesheetReminder {
  id:                  number;
  employee_id:         number;
  week_start_date:     string;
  reminder_1_sent_at:  Date | null;
  reminder_2_sent_at:  Date | null;
  frozen_at:           Date | null;
  unfrozen_at:         Date | null;
  unfrozen_by:         number | null;
  created_at:          Date;
}

export interface ReminderWithEmployee extends TimesheetReminder {
  full_name:     string;
  email:         string;
}
