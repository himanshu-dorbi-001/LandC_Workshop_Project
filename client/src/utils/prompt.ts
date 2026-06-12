import * as readline from 'readline';

export function readLine(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function readPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    return readLine(prompt);
  }

  return new Promise(resolve => {
    process.stdout.write(prompt);
    let password = '';

    const onData = (charBuf: Buffer): void => {
      const ch = charBuf.toString('utf8');
      switch (ch) {
        case '\r':
        case '\n':
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', onData);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '':
          process.exit();
          break;
        case '':
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          if (ch >= ' ') {
            password += ch;
            process.stdout.write('*');
          }
      }
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

export async function confirm(prompt: string): Promise<boolean> {
  const answer = await readLine(`${prompt} (yes/no): `);
  return ['y', 'yes'].includes(answer.toLowerCase());
}

export async function readChoice(max: number): Promise<number | null> {
  const raw = await readLine('  Enter choice: ');
  const n   = parseInt(raw, 10);
  return Number.isNaN(n) || n < 0 || n > max ? null : n;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
