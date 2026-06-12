export interface Allocation {
  id:              number;
  employee_id:     number;
  project_id:      number;
  utilisation_pct: number;
  from_date:       Date;
  to_date:         Date;
  is_active:       boolean;
  created_at:      Date;
  updated_at:      Date;
}

export interface AllocationWithDetails extends Allocation {
  employee_name: string;
  project_name:  string;
}

export interface CreateAllocationDTO {
  employee_id:     number;
  project_id:      number;
  utilisation_pct: number;
  from_date:       string;
  to_date:         string;
}
