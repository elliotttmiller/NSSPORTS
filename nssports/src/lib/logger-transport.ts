/**
 * Transport Abstraction Layer
 * Supports multiple log destinations with pluggable transports
 */

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  service: string;
  version: string;
  environment: string;
  context: Record<string, unknown>;
}

export interface Transport {
  name: string;
  log(entry: LogEntry): void | Promise<void>;
  supportsLevel(level: string): boolean;
  shutdown?(): Promise<void>;
  // Optional hook to update redaction function at runtime
  updateRedaction?(fn: (data: unknown) => unknown): void;
}

// Safe JSON stringify with proper error handling
const safeStringify = (obj: unknown): string => {
  try {
    return JSON.stringify(obj);
  } catch {
    try {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      });
    } catch (innerError) {
      return `{"error": "Failed to serialize log entry: ${String(innerError)}"}`;
    }
  }
};

// Default redaction function
const defaultRedaction = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'apiKey', 'auth', 'cookie'];
  const redacted = { ...(obj as Record<string, unknown>) };
  
  for (const key of Object.keys(redacted)) {
    const val = redacted[key];
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      (redacted as Record<string, unknown>)[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      (redacted as Record<string, unknown>)[key] = defaultRedaction(val as unknown);
    }
  }
  
  return redacted;
};

// ========== BUILT-IN TRANSPORTS ==========

export class ConsoleTransport implements Transport {
  name = 'console';
  private prettyPrint: boolean;
  private redaction: (data: unknown) => unknown;

  constructor(prettyPrint: boolean = false, redaction?: (data: unknown) => unknown) {
    this.prettyPrint = prettyPrint;
    this.redaction = redaction || defaultRedaction;
  }

  supportsLevel(_level: string): boolean {
    return true;
  }

  log(entry: LogEntry): void {
    const consoleMethods = {
      debug: console.debug || console.log,
      info: console.info || console.log,
      warn: console.warn || console.log,
      error: console.error || console.log
    } as Record<string, (...args: unknown[]) => void>;

    const method = consoleMethods[entry.level] || console.log;

    if (this.prettyPrint) {
      this.prettyPrintEntry(entry, method);
    } else {
      method(safeStringify(entry));
    }
  }

  private prettyPrintEntry(entry: LogEntry, method: (...args: unknown[]) => void): void {
    const colors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
      reset: '\x1b[0m'
    } as Record<string, string>;

    const color = colors[entry.level] || colors.info;
    
    // Apply redaction to context
    const safeContext = this.redaction(entry.context) as Record<string, unknown>;
    const contextStr = Object.keys(safeContext).length > 0 
      ? `\n${JSON.stringify(safeContext, null, 2)}`
      : '';

    method(
      `${color}[${entry.timestamp}] [${entry.level.toUpperCase()}]${colors.reset} ${entry.message}${contextStr}`
    );
  }

  updateRedaction(fn: (data: unknown) => unknown): void {
    this.redaction = fn;
  }
}

// ========== HTTP TRANSPORT WITHOUT NODE-FETCH FALLBACK ==========

export class HttpTransport implements Transport {
  name = 'http';
  private endpoint: string;
  private batch: LogEntry[] = [];
  private batchSize: number = 10;
  private flushInterval: number = 5000;
  private intervalId?: ReturnType<typeof setInterval>;
  private fetchImpl?: typeof fetch;
  private redaction?: (data: unknown) => unknown;

  constructor(endpoint: string, batchSize: number = 10, flushInterval: number = 5000, fetchImpl?: typeof fetch) {
    this.endpoint = endpoint;
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    
    // Prefer an injected fetch implementation, otherwise use global fetch if available.
    // We intentionally DO NOT auto-require node-fetch; callers should inject a fetch polyfill
    // when running on Node.js < 18.
    this.fetchImpl = fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
    if (!this.fetchImpl) {
      console.warn('HttpTransport: no global fetch available. HTTP log delivery disabled; logs will fall back to console. To enable HTTP transport provide a fetch implementation when constructing HttpTransport or run on Node >=18.');
    }
    
    this.startBatching();
  }

  supportsLevel(level: string): boolean {
    return ['info', 'warn', 'error'].includes(level);
  }

  async log(entry: LogEntry): Promise<void> {
    this.batch.push(entry);
    if (this.batch.length >= this.batchSize) {
      await this.flushBatch().catch(() => { /* Silent fail */ });
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batch.length === 0) return;

    const batchToSend = [...this.batch];
    this.batch = [];

    // If no fetch implementation is available, fallback to console output
    if (!this.fetchImpl) {
      console.warn('HttpTransport: fetch not available; writing logs to console instead of sending to endpoint.');
      batchToSend.forEach(entry => console.log(safeStringify(entry)));
      return;
    }

    try {
      await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({ logs: batchToSend })
      } as unknown as RequestInit);
    } catch (error) {
      // Fallback to console if HTTP transport fails
      console.error('HTTP Transport failed:', error);
      batchToSend.forEach(entry => console.log(safeStringify(entry)));
    }
  }

  private startBatching(): void {
    this.intervalId = setInterval(() => {
      this.flushBatch().catch(() => { /* Silent fail */ });
    }, this.flushInterval);
  }

  async shutdown(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    await this.flushBatch();
  }

  updateRedaction(fn: (data: unknown) => unknown): void {
    this.redaction = fn;
  }
}

// ========== TRANSPORT MANAGER ==========

export class TransportManager {
  private transports: Transport[] = [];

  addTransport(transport: Transport): void {
    this.transports.push(transport);
  }

  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name);
  }

  async log(entry: LogEntry): Promise<void> {
    const promises: Promise<void>[] = [];
    
    this.transports.forEach(transport => {
      if (transport.supportsLevel(entry.level)) {
        try {
          const result = transport.log(entry);
          if (result instanceof Promise) {
            // Collect async transport promises
            promises.push(result.catch(error => {
              console.error(`Transport ${transport.name} failed:`, error);
            }));
          }
        } catch (error) {
          console.error(`Transport ${transport.name} failed:`, error);
        }
      }
    });

    // AWAIT all async transports for guaranteed delivery
    if (promises.length > 0) {
      await Promise.all(promises).catch(() => { /* Errors already handled individually */ });
    }
  }

  async shutdown(): Promise<void> {
    // Only call shutdown on transports that have the method
    const shutdownPromises = this.transports
      .map(t => t.shutdown?.())
      .filter((p): p is Promise<void> => p !== undefined);
    
    await Promise.all(shutdownPromises).catch(() => { /* Silent */ });
  }

  getTransportNames(): string[] {
    return this.transports.map(t => t.name);
  }

  // Expose transports for runtime operations (e.g., redaction updates)
  getTransports(): Transport[] {
    return this.transports.slice();
  }
}
