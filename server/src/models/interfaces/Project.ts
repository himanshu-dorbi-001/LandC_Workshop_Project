export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
export type HealthStatus = 'ON_TRACK' | 'ATTENTION' | 'AT_RISK';
export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

export interface Project {
  id:                  number;
  name:                string;
  description:         string | null;
  start_date:          Date;
  end_date:            Date;
  status:              ProjectStatus;
  manager_id:          number | null;
  total_story_points:  number;
  health_status:       HealthStatus;
  created_at:          Date;
  updated_at:          Date;
}

export interface ProjectWithDetails extends Project {
  manager_name: string | null;
  done_story_points: number;
}

export interface Milestone {
  id:           number;
  project_id:   number;
  title:        string;
  due_date:     Date;
  story_points: number;
  status:       MilestoneStatus;
  created_at:   Date;
  updated_at:   Date;
}

export interface CreateProjectDTO {
  name:               string;
  description?:       string;
  start_date:         string;
  end_date:           string;
  status:             ProjectStatus;
  manager_id?:        number;
  total_story_points: number;
}

export interface UpdateProjectDTO {
  name?:               string;
  description?:        string;
  start_date?:         string;
  end_date?:           string;
  status?:             ProjectStatus;
  manager_id?:         number;
  total_story_points?: number;
}

export interface CreateMilestoneDTO {
  title:        string;
  due_date:     string;
  story_points: number;
}

export interface UpdateMilestoneDTO {
  status: MilestoneStatus;
}
