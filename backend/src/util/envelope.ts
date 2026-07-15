import type { Request, Response } from 'express';

/**
 * Successful response envelope. The React shell and any alternate shell
 * (JavaFX, GTK, etc.) read `data` rather than the bare object, which
 * means we can extend the envelope (e.g. add `meta`) without breaking
 * callers.
 */
export function ok<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ ok: true, data, requestId: res.locals.requestId });
}

/** Failure envelope. Status defaults to 400 for client errors. */
export function fail(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  const body: Record<string, unknown> = {
    ok: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
    requestId: res.locals.requestId,
  };
  res.status(status).json(body);
}

/** Typed rejection thrown inside handlers; ah() unwraps to the error mw. */
export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

declare module 'express-serve-static-core' {
  interface Response {
    /** Convenience: throw an HttpError to bail out of a handler. */
    fail: (code: string, message: string, status?: number, details?: unknown) => never;
  }
}

/** Decorate res with a `.fail()` helper. Mounted once in createApp. */
export function attachFailHelper(_req: Request, res: Response, next: () => void) {
  res.fail = (code: string, message: string, status = 400, details?: unknown) => {
    fail(res, code, message, status, details);
    // Express handlers expect a return value when using the fail() pattern;
    // we throw so async handlers can simply `throw res.fail(...)`.
    throw new HttpError(status, code, message, details);
  };
  next();
}

/**
 * Generate a short request id. We don't pull in `uuid` - 12 chars of
 * base36 random is more than enough to correlate a log line with a
 * client-side error report.
 */
export function newRequestId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
