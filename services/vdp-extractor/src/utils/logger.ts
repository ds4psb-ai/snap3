import winston from 'winston';
import path from 'path';
import fs from 'fs';

export function createLogger(options: {
  level?: string;
  logFile?: string;
  serviceName?: string;
  enableConsole?: boolean;
} = {}): winston.Logger {
  const {
    level = process.env.LOG_LEVEL || 'info',
    logFile = process.env.LOG_FILE,
    serviceName = 'vdp-extractor',
    enableConsole = true,
  } = options;

  const transports: winston.transport[] = [];

  // Console transport
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${service || serviceName}] ${level}: ${message} ${metaStr}`;
          })
        ),
      })
    );
  }

  // File transport
  if (logFile) {
    // Ensure log directory exists
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    transports.push(
      new winston.transports.File({
        filename: logFile,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
      })
    );
  }

  const logger = winston.createLogger({
    level,
    defaultMeta: { service: serviceName },
    transports,
    exitOnError: false,
  });

  // Handle uncaught exceptions and unhandled rejections
  logger.exceptions.handle(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
  });

  return logger;
}

export function createRequestLogger(logger: winston.Logger) {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const { method, url, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      logger.info('HTTP Request', {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        ip,
        userAgent: req.get('User-Agent'),
        contentLength: res.get('Content-Length'),
      });
    });

    next();
  };
}