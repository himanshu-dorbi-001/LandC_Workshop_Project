import bcrypt from 'bcryptjs';
import { pool } from '../connection';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

async function seed(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const [depts] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM departments WHERE name = 'Operations'"
    );
    if ((depts as RowDataPacket[]).length === 0) {
      throw new Error('Run schema migration first — departments table is empty.');
    }
    const deptId = (depts[0] as RowDataPacket).id as number;

    const [roleRows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM roles WHERE name = 'ADMIN'"
    );
    if ((roleRows as RowDataPacket[]).length === 0) {
      throw new Error('Run schema migration first — roles table is empty.');
    }
    const roleId = (roleRows[0] as RowDataPacket).id as number;

    const [existingEmp] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM employees WHERE email = 'admin@prm-tool.com'"
    );

    let empId: number;
    if ((existingEmp as RowDataPacket[]).length > 0) {
      empId = (existingEmp[0] as RowDataPacket).id as number;
    } else {
      const [empResult] = await connection.execute<ResultSetHeader>(
        'INSERT INTO employees (department_id, full_name, email) VALUES (?, ?, ?)',
        [deptId, 'System Admin', 'admin@prm-tool.com']
      );
      empId = empResult.insertId;
    }

    await connection.execute(
      `INSERT INTO employee_roles (employee_id, role_id, assigned_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE employee_id = employee_id`,
      [empId, roleId, empId]
    );

    const passwordHash = await bcrypt.hash('Admin@1234', 10);
    await connection.execute(
      `INSERT INTO user_accounts (employee_id, username, password_hash, is_active, force_password_change)
       VALUES (?, 'admin', ?, TRUE, TRUE)
       ON DUPLICATE KEY UPDATE username = username`,
      [empId, passwordHash]
    );

    console.log('Seed complete. Admin account ready.');
    console.log('  Username : admin');
    console.log('  Password : Admin@1234');
    console.log('  Note     : Password must be changed on first login.');
  } finally {
    connection.release();
    process.exit(0);
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
