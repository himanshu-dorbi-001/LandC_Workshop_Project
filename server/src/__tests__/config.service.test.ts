import { ConfigService } from '../services/config.service';
import { ISystemConfigRepository } from '../repositories/interfaces/ISystemConfigRepository';

const mockConfig = {
  llm_provider: 'gemma' as const,
  llm_api_key: 'key',
  scheduler_interval: 60,
  max_weekly_hours: 40,
};

function makeRepo(overrides = {}): ISystemConfigRepository {
  return {
    getAll:  jest.fn().mockResolvedValue(mockConfig),
    update:  jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ISystemConfigRepository;
}

describe('ConfigService — getConfig', () => {
  it('returns full config map', async () => {
    const svc = new ConfigService(makeRepo());
    const result = await svc.getConfig();
    expect(result.llm_provider).toBe('gemma');
    expect(result.max_weekly_hours).toBe(40);
    expect(result.scheduler_interval).toBe(60);
  });
});

describe('ConfigService — updateConfig', () => {
  it('updates valid max_weekly_hours', async () => {
    const svc = new ConfigService(makeRepo());
    await expect(svc.updateConfig({ max_weekly_hours: 35 }, 1)).resolves.toBeUndefined();
  });

  it('updates valid scheduler_interval', async () => {
    const svc = new ConfigService(makeRepo());
    await expect(svc.updateConfig({ scheduler_interval: 5 }, 1)).resolves.toBeUndefined();
  });

  it('throws when scheduler_interval is 0', async () => {
    const svc = new ConfigService(makeRepo());
    await expect(svc.updateConfig({ scheduler_interval: 0 }, 1)).rejects.toThrow('at least 1 minute');
  });

  it('throws when scheduler_interval is negative', async () => {
    const svc = new ConfigService(makeRepo());
    await expect(svc.updateConfig({ scheduler_interval: -5 }, 1)).rejects.toThrow('at least 1 minute');
  });

  it('throws when max_weekly_hours is 0', async () => {
    const svc = new ConfigService(makeRepo());
    await expect(svc.updateConfig({ max_weekly_hours: 0 }, 1)).rejects.toThrow('between 1 and 80');
  });

  it('throws when max_weekly_hours exceeds 80', async () => {
    const svc = new ConfigService(makeRepo());
    await expect(svc.updateConfig({ max_weekly_hours: 81 }, 1)).rejects.toThrow('between 1 and 80');
  });

  it('allows max_weekly_hours at boundary values 1 and 80', async () => {
    const svc = new ConfigService(makeRepo());
    await expect(svc.updateConfig({ max_weekly_hours: 1 },  1)).resolves.toBeUndefined();
    await expect(svc.updateConfig({ max_weekly_hours: 80 }, 1)).resolves.toBeUndefined();
  });
});
