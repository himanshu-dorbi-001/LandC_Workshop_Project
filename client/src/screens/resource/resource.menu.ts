import {
  printBanner, printHeader, printSuccess, printError, printInfo,
  printTable, printKeyValue, printDivider, C, pause,
} from '../../utils/display';
import { readLine, readChoice, sleep } from '../../utils/prompt';
import { session } from '../../session/session';
import { showChangePasswordScreen } from '../auth/changePassword.screen';
import {
  getMyAllocations, getMyTimesheets, getTimesheetDetail, submitTimesheet,
  TimesheetEntry,
} from '../../api/resource.api';

export async function showResourceMenu(): Promise<void> {
  while (true) {
    printBanner();
    printHeader(`Resource Portal  —  ${session.get()?.fullName}`);

    console.log(`  ${C.cyan}[1]${C.reset} My Allocations`);
    console.log(`  ${C.cyan}[2]${C.reset} My Timesheets`);
    console.log(`  ${C.cyan}[3]${C.reset} Submit Timesheet`);
    console.log(`  ${C.cyan}[4]${C.reset} View Timesheet Detail`);
    console.log(`  ${C.cyan}[5]${C.reset} Change My Password`);
    console.log(`  ${C.red}[0]${C.reset} Logout`);
    console.log();

    const choice = await readChoice(5);
    switch (choice) {
      case 1: await viewMyAllocations();    break;
      case 2: await viewMyTimesheets();     break;
      case 3: await submitTimesheetFlow();  break;
      case 4: await viewTimesheetDetail();  break;
      case 5: await showChangePasswordScreen(); break;
      case 0: return;
      default:
        printError('Invalid option.');
        await sleep(700);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function viewMyAllocations(): Promise<void> {
  printBanner();
  printHeader('My Allocations');
  try {
    const allocs = await getMyAllocations();
    if (allocs.length === 0) {
      printInfo('You have no active allocations.');
    } else {
      printTable(
        ['ID', 'Project', 'Util %', 'From', 'To'],
        allocs.map(a => [
          a.id,
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

async function viewMyTimesheets(): Promise<void> {
  printBanner();
  printHeader('My Timesheets');
  try {
    const { timesheets, missed_week_reminder } = await getMyTimesheets();

    if (missed_week_reminder) {
      printInfo(`Reminder: You have not submitted a timesheet for week of ${missed_week_reminder}.`);
      console.log();
    }

    if (timesheets.length === 0) {
      printInfo('No timesheets submitted yet.');
    } else {
      printTable(
        ['ID', 'Week Start', 'Total Hours', 'Status'],
        timesheets.map(s => {
          const isInProgress = s.status === 'IN_PROGRESS';
          return [
            isInProgress ? '—' : s.id,
            s.week_start_date?.slice(0, 10),
            isInProgress ? '—' : s.total_hours,
            isInProgress
              ? `${C.yellow}IN PROGRESS${C.reset}`
              : s.status === 'MISSED'
                ? `${C.red}MISSED${C.reset}`
                : `${C.green}SUBMITTED${C.reset}`,
          ];
        }),
      );
    }
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function viewTimesheetDetail(): Promise<void> {
  printBanner();
  printHeader('Timesheet Detail');

  const raw = await readLine(`  ${C.cyan}Timesheet ID: ${C.reset}`);
  const id  = parseInt(raw, 10);
  if (isNaN(id)) { printError('Invalid ID.'); await sleep(800); return; }

  try {
    const ts = await getTimesheetDetail(id);

    printDivider();
    printKeyValue('Timesheet ID', ts.id);
    printKeyValue('Week Start',   ts.week_start_date?.slice(0, 10));
    printKeyValue('Total Hours',  ts.total_hours);
    printKeyValue('Status',       ts.status);
    printDivider();

    if (ts.entries.length === 0) {
      printInfo('No entries.');
    } else {
      printTable(
        ['Project', 'Hours', 'Activity Tags'],
        ts.entries.map(e => [
          e.project_name,
          e.hours_worked,
          (e.activity_tags ?? []).join(', ') || '—',
        ]),
      );
    }
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}

async function submitTimesheetFlow(): Promise<void> {
  printBanner();
  printHeader('Submit Timesheet');

  printInfo('Log hours per project for the week. Use the Monday date as week start.');
  printInfo('Date format: YYYY-MM-DD');
  console.log();

  const week_start_date = await readLine(`  ${C.cyan}Week Start Date: ${C.reset}`);
  if (!week_start_date) { printError('Week start date is required.'); await sleep(800); return; }

  let allocs: Awaited<ReturnType<typeof getMyAllocations>> = [];
  try {
    allocs = await getMyAllocations();
    if (allocs.length > 0) {
      printInfo('Your active allocations (enter Project ID when adding entries):');
      printTable(
        ['Project ID', 'Project', 'Util %', 'From', 'To'],
        allocs.map(a => [
          a.project_id,
          a.project_name,
          `${a.utilisation_pct}%`,
          a.from_date?.slice(0, 10),
          a.to_date?.slice(0, 10),
        ]),
      );
    } else {
      printInfo('You have no active allocations. You need an allocation to log hours.');
    }
  } catch {
    // non-critical — continue
  }

  const entries: TimesheetEntry[] = [];

  while (true) {
    const projRaw = await readLine(`  ${C.cyan}Project ID (Enter to finish): ${C.reset}`);
    if (!projRaw) break;

    const project_id = parseInt(projRaw, 10);
    if (isNaN(project_id)) { printError('Invalid project ID.'); continue; }

    const hoursRaw    = await readLine(`  ${C.cyan}Hours Worked:               ${C.reset}`);
    const hours_worked = parseFloat(hoursRaw);
    if (isNaN(hours_worked) || hours_worked <= 0) { printError('Hours must be a positive number.'); continue; }

    const tagsRaw      = await readLine(`  ${C.cyan}Activity Tags (comma-sep):  ${C.reset}`);
    const activity_tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

    entries.push({ project_id, hours_worked, activity_tags });
    printInfo(`Entry added: Project #${project_id} — ${hours_worked}h  [${activity_tags.join(', ') || 'no tags'}]`);
    console.log();
  }

  if (entries.length === 0) {
    printInfo('No entries added. Returning to menu.');
    await sleep(800);
    return;
  }

  const totalHours = entries.reduce((s, e) => s + e.hours_worked, 0);
  printDivider();
  printInfo(`Week: ${week_start_date}  |  Entries: ${entries.length}  |  Total: ${totalHours}h`);
  printDivider();

  const confirm = await readLine(`  ${C.yellow}Submit? (yes/no): ${C.reset}`);
  if (!['y', 'yes'].includes(confirm.toLowerCase())) {
    printInfo('Submission cancelled.');
    await sleep(800);
    return;
  }

  try {
    const sheet = await submitTimesheet({ week_start_date, entries });
    printSuccess(`Timesheet #${sheet.id} submitted for week of ${week_start_date} (${sheet.total_hours}h total).`);
  } catch (err) {
    printError((err as Error).message);
  }
  await pause();
}
