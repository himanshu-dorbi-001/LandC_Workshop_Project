import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { DashboardController } from '../controllers/dashboard.controller';
import { AllocationController } from '../controllers/allocation.controller';
import { ProjectController } from '../controllers/project.controller';
import { TimesheetController } from '../controllers/timesheet.controller';
import { AIController } from '../controllers/ai.controller';

const router = Router();
router.use(authenticate);   // verify JWT on every /api/manager/* request

const dashboard  = new DashboardController();
const allocation = new AllocationController();
const project    = new ProjectController();
const timesheet  = new TimesheetController();
const ai         = new AIController();

// ── Resource dashboard ────────────────────────────────────────
router.get('/dashboard',               requirePermission('dashboard:read'),              dashboard.getResourceDashboard.bind(dashboard));
router.get('/dashboard/employees/:id', requirePermission('employee:read_all'),           dashboard.getEmployeeDetail.bind(dashboard));

// ── Allocations ───────────────────────────────────────────────
router.post('/allocations',              requirePermission('allocation:create'),         allocation.createAllocation.bind(allocation));
router.put ('/allocations/:id/end',      requirePermission('allocation:end'),            allocation.endAllocation.bind(allocation));
router.get ('/projects/:id/allocations', requirePermission('allocation:read_by_project'), allocation.getAllocationsByProject.bind(allocation));

// ── Projects ──────────────────────────────────────────────────
router.get('/projects',     requirePermission('project:read_all'), project.getAllProjects.bind(project));
router.get('/projects/:id', requirePermission('project:read_all'), project.getProjectById.bind(project));

// ── Timesheets ────────────────────────────────────────────────
router.get('/timesheets', requirePermission('timesheet:read_team'), timesheet.getTeamTimesheets.bind(timesheet));

// ── AI assistant ──────────────────────────────────────────────
router.post('/ai/skill-match',  requirePermission('ai:skill_match'),  ai.skillMatch.bind(ai));
router.post('/ai/risk-summary', requirePermission('ai:risk_summary'), ai.riskSummary.bind(ai));
router.post('/ai/team-match',   requirePermission('ai:skill_match'),  ai.teamMatch.bind(ai));

export { router as managerRoutes };
