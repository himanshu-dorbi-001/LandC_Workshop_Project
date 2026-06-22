import { TimesheetService } from '../services/timesheet.service';
import { ITimesheetRepository } from '../repositories/interfaces/ITimesheetRepository';
import { IAllocationRepository } from '../repositories/interfaces/IAllocationRepository';
import { ISystemConfigRepository } from '../repositories/interfaces/ISystemConfigRepository';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { SubmitTimesheetDTO } from '../models/interfaces/Timesheet';

const mockConfig = { max_weekly_hours: 40, llm_provider: 'gemma', llm_api_key: '', scheduler_interval: 1 };

const activeAllocation = {
  id: 1, employee_id: 3, project_id: 1,
  utilisation_pct: 100, is_active: true,
  from_date: new Date('2026-01-01'), to_date: new Date('2026-12-31'),
};

const pastMonday = '2026-06-08';

const validDTO: SubmitTimesheetDTO = {
  week_start_date: pastMonday,
  entries: [{ project_id: 1, hours_worked: 32, activity_tags: ['backend'] }],
};

function makeTimesheetRepo(overrides: Partial<ITimesheetRepository> = {}): ITimesheetRepository {
  return {
    findById:              jest.fn().mockResolvedValue(null),
    findAll:               jest.fn().mockResolvedValue([]),
    findByEmployeeId:      jest.fn().mockResolvedValue([]),
    findByEmployeeAndWeek: jest.fn().mockResolvedValue(null),
    findWithEntries:       jest.fn().mockResolvedValue(null),
    findTeamTimesheets:    jest.fn().mockResolvedValue([]),
    submit:                jest.fn().mockResolvedValue({ id: 5, total_hours: 32, status: 'SUBMITTED' }),
    markMissed:            jest.fn().mockResolvedValue(undefined),
    delete:                jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as ITimesheetRepository;
}

function makeAllocationRepo(overrides: Partial<IAllocationRepository> = {}): IAllocationRepository {
  return {
    findAll:                     jest.fn().mockResolvedValue([]),
    findById:                    jest.fn().mockResolvedValue(null),
    findAllWithDetails:          jest.fn().mockResolvedValue([]),
    findByEmployeeId:            jest.fn().mockResolvedValue([]),
    findByEmployeeIdWithDetails: jest.fn().mockResolvedValue([]),
    findByProjectId:             jest.fn().mockResolvedValue([]),
    findActiveByEmployeeId:      jest.fn().mockResolvedValue([activeAllocation]),
    create:                      jest.fn().mockResolvedValue({}),
    endAllocation:               jest.fn().mockResolvedValue(undefined),
    endAllActiveForEmployee:     jest.fn().mockResolvedValue(undefined),
    getTotalUtilisationInPeriod: jest.fn().mockResolvedValue(0),
    delete:                      jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as IAllocationRepository;
}

function makeConfigRepo(overrides = {}): ISystemConfigRepository {
  return {
    getAll:  jest.fn().mockResolvedValue({ ...mockConfig, ...overrides }),
    update:  jest.fn().mockResolvedValue(undefined),
  } as unknown as ISystemConfigRepository;
}

function makeUserRepo(): IUserRepository {
  return {
    findByEmployeeId: jest.fn().mockResolvedValue({ timesheet_frozen: false }),
  } as unknown as IUserRepository;
}

function makeService(
  tsOverrides: Partial<ITimesheetRepository> = {},
  allocOverrides: Partial<IAllocationRepository> = {},
) {
  return new TimesheetService(makeTimesheetRepo(tsOverrides), makeAllocationRepo(allocOverrides), makeConfigRepo(), makeUserRepo());
}

describe('TimesheetService — submitTimesheet', () => {
  it('submits a valid timesheet', async () => {
    const svc = makeService();
    const result = await svc.submitTimesheet(3, validDTO);
    expect(result).toMatchObject({ id: 5, status: 'SUBMITTED' });
  });

  it('throws when week_start_date is in the future', async () => {
    const futureDTO: SubmitTimesheetDTO = {
      week_start_date: '2099-01-01',
      entries: [{ project_id: 1, hours_worked: 10, activity_tags: [] }],
    };
    const svc = makeService();
    await expect(svc.submitTimesheet(3, futureDTO)).rejects.toThrow('Cannot submit a timesheet for a future week');
  });

  it('throws when timesheet already submitted for the week', async () => {
    const svc = makeService({ findByEmployeeAndWeek: jest.fn().mockResolvedValue({ status: 'SUBMITTED' }) });
    await expect(svc.submitTimesheet(3, validDTO)).rejects.toThrow('already been submitted');
  });

  it('throws when employee not allocated to the project for that week', async () => {
    const svc = makeService({}, { findActiveByEmployeeId: jest.fn().mockResolvedValue([]) });
    await expect(svc.submitTimesheet(3, validDTO)).rejects.toThrow('not allocated to project');
  });

  it('throws when hours exceed allocation cap', async () => {
    const partialAlloc = { ...activeAllocation, utilisation_pct: 50 };
    const svc = makeService({}, { findActiveByEmployeeId: jest.fn().mockResolvedValue([partialAlloc]) });
    const dto: SubmitTimesheetDTO = {
      week_start_date: pastMonday,
      entries: [{ project_id: 1, hours_worked: 25, activity_tags: [] }],
    };
    await expect(svc.submitTimesheet(3, dto)).rejects.toThrow('cannot exceed');
  });

  it('throws when total hours exceed max weekly hours', async () => {
    const alloc1 = { ...activeAllocation, project_id: 1, utilisation_pct: 80 };
    const alloc2 = { ...activeAllocation, id: 2, project_id: 2, utilisation_pct: 80 };
    const svc = makeService({}, { findActiveByEmployeeId: jest.fn().mockResolvedValue([alloc1, alloc2]) });
    const dto: SubmitTimesheetDTO = {
      week_start_date: pastMonday,
      entries: [
        { project_id: 1, hours_worked: 25, activity_tags: [] },
        { project_id: 2, hours_worked: 25, activity_tags: [] },
      ],
    };
    await expect(svc.submitTimesheet(3, dto)).rejects.toThrow('exceed the maximum');
  });
});

describe('TimesheetService — getMyTimesheets', () => {
  it('returns timesheets for the employee', async () => {
    const ts = [{ id: 1, status: 'SUBMITTED' }];
    const svc = makeService({ findByEmployeeId: jest.fn().mockResolvedValue(ts) });
    const result = await svc.getMyTimesheets(3);
    expect(result).toEqual(ts);
  });
});

describe('TimesheetService — getTimesheetDetail', () => {
  it('returns timesheet with entries when employee owns it', async () => {
    const sheet = { id: 1, employee_id: 3, entries: [] };
    const svc = makeService({ findWithEntries: jest.fn().mockResolvedValue(sheet) });
    const result = await svc.getTimesheetDetail(3, 1);
    expect(result.id).toBe(1);
  });

  it('throws when timesheet not found', async () => {
    const svc = makeService({ findWithEntries: jest.fn().mockResolvedValue(null) });
    await expect(svc.getTimesheetDetail(3, 99)).rejects.toThrow('Timesheet not found');
  });

  it('throws when timesheet belongs to a different employee', async () => {
    const sheet = { id: 1, employee_id: 99, entries: [] };
    const svc = makeService({ findWithEntries: jest.fn().mockResolvedValue(sheet) });
    await expect(svc.getTimesheetDetail(3, 1)).rejects.toThrow('Access denied');
  });
});

describe('TimesheetService — getMissedWeekForEmployee', () => {
  it('returns last Monday when no timesheet exists', async () => {
    const svc = makeService({ findByEmployeeAndWeek: jest.fn().mockResolvedValue(null) });
    const result = await svc.getMissedWeekForEmployee(3);
    expect(typeof result).toBe('string');
  });

  it('returns null when timesheet exists for last week', async () => {
    const svc = makeService({ findByEmployeeAndWeek: jest.fn().mockResolvedValue({ id: 1 }) });
    const result = await svc.getMissedWeekForEmployee(3);
    expect(result).toBeNull();
  });
});
