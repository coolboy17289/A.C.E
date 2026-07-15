import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Db } from './db.js';

import { registerUserRoutes } from './routes/users.js';
import { registerTaskRoutes } from './routes/tasks.js';
import { registerCalendarRoutes } from './routes/calendar.js';
import { registerSubjectRoutes } from './routes/subjects.js';
import { registerNoteRoutes } from './routes/notes.js';
import { registerFocusRoutes } from './routes/focus.js';
import { registerAiRoutes } from './routes/ai.js';
import { registerNotificationRoutes } from './routes/notifications.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerHardwareRoutes } from './routes/hardware.js';
import { registerSystemRoutes } from './routes/system.js';

import { attachFailHelper, newRequestId } from './util/envelope.js';
import { toHttpError } from './util/error.js';
import { createRateLimiter } from './util/rateLimit.js';

/**
 * Creates a fresh Express app with every A.C.E route mounted.
 *
 * Middleware ordering is deliberate (top to bottom):
 *   1. Request id (so every log line + error has a correlation token).
 *   2. CORS + JSON body parsing (with a 512kb cap) - globally.
 *   3. Request logger.
 *   4. .fail() helper attachment for handlers.
 *   5. /api/health + every /api/* route registrar.
 *   6. /api/* 404 JSON responder (must run BEFORE the SPA fallback so an
 *      unmatched /api path returns JSON instead of HTML).
 *   7. Static SPA fallback - only mounts when frontend/desktop-shell/dist
 *      exists. The catch-all predicate (path-startsWith-check middle-
 *      ware) skips any /api/* so it's belt-and-braces against handler
 *      reordering.
 *   8. Final error handler. Must be last.
 *
 * The earlier version registered the SPA catch-all ahead of the /api 404,
 * so unknown /api paths were silently shadowed by an HTML index page when
 * the production dist was in place. This ordering fixes that.
 */
export function createApp({ db }: { db: Db }): Application {
  const app = express();

  // Disable the default ETag header on JSON responses. The frontend caches
  // aggressively and a stale 304 on /api/ai/messages was confusing the
  // chat UI. ETag stays on for the SPA static assets.
  app.set('etag', false);
  // Don't advertise Express in the response header. Cosmetic.
  app.disable('x-powered-by');
  // Trust the first proxy hop (covers reverse proxies on the Pi). Only
  // matters for the rate limiter's clientIp() helper.
  app.set('trust proxy', 1);

  // 1. Request id. Must be first so even an early body-parser failure is
  //    correlated.
  app.use((req, res, next) => {
    const id = newRequestId();
    res.locals.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
  });

  // 2. CORS + JSON parsing.
  app.use(cors({ origin: true, credentials: true }));
  // 512kb body cap. The largest legitimate payload is a note body, and
  // anything bigger is almost certainly a misuse we want to fail fast.
  app.use(express.json({ limit: '512kb' }));

  // 3. Lightweight request logger. Avoids a hard dep on morgan/pino and
  //    keeps the install footprint small.
  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      // eslint-disable-next-line no-console
      console.log(
        `[ace-backend] ${res.locals.requestId} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`,
      );
    });
    next();
  });

  // 4. Attach res.fail() so handlers can `throw res.fail(...)` for clean
  //    short-circuiting.
  app.use(attachFailHelper);

  // 5. /api/health - kept in its original shape on purpose. The alternative
  //    frontends (C/GTK, Java/JavaFX) probe this exact field set.
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'ace-backend', ts: new Date().toISOString() });
  });

  registerUserRoutes(app, db);
  registerTaskRoutes(app, db);
  registerCalendarRoutes(app, db);
  registerSubjectRoutes(app, db);
  registerNoteRoutes(app, db);
  registerFocusRoutes(app, db);
  registerNotificationRoutes(app, db);
  registerSettingsRoutes(app, db);
  registerHardwareRoutes(app, db);
  registerSystemRoutes(app, db);
  // /api/ai is expensive (Ollama calls). Apply a per-IP token bucket.
  // capacity=10, refill 2/sec -> 10 burst, ~120 req/min sustained.
  const aiRateLimit = createRateLimiter({ capacity: 10, refillPerSec: 2 });
  registerAiRoutes(app, db, aiRateLimit);

  // 6. 404 for unknown /api routes. Registered BEFORE the SPA catch-all so
  //    an unmatched /api path returns a JSON 404 instead of falling
  //    through to the static handler.
  app.use('/api/*', (_req, res) => {
    res.status(404).json({
      ok: false,
      error: { code: 'not_found', message: 'route not found' },
      requestId: res.locals.requestId,
    });
  });

  // Production-only: backend also serves the React shell. Vite's build
  // output lives under frontend/desktop-shell/dist. Try several candidate
  // paths so the same artifact works whether the backend is launched from
  // its own folder, the project root, or as a packaged binary.
  const candidates = [
    path.resolve(process.cwd(), 'frontend/desktop-shell/dist'),
    path.resolve(process.cwd(), '../frontend/desktop-shell/dist'),
    path.resolve(fileURLToPath(import.meta.url), '../../frontend/desktop-shell/dist'),
  ];

  for (const dir of candidates) {
    if (!fs.existsSync(path.join(dir, 'index.html'))) continue;
    app.use(express.static(dir));

    // SPA route fallback. Implemented as a predicate middleware that
    // returns the React shell's index.html for any non-/api request that
    // didn't match a static asset. We use app.use + a path-not-startswith
    // check rather than a regex literal: avoids the TS regex lexer edge
    // cases and is just as readable.
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(dir, 'index.html'));
    });
    break;
  }

  // 8. Final error handler. Must be last. Always responds with the
  //    envelope so clients have a consistent shape to parse.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const httpErr = toHttpError(err);
    // Log full detail on the server; only expose safe text to the client.
    // eslint-disable-next-line no-console
    console.error(`[ace-backend] ${res.locals.requestId ?? '-'} ${httpErr.code}: ${err.stack ?? err.message ?? err}`);
    res.status(httpErr.status).json({
      ok: false,
      error: {
        code: httpErr.code,
        message: httpErr.message,
        ...(httpErr.details !== undefined ? { details: httpErr.details } : {}),
      },
      requestId: res.locals.requestId,
    });
  });

  return app;
}
