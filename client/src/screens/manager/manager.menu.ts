import {
  printBanner, printHeader, printSuccess, printError, printInfo,
  printTable, printKeyValue, printDivider, C, pause,
} from '../../utils/display';
import { readLine, readChoice, sleep } from '../../utils/prompt';
import { session } from '../../session/session';
import { showChangePasswordScreen } from '../auth/changePassword.screen';
import {
  getDashboard, getProjects, getProjectById, getAllocationsByProject,
  createAllocation, endAllocation, getTeamTimesheets,
  aiSkillMatch, aiRiskSummary, aiTeamMatch,
  RoleRequirement, FilledRole, UnfilledRole,
} from '../../api/manager.api';

export async function showManagerMenu(): Promise<void> {
  while (true) {
    printBanner();
    printHeader(`Manager Panel  —  ${session.get()?.fullName}`);

    console.log(`  ${C.cyan}[1]${C.reset} Resource Dashboard`);
    console.log(`  ${C.cyan}[2]${C.reset} Projects`);
    console.log(`  ${C.cyan}[3]${C.reset} Allocations`);
    console.log(`  ${C.cyan}[4]${C.reset} Team Timesheets`);
    console.log(`  ${C.cyan}[5]${C.reset} AI Tools`);
    console.log(`  ${C.cyan}[6]${C.reset} Change My Password`);
    console.log(`  ${C.red}[0]${C.reset} Logout`);
    console.log();

    const choice = await readChoice(6);
    switch (choice) {
      case 1: await viewDashboard();       break;
      case 2: await projectSubMenu();      break;
      case 3: await allocationSubMenu();   break;
      case 4: await viewTeamTimesheets();  break;
      case 5: await aiSubMenu();           break;
      case 6: await showChangePasswordScreen(); break;
      case 0: return;
      default:
        printError('Invalid option.');
        await sleep(700);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

async function viewDashboard(): Promise<void> {
  printBanner();
  printHeader('Resource Dashboard');
  try {
    const data = await getDashboard();
    const { total, allocated, bench, employees } = data;

    printKeyValue('Total Resources', total);
    printKeyValue('Allocated',       allocated);
    printKeyValue('On Bench',        bench);
    printDivider();

    printTable(
      ['ID', 'Name', 'Department', 'Status', 'Top Skills'],
      employees.map(e => [
        e.id,
        e.full_name,
        e.department_name,
        e.status,
        e.skills.slice(0, 3).map(s => s.skill_name).join(', ') || '—',
      ]),
    );
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

// ─────────────────────────────────────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────────────────────────────────────

async function projectSubMenu(): Promise<void> {
  while (true) {
    printBanner();
    printHeader('Projects');

    console.log(`  ${C.cyan}[1]${C.reset} List All Projects`);
    console.log(`  ${C.cyan}[2]${C.reset} View Project Detail`);
    console.log(`  ${C.cyan}[3]${C.reset} View Project Allocations`);
    console.log(`  ${C.dim}[0]${C.reset} Back`);
    console.log();

    const choice = await readChoice(3);
    switch (choice) {
      case 1: await listProjects();           break;
      case 2: await viewProjectDetail();      break;
      case 3: await viewProjectAllocations(); break;
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
    const projects = await getProjects();
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
    printKeyValue('Status',             p.status);
    printKeyValue('Health',             p.health_status);
    printKeyValue('Manager',            p.manager_name ?? '—');
    printKeyValue('Start Date',         p.start_date?.slice(0, 10));
    printKeyValue('End Date',           p.end_date?.slice(0, 10));
    printKeyValue('Total Story Points', p.total_story_points ?? 0);
    printKeyValue('Done Story Points',  p.done_story_points  ?? 0);
    printDivider();
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function viewProjectAllocations(): Promise<void> {
  printBanner();
  printHeader('Project Allocations');
  const raw = await readLine(`  ${C.cyan}Project ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  try {
    const allocs = await getAllocationsByProject(id);
    if (allocs.length === 0) {
      printInfo('No active allocations for this project.');
    } else {
      printTable(
        ['ID', 'Resource', 'Util %', 'From', 'To'],
        allocs.map(a => [
          a.id,
          a.employee_name,
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
// Allocations
// ─────────────────────────────────────────────────────────────────────────────

async function allocationSubMenu(): Promise<void> {
  while (true) {
    printBanner();
    printHeader('Allocations');

    console.log(`  ${C.cyan}[1]${C.reset} Allocate Resource to Project`);
    console.log(`  ${C.cyan}[2]${C.reset} End Allocation`);
    console.log(`  ${C.dim}[0]${C.reset} Back`);
    console.log();

    const choice = await readChoice(2);
    switch (choice) {
      case 1: await createAllocationFlow(); break;
      case 2: await endAllocationFlow();    break;
      case 0: return;
      default:
        printError('Invalid option.');
        await sleep(700);
    }
  }
}

async function createAllocationFlow(): Promise<void> {
  printBanner();
  printHeader('Allocate Resource');

  printInfo('Date format: YYYY-MM-DD  |  Utilisation: 1–100');
  printInfo('Over-allocation guard enforced — total cannot exceed 100% per employee.');
  console.log();

  const empRaw  = await readLine(`  ${C.cyan}Employee ID:     ${C.reset}`);
  const projRaw = await readLine(`  ${C.cyan}Project ID:      ${C.reset}`);
  const utilRaw = await readLine(`  ${C.cyan}Utilisation (%): ${C.reset}`);
  const from    = await readLine(`  ${C.cyan}From Date:       ${C.reset}`);
  const to      = await readLine(`  ${C.cyan}To Date:         ${C.reset}`);

  const employee_id    = parseInt(empRaw,  10);
  const project_id     = parseInt(projRaw, 10);
  const utilisation_pct = parseInt(utilRaw, 10);

  if ([employee_id, project_id, utilisation_pct].some(isNaN)) {
    printError('Employee ID, Project ID, and Utilisation must be numbers.');
    await sleep(800); return;
  }
  if (!from || !to) {
    printError('From date and to date are required.');
    await sleep(800); return;
  }

  try {
    const alloc = await createAllocation({
      employee_id, project_id, utilisation_pct,
      from_date: from, to_date: to,
    });
    printSuccess(`Allocation #${alloc.id} created — ${alloc.employee_name} on ${alloc.project_name} at ${alloc.utilisation_pct}%.`);
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function endAllocationFlow(): Promise<void> {
  printBanner();
  printHeader('End Allocation');

  const raw = await readLine(`  ${C.cyan}Allocation ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  try {
    await endAllocation(id);
    printSuccess(`Allocation #${id} ended (to_date set to today).`);
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

// ─────────────────────────────────────────────────────────────────────────────
// Team timesheets
// ─────────────────────────────────────────────────────────────────────────────

async function viewTeamTimesheets(): Promise<void> {
  printBanner();
  printHeader('Team Timesheets');

  printInfo('Leave blank for current week (Monday–Sunday).');
  const weekInput = await readLine(`  ${C.cyan}Week start date (YYYY-MM-DD): ${C.reset}`);

  try {
    const entries = await getTeamTimesheets(weekInput || undefined);

    if (entries.length === 0) {
      printInfo('No timesheet data for this week.');
    } else {
      printTable(
        ['Employee', 'Project', 'Hours', 'Tags', 'Status'],
        entries.map(e => [
          e.employee_name,
          e.project_name   ?? '—',
          e.hours_worked   ?? 0,
          (e.activity_tags ?? []).slice(0, 2).join(', ') || '—',
          e.timesheet_status ?? 'NOT SUBMITTED',
        ]),
      );
    }
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

// ─────────────────────────────────────────────────────────────────────────────
// AI tools
// ─────────────────────────────────────────────────────────────────────────────

async function aiSubMenu(): Promise<void> {
  while (true) {
    printBanner();
    printHeader('AI Tools');

    console.log(`  ${C.cyan}[1]${C.reset} Skill Match — find best-fit resources`);
    console.log(`  ${C.cyan}[2]${C.reset} Risk Summary — project health analysis`);
    console.log(`  ${C.cyan}[3]${C.reset} Team Builder — staff a whole project at once`);
    console.log(`  ${C.dim}[0]${C.reset} Back`);
    console.log();

    const choice = await readChoice(3);
    switch (choice) {
      case 1: await aiSkillMatchFlow();   break;
      case 2: await aiRiskSummaryFlow();  break;
      case 3: await aiTeamMatchFlow();    break;
      case 0: return;
      default:
        printError('Invalid option.');
        await sleep(700);
    }
  }
}

async function aiSkillMatchFlow(): Promise<void> {
  printBanner();
  printHeader('AI Skill Match');

  const raw  = await readLine(`  ${C.cyan}Required skills (comma-separated): ${C.reset}`);
  const desc = await readLine(`  ${C.cyan}Project description (optional):     ${C.reset}`);

  const required_skills = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (required_skills.length === 0) { printError('At least one skill is required.'); await sleep(800); return; }

  printInfo('Querying AI…');
  try {
    const result = await aiSkillMatch({ required_skills, ...(desc ? { project_description: desc } : {}) });
    printDivider();
    console.log(`\n${result}\n`);
    printDivider();
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function aiRiskSummaryFlow(): Promise<void> {
  printBanner();
  printHeader('AI Risk Summary');

  const raw = await readLine(`  ${C.cyan}Project ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  printInfo('Querying AI…');
  try {
    const result = await aiRiskSummary({ project_id: id });
    printDivider();
    console.log(`\n${result}\n`);
    printDivider();
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function aiTeamMatchFlow(): Promise<void> {
  printBanner();
  printHeader('AI Team Builder');

  printInfo('Staff all roles for a project in a single pass.');
  printInfo('Skill format: SkillName:PROFICIENCY  (e.g. "Java:ADVANCED, Spring Boot:INTERMEDIATE")');
  printInfo('Proficiency levels: BEGINNER | INTERMEDIATE | ADVANCED | EXPERT  (omit = any level)');
  console.log();

  const projectName = await readLine(`  ${C.cyan}Project name (optional):        ${C.reset}`);
  const projectDesc = await readLine(`  ${C.cyan}Project description (optional): ${C.reset}`);

  const roles: RoleRequirement[] = [];

  while (true) {
    console.log();
    const roleName = await readLine(
      `  ${C.cyan}Role ${roles.length + 1} name (blank to finish): ${C.reset}`
    );
    if (!roleName.trim()) break;

    const skillsRaw = await readLine(
      `  ${C.cyan}Required skills (comma-separated): ${C.reset}`
    );
    if (!skillsRaw.trim()) {
      printError('At least one skill is required for a role.');
      await sleep(600);
      continue;
    }

    const required_skills = skillsRaw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        const [skill, proficiency] = s.split(':').map(p => p.trim());
        const min_proficiency = proficiency?.toUpperCase() || undefined;
        return min_proficiency ? { skill, min_proficiency } : { skill };
      });

    roles.push({ role_name: roleName.trim(), required_skills });
    printSuccess(`  Role added: ${roleName.trim()} (${required_skills.length} skill(s))`);
  }

  if (roles.length === 0) {
    printError('No roles defined. Cancelled.');
    await sleep(800);
    return;
  }

  console.log();
  printInfo(`Staffing ${roles.length} role(s) — querying AI…`);

  try {
    const result = await aiTeamMatch({
      roles,
      ...(projectName.trim() ? { project_name: projectName.trim() } : {}),
      ...(projectDesc.trim() ? { project_description: projectDesc.trim() } : {}),
    });

    printDivider();
    console.log();

    // ── Filled roles table ───────────────────────────────────────────────────
    if (result.filled.length > 0) {
      console.log(`${C.green}✓ STAFFED ROLES${C.reset}`);
      printTable(
        ['Role', 'Assigned To', 'Dept', 'Avail %', 'Matched', 'Missing'],
        (result.filled as FilledRole[]).map(f => [
          f.role_name,
          f.assigned.name,
          f.assigned.department,
          `${f.assigned.free_pct}% (${f.assigned.free_hours_pw}h/wk)`,
          f.assigned.matched_skills.join(', ') || '—',
          f.assigned.missing_skills.join(', ') || '—',
        ]),
      );
    }

    // ── Unfilled roles table ─────────────────────────────────────────────────
    if (result.unfilled.length > 0) {
      console.log(`\n${C.red}✗ GAPS — ACTION REQUIRED${C.reset}`);
      printTable(
        ['Role', 'Gap Type', 'Missing Skills / Who Is Booked'],
        (result.unfilled as UnfilledRole[]).map(u => [
          u.role_name,
          u.gap_type === 'NO_SKILL_IN_TEAM' ? 'No skill in team' : 'All allocated',
          u.gap_type === 'NO_SKILL_IN_TEAM'
            ? u.missing_skills.join(', ')
            : u.candidates_with_skill.map(c => `${c.name} (free ${c.free_date})`).join('; '),
        ]),
      );
    }

    // ── AI narrative ─────────────────────────────────────────────────────────
    console.log();
    printDivider();
    console.log(`\n${result.narrative}\n`);
    printDivider();
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}
