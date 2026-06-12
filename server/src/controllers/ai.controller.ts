import { Request, Response, NextFunction } from 'express';
import { AIService, TeamMatchInput } from '../services/ai.service';
import { SystemConfigRepository } from '../repositories/implementations/SystemConfigRepository';
import { EmployeeRepository } from '../repositories/implementations/EmployeeRepository';
import { AllocationRepository } from '../repositories/implementations/AllocationRepository';
import { ProjectRepository } from '../repositories/implementations/ProjectRepository';
import { TimesheetRepository } from '../repositories/implementations/TimesheetRepository';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const aiService = new AIService(
  new SystemConfigRepository(),
  new EmployeeRepository(),
  new AllocationRepository(),
  new ProjectRepository(),
  new TimesheetRepository()
);

export class AIController {

  skillMatch = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { required_skills, project_description } = req.body;
    if (!required_skills || !Array.isArray(required_skills) || required_skills.length === 0) {
      sendError(res, 'required_skills must be a non-empty array');
      return;
    }
    sendSuccess(res, await aiService.skillMatch(req.user!.employeeId!, { required_skills, project_description }));
  });

  riskSummary = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { project_id } = req.body;
    if (!project_id) { sendError(res, 'project_id is required'); return; }
    sendSuccess(res, await aiService.riskSummary(parseInt(project_id, 10)));
  });

  teamMatch = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { roles, project_name, project_description } = req.body as TeamMatchInput & Record<string, unknown>;
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      sendError(res, 'roles must be a non-empty array'); return;
    }
    for (const r of roles) {
      if (!r.role_name?.trim()) { sendError(res, 'Each role must have a role_name'); return; }
      if (!Array.isArray(r.required_skills) || r.required_skills.length === 0) {
        sendError(res, `Role "${r.role_name}" must have at least one required_skill`); return;
      }
    }
    sendSuccess(res, await aiService.teamMatch({ roles, project_name, project_description }));
  });
}
