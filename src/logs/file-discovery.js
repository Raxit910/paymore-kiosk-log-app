import fg from 'fast-glob';
import { normalizeSafePath } from '../utils/path-security.js';
import { getLogger } from './logger-factory.js';

export async function discoverFiles(source) {
  if (!source.enabled) {
    return [];
  }

  const logger = getLogger();

  try {
    // fast-glob strictly requires forward slashes, even on Windows
    const fgPatterns = source.patterns.map((p) =>
      normalizeSafePath(p).replace(/\\/g, '/')
    );
    const fgIgnores = source.excludePatterns.map((p) =>
      normalizeSafePath(p).replace(/\\/g, '/')
    );

    const entries = await fg(fgPatterns, {
      onlyFiles: true,
      unique: true,
      dot: true,
      absolute: true,
      suppressErrors: true,
      ignore: fgIgnores
    });
    return entries.sort();
  } catch (error) {
    logger.warn('Failed to discover log files for source.', {
      source: source.name,
      error
    });
    return [];
  }
}
