import { printBanner, printHeader, printSuccess, printError, printInfo, C, pause } from '../../utils/display';
import { readLine, readPassword, sleep } from '../../utils/prompt';
import { login }                         from '../../api/auth.api';
import { session }                       from '../../session/session';
import { showForceChangePasswordScreen } from './changePassword.screen';
import { showAdminMenu }                 from '../admin/admin.menu';
import { showManagerMenu }               from '../manager/manager.menu';
import { showResourceMenu }              from '../resource/resource.menu';

export async function showLoginScreen(): Promise<never> {
  while (true) {
    printBanner();
    printHeader('Login');

    const username = await readLine(`  ${C.cyan}Username: ${C.reset}`);
    const password = await readPassword(`  ${C.cyan}Password: ${C.reset}`);

    try {
      const result = await login(username, password);

      session.set({
        token:      result.token,
        employeeId: result.employeeId,
        username:   result.username,
        role:       result.role,
        fullName:   result.fullName,
      });

      printSuccess(`Welcome, ${result.fullName}!  [ ${result.role} ]`);
      await sleep(1000);

      // First-login password change is mandatory before accessing any menu
      if (result.forcePasswordChange) {
        printInfo('Your password must be changed before you can continue.');
        await sleep(1000);
        const changed = await showForceChangePasswordScreen();
        if (!changed) {
          session.clear();
          continue; // back to login
        }
      }

      // Route to the role's menu; returns when user chooses Logout
      switch (result.role) {
        case 'ADMIN':    await showAdminMenu();    break;
        case 'MANAGER':  await showManagerMenu();  break;
        case 'RESOURCE': await showResourceMenu(); break;
        default:
          printError(`Unknown role '${result.role}'.`);
          await pause();
      }

      session.clear();
      printInfo('You have been logged out.');
      await sleep(1000);

    } catch (err) {
      printError((err as Error).message);
      await pause('Press Enter to try again…');
    }
  }
}
