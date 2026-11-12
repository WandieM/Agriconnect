/** Small helpers to throw an error with the right HTTP status (400, 401, 403, 404, 409). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new ApiError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Authentication required') => new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have permission to do this') => new ApiError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Not found') => new ApiError(404, 'NOT_FOUND', message);
export const conflict = (message: string) => new ApiError(409, 'CONFLICT', message);
