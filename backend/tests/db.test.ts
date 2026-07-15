import { describe, it, expect } from 'vitest';
import {
  rowToTask,
  rowToSubject,
  rowToEvent,
  rowToNote,
  rowToSession,
  rowToMessage,
  rowToNotification,
  rowToUser,
} from '../src/db.js';

/**
 * Pure-function unit tests for the row mappers and JSON safety helpers
 * in `backend/src/db.ts`.
 *
 * The integration coverage in `api.test.ts` exercises the happy path
 * end-to-end. These tests fill the gap on the rows' *edge cases* — null
 * optional columns, boolean coercion (0 vs 1 vs '0' vs '1'), missing
 * arrays/tags, malformed preferences JSON — that would otherwise surface
 * as confusing 5xx responses in production instead of a focused unit
 * failure.
 *
 * Mappers accept `unknown` and are purely syntactic; no database
 * fixture or supertest setup is required.
 */

describe('rowToTask', () => {
  const baseRow = {
    id: 'tsk_1',
    title: 'Read chapter',
    description: 'Algebra',
    priority: 'medium',
    due_date: '2025-01-15',
    completed: 0,
    created_at: '2024-12-01T00:00:00Z',
    completed_at: null,
    category: 'homework',
    subject_id: 'sub_math',
  };

  it('maps a complete row to the Task shape', () => {
    expect(rowToTask(baseRow)).toEqual({
      id: 'tsk_1',
      title: 'Read chapter',
      description: 'Algebra',
      priority: 'medium',
      dueDate: '2025-01-15',
      completed: false,
      createdAt: '2024-12-01T00:00:00Z',
      category: 'homework',
      subjectId: 'sub_math',
    });
    // completed_at was null in source row, must remain undefined in the
    // mapped Task (no leaked nulls in the API surface).
    const mapped = rowToTask(baseRow);
    expect(mapped.completedAt).toBeUndefined();
  });

  it('coerces completed to a boolean via num()', () => {
    expect(rowToTask({ ...baseRow, completed: 1 }).completed).toBe(true);
    expect(rowToTask({ ...baseRow, completed: 0 }).completed).toBe(false);
    // num('1') === 1, num('') === 0 — defense against weak driver typing.
    expect(rowToTask({ ...baseRow, completed: '1' as unknown as number }).completed).toBe(true);
    expect(rowToTask({ ...baseRow, completed: 0 as unknown as number }).completed).toBe(false);
  });

  it('drops null/undefined optional fields entirely', () => {
    const mapped = rowToTask({
      id: 'tsk_2',
      title: 'Minimal',
      priority: 'low',
      completed: 0,
      created_at: '2025-01-01',
      description: null,
      due_date: null,
      completed_at: null,
      category: null,
      subject_id: null,
    });
    expect(mapped.description).toBeUndefined();
    expect(mapped.dueDate).toBeUndefined();
    expect(mapped.completedAt).toBeUndefined();
    expect(mapped.category).toBeUndefined();
    expect(mapped.subjectId).toBeUndefined();
  });
});

describe('rowToSubject', () => {
  it('maps a complete row', () => {
    const subj = rowToSubject({
      id: 'sub_math',
      name: 'Mathematics',
      color: '#60a5fa',
      description: 'Algebra, calculus',
      target_hours_per_week: 6,
      progress: 0.42,
      created_at: '2024-12-01T00:00:00Z',
    });
    expect(subj).toEqual({
      id: 'sub_math',
      name: 'Mathematics',
      color: '#60a5fa',
      description: 'Algebra, calculus',
      targetHoursPerWeek: 6,
      progress: 0.42,
      createdAt: '2024-12-01T00:00:00Z',
    });
  });

  it('handles zero-valued numerics without falling back to defaults', () => {
    const subj = rowToSubject({
      id: 'sub_x',
      name: 'X',
      color: '#abc',
      description: null,
      target_hours_per_week: 0,
      progress: 0,
      created_at: '2025-01-01',
    });
    expect(subj.targetHoursPerWeek).toBe(0);
    expect(subj.progress).toBe(0);
  });
});

describe('rowToEvent', () => {
  it('maps a complete event row', () => {
    const ev = rowToEvent({
      id: 'evt_1',
      title: 'Maths class',
      type: 'class',
      start: '2025-01-15T09:00:00Z',
      end: '2025-01-15T10:00:00Z',
      subject_id: 'sub_math',
      notes: 'Bring laptop',
      location: 'Room 12',
    });
    expect(ev.type).toBe('class');
    expect(ev.subjectId).toBe('sub_math');
    expect(ev.location).toBe('Room 12');
  });

  it('drops null subject_id / notes / location to undefined', () => {
    const ev = rowToEvent({
      id: 'evt_2',
      title: 'T',
      type: 'event',
      start: '2025-01-15T09:00:00Z',
      end: '2025-01-15T10:00:00Z',
      subject_id: null,
      notes: null,
      location: null,
    });
    expect(ev.subjectId).toBeUndefined();
    expect(ev.notes).toBeUndefined();
    expect(ev.location).toBeUndefined();
  });
});

