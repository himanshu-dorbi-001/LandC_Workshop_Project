import { apiCall } from './api';

export interface EmployeeRecord {
  id:              number;
  full_name:       string;
  email:           string;
  username:        string;
  role:            string;
  department_name: string;
  status:          string;
  is_active:       boolean;
}

export interface CreateEmployeePayload {
  full_name:     string;
  email:         string;
  username:      string;
  password:      string;
  role:          string;
  department_id: number;
}

export interface UpdateEmployeePayload {
  full_name?:     string;
  email?:         string;
  department_id?: number;
}

export interface SkillRecord {
  id:          number;
  skill_name:  string;
  category:    string;
  proficiency: string;
}

export interface AddSkillPayload {
  skill_name:  string;
  category:    string;
  proficiency: string;
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

export interface CreateProjectPayload {
  name:               string;
  description?:       string;
  start_date:         string;
  end_date:           string;
  status:             string;
  total_story_points: number;
}

export interface UpdateProjectPayload {
  name?:               string;
  description?:        string;
  start_date?:         string;
  end_date?:           string;
  status?:             string;
  manager_id?:         number | null;
  total_story_points?: number;
}

export interface MilestoneRecord {
  id:           number;
  project_id:   number;
  title:        string;
  due_date:     string;
  story_points: number;
  status:       string;
}

export interface AddMilestonePayload {
  title:        string;
  due_date:     string;
  story_points: number;
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

export interface SystemConfigRecord {
  key:   string;
  value: string;
}

// ── Employees ─────────────────────────────────────────────────────────────────

export async function getAllEmployees(): Promise<EmployeeRecord[]> {
  return apiCall<EmployeeRecord[]>('GET', '/api/admin/employees');
}

export async function getEmployeeById(id: number): Promise<EmployeeRecord> {
  return apiCall<EmployeeRecord>('GET', `/api/admin/employees/${id}`);
}

export async function createEmployee(data: CreateEmployeePayload): Promise<EmployeeRecord> {
  return apiCall<EmployeeRecord>('POST', '/api/admin/employees', data);
}

export async function updateEmployee(id: number, data: UpdateEmployeePayload): Promise<void> {
  await apiCall('PUT', `/api/admin/employees/${id}`, data);
}

export async function resetPassword(employeeId: number, newPassword: string): Promise<void> {
  await apiCall('PUT', `/api/admin/employees/${employeeId}/reset-password`, { newPassword });
}

export async function deactivateEmployee(employeeId: number): Promise<void> {
  await apiCall('PUT', `/api/admin/employees/${employeeId}/deactivate`);
}

export async function reactivateEmployee(employeeId: number): Promise<void> {
  await apiCall('PUT', `/api/admin/employees/${employeeId}/reactivate`);
}

// ── Skills ────────────────────────────────────────────────────────────────────

export async function getEmployeeSkills(employeeId: number): Promise<SkillRecord[]> {
  return apiCall<SkillRecord[]>('GET', `/api/admin/employees/${employeeId}/skills`);
}

export async function addEmployeeSkill(employeeId: number, data: AddSkillPayload): Promise<void> {
  await apiCall('POST', `/api/admin/employees/${employeeId}/skills`, data);
}

export async function updateEmployeeSkill(
  employeeId: number, skillId: number, proficiency: string,
): Promise<void> {
  await apiCall('PUT', `/api/admin/employees/${employeeId}/skills/${skillId}`, { proficiency });
}

export async function removeEmployeeSkill(employeeId: number, skillId: number): Promise<void> {
  await apiCall('DELETE', `/api/admin/employees/${employeeId}/skills/${skillId}`);
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getAllProjects(): Promise<ProjectRecord[]> {
  return apiCall<ProjectRecord[]>('GET', '/api/admin/projects');
}

export async function createProject(data: CreateProjectPayload): Promise<ProjectRecord> {
  return apiCall<ProjectRecord>('POST', '/api/admin/projects', data);
}

export async function getProjectById(id: number): Promise<ProjectRecord> {
  return apiCall<ProjectRecord>('GET', `/api/admin/projects/${id}`);
}

export async function updateProject(id: number, data: UpdateProjectPayload): Promise<void> {
  await apiCall('PUT', `/api/admin/projects/${id}`, data);
}

// ── Milestones ────────────────────────────────────────────────────────────────

export async function getMilestones(projectId: number): Promise<MilestoneRecord[]> {
  return apiCall<MilestoneRecord[]>('GET', `/api/admin/projects/${projectId}/milestones`);
}

export async function addMilestone(projectId: number, data: AddMilestonePayload): Promise<void> {
  await apiCall('POST', `/api/admin/projects/${projectId}/milestones`, data);
}

export async function updateMilestone(
  projectId: number, milestoneId: number, status: string,
): Promise<void> {
  await apiCall('PUT', `/api/admin/projects/${projectId}/milestones/${milestoneId}`, { status });
}

// ── Allocations ───────────────────────────────────────────────────────────────

export async function getAllAllocations(): Promise<AllocationRecord[]> {
  return apiCall<AllocationRecord[]>('GET', '/api/admin/allocations');
}

// ── System config ─────────────────────────────────────────────────────────────

export async function getSystemConfig(): Promise<SystemConfigRecord[]> {
  const map = await apiCall<Record<string, unknown>>('GET', '/api/admin/config');
  return Object.entries(map).map(([key, value]) => ({ key, value: String(value) }));
}

export async function updateSystemConfig(key: string, value: string): Promise<void> {
  await apiCall('PUT', '/api/admin/config', { key, value });
}
