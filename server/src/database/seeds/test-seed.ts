import bcrypt from 'bcryptjs';
import { pool } from '../connection';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const HASH_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Demo@1234';

async function seed(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── 1. Lookup static IDs ────────────────────────────────────────────────
    const deptMap = await getMap(conn, 'SELECT id, name FROM departments');
    const roleMap = await getMap(conn, 'SELECT id, name FROM roles');

    // ── 2. Employees ────────────────────────────────────────────────────────
    const employees = [
      { full_name: 'Alice Manager',   email: 'alice@prm.com',  dept: 'Management',           role: 'MANAGER'  },
      { full_name: 'Frank Manager',   email: 'frank@prm.com',  dept: 'Management',           role: 'MANAGER'  },
      { full_name: 'Bob Developer',   email: 'bob@prm.com',    dept: 'Software Engineering', role: 'RESOURCE' },
      { full_name: 'Carol QA',        email: 'carol@prm.com',  dept: 'Testing & QA',         role: 'RESOURCE' },
      { full_name: 'Dave DevOps',     email: 'dave@prm.com',   dept: 'DevOps',               role: 'RESOURCE' },
      { full_name: 'Eve Designer',    email: 'eve@prm.com',    dept: 'Design',               role: 'RESOURCE' },
      { full_name: 'Sam Developer',   email: 'sam@prm.com',    dept: 'Software Engineering', role: 'RESOURCE' },
    ];

    const empIds: Record<string, number> = {};
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, HASH_ROUNDS);

    for (const emp of employees) {
      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO employees (department_id, full_name, email)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
        [deptMap[emp.dept], emp.full_name, emp.email]
      );

      let empId = res.insertId;
      if (empId === 0) {
        const [rows] = await conn.execute<RowDataPacket[]>(
          'SELECT id FROM employees WHERE email = ?', [emp.email]
        );
        empId = (rows[0] as RowDataPacket).id as number;
      }
      empIds[emp.email] = empId;

      await conn.execute(
        `INSERT INTO employee_roles (employee_id, role_id, assigned_by)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE employee_id = employee_id`,
        [empId, roleMap[emp.role]]
      );

      const username = emp.email.split('@')[0];
      await conn.execute(
        `INSERT INTO user_accounts (employee_id, username, password_hash, is_active, force_password_change)
         VALUES (?, ?, ?, TRUE, FALSE)
         ON DUPLICATE KEY UPDATE username = username`,
        [empId, username, hash]
      );
    }

    // ── 3. Skills catalog ───────────────────────────────────────────────────
    const skillRows = [
      { name: 'TypeScript',   category: 'Technical'  },
      { name: 'React',        category: 'Technical'  },
      { name: 'Node.js',      category: 'Technical'  },
      { name: 'Python',       category: 'Technical'  },
      { name: 'MySQL',        category: 'Technical'  },
      { name: 'Docker',       category: 'Technical'  },
      { name: 'Agile/Scrum',  category: 'Management' },
      { name: 'UI/UX Design', category: 'Design'     },
    ];

    const skillIds: Record<string, number> = {};
    for (const s of skillRows) {
      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO skills (skill_name, category) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE skill_name = skill_name`,
        [s.name, s.category]
      );
      let id = res.insertId;
      if (id === 0) {
        const [rows] = await conn.execute<RowDataPacket[]>(
          'SELECT id FROM skills WHERE skill_name = ?', [s.name]
        );
        id = (rows[0] as RowDataPacket).id as number;
      }
      skillIds[s.name] = id;
    }

    // ── 4. Employee Skills ──────────────────────────────────────────────────
    const empSkills = [
      { email: 'bob@prm.com',   skill: 'TypeScript',   prof: 'Expert'        },
      { email: 'bob@prm.com',   skill: 'Node.js',      prof: 'Advanced'      },
      { email: 'bob@prm.com',   skill: 'MySQL',        prof: 'Intermediate'  },
      { email: 'carol@prm.com', skill: 'Python',       prof: 'Advanced'      },
      { email: 'carol@prm.com', skill: 'MySQL',        prof: 'Advanced'      },
      { email: 'dave@prm.com',  skill: 'Docker',       prof: 'Expert'        },
      { email: 'dave@prm.com',  skill: 'Node.js',      prof: 'Intermediate'  },
      { email: 'eve@prm.com',   skill: 'UI/UX Design', prof: 'Expert'        },
      { email: 'eve@prm.com',   skill: 'React',        prof: 'Advanced'      },
      { email: 'sam@prm.com',   skill: 'TypeScript',   prof: 'Intermediate'  },
      { email: 'sam@prm.com',   skill: 'React',        prof: 'Expert'        },
      { email: 'alice@prm.com', skill: 'Agile/Scrum',  prof: 'Expert'        },
      { email: 'frank@prm.com', skill: 'Agile/Scrum',  prof: 'Advanced'      },
    ];

    for (const es of empSkills) {
      await conn.execute(
        `INSERT INTO employee_skills (employee_id, skill_id, proficiency)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE proficiency = VALUES(proficiency)`,
        [empIds[es.email], skillIds[es.skill], es.prof]
      );
    }

    // ── 5. Projects ─────────────────────────────────────────────────────────
    const projects = [
      {
        name: 'PRM Internal Tool',
        desc: 'Internal resource & project management platform',
        start: '2026-01-01', end: '2026-12-31',
        status: 'ACTIVE',   health: 'ON_TRACK',  sp: 120,
        manager: 'alice@prm.com',
      },
      {
        name: 'E-Commerce Platform',
        desc: 'Full-stack e-commerce rebuild with microservices',
        start: '2026-02-01', end: '2026-09-30',
        status: 'ACTIVE',   health: 'ATTENTION', sp: 200,
        manager: 'alice@prm.com',
      },
      {
        name: 'Mobile App Redesign',
        desc: 'Complete UI/UX overhaul of the mobile application',
        start: '2026-05-01', end: '2026-11-30',
        status: 'ACTIVE',   health: 'ON_TRACK',  sp: 80,
        manager: 'frank@prm.com',
      },
      {
        name: 'Legacy Migration',
        desc: 'Migrate legacy monolith to cloud-native architecture',
        start: '2026-03-01', end: '2027-03-31',
        status: 'ON_HOLD',  health: 'AT_RISK',   sp: 300,
        manager: 'frank@prm.com',
      },
      {
        name: 'Data Analytics Dashboard',
        desc: 'Real-time business intelligence dashboards',
        start: '2026-04-01', end: '2026-10-31',
        status: 'ACTIVE',   health: 'ON_TRACK',  sp: 90,
        manager: 'alice@prm.com',
      },
      {
        name: 'DevOps Automation',
        desc: 'CI/CD pipeline and infrastructure-as-code setup',
        start: '2025-10-01', end: '2026-03-31',
        status: 'COMPLETED', health: 'ON_TRACK', sp: 60,
        manager: 'frank@prm.com',
      },
    ];

    const projectIds: number[] = [];
    for (const p of projects) {
      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO projects (manager_id, name, description, start_date, end_date, status, health_status, total_story_points)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = name`,
        [empIds[p.manager], p.name, p.desc, p.start, p.end, p.status, p.health, p.sp]
      );
      let id = res.insertId;
      if (id === 0) {
        const [rows] = await conn.execute<RowDataPacket[]>(
          'SELECT id FROM projects WHERE name = ?', [p.name]
        );
        id = (rows[0] as RowDataPacket).id as number;
      }
      projectIds.push(id);
    }

    const [p1, p2, p3, p4, p5, p6] = projectIds;

    // ── 6. Milestones ───────────────────────────────────────────────────────
    const milestones = [
      // PRM Internal Tool
      { pid: p1, title: 'Auth & User Management',    due: '2026-02-28', sp: 20, status: 'DONE'        },
      { pid: p1, title: 'Employee & Skills Module',  due: '2026-04-30', sp: 25, status: 'DONE'        },
      { pid: p1, title: 'Projects & Allocations',    due: '2026-06-30', sp: 35, status: 'IN_PROGRESS' },
      { pid: p1, title: 'Timesheets & Scheduler',    due: '2026-09-30', sp: 40, status: 'NOT_STARTED' },
      // E-Commerce Platform
      { pid: p2, title: 'Product Catalogue API',     due: '2026-03-31', sp: 40, status: 'DONE'        },
      { pid: p2, title: 'Cart & Checkout Service',   due: '2026-05-31', sp: 50, status: 'DONE'        },
      { pid: p2, title: 'Payment Gateway',           due: '2026-06-30', sp: 60, status: 'IN_PROGRESS' },
      { pid: p2, title: 'Performance & Load Tests',  due: '2026-04-30', sp: 50, status: 'NOT_STARTED' },
      // Mobile App Redesign
      { pid: p3, title: 'Wireframes & Prototypes',   due: '2026-05-31', sp: 15, status: 'DONE'        },
      { pid: p3, title: 'Component Library',         due: '2026-07-31', sp: 25, status: 'IN_PROGRESS' },
      { pid: p3, title: 'Screen Implementation',     due: '2026-10-31', sp: 40, status: 'NOT_STARTED' },
      // Legacy Migration
      { pid: p4, title: 'Domain Analysis',           due: '2026-04-30', sp: 50, status: 'DONE'        },
      { pid: p4, title: 'Service Decomposition',     due: '2026-05-31', sp: 80, status: 'NOT_STARTED' },
      { pid: p4, title: 'Data Migration Strategy',   due: '2026-04-01', sp: 60, status: 'NOT_STARTED' },
      // Data Analytics Dashboard
      { pid: p5, title: 'Data Pipeline Setup',       due: '2026-05-15', sp: 30, status: 'DONE'        },
      { pid: p5, title: 'Dashboard UI',              due: '2026-07-31', sp: 35, status: 'IN_PROGRESS' },
      { pid: p5, title: 'Alerting & Reports',        due: '2026-10-15', sp: 25, status: 'NOT_STARTED' },
      // DevOps Automation
      { pid: p6, title: 'CI/CD Pipeline',            due: '2026-01-31', sp: 25, status: 'DONE'        },
      { pid: p6, title: 'Infrastructure as Code',    due: '2026-02-28', sp: 20, status: 'DONE'        },
      { pid: p6, title: 'Monitoring & Alerting',     due: '2026-03-31', sp: 15, status: 'DONE'        },
    ];

    for (const m of milestones) {
      await conn.execute(
        `INSERT INTO milestones (project_id, title, due_date, story_points, status)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = title`,
        [m.pid, m.title, m.due, m.sp, m.status]
      );
    }

    // ── 7. Allocations ──────────────────────────────────────────────────────
    const allocations = [
      // Bob: 60% PRM + 40% E-Commerce = 100% (fully booked)
      { emp: 'bob@prm.com',   pid: p1, pct: 60, from: '2026-01-01', to: '2026-12-31', active: true  },
      { emp: 'bob@prm.com',   pid: p2, pct: 40, from: '2026-02-01', to: '2026-09-30', active: true  },
      // Carol: 50% PRM + 50% Analytics = 100%
      { emp: 'carol@prm.com', pid: p1, pct: 50, from: '2026-01-01', to: '2026-12-31', active: true  },
      { emp: 'carol@prm.com', pid: p5, pct: 50, from: '2026-04-01', to: '2026-10-31', active: true  },
      // Dave: 100% DevOps (ended) + 70% E-Commerce (active, 30% free)
      { emp: 'dave@prm.com',  pid: p6, pct: 100, from: '2025-10-01', to: '2026-03-31', active: false },
      { emp: 'dave@prm.com',  pid: p2, pct: 70, from: '2026-04-01', to: '2026-09-30', active: true  },
      // Eve: 80% Mobile App (20% free)
      { emp: 'eve@prm.com',   pid: p3, pct: 80, from: '2026-05-01', to: '2026-11-30', active: true  },
      // Sam: 50% E-Commerce (50% free — available for allocation)
      { emp: 'sam@prm.com',   pid: p2, pct: 50, from: '2026-02-01', to: '2026-09-30', active: true  },
    ];

    for (const a of allocations) {
      await conn.execute(
        `INSERT INTO allocations (employee_id, project_id, utilisation_pct, from_date, to_date, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [empIds[a.emp], a.pid, a.pct, a.from, a.to, a.active]
      );
    }

    // ── 8. Timesheets & entries ─────────────────────────────────────────────
    const weeks = [
      '2026-06-08',
      '2026-06-01',
      '2026-05-25',
      '2026-05-18',
      '2026-05-11',
      '2026-05-04',
    ];

    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];

      // Bob — submits most weeks, one MISSED
      if (i !== 3) {
        const tsId = await insertTimesheet(conn, empIds['bob@prm.com'], week, 'SUBMITTED', 40);
        await insertEntry(conn, tsId, p1, 24, ['backend', 'api', 'typescript']);
        await insertEntry(conn, tsId, p2, 16, ['feature', 'rest-api']);
      } else {
        await conn.execute(
          `INSERT INTO timesheets (employee_id, week_start_date, status, total_hours) VALUES (?, ?, 'MISSED', 0)`,
          [empIds['bob@prm.com'], week]
        );
      }

      // Carol — submits all weeks
      const carolTs = await insertTimesheet(conn, empIds['carol@prm.com'], week, 'SUBMITTED', 38);
      await insertEntry(conn, carolTs, p1, 20, ['testing', 'qa', 'regression']);
      await insertEntry(conn, carolTs, p5, 18, ['data-pipeline', 'python']);

      // Dave — submits last 3 weeks only
      if (i < 3) {
        const daveTs = await insertTimesheet(conn, empIds['dave@prm.com'], week, 'SUBMITTED', 28);
        await insertEntry(conn, daveTs, p2, 28, ['devops', 'docker', 'ci-cd']);
      }
    }

    await conn.commit();
    console.log('\n✓ Test seed complete. All records inserted.\n');
    console.log('  Logins (all use password: Demo@1234, no force-change):');
    console.log('  ─────────────────────────────────────────────────────');
    console.log('  alice   — MANAGER   (manages projects 1, 2, 5)');
    console.log('  frank   — MANAGER   (manages projects 3, 4, 6)');
    console.log('  bob     — RESOURCE  (100% allocated: 60% P1 + 40% P2)');
    console.log('  carol   — RESOURCE  (100% allocated: 50% P1 + 50% P5)');
    console.log('  dave    — RESOURCE  (70% allocated on P2, 30% free)');
    console.log('  eve     — RESOURCE  (80% allocated on P3, 20% free)');
    console.log('  sam     — RESOURCE  (50% allocated on P2, 50% free)');
    console.log('  admin   — ADMIN     (use password from initial seed)');
    console.log();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

async function insertTimesheet(
  conn: Awaited<ReturnType<typeof pool.getConnection>>,
  empId: number, week: string, status: string, hours: number,
): Promise<number> {
  const [res] = await conn.execute<ResultSetHeader>(
    `INSERT INTO timesheets (employee_id, week_start_date, status, total_hours) VALUES (?, ?, ?, ?)`,
    [empId, week, status, hours]
  );
  return res.insertId;
}

async function insertEntry(
  conn: Awaited<ReturnType<typeof pool.getConnection>>,
  timesheetId: number, projectId: number, hours: number, tags: string[],
): Promise<void> {
  await conn.execute(
    `INSERT INTO timesheet_entries (timesheet_id, project_id, hours_worked, activity_tags) VALUES (?, ?, ?, ?)`,
    [timesheetId, projectId, hours, JSON.stringify(tags)]
  );
}

async function getMap(
  conn: Awaited<ReturnType<typeof pool.getConnection>>,
  sql: string,
): Promise<Record<string, number>> {
  const [rows] = await conn.execute<RowDataPacket[]>(sql);
  const map: Record<string, number> = {};
  for (const row of rows as RowDataPacket[]) {
    map[row.name] = row.id as number;
  }
  return map;
}

seed().catch(err => { console.error('Test seed failed:', err); process.exit(1); });
