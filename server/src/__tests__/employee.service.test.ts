import { EmployeeService } from '../services/employee.service';
import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IAllocationRepository } from '../repositories/interfaces/IAllocationRepository';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';

const mockEmp   = { id: 5, full_name: 'Bob Dev', is_active: true };
const mockSkill = { skill_id: 1, skill_name: 'TypeScript', category: 'Technical', proficiency: 'Expert' };

function makeEmpRepo(overrides: Partial<IEmployeeRepository> = {}): IEmployeeRepository {
  return {
    findAllWithDetails:  jest.fn().mockResolvedValue([mockEmp]),
    findByRole:          jest.fn().mockResolvedValue([mockEmp]),
    findById:            jest.fn().mockResolvedValue(mockEmp),
    findWithDetailsById: jest.fn().mockResolvedValue(mockEmp),
    update:              jest.fn().mockResolvedValue(undefined),
    setActive:           jest.fn().mockResolvedValue(undefined),
    getSkills:           jest.fn().mockResolvedValue([mockSkill]),
    addSkill:            jest.fn().mockResolvedValue(undefined),
    updateSkill:         jest.fn().mockResolvedValue(undefined),
    removeSkill:         jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IEmployeeRepository;
}

function makeAllocRepo(): IAllocationRepository {
  return {
    findActiveByEmployeeId:  jest.fn().mockResolvedValue([]),
    endAllActiveForEmployee: jest.fn().mockResolvedValue(undefined),
  } as unknown as IAllocationRepository;
}

function makeUserRepo(): IUserRepository {
  return {
    setActiveByEmployeeId: jest.fn().mockResolvedValue(undefined),
  } as unknown as IUserRepository;
}

function makeService(empOverrides: Partial<IEmployeeRepository> = {}) {
  return new EmployeeService(makeEmpRepo(empOverrides), makeAllocRepo(), makeUserRepo());
}

describe('EmployeeService — queries', () => {
  it('getAllEmployees returns list', async () => {
    const result = await makeService().getAllEmployees();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
  });

  it('getResourceEmployees returns RESOURCE employees', async () => {
    const result = await makeService().getResourceEmployees();
    expect(result).toHaveLength(1);
  });

  it('getEmployeeById returns employee', async () => {
    const result = await makeService().getEmployeeById(5);
    expect(result.id).toBe(5);
  });

  it('getEmployeeById throws when not found', async () => {
    const svc = makeService({ findWithDetailsById: jest.fn().mockResolvedValue(null) });
    await expect(svc.getEmployeeById(999)).rejects.toThrow('Employee not found');
  });

  it('updateEmployee succeeds', async () => {
    await expect(makeService().updateEmployee(5, { full_name: 'Updated' })).resolves.toBeUndefined();
  });

  it('updateEmployee throws when employee not found', async () => {
    const svc = makeService({ findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.updateEmployee(999, { full_name: 'X' })).rejects.toThrow('Employee not found');
  });
});

describe('EmployeeService — deactivateEmployee', () => {
  it('deactivates an active employee', async () => {
    await expect(makeService().deactivateEmployee(5)).resolves.toBeUndefined();
  });

  it('throws when employee not found', async () => {
    const svc = makeService({ findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.deactivateEmployee(999)).rejects.toThrow('Employee not found');
  });

  it('throws when employee is already inactive', async () => {
    const svc = makeService({ findById: jest.fn().mockResolvedValue({ ...mockEmp, is_active: false }) });
    await expect(svc.deactivateEmployee(5)).rejects.toThrow('already inactive');
  });
});

describe('EmployeeService — skills', () => {
  it('getSkills returns list', async () => {
    const result = await makeService().getSkills(5);
    expect(result).toHaveLength(1);
    expect(result[0].skill_name).toBe('TypeScript');
  });

  it('getSkills throws when employee not found', async () => {
    const svc = makeService({ findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.getSkills(999)).rejects.toThrow('Employee not found');
  });

  it('addSkill succeeds', async () => {
    await expect(
      makeService().addSkill(5, { skill_name: 'Go', category: 'OTHER' as const, proficiency: 'BEGINNER' as const })
    ).resolves.toBeUndefined();
  });

  it('addSkill throws when employee not found', async () => {
    const svc = makeService({ findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.addSkill(999, { skill_name: 'Go', category: 'OTHER' as const, proficiency: 'BEGINNER' as const }))
      .rejects.toThrow('Employee not found');
  });

  it('addSkill throws on empty skill name', async () => {
    await expect(
      makeService().addSkill(5, { skill_name: '  ', category: 'OTHER' as const, proficiency: 'BEGINNER' as const })
    ).rejects.toThrow('Skill name is required');
  });

  it('updateSkill succeeds', async () => {
    await expect(makeService().updateSkill(5, 1, { proficiency: 'ADVANCED' as const })).resolves.toBeUndefined();
  });

  it('updateSkill throws when skill not found for employee', async () => {
    await expect(makeService().updateSkill(5, 999, { proficiency: 'ADVANCED' as const })).rejects.toThrow('Skill not found');
  });

  it('removeSkill succeeds', async () => {
    await expect(makeService().removeSkill(5, 1)).resolves.toBeUndefined();
  });

  it('removeSkill throws when skill not found for employee', async () => {
    await expect(makeService().removeSkill(5, 999)).rejects.toThrow('Skill not found');
  });
});
