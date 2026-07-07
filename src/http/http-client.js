import { HttpError } from '../core/errors/http-error.js';
import { retry } from '../utils/retry.js';
import { getConfig } from '../config/index.js';
import { getLogger } from '../logs/logger-factory.js';

export async function requestJson(options) {
  const config = getConfig();
  const logger = getLogger();
  return retry((attempt) => executeJsonRequest(options, attempt, config, logger), {
    config: config.upload.retry,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    shouldRetry: (error) => isRetryable(error, config),
    onRetry: (error, attempt, delayMs) => {
      logger.warn('HTTP request failed; retrying.', {
        method: options.method,
        url: options.url,
        attempt,
        delayMs,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

export async function requestPutFile(options) {
  const config = getConfig();
  const logger = getLogger();
  return retry((attempt) => executePutFileRequest(options, attempt, config, logger), {
    config: config.upload.retry,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    shouldRetry: (error) => isRetryable(error, config),
    onRetry: (error, attempt, delayMs) => {
      logger.warn('HTTP PUT file request failed; retrying.', {
        url: options.url,
        attempt,
        delayMs,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

async function executeJsonRequest(options, attempt, config, logger) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('HTTP request timed out.')),
    config.upload.timeoutMs
  );
  const signal = combineSignals(controller.signal, options.signal);
  const startedAt = Date.now();
  try {
    logger.debug('Sending HTTP request.', {
      method: options.method,
      url: options.url,
      attempt
    });
    const requestInit = {
      method: options.method,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'user-agent': config.http.userAgent,
        ...options.headers
      },
      signal
    };
    if (options.body !== undefined) {
      requestInit.body = JSON.stringify(options.body);
    }
    const response = await fetch(options.url, requestInit);
    const text = await response.text();
    logger.debug('Received HTTP response.', {
      method: options.method,
      url: options.url,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      responsePreview: safePreview(text, config.http.safeResponseBodyLogLimit)
    });
    if (!response.ok) {
      throw new HttpError(
        `HTTP request failed with status ${response.status}.`,
        response.status,
        safePreview(text, 512)
      );
    }
    if (text.length === 0) {
      return undefined;
    }
    return JSON.parse(text);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('HTTP request was aborted or timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function executePutFileRequest(options, attempt, config, logger) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('HTTP request timed out.')),
    config.upload.timeoutMs
  );
  const signal = combineSignals(controller.signal, options.signal);
  const startedAt = Date.now();

  try {
    logger.debug('Sending HTTP PUT file request directly to S3.', {
      url: options.url,
      attempt,
      size: options.buffer.length
    });

    // AWS S3 presigned URLs require a PUT method and correct raw binary body
    const requestInit = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/zip',
        ...options.headers
      },
      signal,
      body: options.buffer
    };

    const response = await fetch(options.url, requestInit);
    const text = await response.text();

    logger.debug('Received HTTP response from S3.', {
      statusCode: response.status,
      durationMs: Date.now() - startedAt
    });

    if (!response.ok) {
      throw new HttpError(
        `HTTP request failed with status ${response.status}.`,
        response.status,
        safePreview(text, 512)
      );
    }
    return text;
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('HTTP request was aborted or timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryable(error, config) {
  if (error instanceof HttpError) {
    return config.upload.retry.retryableStatusCodes.includes(error.statusCode);
  }
  return (
    error instanceof TypeError ||
    (error instanceof Error && /aborted|timed out|network/i.test(error.message))
  );
}

function safePreview(value, limit) {
  const sanitized = value.replace(
    /("?(?:api[_-]?key|token|secret|password)"?\s*:\s*")([^"]+)(")/gi,
    '$1[redacted]$3'
  );
  return sanitized.slice(0, limit);
}

function combineSignals(primary, secondary) {
  if (secondary === undefined) {
    return primary;
  }
  if (primary.aborted) {
    return primary;
  }
  if (secondary.aborted) {
    return secondary;
  }
  const controller = new AbortController();
  const abort = (event) => {
    const source = event.target;
    controller.abort(source.reason);
  };
  primary.addEventListener('abort', abort, { once: true });
  secondary.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

function isAbortError(error) {
  return error instanceof DOMException && error.name === 'AbortError';
}
