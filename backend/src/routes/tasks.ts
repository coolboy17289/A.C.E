import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { ok } from '../util/envelope.js';
import { newId } from '../util/ids.js';
import { rowToTask } from '../db.js';
import type { TaskPriority } from '@ace/shared';
import { str, optStr, bool, optIsoTs, oneOf, record } from '../util/validate.js';

const PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export function registerTaskRoutes(app: Application, db: Db) {
  app.get('/api/tasks', ah((_req, res) => {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY completed ASC, created_at DESC').all();
    ok(res, rows.map(rowToTask));
  }));

  app.post('/api/tasks', ah(async (req, res) => {
    const t = record(req.body ?? {}, 'body');
    const title = str(t.title, 'title', { maxLen: 256 });
    const description = optStr(t.description, 'description', { maxLen: 4096 });
    const priority = oneOf(t.priority, 'priority', PRIORITIES);
    const completed = t.completed === undefined ? false : bool(t.completed, 'completed');
    const dueDate = optIsoTs(t.dueDate, 'dueDate');
    const category = optStr(t.category, 'category', { maxLen: 64 });
    const subjectId = optStr(t.subjectId, 'subjectId', { maxLen: 64 });

    const id = newId('tsk');
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO tasks (id, title, description, priority, due_date, completed, created_at, completed_at, category, subject_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id, title, description, priority, dueDate, completed ? 1 : 0, createdAt,
      null, category, subjectId,
    );
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    ok(res, rowToTask(row), 201);
  }));

  app.patch('/api/tasks/:id', ah(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== 'string' || id.length === 0) {
      ok(res, null, 400);
      return;
    }
    const patch = record(req.body ?? {}, 'body');
    // Pull the raw row first so a real "not found" is detected cleanly,
    // then map it through rowToTask() so the merged object below uses
    // the Task camelCase shape.
    const rawExisting = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!rawExisting) {
      ok(res, null, 404);
      return;
    }
    const existing = rowToTask(rawExisting);

    // Partial updates: only re-validate fields that were actually sent.
    const title = patch.title !== undefined ? str(patch.title, 'title', { maxLen: 256 }) : existing.title;
    const description = patch.description !== undefined
      ? optStr(patch.description, 'description', { maxLen: 4096 })
      : existing.description;
    const priority = patch.priority !== undefined
      ? oneOf(patch.priority, 'priority', PRIORITIES)
      : existing.priority;
    const completed = patch.completed !== undefined ? bool(patch.completed, 'completed') : existing.completed;
    const dueDate = patch.dueDate !== undefined ? optIsoTs(patch.dueDate, 'dueDate') : existing.dueDate;
    const category = patch.category !== undefined
      ? optStr(patch.category, 'category', { maxLen: 64 })
      : existing.category;
    const subjectId = patch.subjectId !== undefined
      ? optStr(patch.subjectId, 'subjectId', { maxLen: 64 })
      : existing.subjectId;

    // Auto-stamp completedAt on transition.
    let completedAt = existing.completedAt;
    if (patch.completed === true && !existing.completed) completedAt = new Date().toISOString();
    if (patch.completed === false) completedAt = undefined;

    db.prepare(
      `UPDATE tasks SET title=?, description=?, priority=?, due_date=?, completed=?, completed_at=?, category=?, subject_id=? WHERE id=?`,
    ).run(
      title, description ?? null, priority, dueDate ?? null,
      completed ? 1 : 0, completedAt ?? null, category ?? null, subjectId ?? null, id,
    );
    ok(res, rowToTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)));
  }));

  app.delete('/api/tasks/:id', ah((req, res) => {
    const id = req.params.id;
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    ok(res, { ok: true });
  }));
}
