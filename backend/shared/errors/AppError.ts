export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toErrorResponse(error: unknown): { code: string; error: string } {
  if (error instanceof AppError) {
    return { code: error.code, error: error.message };
  }
  if (error instanceof Error) {
    return { code: "INTERNAL_ERROR", error: error.message };
  }
  return { code: "INTERNAL_ERROR", error: "An unexpected error occurred" };
}
