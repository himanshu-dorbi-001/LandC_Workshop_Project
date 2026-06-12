import fs   from 'fs';
import path from 'path';

const LOG_DIR  = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'scheduler.log');

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatLine(level: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] ${message}\n`;
}

function write(level: string, message: string): void {
  ensureLogDir();
  const line = formatLine(level, message);
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}

export const schedulerLogger = {
  info:  (message: string) => { console.log(`[Scheduler] ${message}`);          write('INFO',  message); },
  error: (message: string) => { console.error(`[Scheduler] ERROR: ${message}`); write('ERROR', message); },
  warn:  (message: string) => { console.warn(`[Scheduler] WARN: ${message}`);   write('WARN',  message); },
};
