import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { ok } from '../util/envelope.js';
import { newId } from '../util/ids.js';
import { rowToNotification } from '../db.js';
import type { NotificationRecord } from '@ace/shared';
import { str, optStr, bool, record, oneOf } from '../util/validate.js';

const CATEGORIES = ['system', 'task', 'reminder', 'ai'] as const;

export function registerNotificationRoutes(app: Application, db: Db) {
  app.get('/api/notifications', ah((_req, res) => {
    const rows = db.prepare('SELECT * FROM notifications ORDER BY ts DESC LIMIT 100').all();
    ok(res, rows.map(rowToNotification));
  }));

  app.patch('/api/notifications/:id', ah(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== 'string' || id.length === 0) {
      ok(res, null, 400);
      return;
    }
    const patch = record(req.body ?? {}, 'body');
    const read = patch.read === undefined ? true : bool(patch.read, 'read');
    db.prepare('UPDATE notifications SET read = ? WHERE id = ?').run(read ? 1 : 0, id);
    const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    if (!row) { ok(res, null, 404); return; }
    ok(res, rowToNotification(row));
  }));

  // POST is also exposed for the task/focus apps to push new system events.
  app.post('/api/notifications', ah(async (req, res) => {
    const n = record(req.body ?? {}, 'body');
    const title = str(n.title, 'title', { maxLen: 256 });
    const message = str(n.message, 'message', { maxLen: 1024 });
    const category = n.category === undefined
      ? 'system'
      : oneOf(n.category, 'category', CATEGORIES);

    const id = newId('ntf');
    const ts = new Date().toISOString();
    db.prepare(`INSERT INTO notifications (id, title, message, ts, read, category) VALUES (?, ?, ?, ?, 0, ?)`)
      .run(id, title, message, ts, category);
    ok(res, rowToNotification(db.prepare('SELECT * FROM notifications WHERE id = ?').get(id)), 201);
  }));
}
