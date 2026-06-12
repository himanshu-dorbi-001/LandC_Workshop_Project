import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';
import { ProjectRepository } from '../repositories/implementations/ProjectRepository';
import { sendSuccess, sendError } from '../utils/response';
import { parseId } from '../utils/parseId';
import { asyncHandler } from '../utils/asyncHandler';

const projectService = new ProjectService(new ProjectRepository());

export class ProjectController {

  getAllProjects = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await projectService.getAllProjects());
  });

  getProjectById = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await projectService.getProjectById(parseId(req.params.id)));
  });

  createProject = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { name, start_date, end_date, status, total_story_points } = req.body;
    if (!name || !start_date || !end_date || !status || total_story_points === undefined) {
      sendError(res, 'name, start_date, end_date, status and total_story_points are required');
      return;
    }
    sendSuccess(res, await projectService.createProject(req.body), 201);
  });

  updateProject = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await projectService.updateProject(parseId(req.params.id), req.body);
    sendSuccess(res, { message: 'Project updated.' });
  });

  getMilestones = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    sendSuccess(res, await projectService.getMilestones(parseId(req.params.id)));
  });

  addMilestone = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { title, due_date, story_points } = req.body;
    if (!title || !due_date || story_points === undefined) {
      sendError(res, 'title, due_date and story_points are required');
      return;
    }
    sendSuccess(res, await projectService.addMilestone(parseId(req.params.id), req.body), 201);
  });

  updateMilestone = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { status } = req.body;
    if (!status) { sendError(res, 'status is required'); return; }
    await projectService.updateMilestone(
      parseId(req.params.id),
      parseId(req.params.milestoneId),
      { status }
    );
    sendSuccess(res, { message: 'Milestone updated.' });
  });
}
