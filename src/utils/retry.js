import { sleep } from './sleep.js';
export async function retry(operation, options) {
  let attempt = 1;
  let lastError;
  while (attempt <= options.config.maxAttempts) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= options.config.maxAttempts || !options.shouldRetry(error)) {
        throw error;
      }
      const delayMs = calculateBackoffDelay(options.config, attempt);
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs, options.signal);
      attempt += 1;
    }
  }
  throw lastError;
}
export function calculateBackoffDelay(config, attempt) {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const jitter = Math.floor(Math.random() * Math.min(250, Math.max(1, config.baseDelayMs)));
  return Math.min(config.maxDelayMs, exponentialDelay + jitter);
}
