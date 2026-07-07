import process from 'node:process';
import { setNestedValue } from '../utils/object.js';
const numberValue = (value) => Number.parseInt(value, 10);
const booleanValue = (value) => ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
const stringValue = (value) => value;
const csvNumberList = (value) =>
  value
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item));
const mappings = [
  { name: 'PAYMORE_AGENT_NAME', path: 'app.name', parse: stringValue },
  { name: 'PAYMORE_AGENT_VERSION', path: 'app.version', parse: stringValue },
  { name: 'PAYMORE_AGENT_ENVIRONMENT', path: 'app.environment', parse: stringValue },
  { name: 'PAYMORE_AGENT_LOG_LEVEL', path: 'logging.level', parse: stringValue },
  { name: 'PAYMORE_AGENT_LOG_DIR', path: 'logging.directory', parse: stringValue },
  { name: 'PAYMORE_AGENT_DAILY_RUN_TIME', path: 'scheduler.dailyRunTime', parse: stringValue },
  {
    name: 'PAYMORE_AGENT_UPLOAD_RETRY_INTERVAL_MS',
    path: 'scheduler.uploadRetryIntervalMs',
    parse: numberValue
  },
  {
    name: 'PAYMORE_AGENT_HOUSEKEEPING_INTERVAL_MS',
    path: 'scheduler.housekeepingIntervalMs',
    parse: numberValue
  },

  { name: 'PAYMORE_AGENT_SCAN_ON_START', path: 'scheduler.runScanOnStart', parse: booleanValue },
  { name: 'PAYMORE_AGENT_UPLOAD_AUTH_ENDPOINT', path: 'upload.authEndpoint', parse: stringValue },
  { name: 'PAYMORE_AGENT_UPLOAD_STATIC_TOKEN', path: 'upload.staticToken', parse: stringValue },

  { name: 'PAYMORE_AGENT_UPLOAD_TIMEOUT_MS', path: 'upload.timeoutMs', parse: numberValue },
  {
    name: 'PAYMORE_AGENT_RETRY_MAX_ATTEMPTS',
    path: 'upload.retry.maxAttempts',
    parse: numberValue
  },
  {
    name: 'PAYMORE_AGENT_RETRY_BASE_DELAY_MS',
    path: 'upload.retry.baseDelayMs',
    parse: numberValue
  },
  { name: 'PAYMORE_AGENT_RETRY_MAX_DELAY_MS', path: 'upload.retry.maxDelayMs', parse: numberValue },
  {
    name: 'PAYMORE_AGENT_RETRYABLE_STATUS_CODES',
    path: 'upload.retry.retryableStatusCodes',
    parse: csvNumberList
  },

  { name: 'PAYMORE_AGENT_QUEUE_DIR', path: 'queue.directory', parse: stringValue },
  { name: 'PAYMORE_AGENT_TELEMETRY_ENABLED', path: 'telemetry.enabled', parse: booleanValue }
];
export function readEnvironmentOverrides(env = process.env) {
  const overrides = {};
  for (const mapping of mappings) {
    const rawValue = env[mapping.name];
    if (rawValue === undefined || rawValue === '') {
      continue;
    }
    setNestedValue(overrides, mapping.path, mapping.parse(rawValue));
  }
  return overrides;
}
