import bcrypt from 'bcryptjs';
import { AuthService } from '../services/auth.service';
import { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { IEmployeeRepository } from '../repositories/interfaces/IEmployeeRepository';
import { IEmployeeRoleRepository } from '../repositories/interfaces/IEmployeeRoleRepository';

const validHash = bcrypt.hashSync('Demo@1234', 1);

const mockAccount = {
  id: 1, employee_id: 3, username: 'alice',
  password_hash: validHash,
  is_active: true, force_password_change: false,
};

const mockEmployee = { id: 3, full_name: 'Alice Manager' };

function makeUserRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    findByUsername:         jest.fn().mockResolvedValue(mockAccount),
    findById:               jest.fn().mockResolvedValue(mockAccount),
    findByEmployeeId:       jest.fn().mockResolvedValue(mockAccount),
    create:                 jest.fn().mockResolvedValue(mockAccount),
    updatePassword:         jest.fn().mockResolvedValue(undefined),
    setForcePasswordChange: jest.fn().mockResolvedValue(undefined),
    setActiveByEmployeeId:  jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IUserRepository;
}

function makeEmployeeRepo(overrides: Partial<IEmployeeRepository> = {}): IEmployeeRepository {
  return {
    findById: jest.fn().mockResolvedValue(mockEmployee),
    ...overrides,
  } as unknown as IEmployeeRepository;
}

function makeRoleRepo(role: string | null = 'MANAGER'): IEmployeeRoleRepository {
  return {
    getRoleForEmployee: jest.fn().mockResolvedValue(role),
  } as unknown as IEmployeeRoleRepository;
}

function makeService(
  userOverrides: Partial<IUserRepository> = {},
  empOverrides:  Partial<IEmployeeRepository> = {},
  role:          string | null = 'MANAGER',
) {
  return new AuthService(makeUserRepo(userOverrides), makeEmployeeRepo(empOverrides), makeRoleRepo(role));
}

describe('AuthService — login', () => {
  it('returns token and user info on valid credentials', async () => {
    const svc    = makeService();
    const result = await svc.login('alice', 'Demo@1234');
    expect(typeof result.token).toBe('string');
    expect(result.role).toBe('MANAGER');
    expect(result.fullName).toBe('Alice Manager');
    expect(result.forcePasswordChange).toBe(false);
  });

  it('throws when username not found', async () => {
    const svc = makeService({ findByUsername: jest.fn().mockResolvedValue(null) });
    await expect(svc.login('ghost', 'Demo@1234')).rejects.toThrow('Invalid username or password');
  });

  it('throws when account is deactivated', async () => {
    const svc = makeService({
      findByUsername: jest.fn().mockResolvedValue({ ...mockAccount, is_active: false }),
    });
    await expect(svc.login('alice', 'Demo@1234')).rejects.toThrow('deactivated');
  });

  it('throws when password is wrong', async () => {
    const svc = makeService();
    await expect(svc.login('alice', 'WrongPass1')).rejects.toThrow('Invalid username or password');
  });

  it('throws when employee record is missing', async () => {
    const svc = makeService({}, { findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.login('alice', 'Demo@1234')).rejects.toThrow('Employee record not found');
  });

  it('throws when no role is assigned', async () => {
    const svc = makeService({}, {}, null);
    await expect(svc.login('alice', 'Demo@1234')).rejects.toThrow('No role assigned');
  });
});

describe('AuthService — changePassword', () => {
  it('changes password when current password is correct', async () => {
    const svc = makeService();
    await expect(svc.changePassword(1, 'Demo@1234', 'NewPass@9')).resolves.toBeUndefined();
  });

  it('throws when account not found', async () => {
    const svc = makeService({ findById: jest.fn().mockResolvedValue(null) });
    await expect(svc.changePassword(1, 'Demo@1234', 'NewPass@9')).rejects.toThrow('Account not found');
  });

  it('throws when current password is wrong', async () => {
    const svc = makeService();
    await expect(svc.changePassword(1, 'WrongPass1', 'NewPass@9')).rejects.toThrow('Current password is incorrect');
  });

  it('throws when new password is too short', async () => {
    const svc = makeService();
    await expect(svc.changePassword(1, 'Demo@1234', 'short')).rejects.toThrow('at least 8 characters');
  });

  it('throws when new password has no uppercase', async () => {
    const svc = makeService();
    await expect(svc.changePassword(1, 'Demo@1234', 'nouppercase1')).rejects.toThrow('uppercase');
  });

  it('throws when new password has no number', async () => {
    const svc = makeService();
    await expect(svc.changePassword(1, 'Demo@1234', 'NoNumberPass')).rejects.toThrow('number');
  });
});

describe('AuthService — forceChangePassword', () => {
  it('updates password without verifying current', async () => {
    const svc = makeService();
    await expect(svc.forceChangePassword(1, 'NewPass@9')).resolves.toBeUndefined();
  });

  it('throws on weak password', async () => {
    const svc = makeService();
    await expect(svc.forceChangePassword(1, 'weak')).rejects.toThrow('at least 8 characters');
  });
});
