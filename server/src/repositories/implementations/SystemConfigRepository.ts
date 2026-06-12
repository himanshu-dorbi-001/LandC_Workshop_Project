import { pool } from '../../database/connection';
import { ISystemConfigRepository } from '../interfaces/ISystemConfigRepository';
import { SystemConfigMap, UpdateConfigDTO, LLMProvider } from '../../models/interfaces/SystemConfig';
import { RowDataPacket } from 'mysql2';

export class SystemConfigRepository implements ISystemConfigRepository {

  async getAll(): Promise<SystemConfigMap> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT config_key, config_value FROM system_config'
    );
    const map: Record<string, string> = {};
    for (const row of rows as RowDataPacket[]) {
      map[row.config_key] = row.config_value;
    }
    return {
      llm_provider:       (map.llm_provider as LLMProvider) || 'gemini',
      llm_api_key:        map.llm_api_key        || '',
      scheduler_interval: parseInt(map.scheduler_interval || '60', 10),
      max_weekly_hours:   parseInt(map.max_weekly_hours   || '40', 10),
    };
  }

  async update(dto: UpdateConfigDTO, updatedByEmployeeId: number): Promise<void> {
    const entries = Object.entries(dto) as [string, string | number | undefined][];
    for (const [key, value] of entries) {
      if (value !== undefined) {
        await pool.execute(
          `INSERT INTO system_config (config_key, config_value, updated_by_employee_id)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE config_value = VALUES(config_value),
                                   updated_by_employee_id = VALUES(updated_by_employee_id)`,
          [key, String(value), updatedByEmployeeId]
        );
      }
    }
  }
}
