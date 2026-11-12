/** Turns every error into the same JSON shape: { error: { code, message, details } }. */
import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/errors';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  const e = err as { type?: string; status?: number; code?: string };
  if (e?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
  }
  if (e?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Malformed JSON body' } });
  }
  // Postgres invalid text representation (e.g. bad uuid)
  if (e?.code === '22P02') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid identifier' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}

/** Wraps async route handlers so rejected promises reach the error handler. */
export const asyncHandler =
  <T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: T, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
