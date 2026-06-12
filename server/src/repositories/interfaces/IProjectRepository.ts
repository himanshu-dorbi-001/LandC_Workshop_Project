import { IBaseRepository } from './IBaseRepository';
import {
  Project, ProjectWithDetails,
  Milestone,
  CreateProjectDTO, UpdateProjectDTO,
  CreateMilestoneDTO, UpdateMilestoneDTO,
  HealthStatus,
} from '../../models/interfaces/Project';

export interface IProjectRepository extends IBaseRepository<Project> {
  findAllWithDetails(): Promise<ProjectWithDetails[]>;
  findByManagerId(managerId: number): Promise<ProjectWithDetails[]>;
  create(dto: CreateProjectDTO): Promise<Project>;
  update(id: number, dto: UpdateProjectDTO): Promise<void>;
  updateHealthStatus(id: number, health: HealthStatus): Promise<void>;

  // Milestones
  getMilestones(projectId: number): Promise<Milestone[]>;
  addMilestone(projectId: number, dto: CreateMilestoneDTO): Promise<Milestone>;
  updateMilestone(milestoneId: number, dto: UpdateMilestoneDTO): Promise<void>;
  findMilestoneById(milestoneId: number): Promise<Milestone | null>;
}
