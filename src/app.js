import { errorToLogObject } from './utils/errors.js';
import { sleep } from './utils/sleep.js';
import fsp from 'node:fs/promises';
import { getConfig } from './config/index.js';
import { getLogger } from './logs/logger-factory.js';
import { startScheduler, stopScheduler } from './scheduler/scheduler.js';
import { buildArchive } from './logs/archive-builder.js';
import { processPendingUploads } from './upload/zip-upload-worker.js';
import * as health from './health/health-service.js';
import * as telemetry from './telemetry/noop-telemetry-client.js';

let abortController = new AbortController();
let started = false;
let stoppingPromise;

export async function startApp() {
  if (started) {
    return;
  }

  const config = getConfig();
  const logger = getLogger();

  // Ensure queue directory exists on startup
  await fsp.mkdir(config.queue.directory, { recursive: true }).catch(() => {});

  health.markRunning();

  startScheduler(
    [
      {
        name: 'daily-archive-logs',
        dailyRunTime: config.scheduler.dailyRunTime,
        maxJitterMs: config.scheduler.maxJitterMs,
        runOnStart: config.scheduler.runScanOnStart,
        handler: (signal) => buildArchive(signal)
      },
      {
        name: 'upload-logs-retry',
        intervalMs: config.scheduler.uploadRetryIntervalMs,
        runOnStart: true,
        handler: (signal) => processPendingUploads(signal)
      }
    ],
    abortController.signal
  );

  started = true;
  logger.info('Paymore kiosk daily zip log agent started.', {
    health: health.getHealthSnapshot()
  });
}

export async function stopApp(reason = 'shutdown') {
  if (stoppingPromise !== undefined) {
    return stoppingPromise;
  }
  stoppingPromise = stopInternal(reason);
  return stoppingPromise;
}

async function stopInternal(reason) {
  const config = getConfig();
  const logger = getLogger();

  health.markStopping();
  logger.info('Paymore kiosk log agent stopping.', { reason });
  abortController.abort(new Error(reason));

  const shutdown = async () => {
    await stopScheduler();
    await processPendingUploads();
    await telemetry.flush();
  };

  try {
    await withTimeout(shutdown(), config.scheduler.gracefulShutdownTimeoutMs);
  } catch (error) {
    logger.error('Graceful shutdown did not complete cleanly.', {
      error: errorToLogObject(error)
    });
  } finally {
    health.markStopped();
    logger.info('Paymore kiosk log agent stopped.', {
      health: health.getHealthSnapshot()
    });
  }
}

async function withTimeout(promise, timeoutMs) {
  const controller = new AbortController();
  const timeout = sleep(timeoutMs, controller.signal).then(() => {
    throw new Error(`Operation timed out after ${timeoutMs}ms.`);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    controller.abort(new Error('Timeout no longer needed.'));
  }
}
