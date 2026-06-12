import { ISystemConfigRepository } from '../repositories/interfaces/ISystemConfigRepository';
import { SystemConfigMap, UpdateConfigDTO } from '../models/interfaces/SystemConfig';
import { ValidationError } from '../exceptions';

export class ConfigService {
  constructor(private configRepo: ISystemConfigRepository) {}

  async getConfig(): Promise<SystemConfigMap> {
    return this.configRepo.getAll();
  }

  async updateConfig(dto: UpdateConfigDTO, updatedByEmployeeId: number): Promise<void> {
    if (dto.scheduler_interval !== undefined && dto.scheduler_interval < 1) {
      throw new ValidationError('Scheduler interval must be at least 1 minute');
    }
    if (dto.max_weekly_hours !== undefined && (dto.max_weekly_hours < 1 || dto.max_weekly_hours > 80)) {
      throw new ValidationError('Max weekly hours must be between 1 and 80');
    }
    await this.configRepo.update(dto, updatedByEmployeeId);
  }
}
