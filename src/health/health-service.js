import process from 'node:process';
import { getConfig } from '../config/index.js';

let status = 'starting';
let startedAt = new Date();
let lastScanAt;
let lastUploadAt;
let lastUploadSucceeded;
let pendingUploads = 0;

export function markRunning() {
  status = 'running';
}

export function markStopping() {
  status = 'stopping';
}

export function markStopped() {
  status = 'stopped';
}

export function recordScan(date = new Date()) {
  lastScanAt = date.toISOString();
}

export function recordUpload(succeeded, date = new Date()) {
  lastUploadAt = date.toISOString();
  lastUploadSucceeded = succeeded;
}

export function setPendingUploads(count) {
  pendingUploads = count;
}

export function getHealthSnapshot() {
  const config = getConfig();
  const snapshot = {
    status,
    appName: config.app.name,
    version: config.app.version,
    environment: config.app.environment,
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: startedAt.toISOString(),
    pendingUploads
  };

  if (lastScanAt !== undefined) {
    return {
      ...snapshot,
      lastScanAt,
      ...(lastUploadAt === undefined ? {} : { lastUploadAt }),
      ...(lastUploadSucceeded === undefined ? {} : { lastUploadSucceeded })
    };
  }

  return {
    ...snapshot,
    ...(lastUploadAt === undefined ? {} : { lastUploadAt }),
    ...(lastUploadSucceeded === undefined ? {} : { lastUploadSucceeded })
  };
}
