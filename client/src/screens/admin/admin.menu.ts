import {
  printBanner, printHeader, printSuccess, printError, printInfo,
  printTable, printKeyValue, printDivider, C, pause,
} from '../../utils/display';
import { readLine, readPassword, readChoice, confirm, sleep } from '../../utils/prompt';
import { session } from '../../session/session';
import { showChangePasswordScreen } from '../auth/changePassword.screen';
import {
  getAllEmployees, getEmployeeById, createEmployee, updateEmployee,
  resetPassword, deactivateEmployee, reactivateEmployee,
  getEmployeeSkills, addEmployeeSkill, updateEmployeeSkill, removeEmployeeSkill,
  getAllProjects, createProject, getProjectById, updateProject,
  getMilestones, addMilestone, updateMilestone,
  getAllAllocations,
  getSystemConfig, updateSystemConfig,
} from '../../api/admin.api';

// ─────────────────────────────────────────────────────────────────────────────
// Main menu
// ─────────────────────────────────────────────────────────────────────────────

export async function showAdminMenu(): Promise<void> {
  while (true) {
    printBanner();
    printHeader(`Admin Panel  —  ${session.get()?.fullName}`);

    console.log(`  ${C.cyan}[1]${C.reset} Manage Employees`);
    console.log(`  ${C.cyan}[2]${C.reset} Manage Projects`);
    console.log(`  ${C.cyan}[3]${C.reset} View All Allocations`);
    console.log(`  ${C.cyan}[4]${C.reset} System Configuration`);
    console.log(`  ${C.cyan}[5]${C.reset} Change My Password`);
    console.log(`  ${C.red}[0]${C.reset} Logout`);
    console.log();

    const choice = await readChoice(5);
    switch (choice) {
      case 1: await employeeSubMenu();      break;
      case 2: await projectSubMenu();       break;
      case 3: await viewAllAllocations();   break;
      case 4: await configSubMenu();        break;
      case 5: await showChangePasswordScreen(); break;
      case 0: return;
      default:
        printError('Invalid option.');
        await sleep(700);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee sub-menu
// ─────────────────────────────────────────────────────────────────────────────

async function employeeSubMenu(): Promise<void> {
  while (true) {
    printBanner();
    printHeader('Employees');

    console.log(`  ${C.cyan}[1]${C.reset} List All Employees`);
    console.log(`  ${C.cyan}[2]${C.reset} View Employee Detail`);
    console.log(`  ${C.cyan}[3]${C.reset} Create Employee`);
    console.log(`  ${C.cyan}[4]${C.reset} Update Employee Profile`);
    console.log(`  ${C.cyan}[5]${C.reset} Manage Skills`);
    console.log(`  ${C.cyan}[6]${C.reset} Reset Password`);
    console.log(`  ${C.cyan}[7]${C.reset} Deactivate Employee`);
    console.log(`  ${C.cyan}[8]${C.reset} Reactivate Employee`);
    console.log(`  ${C.dim}[0]${C.reset} Back`);
    console.log();

    const choice = await readChoice(8);
    switch (choice) {
      case 1: await listEmployees();          break;
      case 2: await viewEmployeeDetail();     break;
      case 3: await createEmployeeFlow();     break;
      case 4: await updateEmployeeFlow();     break;
      case 5: await skillsSubMenu();          break;
      case 6: await resetPasswordFlow();      break;
      case 7: await deactivateEmployeeFlow(); break;
      case 8: await reactivateEmployeeFlow(); break;
      case 0: return;
      default:
        printError('Invalid option.');
        await sleep(700);
    }
  }
}

async function listEmployees(): Promise<void> {
  printBanner();
  printHeader('All Employees');
  try {
    const employees = await getAllEmployees();
    printTable(
      ['ID', 'Name', 'Role', 'Department', 'Status', 'Active'],
      employees.map(e => [e.id, e.full_name, e.role, e.department_name, e.status, e.is_active ? 'Yes' : 'No']),
    );
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function viewEmployeeDetail(): Promise<void> {
  printBanner();
  printHeader('Employee Detail');
  const raw = await readLine(`  ${C.cyan}Employee ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  try {
    const e = await getEmployeeById(id);
    printDivider();
    printKeyValue('ID',         e.id);
    printKeyValue('Name',       e.full_name);
    printKeyValue('Email',      e.email);
    printKeyValue('Username',   e.username);
    printKeyValue('Role',       e.role);
    printKeyValue('Department', e.department_name);
    printKeyValue('Status',     e.status);
    printKeyValue('Active',     e.is_active ? 'Yes' : 'No');
    printDivider();
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function createEmployeeFlow(): Promise<void> {
  printBanner();
  printHeader('Create Employee');

  printInfo('Departments:  1-Operations  2-Management  3-Software Engineering');
  printInfo('              4-Testing & QA  5-DevOps  6-Design');
  printInfo('Roles:        ADMIN | MANAGER | RESOURCE');
  console.log();

  const full_name     = await readLine(`  ${C.cyan}Full Name:     ${C.reset}`);
  const email         = await readLine(`  ${C.cyan}Email:         ${C.reset}`);
  const username      = await readLine(`  ${C.cyan}Username:      ${C.reset}`);
  const password      = await readPassword(`  ${C.cyan}Password:      ${C.reset}`);
  const role          = (await readLine(`  ${C.cyan}Role:          ${C.reset}`)).toUpperCase();
  const rawDept       = await readLine(`  ${C.cyan}Department ID: ${C.reset}`);
  const department_id = parseInt(rawDept, 10);

  if (isNaN(department_id)) { printError('Invalid department ID.'); await sleep(800); return; }

  try {
    const emp = await createEmployee({ full_name, email, username, password, role, department_id });
    printSuccess(`Employee '${emp.full_name}' (ID: ${emp.id}) created. They will be prompted to change password on first login.`);
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function updateEmployeeFlow(): Promise<void> {
  printBanner();
  printHeader('Update Employee Profile');

  const raw = await readLine(`  ${C.cyan}Employee ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  printInfo('Leave blank to keep current value.');
  console.log();

  const full_name     = await readLine(`  ${C.cyan}Full Name:     ${C.reset}`);
  const email         = await readLine(`  ${C.cyan}Email:         ${C.reset}`);
  const rawDept       = await readLine(`  ${C.cyan}Department ID: ${C.reset}`);

  const payload: Record<string, string | number> = {};
  if (full_name)  payload.full_name     = full_name;
  if (email)      payload.email         = email;
  if (rawDept) {
    const dept = parseInt(rawDept, 10);
    if (isNaN(dept)) { printError('Invalid department ID.'); await sleep(800); return; }
    payload.department_id = dept;
  }

  if (Object.keys(payload).length === 0) {
    printInfo('No changes provided.');
    await sleep(800);
    return;
  }

  try {
    await updateEmployee(id, payload);
    printSuccess('Employee profile updated.');
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function resetPasswordFlow(): Promise<void> {
  printBanner();
  printHeader('Reset Employee Password');

  const raw = await readLine(`  ${C.cyan}Employee ID:  ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  const newPassword = await readPassword(`  ${C.cyan}New Password: ${C.reset}`);

  try {
    await resetPassword(id, newPassword);
    printSuccess('Password reset. The employee will be forced to change it on next login.');
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function deactivateEmployeeFlow(): Promise<void> {
  printBanner();
  printHeader('Deactivate Employee');

  const raw = await readLine(`  ${C.cyan}Employee ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  if (!(await confirm(`  ${C.yellow}Deactivate employee #${id}?`))) {
    printInfo('Cancelled.'); await sleep(800); return;
  }

  try {
    await deactivateEmployee(id);
    printSuccess('Employee deactivated. They can no longer log in.');
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function reactivateEmployeeFlow(): Promise<void> {
  printBanner();
  printHeader('Reactivate Employee');

  const raw = await readLine(`  ${C.cyan}Employee ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  try {
    await reactivateEmployee(id);
    printSuccess('Employee reactivated.');
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

// ─────────────────────────────────────────────────────────────────────────────
// Skills sub-menu
// ─────────────────────────────────────────────────────────────────────────────

async function skillsSubMenu(): Promise<void> {
  while (true) {
    printBanner();
    printHeader('Manage Skills');

    console.log(`  ${C.cyan}[1]${C.reset} View Employee Skills`);
    console.log(`  ${C.cyan}[2]${C.reset} Add Skill`);
    console.log(`  ${C.cyan}[3]${C.reset} Update Skill Proficiency`);
    console.log(`  ${C.cyan}[4]${C.reset} Remove Skill`);
    console.log(`  ${C.dim}[0]${C.reset} Back`);
    console.log();

    const choice = await readChoice(4);
    switch (choice) {
      case 1: await viewSkillsFlow();           break;
      case 2: await addSkillFlow();             break;
      case 3: await updateSkillProficiency();   break;
      case 4: await removeSkillFlow();          break;
      case 0: return;
      default:
        printError('Invalid option.');
        await sleep(700);
    }
  }
}

async function viewSkillsFlow(): Promise<void> {
  printBanner();
  printHeader('Employee Skills');

  const raw = await readLine(`  ${C.cyan}Employee ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  try {
    const skills = await getEmployeeSkills(id);
    if (skills.length === 0) {
      printInfo('No skills on record for this employee.');
    } else {
      printTable(
        ['Skill ID', 'Skill Name', 'Category', 'Proficiency'],
        skills.map(s => [s.id, s.skill_name, s.category, s.proficiency]),
      );
    }
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function addSkillFlow(): Promise<void> {
  printBanner();
  printHeader('Add Skill');

  printInfo('Categories: Technical | Soft Skills | Domain | Management');
  printInfo('Proficiency: Beginner | Intermediate | Advanced | Expert');
  console.log();

  const raw  = await readLine(`  ${C.cyan}Employee ID:   ${C.reset}`);
  const id   = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  const skill_name  = await readLine(`  ${C.cyan}Skill Name:    ${C.reset}`);
  const category    = await readLine(`  ${C.cyan}Category:      ${C.reset}`);
  const proficiency = await readLine(`  ${C.cyan}Proficiency:   ${C.reset}`);

  if (!skill_name || !category || !proficiency) {
    printError('All fields are required.'); await sleep(800); return;
  }

  try {
    await addEmployeeSkill(id, { skill_name, category, proficiency });
    printSuccess(`Skill '${skill_name}' added.`);
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function updateSkillProficiency(): Promise<void> {
  printBanner();
  printHeader('Update Skill Proficiency');

  printInfo('Proficiency: Beginner | Intermediate | Advanced | Expert');
  console.log();

  const empRaw   = await readLine(`  ${C.cyan}Employee ID: ${C.reset}`);
  const skillRaw = await readLine(`  ${C.cyan}Skill ID:    ${C.reset}`);
  const empId    = parseInt(empRaw,   10);
  const skillId  = parseInt(skillRaw, 10);

  if (isNaN(empId) || isNaN(skillId)) { printError('Invalid ID.'); await sleep(800); return; }

  const proficiency = await readLine(`  ${C.cyan}New Proficiency: ${C.reset}`);
  if (!proficiency) { printError('Proficiency is required.'); await sleep(800); return; }

  try {
    await updateEmployeeSkill(empId, skillId, proficiency);
    printSuccess('Skill proficiency updated.');
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function removeSkillFlow(): Promise<void> {
  printBanner();
  printHeader('Remove Skill');

  const empRaw   = await readLine(`  ${C.cyan}Employee ID: ${C.reset}`);
  const skillRaw = await readLine(`  ${C.cyan}Skill ID:    ${C.reset}`);
  const empId    = parseInt(empRaw,   10);
  const skillId  = parseInt(skillRaw, 10);

  if (isNaN(empId) || isNaN(skillId)) { printError('Invalid ID.'); await sleep(800); return; }

  if (!(await confirm(`  ${C.yellow}Remove skill #${skillId} from employee #${empId}?`))) {
    printInfo('Cancelled.'); await sleep(800); return;
  }

  try {
    await removeEmployeeSkill(empId, skillId);
    printSuccess('Skill removed.');
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

// ─────────────────────────────────────────────────────────────────────────────
// Project sub-menu
// ─────────────────────────────────────────────────────────────────────────────

async function projectSubMenu(): Promise<void> {
  while (true) {
    printBanner();
    printHeader('Projects');

    console.log(`  ${C.cyan}[1]${C.reset} List All Projects`);
    console.log(`  ${C.cyan}[2]${C.reset} View Project Detail`);
    console.log(`  ${C.cyan}[3]${C.reset} Create Project`);
    console.log(`  ${C.cyan}[4]${C.reset} Update Project / Assign Manager`);
    console.log(`  ${C.cyan}[5]${C.reset} Manage Milestones`);
    console.log(`  ${C.dim}[0]${C.reset} Back`);
    console.log();

    const choice = await readChoice(5);
    switch (choice) {
      case 1: await listProjects();       break;
      case 2: await viewProjectDetail();  break;
      case 3: await createProjectFlow();  break;
      case 4: await updateProjectFlow();  break;
      case 5: await milestonesSubMenu();  break;
      case 0: return;
      default:
        printError('Invalid option.');
        await sleep(700);
    }
  }
}

async function listProjects(): Promise<void> {
  printBanner();
  printHeader('All Projects');
  try {
    const projects = await getAllProjects();
    printTable(
      ['ID', 'Name', 'Status', 'Health', 'Manager', 'Start', 'End'],
      projects.map(p => [
        p.id, p.name, p.status, p.health_status,
        p.manager_name ?? '—',
        p.start_date?.slice(0, 10),
        p.end_date?.slice(0, 10),
      ]),
    );
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function viewProjectDetail(): Promise<void> {
  printBanner();
  printHeader('Project Detail');

  const raw = await readLine(`  ${C.cyan}Project ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  try {
    const p = await getProjectById(id);
    printDivider();
    printKeyValue('ID',                 p.id);
    printKeyValue('Name',               p.name);
    printKeyValue('Description',        p.description ?? '—');
    printKeyValue('Status',             p.status);
    printKeyValue('Health',             p.health_status);
    printKeyValue('Manager',            p.manager_name ?? '—');
    printKeyValue('Start Date',         p.start_date?.slice(0, 10));
    printKeyValue('End Date',           p.end_date?.slice(0, 10));
    printKeyValue('Total Story Points', p.total_story_points ?? 0);
    printDivider();
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function createProjectFlow(): Promise<void> {
  printBanner();
  printHeader('Create Project');

  printInfo('Date format:  YYYY-MM-DD');
  printInfo('Status:       PLANNED | ACTIVE | ON_HOLD | COMPLETED');
  console.log();

  const name               = await readLine(`  ${C.cyan}Project Name:       ${C.reset}`);
  const description        = await readLine(`  ${C.cyan}Description:        ${C.reset}`);
  const start_date         = await readLine(`  ${C.cyan}Start Date:         ${C.reset}`);
  const end_date           = await readLine(`  ${C.cyan}End Date:           ${C.reset}`);
  const status             = (await readLine(`  ${C.cyan}Status:             ${C.reset}`)).toUpperCase() || 'PLANNED';
  const rawPoints          = await readLine(`  ${C.cyan}Total Story Points: ${C.reset}`);
  const total_story_points = parseInt(rawPoints, 10);

  if (isNaN(total_story_points)) { printError('Story points must be a number.'); await sleep(800); return; }

  try {
    const p = await createProject({
      name,
      ...(description ? { description } : {}),
      start_date,
      end_date,
      status,
      total_story_points,
    });
    printSuccess(`Project '${p.name}' (ID: ${p.id}) created.`);
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function updateProjectFlow(): Promise<void> {
  printBanner();
  printHeader('Update Project / Assign Manager');

  const raw = await readLine(`  ${C.cyan}Project ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  printInfo('Leave blank to keep current value. Enter "none" for manager to unassign.');
  console.log();

  const name        = await readLine(`  ${C.cyan}Name:               ${C.reset}`);
  const description = await readLine(`  ${C.cyan}Description:        ${C.reset}`);
  const start_date  = await readLine(`  ${C.cyan}Start Date:         ${C.reset}`);
  const end_date    = await readLine(`  ${C.cyan}End Date:           ${C.reset}`);
  const status      = (await readLine(`  ${C.cyan}Status:             ${C.reset}`)).toUpperCase();
  const managerRaw  = await readLine(`  ${C.cyan}Manager ID:         ${C.reset}`);
  const pointsRaw   = await readLine(`  ${C.cyan}Total Story Points: ${C.reset}`);

  const payload: Record<string, string | number | null> = {};
  if (name)        payload.name        = name;
  if (description) payload.description = description;
  if (start_date)  payload.start_date  = start_date;
  if (end_date)    payload.end_date    = end_date;
  if (status)      payload.status      = status;
  if (managerRaw) {
    if (managerRaw.toLowerCase() === 'none') {
      payload.manager_id = null;
    } else {
      const mgr = parseInt(managerRaw, 10);
      if (isNaN(mgr)) { printError('Invalid manager ID.'); await sleep(800); return; }
      payload.manager_id = mgr;
    }
  }
  if (pointsRaw) {
    const pts = parseInt(pointsRaw, 10);
    if (isNaN(pts)) { printError('Invalid story points.'); await sleep(800); return; }
    payload.total_story_points = pts;
  }

  if (Object.keys(payload).length === 0) {
    printInfo('No changes provided.');
    await sleep(800);
    return;
  }

  try {
    await updateProject(id, payload);
    printSuccess('Project updated.');
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

// ─────────────────────────────────────────────────────────────────────────────
// Milestones sub-menu
// ─────────────────────────────────────────────────────────────────────────────

async function milestonesSubMenu(): Promise<void> {
  while (true) {
    printBanner();
    printHeader('Milestones');

    console.log(`  ${C.cyan}[1]${C.reset} List Project Milestones`);
    console.log(`  ${C.cyan}[2]${C.reset} Add Milestone`);
    console.log(`  ${C.cyan}[3]${C.reset} Update Milestone Status`);
    console.log(`  ${C.dim}[0]${C.reset} Back`);
    console.log();

    const choice = await readChoice(3);
    switch (choice) {
      case 1: await listMilestonesFlow(); break;
      case 2: await addMilestoneFlow();   break;
      case 3: await updateMilestoneFlow(); break;
      case 0: return;
      default:
        printError('Invalid option.');
        await sleep(700);
    }
  }
}

async function listMilestonesFlow(): Promise<void> {
  printBanner();
  printHeader('Project Milestones');

  const raw = await readLine(`  ${C.cyan}Project ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  try {
    const milestones = await getMilestones(id);
    if (milestones.length === 0) {
      printInfo('No milestones for this project.');
    } else {
      printTable(
        ['ID', 'Title', 'Due Date', 'Story Pts', 'Status'],
        milestones.map(m => [
          m.id, m.title,
          m.due_date?.slice(0, 10),
          m.story_points,
          m.status,
        ]),
      );
    }
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function addMilestoneFlow(): Promise<void> {
  printBanner();
  printHeader('Add Milestone');

  printInfo('Date format: YYYY-MM-DD');
  console.log();

  const projRaw    = await readLine(`  ${C.cyan}Project ID:    ${C.reset}`);
  const projectId  = parseInt(projRaw, 10);
  if (isNaN(projectId)) { printError('Invalid project ID.'); await sleep(800); return; }

  const title       = await readLine(`  ${C.cyan}Title:         ${C.reset}`);
  const due_date    = await readLine(`  ${C.cyan}Due Date:      ${C.reset}`);
  const ptsRaw      = await readLine(`  ${C.cyan}Story Points:  ${C.reset}`);
  const story_points = parseInt(ptsRaw, 10);

  if (!title || !due_date) { printError('Title and due date are required.'); await sleep(800); return; }
  if (isNaN(story_points)) { printError('Story points must be a number.'); await sleep(800); return; }

  try {
    await addMilestone(projectId, { title, due_date, story_points });
    printSuccess(`Milestone '${title}' added to project #${projectId}.`);
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function updateMilestoneFlow(): Promise<void> {
  printBanner();
  printHeader('Update Milestone Status');

  printInfo('Status: NOT_STARTED | IN_PROGRESS | DONE');
  console.log();

  const projRaw   = await readLine(`  ${C.cyan}Project ID:   ${C.reset}`);
  const mileRaw   = await readLine(`  ${C.cyan}Milestone ID: ${C.reset}`);
  const projectId = parseInt(projRaw,  10);
  const mileId    = parseInt(mileRaw,  10);

  if (isNaN(projectId) || isNaN(mileId)) { printError('Invalid ID.'); await sleep(800); return; }

  const status = (await readLine(`  ${C.cyan}New Status:   ${C.reset}`)).toUpperCase();
  if (!status) { printError('Status is required.'); await sleep(800); return; }

  try {
    await updateMilestone(projectId, mileId, status);
    printSuccess(`Milestone #${mileId} status updated to '${status}'.`);
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

// ─────────────────────────────────────────────────────────────────────────────
// All allocations view
// ─────────────────────────────────────────────────────────────────────────────

async function viewAllAllocations(): Promise<void> {
  printBanner();
  printHeader('All Active Allocations');
  try {
    const allocs = await getAllAllocations();
    if (allocs.length === 0) {
      printInfo('No active allocations.');
    } else {
      printTable(
        ['ID', 'Employee', 'Project', 'Util %', 'From', 'To'],
        allocs.map(a => [
          a.id,
          a.employee_name,
          a.project_name,
          `${a.utilisation_pct}%`,
          a.from_date?.slice(0, 10),
          a.to_date?.slice(0, 10),
        ]),
      );
    }
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

// ─────────────────────────────────────────────────────────────────────────────
// Config sub-menu
// ─────────────────────────────────────────────────────────────────────────────

async function configSubMenu(): Promise<void> {
  while (true) {
    printBanner();
    printHeader('System Configuration');

    console.log(`  ${C.cyan}[1]${C.reset} View All Config`);
    console.log(`  ${C.cyan}[2]${C.reset} Update Config Value`);
    console.log(`  ${C.dim}[0]${C.reset} Back`);
    console.log();

    const choice = await readChoice(2);
    switch (choice) {
      case 1: await viewConfig(); break;
      case 2: await editConfig(); break;
      case 0: return;
      default:
        printError('Invalid option.');
        await sleep(700);
    }
  }
}

async function viewConfig(): Promise<void> {
  printBanner();
  printHeader('System Configuration');
  try {
    const configs = await getSystemConfig();
    printTable(['Key', 'Value'], configs.map(c => [c.key, c.value]));
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function editConfig(): Promise<void> {
  printBanner();
  printHeader('Update Config');

  const key   = await readLine(`  ${C.cyan}Config Key:  ${C.reset}`);
  const value = await readLine(`  ${C.cyan}New Value:   ${C.reset}`);

  try {
    await updateSystemConfig(key, value);
    printSuccess(`Config '${key}' updated to '${value}'.`);
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}
