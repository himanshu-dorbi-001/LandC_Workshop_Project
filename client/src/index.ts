import { showLoginScreen } from './screens/auth/login.screen';

process.stdin.resume();

process.on('SIGINT', () => {
  process.stdout.write('\n\n  Goodbye!\n\n');
  process.exit(0);
});

showLoginScreen().catch(err => {
  console.error('\n  Fatal error:', err);
  process.exit(1);
});