describe('rowToNote', () => {
  it('maps a note with a JSON tags array', () => {
    const n = rowToNote({
      id: 'note_1',
      subject_id: 'sub_math',
      title: 'Integration',
      body: '...',
      tags: '["unit-test","exam"]',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      revision_count: 3,
    });
    expect(n.tags).toEqual(['unit-test', 'exam']);
    expect(n.revisionCount).toBe(3);
  });

  it('falls back to [] when tags is malformed', () => {
    const n = rowToNote({
      id: 'note_2',
      subject_id: 'sub_math',
      title: 'T',
      body: '...',
      tags: 'not json',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      revision_count: 0,
    });
    expect(n.tags).toEqual([]);
  });

  it('applies safeJsonArray directly to [] input', () => {
    expect(rowToNote({
      id: 'n3', subject_id: 's', title: 't', body: '',
      tags: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      revision_count: 0,
    }).tags).toEqual([]);
  });
});

describe('rowToSession', () => {
  it('maps a complete Pomodoro row', () => {
    const s = rowToSession({
      id: 'sess_1',
      started_at: '2025-01-15T09:00:00Z',
      ended_at: '2025-01-15T09:25:00Z',
      duration_minutes: 25,
      break_minutes: 5,
      type: 'pomodoro',
      subject_id: 'sub_math',
      completed: 1,
      notes: null,
    });
    expect(s.completed).toBe(true);
    expect(s.durationMinutes).toBe(25);
    expect(s.type).toBe('pomodoro');
  });

  it('treats completed=0 as false', () => {
    const s = rowToSession({
      id: 'sess_2',
      started_at: '2025-01-15T09:00:00Z',
      ended_at: null,
      duration_minutes: 25,
      break_minutes: 5,
      type: 'pomodoro',
      subject_id: null,
      completed: 0,
      notes: null,
    });
    expect(s.completed).toBe(false);
    expect(s.endedAt).toBeUndefined();
  });
});

describe('rowToMessage', () => {
  it('maps a user message', () => {
    const m = rowToMessage({
      id: 'msg_1',
      role: 'user',
      content: 'Hi',
      ts: '2025-01-15T09:00:00Z',
      model: null,
    });
    expect(m.role).toBe('user');
    expect(m.model).toBeUndefined();
  });

  it('keeps model when present', () => {
    const m = rowToMessage({
      id: 'msg_2',
      role: 'assistant',
      content: 'Hi',
      ts: '2025-01-15T09:00:00Z',
      model: 'llama3:8b',
    });
    expect(m.model).toBe('llama3:8b');
  });
});

describe('rowToNotification', () => {
  it('maps with read=true', () => {
    const n = rowToNotification({
      id: 'n_1',
      title: 'Task due',
      message: 'Tomorrow',
      ts: '2025-01-15T09:00:00Z',
      read: 1,
      category: 'reminder',
    });
    expect(n.read).toBe(true);
    expect(n.category).toBe('reminder');
  });

  it('drops read=0 to false', () => {
    const n = rowToNotification({
      id: 'n_2',
      title: 'X',
      message: 'Y',
      ts: '2025-01-15T09:00:00Z',
      read: 0,
      category: 'system',
    });
    expect(n.read).toBe(false);
  });
});

describe('rowToUser (preferences JSON safety)', () => {
  it('parses a valid preferences JSON blob', () => {
    const u = rowToUser({
      id: 'u_1',
      name: 'Alex',
      avatar: '🦊',
      created_at: '2025-01-01T00:00:00Z',
      preferences: JSON.stringify({
        theme: 'light',
        accentColor: '#006ad6',
        fontScale: 1.25,
        notificationsEnabled: false,
        reduceMotion: true,
        username: 'Alex',
      }),
    });
    expect(u.preferences.theme).toBe('light');
    expect(u.preferences.accentColor).toBe('#006ad6');
    expect(u.preferences.fontScale).toBe(1.25);
    expect(u.preferences.reduceMotion).toBe(true);
  });

  it('falls back to default prefs when the column is missing/non-string', () => {
    const u = rowToUser({
      id: 'u_1',
      name: 'X',
      avatar: '🦊',
      created_at: '2025-01-01T00:00:00Z',
      preferences: null,
    });
    expect(u.preferences.theme).toBe('dark');
    expect(u.preferences.username).toBe('Student');
  });

  it('falls back to default prefs when JSON is malformed', () => {
    const u = rowToUser({
      id: 'u_1',
      name: 'X',
      avatar: '🦊',
      created_at: '2025-01-01T00:00:00Z',
      preferences: '{not valid json',
    });
    expect(u.preferences.theme).toBe('dark');
    expect(u.preferences.username).toBe('Student');
    // The fallback uses the SAME DEFAULT_PREFERENCES literal so the
    // fallback path can't drift from the seed path; this asserts that
    // identity by spot-checking the bundled default colour.
    expect(u.preferences.accentColor).toBe('#60a5fa');
  });
});
