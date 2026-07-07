export class ApplicationError extends Error {
  code;
  cause;
  retryable;
  constructor(message, code, cause = undefined, retryable = false) {
    super(message, { cause });
    this.code = code;
    this.cause = cause;
    this.retryable = retryable;
    this.name = new.target.name;
  }
}
