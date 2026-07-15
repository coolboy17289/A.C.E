import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { ok } from '../util/envelope.js';
import { newId } from '../util/ids.js';
import { rowToEvent } from '../db.js';
import { str, optStr, record, oneOf, isoTs } from '../util/validate.js';

const TYPES = ['assignment', 'exam', 'class', 'session', 'event'] as const;

export function registerCalendarRoutes(app: Application, db: Db) {
  app.get('/api/calendar', ah((_req, res) => {
    const rows = db.prepare('SELECT * FROM events ORDER BY start ASC').all();
    ok(res, rows.map(rowToEvent));
  }));

  app.post('/api/calendar', ah(async (req, res) => {
    const e = record(req.body ?? {}, 'body');
    const title = str(e.title, 'title', { maxLen: 256 });
    const type = oneOf(e.type, 'type', TYPES);
    const start = isoTs(e.start, 'start');
    const end = isoTs(e.end, 'end');
    if (Date.parse(end) < Date.parse(start)) {
      ok(res, null, 400);
      return;
    }
    const subjectId = optStr(e.subjectId, 'subjectId', { maxLen: 64 });
    const notes = optStr(e.notes, 'notes', { maxLen: 4096 });
    const location = optStr(e.location, 'location', { maxLen: 256 });

    const id = newId('evt');
    db.prepare(
      `INSERT INTO events (id, title, type, start, "end", subject_id, notes, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, title, type, start, end, subjectId, notes, location);
    ok(res, rowToEvent(db.prepare('SELECT * FROM events WHERE id = ?').get(id)), 201);
  }));

  app.patch('/api/calendar/:id', ah(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== 'string' || id.length === 0) {
      ok(res, null, 400);
      return;
    }
    const patch = record(req.body ?? {}, 'body');
    // Pull raw row, then map through rowToEvent() so the merged object
    // has camelCase keys (subjectId/notes/location) that line up with
    // CalendarEvent.
    const rawExisting = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!rawExisting) { ok(res, null, 404); return; }
    const existing = rowToEvent(rawExisting);

    const title = patch.title !== undefined ? str(patch.title, 'title', { maxLen: 256 }) : existing.title;
    const type = patch.type !== undefined ? oneOf(patch.type, 'type', TYPES) : existing.type;
    const start = patch.start !== undefined ? isoTs(patch.start, 'start') : existing.start;
    const end = patch.end !== undefined ? isoTs(patch.end, 'end') : existing.end;
    if (Date.parse(end) < Date.parse(start)) {
      ok(res, null, 400);
      return;
    }
    const subjectId = patch.subjectId !== undefined
      ? optStr(patch.subjectId, 'subjectId', { maxLen: 64 })
      : existing.subjectId;
    const notes = patch.notes !== undefined ? optStr(patch.notes, 'notes', { maxLen: 4096 }) : existing.notes;
    const location = patch.location !== undefined
      ? optStr(patch.location, 'location', { maxLen: 256 })
      : existing.location;

    db.prepare(
      `UPDATE events SET title=?, type=?, start=?, "end"=?, subject_id=?, notes=?, location=? WHERE id=?`,
    ).run(title, type, start, end, subjectId ?? null, notes ?? null, location ?? null, id);
    ok(res, rowToEvent(db.prepare('SELECT * FROM events WHERE id = ?').get(id)));
  }));

  app.delete('/api/calendar/:id', ah((req, res) => {
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    ok(res, { ok: true });
  }));
}
