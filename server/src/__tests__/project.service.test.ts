import { ProjectService } from '../services/project.service';
import { IProjectRepository } from '../repositories/interfaces/IProjectRepository';

const mockProject = {
  id: 1, name: 'Alpha', status: 'ACTIVE' as const,
  start_date: new Date('2026-01-01'), end_date: new Date('2026-12-31'),
  total_story_points: 100, health_status: 'ON_TRACK' as const,
  description: null, manager_id: null,
};

const mockMilestone = {
  id: 1, project_id: 1, title: 'MVP',
  due_date: new Date('2026-06-30'), story_points: 50, status: 'NOT_STARTED' as const,
};

function makeRepo(overrides: Partial<IProjectRepository> = {}): IProjectRepository {
  return {
    findById:         jest.fn().mockResolvedValue(mockProject),
    findAll:          jest.fn().mockResolvedValue([mockProject]),
    findAllWithDetails: jest.fn().mockResolvedValue([mockProject]),
    findByManagerId:  jest.fn().mockResolvedValue([mockProject]),
    create:           jest.fn().mockResolvedValue(mockProject),
    update:           jest.fn().mockResolvedValue(undefined),
    updateHealthStatus: jest.fn().mockResolvedValue(undefined),
    getMilestones:    jest.fn().mockResolvedValue([mockMilestone]),
    addMilestone:     jest.fn().mockResolvedValue(mockMilestone),
    updateMilestone:  jest.fn().mockResolvedValue(undefined),
    findMilestoneById: jest.fn().mockResolvedValue(mockMilestone),
    delete:           jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as IProjectRepository;
}

function makeService(overrides: Partial<IProjectRepository> = {}) {
  return new ProjectService(makeRepo(overrides));
}

describe('ProjectService — getAllProjects', () => {
  it('returns all projects', async () => {
    const svc = makeService();
    const result = await svc.getAllProjects();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alpha');
  });
});

describe('ProjectService — getProjectById', () => {
  it('returns a project by ID', async () => {
    const svc = makeService();
    const result = await svc.getProjectById(1);
    expect(result.id).toBe(1);
  });

  it('throws when project not found', async () => {
    const svc = makeService({ findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.getProjectById(999)).rejects.toThrow('Project not found');
  });
});

describe('ProjectService — createProject', () => {
  it('creates a valid project', async () => {
    const svc = makeService();
    const result = await svc.createProject({
      name: 'Beta', start_date: '2026-01-01', end_date: '2026-12-31',
      status: 'PLANNED', total_story_points: 50,
    });
    expect(result.name).toBe('Alpha');
  });

  it('throws when start_date >= end_date', async () => {
    const svc = makeService();
    await expect(svc.createProject({
      name: 'Bad', start_date: '2026-12-31', end_date: '2026-01-01',
      status: 'PLANNED', total_story_points: 10,
    })).rejects.toThrow('Start date must be before end date');
  });
});

describe('ProjectService — updateProject', () => {
  it('updates a project', async () => {
    const svc = makeService();
    await expect(svc.updateProject(1, { name: 'Alpha v2' })).resolves.toBeUndefined();
  });

  it('throws when project not found', async () => {
    const svc = makeService({ findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.updateProject(999, { name: 'X' })).rejects.toThrow('Project not found');
  });

  it('throws when updated dates are invalid', async () => {
    const svc = makeService();
    await expect(svc.updateProject(1, { start_date: '2026-12-31', end_date: '2026-01-01' }))
      .rejects.toThrow('Start date must be before end date');
  });
});

describe('ProjectService — milestones', () => {
  it('returns milestones for a project', async () => {
    const svc = makeService();
    const result = await svc.getMilestones(1);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('MVP');
  });

  it('throws when project not found in getMilestones', async () => {
    const svc = makeService({ findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.getMilestones(999)).rejects.toThrow('Project not found');
  });

  it('adds a milestone', async () => {
    const svc = makeService();
    const result = await svc.addMilestone(1, { title: 'Launch', due_date: '2026-09-01', story_points: 30 });
    expect(result.title).toBe('MVP');
  });

  it('throws on empty milestone title', async () => {
    const svc = makeService();
    await expect(svc.addMilestone(1, { title: '', due_date: '2026-09-01', story_points: 30 }))
      .rejects.toThrow('Milestone title is required');
  });

  it('throws when story_points is negative', async () => {
    const svc = makeService();
    await expect(svc.addMilestone(1, { title: 'X', due_date: '2026-09-01', story_points: -1 }))
      .rejects.toThrow('Story points cannot be negative');
  });

  it('updates a milestone status', async () => {
    const svc = makeService();
    await expect(svc.updateMilestone(1, 1, { status: 'DONE' })).resolves.toBeUndefined();
  });

  it('throws when milestone not found in updateMilestone', async () => {
    const svc = makeService({ findMilestoneById: jest.fn().mockResolvedValue(null) });
    await expect(svc.updateMilestone(1, 999, { status: 'DONE' })).rejects.toThrow('Milestone not found');
  });

  it('throws when milestone belongs to a different project', async () => {
    const svc = makeService({ findMilestoneById: jest.fn().mockResolvedValue({ ...mockMilestone, project_id: 99 }) });
    await expect(svc.updateMilestone(1, 1, { status: 'DONE' })).rejects.toThrow('Milestone not found');
  });
});
