import { ApplicationError } from './application-error.js';
export class HttpError extends ApplicationError {
  statusCode;
  responseBody;
  constructor(message, statusCode, responseBody) {
    super(
      message,
      'HTTP_ERROR',
      undefined,
      statusCode >= 500 || statusCode === 408 || statusCode === 429
    );
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}
