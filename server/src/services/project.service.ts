import { IProjectRepository } from '../repositories/interfaces/IProjectRepository';
import {
  Project, ProjectWithDetails, Milestone,
  CreateProjectDTO, UpdateProjectDTO,
  CreateMilestoneDTO, UpdateMilestoneDTO,
} from '../models/interfaces/Project';
import { NotFoundError, ValidationError } from '../exceptions';

export class ProjectService {
  constructor(private projectRepo: IProjectRepository) {}

  async getAllProjects(): Promise<ProjectWithDetails[]> {
    return this.projectRepo.findAllWithDetails();
  }

  async getProjectById(id: number): Promise<Project> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundError('Project not found');
    return project;
  }

  async getProjectsByManager(managerId: number): Promise<ProjectWithDetails[]> {
    return this.projectRepo.findByManagerId(managerId);
  }

  async createProject(dto: CreateProjectDTO): Promise<Project> {
    if (new Date(dto.start_date) >= new Date(dto.end_date)) {
      throw new ValidationError('Start date must be before end date');
    }
    return this.projectRepo.create(dto);
  }

  async updateProject(id: number, dto: UpdateProjectDTO): Promise<void> {
    const project = await this.projectRepo.findById(id);
    if (!project) throw new NotFoundError('Project not found');
    if (dto.start_date && dto.end_date && new Date(dto.start_date) >= new Date(dto.end_date)) {
      throw new ValidationError('Start date must be before end date');
    }
    await this.projectRepo.update(id, dto);
  }

  async getMilestones(projectId: number): Promise<Milestone[]> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    return this.projectRepo.getMilestones(projectId);
  }

  async addMilestone(projectId: number, dto: CreateMilestoneDTO): Promise<Milestone> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    if (!dto.title?.trim()) throw new ValidationError('Milestone title is required');
    if (dto.story_points < 0) throw new ValidationError('Story points cannot be negative');
    return this.projectRepo.addMilestone(projectId, dto);
  }

  async updateMilestone(projectId: number, milestoneId: number, dto: UpdateMilestoneDTO): Promise<void> {
    const milestone = await this.projectRepo.findMilestoneById(milestoneId);
    if (!milestone || milestone.project_id !== projectId) {
      throw new NotFoundError('Milestone not found for this project');
    }
    await this.projectRepo.updateMilestone(milestoneId, dto);
  }

  async getProjectWithMilestones(projectId: number) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    const milestones = await this.projectRepo.getMilestones(projectId);
    return { ...project, milestones };
  }
}
