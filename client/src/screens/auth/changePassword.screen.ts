import { printBanner, printHeader, printSuccess, printError, printInfo, C } from '../../utils/display';
import { readPassword, sleep } from '../../utils/prompt';
import { changePassword, forceChangePassword } from '../../api/auth.api';

// Called on first login when force_password_change = true.
// Returns true on success, false if the user fails all attempts.
export async function showForceChangePasswordScreen(): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    printBanner();
    printHeader('Set New Password  (Required)');
    printInfo('You must set a new password before you can continue.');
    printInfo('Requirements: 8+ chars, 1 uppercase letter, 1 number.');
    if (attempt > 1) printInfo(`Attempt ${attempt} of 3`);
    console.log();

    const newPassword     = await readPassword(`  ${C.cyan}New Password:     ${C.reset}`);
    const confirmPassword = await readPassword(`  ${C.cyan}Confirm Password: ${C.reset}`);

    if (newPassword !== confirmPassword) {
      printError('Passwords do not match.');
      await sleep(1000);
      continue;
    }

    try {
      await forceChangePassword(newPassword);
      printSuccess('Password updated. Continuing…');
      await sleep(1200);
      return true;
    } catch (err) {
      printError((err as Error).message);
      await sleep(1000);
    }
  }

  printError('Too many failed attempts. You have been logged out.');
  await sleep(2000);
  return false;
}

// Called from the role menus when the user chooses "Change My Password".
export async function showChangePasswordScreen(): Promise<void> {
  printBanner();
  printHeader('Change Password');

  const current  = await readPassword(`  ${C.cyan}Current Password: ${C.reset}`);
  const next     = await readPassword(`  ${C.cyan}New Password:     ${C.reset}`);
  const confirm  = await readPassword(`  ${C.cyan}Confirm Password: ${C.reset}`);

  if (next !== confirm) {
    printError('Passwords do not match.');
    await sleep(1500);
    return;
  }

  try {
    await changePassword(current, next);
    printSuccess('Password changed successfully.');
  } catch (err) {
    printError((err as Error).message);
  }

  await sleep(1500);
}
