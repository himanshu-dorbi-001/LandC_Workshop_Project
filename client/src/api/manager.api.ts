import { apiCall } from './api';
import { CONFIG } from '../config/config';

export interface DashboardData {
  total:     number;
  bench:     number;
  allocated: number;
  employees: Array<{
    id:              number;
    full_name:       string;
    department_name: string;
    status:          string;
    skills:          Array<{ skill_name: string; proficiency: string }>;
  }>;
}

export interface ProjectRecord {
  id:                 number;
  name:               string;
  description:        string | null;
  status:             string;
  start_date:         string;
  end_date:           string;
  health_status:      string;
  manager_id:         number | null;
  manager_name:       string | null;
  total_story_points: number;
  done_story_points:  number;
}

export interface AllocationRecord {
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

export interface CreateAllocationPayload {
  employee_id:     number;
  project_id:      number;
  utilisation_pct: number;
  from_date:       string;
  to_date:         string;
}

export interface TeamTimesheetEntry {
  id:               number | null;
  timesheet_id:     number | null;
  project_id:       number | null;
  project_name:     string | null;
  hours_worked:     number | null;
  activity_tags:    string[];
  employee_name:    string;
  timesheet_status: string | null;
  week_start_date:  string | null;
}

export interface SkillMatchPayload {
  required_skills:     string[];
  project_description?: string;
}

export interface RiskSummaryPayload {
  project_id: number;
}

export interface SkillRequirement {
  skill:             string;
  min_proficiency?:  string;
}

export interface RoleRequirement {
  role_name:       string;
  required_skills: SkillRequirement[];
}

export interface TeamMatchPayload {
  roles:                RoleRequirement[];
  project_name?:        string;
  project_description?: string;
}

export interface FilledRole {
  role_name:       string;
  required_skills: SkillRequirement[];
  assigned: {
    name:           string;
    department:     string;
    free_pct:       number;
    free_hours_pw:  number;
    matched_skills: string[];
    missing_skills: string[];
    all_skills:     string;
  };
}

export interface UnfilledRole {
  role_name:             string;
  required_skills:       SkillRequirement[];
  gap_type:              'NO_SKILL_IN_TEAM' | 'ALL_ALLOCATED';
  missing_skills:        string[];
  candidates_with_skill: { name: string; free_date: string }[];
}

export interface TeamMatchResult {
  filled:    FilledRole[];
  unfilled:  UnfilledRole[];
  narrative: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardData> {
  return apiCall<DashboardData>('GET', '/api/manager/dashboard');
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<ProjectRecord[]> {
  return apiCall<ProjectRecord[]>('GET', '/api/manager/projects');
}

export async function getProjectById(id: number): Promise<ProjectRecord> {
  return apiCall<ProjectRecord>('GET', `/api/manager/projects/${id}`);
}

export async function getAllocationsByProject(projectId: number): Promise<AllocationRecord[]> {
  return apiCall<AllocationRecord[]>('GET', `/api/manager/projects/${projectId}/allocations`);
}

// ── Allocations ───────────────────────────────────────────────────────────────

export async function createAllocation(data: CreateAllocationPayload): Promise<AllocationRecord> {
  return apiCall<AllocationRecord>('POST', '/api/manager/allocations', data);
}

export async function endAllocation(allocationId: number): Promise<void> {
  await apiCall('PUT', `/api/manager/allocations/${allocationId}/end`);
}

// ── Timesheets ────────────────────────────────────────────────────────────────

export async function getTeamTimesheets(week?: string): Promise<TeamTimesheetEntry[]> {
  const path = week ? `/api/manager/timesheets?week=${week}` : '/api/manager/timesheets';
  return apiCall<TeamTimesheetEntry[]>('GET', path);
}

// ── AI tools ─────────────────────────────────────────────────────────────────

export async function aiSkillMatch(payload: SkillMatchPayload): Promise<string> {
  return apiCall<string>('POST', '/api/manager/ai/skill-match', payload, CONFIG.AI_REQUEST_TIMEOUT_MS);
}

export async function aiRiskSummary(payload: RiskSummaryPayload): Promise<string> {
  return apiCall<string>('POST', '/api/manager/ai/risk-summary', payload, CONFIG.AI_REQUEST_TIMEOUT_MS);
}

export async function aiTeamMatch(payload: TeamMatchPayload): Promise<TeamMatchResult> {
  return apiCall<TeamMatchResult>('POST', '/api/manager/ai/team-match', payload, CONFIG.AI_REQUEST_TIMEOUT_MS);
}
