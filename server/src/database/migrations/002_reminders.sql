-- Migration 002: Timesheet reminder & freeze support
USE prm_tool;

ALTER TABLE user_accounts
  ADD COLUMN timesheet_frozen TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS timesheet_reminders (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  employee_id         INT NOT NULL,
  week_start_date     DATE NOT NULL,
  reminder_1_sent_at  DATETIME NULL,
  reminder_2_sent_at  DATETIME NULL,
  frozen_at           DATETIME NULL,
  unfrozen_at         DATETIME NULL,
  unfrozen_by         INT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_tr_emp_week UNIQUE (employee_id, week_start_date),
  CONSTRAINT fk_tr_employee  FOREIGN KEY (employee_id)  REFERENCES employees(id),
  CONSTRAINT fk_tr_unfrozen  FOREIGN KEY (unfrozen_by)  REFERENCES employees(id)
);
