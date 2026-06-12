export type UserRole = 'ADMIN' | 'MANAGER' | 'RESOURCE';

export interface UserAccount {
  id:                    number;
  employee_id:           number;
  username:              string;
  password_hash:         string;
  force_password_change: boolean;
  is_active:             boolean;
  timesheet_frozen:      boolean;
  created_at:            Date;
}

export interface CreateUserAccountDTO {
  employee_id: number;
  username:    string;
  password:    string;
}
