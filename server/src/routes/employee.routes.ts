import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { TimesheetController } from '../controllers/timesheet.controller';
import { AllocationController } from '../controllers/allocation.controller';

const router = Router();
router.use(authenticate);   // verify JWT on every /api/resource/* request

const timesheet  = new TimesheetController();
const allocation = new AllocationController();

// ── Timesheets ────────────────────────────────────────────────
router.post('/timesheets',     requirePermission('timesheet:submit'),   timesheet.submitTimesheet.bind(timesheet));
router.get ('/timesheets',     requirePermission('timesheet:read_own'), timesheet.getMyTimesheets.bind(timesheet));
router.get ('/timesheets/:id', requirePermission('timesheet:read_own'), timesheet.getTimesheetDetail.bind(timesheet));

// ── Allocations ───────────────────────────────────────────────
router.get('/allocations', requirePermission('allocation:read_own'), allocation.getMyAllocations.bind(allocation));

export { router as resourceRoutes };
