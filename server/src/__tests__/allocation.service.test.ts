import { AllocationService } from '../services/allocation.service';
import { IAllocationRepository } from '../repositories/interfaces/IAllocationRepository';
import { IProjectRepository } from '../repositories/interfaces/IProjectRepository';
import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';

const activeProject  = { id: 1, status: 'ACTIVE',    manager_id: 2 };
const plannedProject = { id: 2, status: 'PLANNED',   manager_id: 2 };
const doneProject    = { id: 3, status: 'COMPLETED', manager_id: 2 };
const activeEmployee = { id: 10, is_active: true };
const inactiveEmp    = { id: 11, is_active: false };

function makeAllocationRepo(overrides: Partial<IAllocationRepository> = {}): IAllocationRepository {
  return {
    findAll:                      jest.fn().mockResolvedValue([]),
    findById:                     jest.fn().mockResolvedValue(null),
    findAllWithDetails:           jest.fn().mockResolvedValue([]),
    findByEmployeeId:             jest.fn().mockResolvedValue([]),
    findByEmployeeIdWithDetails:  jest.fn().mockResolvedValue([]),
    findByProjectId:              jest.fn().mockResolvedValue([]),
    findActiveByEmployeeId:       jest.fn().mockResolvedValue([]),
    create:                       jest.fn().mockResolvedValue({ id: 99 }),
    endAllocation:                jest.fn().mockResolvedValue(undefined),
    endAllActiveForEmployee:      jest.fn().mockResolvedValue(undefined),
    getTotalUtilisationInPeriod:  jest.fn().mockResolvedValue(0),
    delete:                       jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as IAllocationRepository;
}

function makeProjectRepo(project: unknown = activeProject): IProjectRepository {
  return { findById: jest.fn().mockResolvedValue(project) } as unknown as IProjectRepository;
}

function makeEmployeeRepo(employee: unknown = activeEmployee): IEmployeeRepository {
  return { findById: jest.fn().mockResolvedValue(employee) } as unknown as IEmployeeRepository;
}

function makeService(
  alloc: Partial<IAllocationRepository> = {},
  project: unknown = activeProject,
  employee: unknown = activeEmployee,
) {
  return new AllocationService(makeAllocationRepo(alloc), makeProjectRepo(project), makeEmployeeRepo(employee));
}

const validDto = {
  employee_id: 10, project_id: 1,
  utilisation_pct: 50,
  from_date: '2026-01-01', to_date: '2026-12-31',
};

describe('AllocationService — createAllocation', () => {
  it('creates allocation when inputs are valid', async () => {
    const svc = makeService();
    const result = await svc.createAllocation(validDto);
    expect(result).toEqual({ id: 99 });
  });

  it('throws when project not found', async () => {
    const svc = makeService({}, null);
    await expect(svc.createAllocation(validDto)).rejects.toThrow('Project not found');
  });

  it('throws when project is COMPLETED', async () => {
    const svc = makeService({}, doneProject);
    await expect(svc.createAllocation(validDto)).rejects.toThrow('Can only allocate to ACTIVE or PLANNED');
  });

  it('allows allocation to PLANNED project', async () => {
    const svc = makeService({}, plannedProject);
    const result = await svc.createAllocation({ ...validDto, project_id: 2 });
    expect(result).toEqual({ id: 99 });
  });

  it('throws when employee not found', async () => {
    const svc = makeService({}, activeProject, null);
    await expect(svc.createAllocation(validDto)).rejects.toThrow('Employee not found');
  });

  it('throws when employee is inactive', async () => {
    const svc = makeService({}, activeProject, inactiveEmp);
    await expect(svc.createAllocation(validDto)).rejects.toThrow('Cannot allocate an inactive employee');
  });

  it('throws when from_date >= to_date', async () => {
    const svc = makeService();
    await expect(svc.createAllocation({ ...validDto, from_date: '2026-12-31', to_date: '2026-01-01' }))
      .rejects.toThrow('from_date must be before to_date');
  });

  it('throws when utilisation < 1', async () => {
    const svc = makeService();
    await expect(svc.createAllocation({ ...validDto, utilisation_pct: 0 }))
      .rejects.toThrow('Utilisation must be between 1 and 100');
  });

  it('throws when utilisation > 100', async () => {
    const svc = makeService();
    await expect(svc.createAllocation({ ...validDto, utilisation_pct: 101 }))
      .rejects.toThrow('Utilisation must be between 1 and 100');
  });

  it('throws on over-allocation', async () => {
    const svc = makeService({ getTotalUtilisationInPeriod: jest.fn().mockResolvedValue(70) });
    await expect(svc.createAllocation({ ...validDto, utilisation_pct: 40 }))
      .rejects.toThrow('Over-allocation');
  });

  it('allows allocation exactly at 100%', async () => {
    const svc = makeService({ getTotalUtilisationInPeriod: jest.fn().mockResolvedValue(50) });
    const result = await svc.createAllocation({ ...validDto, utilisation_pct: 50 });
    expect(result).toEqual({ id: 99 });
  });
});

describe('AllocationService — endAllocation', () => {
  it('ends an active allocation owned by the manager', async () => {
    const allocationRepo = makeAllocationRepo({
      findById:      jest.fn().mockResolvedValue({ id: 1, is_active: true, project_id: 1 }),
      endAllocation: jest.fn().mockResolvedValue(undefined),
    });
    const svc = new AllocationService(allocationRepo, makeProjectRepo({ id: 1, manager_id: 2 }), makeEmployeeRepo());
    await expect(svc.endAllocation(1, 2)).resolves.toBeUndefined();
  });

  it('throws when allocation not found', async () => {
    const svc = makeService({ findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.endAllocation(999, 2)).rejects.toThrow('Allocation not found');
  });

  it('throws when allocation already ended', async () => {
    const svc = makeService({ findById: jest.fn().mockResolvedValue({ id: 1, is_active: false, project_id: 1 }) });
    await expect(svc.endAllocation(1, 2)).rejects.toThrow('Allocation is already ended');
  });

  it('throws when manager does not own the project', async () => {
    const allocationRepo = makeAllocationRepo({
      findById: jest.fn().mockResolvedValue({ id: 1, is_active: true, project_id: 1 }),
    });
    const svc = new AllocationService(allocationRepo, makeProjectRepo({ id: 1, manager_id: 99 }), makeEmployeeRepo());
    await expect(svc.endAllocation(1, 2)).rejects.toThrow('You can only end allocations on your own projects');
  });
});

describe('AllocationService — queries', () => {
  it('getAllAllocations returns all active allocations with details', async () => {
    const svc = makeService({ findAllWithDetails: jest.fn().mockResolvedValue([{ id: 1 }]) });
    const result = await svc.getAllAllocations();
    expect(result).toEqual([{ id: 1 }]);
  });

  it('getAllocationsByEmployee returns details for a specific employee', async () => {
    const svc = makeService({ findByEmployeeIdWithDetails: jest.fn().mockResolvedValue([{ id: 2 }]) });
    const result = await svc.getAllocationsByEmployee(10);
    expect(result).toEqual([{ id: 2 }]);
  });

  it('getAllocationsByProject returns allocations for a project', async () => {
    const svc = makeService({ findByProjectId: jest.fn().mockResolvedValue([{ id: 3 }]) });
    const result = await svc.getAllocationsByProject(1);
    expect(result).toEqual([{ id: 3 }]);
  });
});
