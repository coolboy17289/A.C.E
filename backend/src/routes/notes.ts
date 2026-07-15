import type { Application } from 'express';
import type { Db } from '../db.js';
import { ah } from '../util/error.js';
import { ok } from '../util/envelope.js';
import { newId } from '../util/ids.js';
import { rowToNote } from '../db.js';
import { str, optStr, record, optStrArray } from '../util/validate.js';

export function registerNoteRoutes(app: Application, db: Db) {
  app.get('/api/notes', ah((req, res) => {
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : null;
    const rows = subjectId
      ? db.prepare('SELECT * FROM notes WHERE subject_id = ? ORDER BY updated_at DESC').all(subjectId)
      : db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all();
    ok(res, rows.map(rowToNote));
  }));

  app.post('/api/notes', ah(async (req, res) => {
    const n = record(req.body ?? {}, 'body');
    const subjectId = str(n.subjectId, 'subjectId', { maxLen: 64 });
    const title = str(n.title, 'title', { maxLen: 256 });
    const body = optStr(n.body, 'body', { maxLen: 64 * 1024 }) ?? '';
    const tags = optStrArray(n.tags, 'tags', { maxItems: 32, maxItemLen: 64 }) ?? [];

    const id = newId('note');
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO notes (id, subject_id, title, body, tags, created_at, updated_at, revision_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    ).run(id, subjectId, title, body, JSON.stringify(tags), now, now);
    ok(res, rowToNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id)), 201);
  }));

  app.patch('/api/notes/:id', ah(async (req, res) => {
    const id = req.params.id;
    if (typeof id !== 'string' || id.length === 0) {
      ok(res, null, 400);
      return;
    }
    const patch = record(req.body ?? {}, 'body');

    // Pull the RAW row first so we can detect a true "not found" cleanly,
    // then run it through rowToNote() so the merged object below uses
    // the NoteRecord camelCase shape (subjectId, revisionCount, etc).
    const existingRow = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existingRow) { ok(res, null, 404); return; }
    const existing = rowToNote(existingRow);

    const subjectId = patch.subjectId !== undefined
      ? str(patch.subjectId, 'subjectId', { maxLen: 64 })
      : existing.subjectId;
    const title = patch.title !== undefined ? str(patch.title, 'title', { maxLen: 256 }) : existing.title;
    const body = patch.body !== undefined
      ? (optStr(patch.body, 'body', { maxLen: 64 * 1024 }) ?? '')
      : existing.body;
    const tags = patch.tags !== undefined
      ? (optStrArray(patch.tags, 'tags', { maxItems: 32, maxItemLen: 64 }) ?? existing.tags)
      : existing.tags;
    const now = new Date().toISOString();
    const bumped = patch.body !== undefined && patch.body !== existing.body
      ? (existing.revisionCount ?? 0) + 1
      : existing.revisionCount ?? 0;
    db.prepare(
      `UPDATE notes SET subject_id=?, title=?, body=?, tags=?, updated_at=?, revision_count=? WHERE id=?`,
    ).run(
      subjectId, title, body, JSON.stringify(tags), now, bumped, id,
    );
    ok(res, rowToNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id)));
  }));
}
