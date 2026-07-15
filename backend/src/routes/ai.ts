import type { Application, RequestHandler } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { ok } from '../util/envelope.js';
import { newId } from '../util/ids.js';
import { rowToMessage } from '../db.js';
import { ask, describeImageWithFallback, status as aiStatus, runInstall } from '../services/ai.js';
import type { ChatMessage } from '@ace/shared';
import { str, optStr, record } from '../util/validate.js';

const HISTORY_LIMIT = 200;
const MAX_PROMPT_LEN = 8 * 1024;

/**
 * The rate limiter is wired externally (see server.ts) so we can tune
 * capacity/refill from one place. This module just consumes it.
 */
export function registerAiRoutes(app: Application, _db: Db, rateLimit: RequestHandler) {
  // Note: _db is reserved for future conversation index tables.

  app.get('/api/ai/messages', rateLimit, ah((_req, res) => {
    // In-process k/v would be the long-term store for chat history but
    // we deliberately persist only on /messages POST so the table mirrors
    // the conversation accurately.
    const rows = _db
      .prepare('SELECT * FROM messages ORDER BY ts ASC LIMIT ?')
      .all(HISTORY_LIMIT);
    ok(res, rows.map(rowToMessage));
  }));

  app.post('/api/ai/messages', rateLimit, ah(async (req, res) => {
    const body = record(req.body ?? {}, 'body');
    const content = str(body.content, 'content', { minLen: 1, maxLen: MAX_PROMPT_LEN });

    const userMsg: ChatMessage = {
      id: newId('msg'),
      role: 'user',
      content,
      ts: new Date().toISOString(),
    };
    _db.prepare(`INSERT INTO messages (id, role, content, ts, model) VALUES (?, ?, ?, ?, ?)`)
      .run(userMsg.id, 'user', content, userMsg.ts, null);

    const sentences = _db
      .prepare('SELECT * FROM messages ORDER BY ts ASC LIMIT ?')
      .all(HISTORY_LIMIT) as ReturnType<typeof rowToMessage>[];
    const result = await ask({ prompt: content, history: sentences });
    _db.prepare(`INSERT INTO messages (id, role, content, ts, model) VALUES (?, ?, ?, ?, ?)`)
      .run(result.message.id, 'assistant', result.message.content, result.message.ts, result.message.model ?? null);

    ok(res, { ...result.message, remote: result.remote, error: result.error });
  }));

  app.post('/api/ai/vision', rateLimit, ah(async (req, res) => {
    const body = record(req.body ?? {}, 'body');
    const prompt = optStr(body.prompt, 'prompt', { maxLen: 1024 }) ?? 'Describe what you see.';
    const result = await describeImageWithFallback(prompt);
    _db.prepare(`INSERT INTO messages (id, role, content, ts, model) VALUES (?, ?, ?, ?, ?)`)
      .run(result.message.id, 'assistant', result.message.content, result.message.ts, result.message.model ?? null);
    ok(res, result.message);
  }));

  app.post('/api/ai/reset', rateLimit, ah((_req, res) => {
    _db.prepare('DELETE FROM messages').run();
    ok(res, { ok: true });
  }));

  // Lightweight status endpoint. The frontend polls this every few
  // seconds while waiting for Ollama to come up.
  app.get('/api/ai/status', rateLimit, ah(async (_req, res) => {
    ok(res, await aiStatus());
  }));

  // Manual "Set up Ollama" trigger. The route always returns immediately
  // with `{ started: true }` so the UI doesn't hang; the actual install
  // runs in the background via `runInstall` and the next /status poll
  // reflects progress.
  app.post('/api/ai/install', rateLimit, ah(async (_req, res) => {
    void runInstall().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[ace-ai] background install crashed', err);
    });
    ok(res, { started: true });
  }));
}
