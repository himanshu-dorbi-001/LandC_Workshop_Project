import { UserService } from '../services/user.service';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IEmployeeRoleRepository } from '../repositories/interfaces/IEmployeeRoleRepository';

const mockEmp         = { id: 5, full_name: 'New Employee', is_active: true };
const mockInactiveEmp = { ...mockEmp, is_active: false };

function makeUserRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    findByUsername:         jest.fn().mockResolvedValue(null),
    findByEmployeeId:       jest.fn().mockResolvedValue({ id: 1 }),
    create:                 jest.fn().mockResolvedValue({}),
    updatePassword:         jest.fn().mockResolvedValue(undefined),
    setForcePasswordChange: jest.fn().mockResolvedValue(undefined),
    setActiveByEmployeeId:  jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IUserRepository;
}

function makeEmpRepo(overrides: Partial<IEmployeeRepository> = {}): IEmployeeRepository {
  return {
    findByEmail:         jest.fn().mockResolvedValue(null),
    create:              jest.fn().mockResolvedValue(mockEmp),
    findById:            jest.fn().mockResolvedValue(mockEmp),
    findAllWithDetails:  jest.fn().mockResolvedValue([mockEmp]),
    findWithDetailsById: jest.fn().mockResolvedValue(mockEmp),
    setActive:           jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IEmployeeRepository;
}

function makeRoleRepo(): IEmployeeRoleRepository {
  return {
    assignRole: jest.fn().mockResolvedValue(undefined),
  } as unknown as IEmployeeRoleRepository;
}

function makeService(
  userOverrides: Partial<IUserRepository> = {},
  empOverrides:  Partial<IEmployeeRepository> = {},
) {
  return new UserService(makeUserRepo(userOverrides), makeEmpRepo(empOverrides), makeRoleRepo());
}

const validDto = {
  full_name: 'New Employee', email: 'new@prm.com',
  username: 'newuser', password: 'Demo@1234',
  role: 'RESOURCE' as const, department_id: 3,
};

describe('UserService — createEmployee', () => {
  it('creates employee with valid data', async () => {
    const result = await makeService().createEmployee(validDto, 1);
    expect(result.id).toBe(5);
  });

  it('throws when password is too short', async () => {
    await expect(makeService().createEmployee({ ...validDto, password: 'short' }, 1))
      .rejects.toThrow('at least 8 characters');
  });

  it('throws when password has no uppercase', async () => {
    await expect(makeService().createEmployee({ ...validDto, password: 'nouppercase1' }, 1))
      .rejects.toThrow('uppercase');
  });

  it('throws when password has no number', async () => {
    await expect(makeService().createEmployee({ ...validDto, password: 'NoNumberPass' }, 1))
      .rejects.toThrow('number');
  });

  it('throws when username already taken', async () => {
    const svc = makeService({ findByUsername: jest.fn().mockResolvedValue({ id: 99 }) });
    await expect(svc.createEmployee(validDto, 1)).rejects.toThrow('Username already taken');
  });

  it('throws when email already registered', async () => {
    const svc = makeService({}, { findByEmail: jest.fn().mockResolvedValue({ id: 99 }) });
    await expect(svc.createEmployee(validDto, 1)).rejects.toThrow('Email already registered');
  });
});

describe('UserService — getAllEmployees', () => {
  it('returns list of employees', async () => {
    const result = await makeService().getAllEmployees();
    expect(result).toHaveLength(1);
  });
});

describe('UserService — resetPassword', () => {
  it('resets password successfully', async () => {
    await expect(makeService().resetPassword(5, 'NewPass@9')).resolves.toBeUndefined();
  });

  it('throws when user account not found', async () => {
    const svc = makeService({ findByEmployeeId: jest.fn().mockResolvedValue(null) });
    await expect(svc.resetPassword(5, 'NewPass@9')).rejects.toThrow('User account not found');
  });

  it('throws when new password is too short', async () => {
    await expect(makeService().resetPassword(5, 'weak')).rejects.toThrow('at least 8 characters');
  });

  it('throws when new password has no uppercase', async () => {
    await expect(makeService().resetPassword(5, 'nouppercase1')).rejects.toThrow('uppercase');
  });

  it('throws when new password has no number', async () => {
    await expect(makeService().resetPassword(5, 'NoNumberPass')).rejects.toThrow('number');
  });
});

describe('UserService — deactivateEmployee', () => {
  it('deactivates an active employee', async () => {
    await expect(makeService().deactivateEmployee(5)).resolves.toBeUndefined();
  });

  it('throws when employee not found', async () => {
    const svc = makeService({}, { findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.deactivateEmployee(999)).rejects.toThrow('Employee not found');
  });

  it('throws when employee is already inactive', async () => {
    const svc = makeService({}, { findById: jest.fn().mockResolvedValue(mockInactiveEmp) });
    await expect(svc.deactivateEmployee(5)).rejects.toThrow('already inactive');
  });
});

describe('UserService — reactivateEmployee', () => {
  it('reactivates an inactive employee', async () => {
    const svc = makeService({}, { findById: jest.fn().mockResolvedValue(mockInactiveEmp) });
    await expect(svc.reactivateEmployee(5)).resolves.toBeUndefined();
  });

  it('throws when employee not found', async () => {
    const svc = makeService({}, { findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.reactivateEmployee(999)).rejects.toThrow('Employee not found');
  });

  it('throws when employee is already active', async () => {
    await expect(makeService().reactivateEmployee(5)).rejects.toThrow('already active');
  });
});
