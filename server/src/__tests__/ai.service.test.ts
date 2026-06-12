import { AIService, SkillMatchInput, CandidateContext, ProjectRiskContext } from '../services/ai.service';
import { ISystemConfigRepository } from '../repositories/interfaces/ISystemConfigRepository';
import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IAllocationRepository } from '../repositories/interfaces/IAllocationRepository';
import { IProjectRepository } from '../repositories/interfaces/IProjectRepository';
import { ITimesheetRepository } from '../repositories/interfaces/ITimesheetRepository';
import { SystemConfigMap } from '../models/interfaces/SystemConfig';

const mockConfig: SystemConfigMap = {
  llm_provider:       'gemma',
  llm_api_key:        'test-key',
  scheduler_interval: 1,
  max_weekly_hours:   40,
};

const mockEmployee = {
  id: 3, full_name: 'Bob Dev', department_name: 'Engineering',
  is_active: true, status: 'BENCH',
  skills: [{ skill_name: 'TypeScript', proficiency: 'Expert' }],
};

const mockProject = {
  id: 1, name: 'Alpha', status: 'ACTIVE',
  end_date: new Date('2026-12-31'),
  total_story_points: 100,
  health_status: 'ON_TRACK',
};

const mockMilestone = {
  id: 1, project_id: 1, title: 'MVP', story_points: 50,
  status: 'DONE', due_date: new Date('2026-06-01'),
};

function makeRepos(overrides: Partial<{
  config: Partial<ISystemConfigRepository>;
  employee: Partial<IEmployeeRepository>;
  allocation: Partial<IAllocationRepository>;
  project: Partial<IProjectRepository>;
  timesheet: Partial<ITimesheetRepository>;
}> = {}) {
  const configRepo = {
    getAll:  jest.fn().mockResolvedValue(mockConfig),
    update:  jest.fn().mockResolvedValue(undefined),
    ...overrides.config,
  } as unknown as ISystemConfigRepository;

  const employeeRepo = {
    findByRole: jest.fn().mockResolvedValue([mockEmployee]),
    ...overrides.employee,
  } as unknown as IEmployeeRepository;

  const allocationRepo = {
    findActiveByEmployeeId: jest.fn().mockResolvedValue([]),
    findByProjectId:        jest.fn().mockResolvedValue([]),
    ...overrides.allocation,
  } as unknown as IAllocationRepository;

  const projectRepo = {
    findById:      jest.fn().mockResolvedValue(mockProject),
    getMilestones: jest.fn().mockResolvedValue([mockMilestone]),
    ...overrides.project,
  } as unknown as IProjectRepository;

  const timesheetRepo = {
    findByEmployeeAndWeek: jest.fn().mockResolvedValue(null),
    ...overrides.timesheet,
  } as unknown as ITimesheetRepository;

  return { configRepo, employeeRepo, allocationRepo, projectRepo, timesheetRepo };
}

function makeService(overrides = {}) {
  const repos = makeRepos(overrides);
  return new AIService(repos.configRepo, repos.employeeRepo, repos.allocationRepo, repos.projectRepo, repos.timesheetRepo);
}

describe('AIService — buildCandidateContext', () => {
  it('includes employees with remaining capacity', async () => {
    const svc = makeService();
    const candidates = await svc.buildCandidateContext(40);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].name).toBe('Bob Dev');
    expect(candidates[0].free_pct).toBe(100);
    expect(candidates[0].free_hours_pw).toBe(40);
  });

  it('excludes fully allocated employees', async () => {
    const svc = makeService({
      allocation: { findActiveByEmployeeId: jest.fn().mockResolvedValue([{ utilisation_pct: 100 }]) },
    });
    const candidates = await svc.buildCandidateContext(40);
    expect(candidates).toHaveLength(0);
  });

  it('excludes inactive employees', async () => {
    const svc = makeService({
      employee: { findByRole: jest.fn().mockResolvedValue([{ ...mockEmployee, is_active: false }]) },
    });
    const candidates = await svc.buildCandidateContext(40);
    expect(candidates).toHaveLength(0);
  });

  it('computes partial free hours correctly', async () => {
    const svc = makeService({
      allocation: { findActiveByEmployeeId: jest.fn().mockResolvedValue([{ utilisation_pct: 60 }]) },
    });
    const candidates = await svc.buildCandidateContext(40);
    expect(candidates[0].free_pct).toBe(40);
    expect(candidates[0].free_hours_pw).toBe(16);
  });

  it('handles employee with no skills', async () => {
    const svc = makeService({
      employee: { findByRole: jest.fn().mockResolvedValue([{ ...mockEmployee, skills: [] }]) },
    });
    const candidates = await svc.buildCandidateContext(40);
    expect(candidates[0].skills).toBe('No skills recorded');
  });
});

