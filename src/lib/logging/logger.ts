/**
 * Structured logging with trace context support
 * Maintains per-job tracing IDs without PII
 */

export interface LogContext {
  traceId?: string;
  jobId?: string;
  queueName?: string;
  workerId?: string;
  attempt?: number;
  maxAttempts?: number;
  [key: string]: any;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

class Logger {
  private context: LogContext = {};

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Set context for this logger instance
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear specific context keys
   */
  clearContext(keys: string[]): void {
    keys.forEach(key => delete this.context[key]);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...this.context,
      ...meta
    };

    // In production, this would go to a structured logging service
    // For now, we use console with proper formatting
    const logMethod = level === LogLevel.ERROR ? console.error :
                     level === LogLevel.WARN ? console.warn :
                     console.log;

    if (process.env.NODE_ENV === 'production') {
      // Production: JSON format for log aggregation
      logMethod(JSON.stringify(logEntry));
    } else {
      // Development: Human-readable format
      const contextStr = Object.keys({ ...this.context, ...meta })
        .filter(k => k !== 'message')
        .map(k => `${k}=${JSON.stringify({ ...this.context, ...meta }[k])}`)
        .join(' ');
      logMethod(`[${timestamp}] ${level.toUpperCase()}: ${message} ${contextStr}`);
    }
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
    const errorMeta = error instanceof Error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : error ? { error } : {};

    this.log(LogLevel.ERROR, message, { ...errorMeta, ...meta });
  }
}

// Global logger instance
export const logger = new Logger();

/**
 * Create a logger with job-specific context
 */
export function createJobLogger(jobId: string, traceId: string, queueName?: string): Logger {
  return logger.child({
    jobId,
    traceId,
    queueName
  });
}

/**
 * Generate a trace ID for correlation
 * Format: timestamp-random for sortability and uniqueness
 */
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}