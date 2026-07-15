import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { HttpError } from './envelope.js';
import { ValidationError } from './validate.js';

/** Wraps an async handler so thrown errors reach the Express error middleware. */
export function ah(handler: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

/**
 * Convert any thrown error into a typed HttpError so the central error
 * middleware can render it consistently. We coerce ValidationErrors into
 * a 400 and leave everything else as a 500.
 */
export function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  if (err instanceof ValidationError) {
    return new HttpError(400, 'validation_error', err.message, { field: err.field });
  }
  if (err && typeof err === 'object' && 'type' in err && 'status' in err) {
    // Express body-parser errors have a numeric .status (e.g. 413).
    const e = err as { status?: number; type?: string; message?: string };
    if (typeof e.status === 'number' && e.status >= 400 && e.status < 500) {
      const code = e.status === 413 ? 'payload_too_large' : 'bad_request';
      return new HttpError(e.status, code, e.message ?? 'bad request');
    }
  }
  return new HttpError(500, 'internal_error', (err as Error)?.message ?? 'internal error');
}
