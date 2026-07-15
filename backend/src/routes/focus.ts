import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { ok } from '../util/envelope.js';
import { newId } from '../util/ids.js';
import { rowToSession } from '../db.js';
import {
  str, optStr, num, bool, optIsoTs, oneOf, record,
} from '../util/validate.js';

const SESSION_TYPES = ['pomodoro', 'long', 'short'] as const;

export function registerFocusRoutes(app: Application, db: Db) {
  app.get('/api/focus', ah((_req, res) => {
    const rows = db.prepare('SELECT * FROM sessions ORDER BY started_at DESC LIMIT 200').all();
    ok(res, rows.map(rowToSession));
  }));

  app.post('/api/focus', ah(async (req, res) => {
    const s = record(req.body ?? {}, 'body');
    const startedAt = str(s.startedAt, 'startedAt'); // already ISO in tests
    const endedAt = optIsoTs(s.endedAt, 'endedAt');
    const durationMinutes = num(s.durationMinutes, 'durationMinutes', { min: 0, max: 24 * 60 });
    const breakMinutes = num(s.breakMinutes, 'breakMinutes', { min: 0, max: 24 * 60 });
    const type = oneOf(s.type, 'type', SESSION_TYPES);
    const completed = s.completed === undefined ? false : bool(s.completed, 'completed');
    const subjectId = optStr(s.subjectId, 'subjectId', { maxLen: 64 });
    const notes = optStr(s.notes, 'notes', { maxLen: 4096 });

    const id = newId('ses');
    db.prepare(
      `INSERT INTO sessions (id, started_at, ended_at, duration_minutes, break_minutes, type, subject_id, completed, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id, startedAt, endedAt ?? null, durationMinutes, breakMinutes,
      type, subjectId, completed ? 1 : 0, notes,
    );
    ok(res, rowToSession(db.prepare('SELECT * FROM sessions WHERE id = ?').get(id)), 201);
  }));

  app.patch('/api/focus/:id', ah(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== 'string' || id.length === 0) {
      ok(res, null, 400);
      return;
    }
    const patch = record(req.body ?? {}, 'body');
    // Pull raw row + map through rowToSession().
    const rawExisting = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!rawExisting) { ok(res, null, 404); return; }
    const existing = rowToSession(rawExisting);

    const endedAt = patch.endedAt !== undefined
      ? optIsoTs(patch.endedAt, 'endedAt')
      : existing.endedAt;
    const durationMinutes = patch.durationMinutes !== undefined
      ? num(patch.durationMinutes, 'durationMinutes', { min: 0, max: 24 * 60 })
      : existing.durationMinutes;
    const breakMinutes = patch.breakMinutes !== undefined
      ? num(patch.breakMinutes, 'breakMinutes', { min: 0, max: 24 * 60 })
      : existing.breakMinutes;
    const type = patch.type !== undefined ? oneOf(patch.type, 'type', SESSION_TYPES) : existing.type;
    const completed = patch.completed !== undefined
      ? bool(patch.completed, 'completed')
      : existing.completed;
    const subjectId = patch.subjectId !== undefined
      ? optStr(patch.subjectId, 'subjectId', { maxLen: 64 })
      : existing.subjectId;
    const notes = patch.notes !== undefined ? optStr(patch.notes, 'notes', { maxLen: 4096 }) : existing.notes;

    db.prepare(
      `UPDATE sessions SET ended_at=?, duration_minutes=?, break_minutes=?, type=?, subject_id=?, completed=?, notes=? WHERE id=?`,
    ).run(
      endedAt ?? null, durationMinutes, breakMinutes, type,
      subjectId ?? null, completed ? 1 : 0, notes ?? null, id,
    );
    ok(res, rowToSession(db.prepare('SELECT * FROM sessions WHERE id = ?').get(id)));
  }));
}
