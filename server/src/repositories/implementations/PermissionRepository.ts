import { pool } from '../../database/connection';
import { IPermissionRepository } from '../interfaces/IPermissionRepository';
import { RowDataPacket } from 'mysql2';

export class PermissionRepository implements IPermissionRepository {

  async loadRolePermissions(): Promise<Map<string, Set<string>>> {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT r.name AS role_name, p.name AS permission_name
      FROM role_permissions rp
      JOIN roles       r ON rp.role_id       = r.id
      JOIN permissions p ON rp.permission_id = p.id
    `);

    const map = new Map<string, Set<string>>();
    for (const row of rows as RowDataPacket[]) {
      if (!map.has(row.role_name)) {
        map.set(row.role_name, new Set());
      }
      map.get(row.role_name)!.add(row.permission_name);
    }
    return map;
  }
}