describe('AIService — buildSkillMatchContext', () => {
  it('includes required skills in context', () => {
    const svc = makeService();
    const candidates: CandidateContext[] = [{
      name: 'Bob Dev', department: 'Engineering', status: 'BENCH',
      free_pct: 100, free_hours_pw: 40, skills: 'TypeScript (Expert)',
    }];
    const input: SkillMatchInput = { required_skills: ['TypeScript', 'Node.js'] };
    const ctx = svc.buildSkillMatchContext(input, candidates, 40);
    const parsed = JSON.parse(ctx);
    expect(parsed.request.required_skills).toContain('TypeScript');
    expect(parsed.request.required_skills).toContain('Node.js');
    expect(parsed.fully_available[0].name).toBe('Bob Dev');
    expect(parsed.fully_available[0].free_pct).toBe(100);
  });

  it('includes project description when provided', () => {
    const svc = makeService();
    const input: SkillMatchInput = { required_skills: ['Go'], project_description: 'Backend API' };
    const ctx = svc.buildSkillMatchContext(input, [], 40);
    const parsed = JSON.parse(ctx);
    expect(parsed.request.project_description).toBe('Backend API');
  });

  it('omits project description when absent', () => {
    const svc = makeService();
    const input: SkillMatchInput = { required_skills: ['Go'] };
    const ctx = svc.buildSkillMatchContext(input, [], 40);
    const parsed = JSON.parse(ctx);
    expect(parsed.request.project_description).toBeNull();
  });
});

describe('AIService — buildProjectRiskContext', () => {
  it('returns correct project fields', async () => {
    const svc = makeService();
    const ctx = await svc.buildProjectRiskContext(1, 40);
    expect(ctx.project_name).toBe('Alpha');
    expect(ctx.total_sp).toBe(100);
    expect(ctx.done_sp).toBe(50);
    expect(ctx.overdue_count).toBe(0);
  });

  it('counts overdue milestones', async () => {
    const overdueMilestone = { ...mockMilestone, status: 'NOT_STARTED', due_date: new Date('2020-01-01') };
    const svc = makeService({
      project: {
        findById:      jest.fn().mockResolvedValue(mockProject),
        getMilestones: jest.fn().mockResolvedValue([overdueMilestone]),
      },
    });
    const ctx = await svc.buildProjectRiskContext(1, 40);
    expect(ctx.overdue_count).toBe(1);
    expect(ctx.milestones).toContain('[OVERDUE]');
  });

  it('throws when project not found', async () => {
    const svc = makeService({
      project: { findById: jest.fn().mockResolvedValue(null), getMilestones: jest.fn() },
    });
    await expect(svc.buildProjectRiskContext(999, 40)).rejects.toThrow('Project not found');
  });
});

describe('AIService — buildRiskSummaryContext', () => {
  it('formats context correctly', () => {
    const svc = makeService();
    const ctx: ProjectRiskContext = {
      project_name: 'Alpha', status: 'ACTIVE', end_date: '2026-12-31',
      total_sp: 100, done_sp: 50, overdue_count: 0,
      milestones: '  MVP | Done', allocations: '  Bob — 80%',
      last_week_effort: '  Bob: expected 32h, logged 30h',
    };
    const result = svc.buildRiskSummaryContext(ctx);
    const parsed = JSON.parse(result);
    expect(parsed.project.name).toBe('Alpha');
    expect(parsed.project.completed_story_points).toBe(50);
    expect(parsed.project.total_story_points).toBe(100);
    expect(parsed.project.overdue_milestone_count).toBe(0);
    expect(parsed.allocated_resources).toContain('Bob — 80%');
  });
});

describe('AIService — skillMatch fallback', () => {
  it('returns fallback when LLM throws', async () => {
    jest.mock('../ai/llm.factory', () => ({
      LLMFactory: { create: jest.fn().mockReturnValue({ skillMatch: jest.fn().mockRejectedValue(new Error('Network error')) }) },
    }));
    const svc = makeService();
    const result = await svc.skillMatch(1, { required_skills: ['TypeScript'] });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns no-candidates message when all are fully allocated', async () => {
    const svc = makeService({
      allocation: { findActiveByEmployeeId: jest.fn().mockResolvedValue([{ utilisation_pct: 100 }]) },
    });
    const result = await svc.skillMatch(1, { required_skills: ['Go'] });
    expect(result).toContain('No available employees');
  });

  it('throws when API key is missing', async () => {
    const svc = makeService({
      config: { getAll: jest.fn().mockResolvedValue({ ...mockConfig, llm_api_key: '' }) },
    });
    await expect(svc.skillMatch(1, { required_skills: ['Go'] })).rejects.toThrow('LLM API key not configured');
  });
});

describe('AIService — riskSummary fallback', () => {
  it('throws when API key is missing', async () => {
    const svc = makeService({
      config: { getAll: jest.fn().mockResolvedValue({ ...mockConfig, llm_api_key: '' }) },
    });
    await expect(svc.riskSummary(1)).rejects.toThrow('LLM API key not configured');
  });

  it('returns fallback string on LLM error', async () => {
    const svc = makeService();
    const result = await svc.riskSummary(1);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
