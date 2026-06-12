import { UserRole } from './User';

export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type SkillCategory    = 'BACKEND' | 'FRONTEND' | 'DEVOPS' | 'QA' | 'OTHER';
export type EmployeeStatus   = 'BENCH' | 'ALLOCATED';

export interface Department {
  id:   number;
  name: string;
  type: string;
}

export interface Employee {
  id:            number;
  department_id: number;
  full_name:     string;
  email:         string;
  is_active:     boolean;
  created_at:    Date;
  updated_at:    Date;
}

export interface EmployeeWithDetails extends Employee {
  department_name: string;
  username:        string;
  role:            UserRole;
  status:          EmployeeStatus;  // derived: ALLOCATED if active allocation today, else BENCH
  skills:          EmployeeSkillDetail[];
}

export interface Skill {
  id:         number;
  skill_name: string;
  category:   SkillCategory;
  created_at: Date;
}

export interface EmployeeSkill {
  id:          number;
  employee_id: number;
  skill_id:    number;
  proficiency: ProficiencyLevel;
  created_at:  Date;
  updated_at:  Date;
}

export interface EmployeeSkillDetail {
  skill_id:    number;
  skill_name:  string;
  category:    SkillCategory;
  proficiency: ProficiencyLevel;
}

export interface CreateEmployeeDTO {
  department_id: number;
  full_name:     string;
  email:         string;
  username:      string;
  password:      string;
  role:          UserRole;
}

export interface UpdateEmployeeDTO {
  full_name?:     string;
  department_id?: number;
  email?:         string;
}

export interface AddSkillDTO {
  skill_name:  string;
  category:    SkillCategory;
  proficiency: ProficiencyLevel;
}

export interface UpdateSkillDTO {
  proficiency: ProficiencyLevel;
}
