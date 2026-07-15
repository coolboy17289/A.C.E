import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { ok } from '../util/envelope.js';
import { rowToUser } from '../db.js';
import type { UserProfile } from '@ace/shared';
import { str, optStr, record } from '../util/validate.js';

/**
 * The student profile is a singleton. Both GET and PATCH auto-create the
 * default user if the table is empty so that:
 *   - the kiosk boots straight into a working profile (matches the
 *     defensive behaviour in seed.ts);
 *   - test fixtures that wipe the table mid-run still PATCH successfully
 *     instead of silently updating a non-existent row.
 */
export function registerUserRoutes(app: Application, db: Db) {
  app.get('/api/users/me', ah((_req, res) => {
    ok(res, rowToUser(getOrCreateUser(db)));
  }));

  app.patch('/api/users/me', ah(async (req, res) => {
    const patch = record(req.body ?? {}, 'body');
    const existing = rowToUser(getOrCreateUser(db));
    const name = patch.name !== undefined ? str(patch.name, 'name', { maxLen: 64 }) : existing.name;
    const avatar = patch.avatar !== undefined ? optStr(patch.avatar, 'avatar', { maxLen: 32 }) ?? existing.avatar : existing.avatar;
    let preferences = existing.preferences;
    if (patch.preferences !== undefined) {
      const prefs = record(patch.preferences, 'preferences');
      preferences = { ...existing.preferences, ...prefs } as UserProfile['preferences'];
    }
    db.prepare('UPDATE users SET name = ?, avatar = ?, preferences = ? WHERE id = ?')
      .run(name, avatar, JSON.stringify(preferences), existing.id);
    ok(res, rowToUser(db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id)));
  }));
}

/**
 * Returns the singleton user row, inserting the default profile on the
 * first call after a wipe. Both GET and PATCH route through here so the
 * "auto-create on first access" semantics are guaranteed regardless of
 * which endpoint the client hits first.
 */
function getOrCreateUser(db: Db): unknown {
  const row = db.prepare('SELECT * FROM users LIMIT 1').get();
  if (row) return row;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, name, avatar, created_at, preferences)
     VALUES ('user_default', 'Student', ?, ?, ?)`,
  ).run('\u{1F98A}', now, JSON.stringify(defaultPrefs()));
  return db.prepare('SELECT * FROM users WHERE id = ?').get('user_default');
}

function defaultPrefs(): UserProfile['preferences'] {
  return {
    theme: 'dark',
    accentColor: '#60a5fa',
    fontScale: 1,
    notificationsEnabled: true,
    reduceMotion: false,
    username: 'Student',
  };
}
