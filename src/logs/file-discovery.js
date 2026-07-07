import fg from 'fast-glob';
import { normalizeSafePath } from '../utils/path-security.js';
import { getLogger } from './logger-factory.js';

export async function discoverFiles(source) {
  if (!source.enabled) {
    return [];
  }

  const logger = getLogger();

  try {
    const entries = await fg(source.patterns.map(normalizeSafePath), {
      onlyFiles: true,
      unique: true,
      dot: true,
      absolute: true,
      suppressErrors: true,
      ignore: source.excludePatterns.map(normalizeSafePath)
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
