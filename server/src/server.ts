import { ENV } from './config/env';
import app from './app';
import { pool } from './database/connection';
import { startScheduler } from './scheduler/scheduler';
import { PermissionRepository } from './repositories/implementations/PermissionRepository';
import { setRolePermissions } from './middleware/permission';

async function startServer(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log('Database connection established.');
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }

  const permMap = await new PermissionRepository().loadRolePermissions();
  setRolePermissions(permMap);
  console.log(`[Permissions] Loaded ${[...permMap.values()].reduce((s, v) => s + v.size, 0)} role-permission mappings from DB.`);

  app.listen(ENV.PORT, async () => {
    console.log(`PRM Tool server running on http://localhost:${ENV.PORT}`);
    console.log(`Environment: ${ENV.NODE_ENV}`);
    await startScheduler();
  });
}

startServer();
