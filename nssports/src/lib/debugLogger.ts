/**
 * Debug Logger for GameList Component
 * Writes debug logs to browser console with special formatting
 * and sends to API endpoint for server-side file logging
 */

export class GameListDebugLogger {
  private static logs: string[] = [];
  private static readonly MAX_BUFFER = 20;

  private static formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    let formatted = `🔍 [GameList Debug] [${timestamp}] [${level}] ${message}`;
    
    if (data !== undefined) {
      formatted += '\n' + JSON.stringify(data, null, 2);
    }
    
    return formatted;
  }

  private static write(message: string): void {
    // Always log to console with special formatting
    console.log(message);
    
    // Buffer logs for API
    this.logs.push(message);
    
    // Send to API when buffer is full
    if (this.logs.length >= this.MAX_BUFFER) {
      this.flush();
    }
  }

  static info(message: string, data?: unknown): void {
    const formatted = this.formatMessage('INFO', message, data);
    this.write(formatted);
  }

  static warn(message: string, data?: unknown): void {
    const formatted = this.formatMessage('WARN', message, data);
    this.write(formatted);
  }

  static error(message: string, data?: unknown): void {
    const formatted = this.formatMessage('ERROR', message, data);
    this.write(formatted);
  }

  static flush(): void {
    if (this.logs.length === 0) return;
    
    // Send accumulated logs to API
    fetch('/api/debug-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: this.logs })
    }).catch(e => console.error('Failed to send debug logs:', e));
    
    this.logs = [];
  }
}

