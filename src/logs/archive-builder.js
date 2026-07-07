import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { ZipArchive } from 'archiver';
import { ensureDirectory } from '../utils/files.js';
import { getConfig } from '../config/index.js';
import { getLogger } from './logger-factory.js';
import { discoverFiles } from './file-discovery.js';

export async function buildArchive(signal) {
  const config = getConfig();
  const logger = getLogger();

  const startedAt = Date.now();
  logger.info('Starting daily log archival process.');

  const filesToArchive = await gatherPastFiles(config);
  if (filesToArchive.length === 0) {
    logger.info('No past log files found to archive.');
    return;
  }

  const archiveName = `kiosk-logs-${Date.now()}.zip`;
  const pendingDir = config.queue.directory;
  await ensureDirectory(pendingDir);

  const targetPath = path.join(pendingDir, archiveName);

  try {
    await createZipArchive(targetPath, filesToArchive, signal, logger);
    logger.info('Successfully created log archive.', {
      archiveName,
      fileCount: filesToArchive.length,
      durationMs: Date.now() - startedAt
    });
  } catch (error) {
    logger.error('Failed to create log archive.', {
      archiveName,
      error: error instanceof Error ? error.message : String(error)
    });
    // Clean up partial zip if possible
    await fsp.rm(targetPath, { force: true }).catch(() => {});
  }
}

async function gatherPastFiles(config) {
  const pastFiles = [];

  // Start of "today" in local time
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Start of "yesterday" in local time
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  for (const source of config.logSources) {
    const files = await discoverFiles(source);
    for (const filePath of files) {
      try {
        const stats = await fsp.stat(filePath);

        // Only include files modified strictly yesterday
        if (stats.mtime >= startOfYesterday && stats.mtime < startOfToday) {
          pastFiles.push(filePath);
        }
      } catch {
        // Ignore files we can't stat (e.g., deleted during scan)
      }
    }
  }

  return pastFiles;
}

function createZipArchive(targetPath, filesToArchive, signal, logger) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(targetPath);
    const archive = new ZipArchive({
      zlib: { level: 6 }
    });

    output.on('close', () => {
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        logger.warn('A log file was missing during zipping.', { error: err.message });
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          archive.abort();
          reject(new Error('Archival aborted via signal.'));
        },
        { once: true }
      );
    }

    archive.pipe(output);

    for (const file of filesToArchive) {
      archive.file(file, { name: path.basename(file) });
    }

    archive.finalize();
  });
}
