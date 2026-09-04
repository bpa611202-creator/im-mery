import { StructuredLog, LogLevel } from '../types';

class SystemLogger {
  private logs: StructuredLog[] = [];
  private listeners: Array<(logs: StructuredLog[]) => void> = [];
  private maxLogs = 200;

  constructor() {
    this.log('INFO', 'system', 'MERY Master Core initialized. Structured telemetry stream active.');
  }

  public log(
    level: LogLevel,
    category: StructuredLog['category'],
    message: string,
    metadata?: Record<string, any>
  ): void {
    // Sanitize metadata to guarantee NO api keys or secrets are logged
    const cleanMeta = metadata ? this.sanitize(metadata) : undefined;

    const entry: StructuredLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      level,
      category,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      metadata: cleanMeta,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console output for dev inspect
    const tag = `[MERY :: ${category.toUpperCase()} :: ${level}]`;
    if (level === 'ERROR' || level === 'CRITICAL') {
      console.error(tag, message, cleanMeta || '');
    } else if (level === 'WARNING') {
      console.warn(tag, message, cleanMeta || '');
    } else {
      console.log(tag, message, cleanMeta || '');
    }

    this.notify();
  }

  public getLogs(): StructuredLog[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
    this.notify();
  }

  public subscribe(fn: (logs: StructuredLog[]) => void): () => void {
    this.listeners.push(fn);
    fn(this.getLogs());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(): void {
    const current = this.getLogs();
    this.listeners.forEach((fn) => fn(current));
  }

  private sanitize(obj: Record<string, any>): Record<string, any> {
    const safe: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('key') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('password')
      ) {
        safe[key] = '[REDACTED_SECRET]';
      } else if (typeof value === 'object' && value !== null) {
        safe[key] = this.sanitize(value);
      } else {
        safe[key] = value;
      }
    }
    return safe;
  }
}

export const logger = new SystemLogger();
