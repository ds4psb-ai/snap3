import pino from 'pino';

const transport = pino.transport({
  targets: [
    {
      target: process.env.NODE_ENV === 'production' ? 'pino/file' : 'pino-pretty',
      options: process.env.NODE_ENV === 'production'
        ? { destination: './logs/app.log' }
        : { colorize: true, translateTime: true }
    }
  ]
});

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'vdp-pipeline',
    version: '1.0.0'
  }
}, transport);

export default logger;