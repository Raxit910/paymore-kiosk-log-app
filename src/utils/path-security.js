import path from 'node:path';
export function normalizeSafePath(inputPath) {
  if (inputPath.includes('\0')) {
    throw new Error('Path contains a null byte.');
  }
  return path.normalize(inputPath);
}
export function checkpointKey(source, filePath) {
  return `${source}:${normalizeSafePath(filePath).toLowerCase()}`;
}
