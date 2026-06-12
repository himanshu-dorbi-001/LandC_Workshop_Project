import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { UserController } from '../controllers/user.controller';
import { EmployeeController } from '../controllers/employee.controller';
import { ProjectController } from '../controllers/project.controller';
import { ConfigController } from '../controllers/config.controller';
import { AllocationController } from '../controllers/allocation.controller';

const router = Router();
router.use(authenticate);   // verify JWT on every /api/admin/* request

const user       = new UserController();
const employee   = new EmployeeController();
const project    = new ProjectController();
const config     = new ConfigController();
const allocation = new AllocationController();

// ── Employee account management ───────────────────────────────
router.post('/employees',                    requirePermission('employee:create'),         user.createEmployee.bind(user));
router.get ('/employees',                    requirePermission('employee:read_all'),        user.getAllEmployees.bind(user));
router.put ('/employees/:id/reset-password', requirePermission('employee:reset_password'), user.resetPassword.bind(user));
router.put ('/employees/:id/deactivate',     requirePermission('employee:deactivate'),     user.deactivateEmployee.bind(user));
router.put ('/employees/:id/reactivate',     requirePermission('employee:reactivate'),     user.reactivateEmployee.bind(user));

// ── Employee profile & skills ─────────────────────────────────
router.get   ('/employees/:id',                 requirePermission('employee:read_all'),  employee.getEmployeeById.bind(employee));
router.put   ('/employees/:id',                 requirePermission('employee:update'),    employee.updateEmployee.bind(employee));
router.put   ('/employees/:id/deactivate-emp',  requirePermission('employee:deactivate'), employee.deactivateEmployee.bind(employee));
router.get   ('/employees/:id/skills',          requirePermission('skill:manage'),       employee.getSkills.bind(employee));
router.post  ('/employees/:id/skills',          requirePermission('skill:manage'),       employee.addSkill.bind(employee));
router.put   ('/employees/:id/skills/:skillId', requirePermission('skill:manage'),       employee.updateSkill.bind(employee));
router.delete('/employees/:id/skills/:skillId', requirePermission('skill:manage'),       employee.removeSkill.bind(employee));

// ── Project management ────────────────────────────────────────
router.get ('/projects',                             requirePermission('project:read_all'),   project.getAllProjects.bind(project));
router.post('/projects',                             requirePermission('project:create'),     project.createProject.bind(project));
router.get ('/projects/:id',                         requirePermission('project:read_all'),   project.getProjectById.bind(project));
router.put ('/projects/:id',                         requirePermission('project:update'),     project.updateProject.bind(project));
router.get ('/projects/:id/milestones',              requirePermission('project:read_all'),   project.getMilestones.bind(project));
router.post('/projects/:id/milestones',              requirePermission('milestone:manage'),   project.addMilestone.bind(project));
router.put ('/projects/:id/milestones/:milestoneId', requirePermission('milestone:manage'),   project.updateMilestone.bind(project));

// ── Allocation view ───────────────────────────────────────────
router.get('/allocations', requirePermission('allocation:read_all'), allocation.getAllAllocations.bind(allocation));

// ── System configuration ──────────────────────────────────────
router.get('/config', requirePermission('config:read'),   config.getConfig.bind(config));
router.put('/config', requirePermission('config:update'), config.updateConfig.bind(config));

export { router as adminRoutes };
