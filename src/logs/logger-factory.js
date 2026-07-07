import fs from 'node:fs/promises';
import path from 'node:path';
import DailyRotateFile from 'winston-daily-rotate-file';
import winston from 'winston';
let currentLogger = null;

export async function initLogger(config) {
  await fs.mkdir(config.logging.directory, { recursive: true }).catch(() => {});
  const formats = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );
  const logger = winston.createLogger({
    level: config.logging.level,
    defaultMeta: {
      service: config.app.name,
      version: config.app.version,
      environment: config.app.environment
    },
    format: formats,
    transports: [
      new DailyRotateFile({
        dirname: config.logging.directory,
        filename: `${config.app.name}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: config.logging.maxFiles,
        maxSize: config.logging.maxSize,
        zippedArchive: true
      }),
      new DailyRotateFile({
        dirname: path.join(config.logging.directory, 'errors'),
        filename: `${config.app.name}-error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: config.logging.maxFiles,
        maxSize: config.logging.maxSize,
        zippedArchive: true
      })
    ],
    exitOnError: false
  });
  if (config.app.environment !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple())
      })
    );
  }

  currentLogger = logger;
  return currentLogger;
}

export function getLogger() {
  if (!currentLogger) {
    throw new Error('Logger has not been initialized. Call initLogger() first.');
  }
  return currentLogger;
}
