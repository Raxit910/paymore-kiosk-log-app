export function errorToMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
export function errorToLogObject(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  return { message: String(error) };
}
