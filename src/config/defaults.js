import path from 'node:path';
import process from 'node:process';
const defaultDataDirectory =
  process.platform === 'win32'
    ? 'C:\\ProgramData\\Paymore\\KioskLogAgent'
    : path.join(process.cwd(), 'var', 'paymore-kiosk-log-agent');
export const defaultConfig = {
  app: {
    name: 'paymore-kiosk-log-agent',
    version: '1.0.0',
    environment: 'production'
  },
  logging: {
    level: 'info',
    directory: path.join(defaultDataDirectory, 'logs'),
    maxFiles: '30d',
    maxSize: '20m'
  },
  scheduler: {
    dailyRunTime: '02:00',
    uploadRetryIntervalMs: 300_000,
    housekeepingIntervalMs: 3_600_000,
    runScanOnStart: true,
    gracefulShutdownTimeoutMs: 30_000
  },
  upload: {
    authEndpoint: 'http://localhost:8080/v1/kiosk/logs/authorize',
    staticToken: undefined,
    timeoutMs: 30_000,
    retry: {
      maxAttempts: 4,
      baseDelayMs: 1_000,
      maxDelayMs: 30_000,
      backoffMultiplier: 2,
      retryableStatusCodes: [408, 425, 429, 500, 502, 503, 504]
    }
  },
  http: {
    userAgent: 'PaymoreKioskLogAgent/1.0.0',
    safeResponseBodyLogLimit: 512
  },
  queue: {
    directory: path.join(defaultDataDirectory, 'queue')
  },
  logSources: [
    {
      name: 'application',
      enabled: true,
      patterns: ['C:\\Paymore\\Kiosk\\logs\\application*.log'],
      excludePatterns: [],
      encoding: 'utf8',
      readFromBeginning: false
    },
    {
      name: 'system',
      enabled: true,
      patterns: ['C:\\Paymore\\Kiosk\\logs\\system*.log'],
      excludePatterns: [],
      encoding: 'utf8',
      readFromBeginning: false
    },
    {
      name: 'pos',
      enabled: true,
      patterns: ['C:\\Paymore\\Kiosk\\logs\\pos*.log'],
      excludePatterns: [],
      encoding: 'utf8',
      readFromBeginning: false
    },
    {
      name: 'crash',
      enabled: true,
      patterns: ['C:\\Paymore\\Kiosk\\crashes\\*.log'],
      excludePatterns: [],
      encoding: 'utf8',
      readFromBeginning: false
    }
  ],
  telemetry: {
    enabled: false
  }
};
