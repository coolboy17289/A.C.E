import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { ok } from '../util/envelope.js';
import { newId } from '../util/ids.js';
import { rowToSubject } from '../db.js';
import type { Subject } from '@ace/shared';
import { str, optStr, num, optNum, record } from '../util/validate.js';

export function registerSubjectRoutes(app: Application, db: Db) {
  app.get('/api/subjects', ah((_req, res) => {
    const rows = db.prepare('SELECT * FROM subjects ORDER BY name ASC').all();
    ok(res, rows.map(rowToSubject));
  }));

  app.post('/api/subjects', ah(async (req, res) => {
    const s = record(req.body ?? {}, 'body');
    const name = str(s.name, 'name', { maxLen: 128 });
    const color = str(s.color, 'color', { maxLen: 32 });
    const description = optStr(s.description, 'description', { maxLen: 1024 });
    const targetHoursPerWeek = num(s.targetHoursPerWeek, 'targetHoursPerWeek', { min: 0, max: 168 });
    const progress = num(s.progress, 'progress', { min: 0, max: 1 });

    const id = newId('sub');
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO subjects (id, name, color, description, target_hours_per_week, progress, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, name, color, description, targetHoursPerWeek, progress, createdAt);
    ok(res, rowToSubject(db.prepare('SELECT * FROM subjects WHERE id = ?').get(id)), 201);
  }));

  app.patch('/api/subjects/:id', ah(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== 'string' || id.length === 0) {
      ok(res, null, 400);
      return;
    }
    const patch = record(req.body ?? {}, 'body');
    const rawExisting = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    if (!rawExisting) { ok(res, null, 404); return; }
    const existing = rowToSubject(rawExisting);

    const name = patch.name !== undefined ? str(patch.name, 'name', { maxLen: 128 }) : existing.name;
    const color = patch.color !== undefined ? str(patch.color, 'color', { maxLen: 32 }) : existing.color;
    const description = patch.description !== undefined
      ? optStr(patch.description, 'description', { maxLen: 1024 })
      : existing.description;
    const targetHoursPerWeek = patch.targetHoursPerWeek !== undefined
      ? num(patch.targetHoursPerWeek, 'targetHoursPerWeek', { min: 0, max: 168 })
      : existing.targetHoursPerWeek;
    const progress = patch.progress !== undefined
      ? num(patch.progress, 'progress', { min: 0, max: 1 })
      : existing.progress;

    db.prepare(
      `UPDATE subjects SET name=?, color=?, description=?, target_hours_per_week=?, progress=? WHERE id=?`,
    ).run(name, color, description ?? null, targetHoursPerWeek, progress, id);
    ok(res, rowToSubject(db.prepare('SELECT * FROM subjects WHERE id = ?').get(id)));
  }));

  app.delete('/api/subjects/:id', ah((req, res) => {
    db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
    ok(res, { ok: true });
  }));
}
