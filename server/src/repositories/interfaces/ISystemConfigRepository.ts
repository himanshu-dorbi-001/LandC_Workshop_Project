import { SystemConfigMap, UpdateConfigDTO } from '../../models/interfaces/SystemConfig';

export interface ISystemConfigRepository {
  getAll(): Promise<SystemConfigMap>;
  update(dto: UpdateConfigDTO, updatedByEmployeeId: number): Promise<void>;
}
