export const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
} as const;

export function clearScreen(): void {
  process.stdout.write('\x1Bc');
}

export function printBanner(): void {
  clearScreen();
  console.log(`${C.cyan}${C.bold}`);
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   PRM TOOL — Project & Resource Manager  ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log(C.reset);
}

export function printHeader(title: string): void {
  const pad  = 2;
  const line = '─'.repeat(title.length + pad * 2);
  console.log(`${C.cyan}${C.bold}  ┌${line}┐`);
  console.log(`  │${''.padStart(pad)}${title}${''.padStart(pad)}│`);
  console.log(`  └${line}┘${C.reset}\n`);
}

export function printSuccess(msg: string): void {
  console.log(`\n${C.green}${C.bold}  ✓  ${msg}${C.reset}\n`);
}

export function printError(msg: string): void {
  console.log(`\n${C.red}${C.bold}  ✗  ${msg}${C.reset}\n`);
}

export function printInfo(msg: string): void {
  console.log(`${C.yellow}  ℹ  ${msg}${C.reset}`);
}

export function printDivider(): void {
  console.log(`${C.dim}  ${'─'.repeat(48)}${C.reset}`);
}

export function printKeyValue(key: string, value: string | number | boolean): void {
  console.log(`  ${C.cyan}${key.padEnd(22)}${C.reset}${String(value)}`);
}

export function printTable(headers: string[], rows: (string | number)[][]): void {
  if (rows.length === 0) {
    printInfo('No records found.');
    return;
  }

  const strRows = rows.map(r => r.map(String));
  const widths  = headers.map((h, i) =>
    Math.max(h.length, ...strRows.map(r => (r[i] ?? '').length))
  );

  const row2str = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(widths[i])).join(`  ${C.dim}│${C.reset}  `);

  console.log(`  ${C.bold}${C.cyan}${row2str(headers)}${C.reset}`);
  console.log(`  ${C.dim}${widths.map(w => '─'.repeat(w)).join('──┼──')}${C.reset}`);
  for (const r of strRows) {
    console.log(`  ${row2str(r)}`);
  }
  console.log();
}

export async function pause(msg = 'Press Enter to continue...'): Promise<void> {
  const { readLine } = await import('./prompt');
  await readLine(`\n  ${C.dim}${msg}${C.reset}`);
}
