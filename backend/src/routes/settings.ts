import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { ok } from '../util/envelope.js';
import { record } from '../util/validate.js';

/**
 * Settings storage.
 *
 * Persisted as a key/value table so callers can save arbitrary slices
 * (theme, accent, wallpaper, network config) without schema churn.
 */
const LEGACY_APP_KEY = 'app';
const MAX_KEYS = 64;
const MAX_KEY_LEN = 64;
const MAX_VALUE_LEN = 16 * 1024; // 16kb per setting row

export function registerSettingsRoutes(app: Application, db: Db) {
  app.get('/api/settings', ah((_req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings_kv').all() as Array<{ key: string; value: string }>;
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
    }
    ok(res, out);
  }));

  app.put('/api/settings', ah(async (req, res) => {
    const payload = record(req.body ?? {}, 'body');
    const entries = Object.entries(payload);
    if (entries.length === 0) { ok(res, { ok: true }); return; }
    if (entries.length > MAX_KEYS) {
      ok(res, null, 400);
      return;
    }

    const stmt = db.prepare(
      `INSERT INTO settings_kv (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    );
    const txn = db.transaction((entries: [string, unknown][]) => {
      for (const [k, v] of entries) {
        if (typeof k !== 'string' || k.length === 0 || k.length > MAX_KEY_LEN) {
          throw new Error(`invalid settings key length`);
        }
        // Reject functions / undefined to keep storage shape stable.
        if (v === undefined) continue;
        const serialised = JSON.stringify(v);
        if (serialised.length > MAX_VALUE_LEN) {
          throw new Error(`settings value for "${k}" exceeds ${MAX_VALUE_LEN} bytes`);
        }
        stmt.run(k, serialised);
      }
    });
    txn(entries);
    // Intentionally NOT writing to LEGACY_APP_KEY anymore. The GET path
    // still understands it for backward-compatible reads.
    void LEGACY_APP_KEY;
    ok(res, { ok: true });
  }));
}
