import fsp from 'node:fs/promises';
import path from 'node:path';
import { errorToLogObject } from '../utils/errors.js';
import { getConfig } from '../config/index.js';
import { getLogger } from '../logs/logger-factory.js';
import { uploadZip } from './upload-api-client.js';

export async function processPendingUploads(signal) {
  const config = getConfig();
  const logger = getLogger();

  const startedAt = Date.now();
  const pendingDir = config.queue.directory;

  let files;
  try {
    files = await fsp.readdir(pendingDir);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return; // Directory doesn't exist yet
    }
    logger.error('Failed to read pending upload directory.', { error });
    return;
  }

  const zipFiles = files.filter((f) => f.endsWith('.zip')).sort();

  if (zipFiles.length === 0) {
    return;
  }

  let uploadedCount = 0;
  let failedCount = 0;

  for (const file of zipFiles) {
    if (signal?.aborted) {
      break;
    }

    const filePath = path.join(pendingDir, file);

    try {
      await uploadZip(filePath, signal);

      // Delete zip on success
      await fsp.rm(filePath, { force: true });

      uploadedCount++;
      logger.info('Successfully uploaded zip archive.', { file });
    } catch (error) {
      failedCount++;
      logger.warn('Failed to upload zip archive. Will retry later.', {
        file,
        error: errorToLogObject(error)
      });
      // We do NOT delete on failure; it stays in the queue dir and we try again in 5 minutes
    }
  }

  if (uploadedCount > 0 || failedCount > 0) {
    logger.info('Zip upload processing complete.', {
      uploadedCount,
      failedCount,
      durationMs: Date.now() - startedAt
    });
  }
}
