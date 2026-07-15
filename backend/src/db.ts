import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type {
  CalendarEvent,
  ChatMessage,
  FocusSession,
  NoteRecord,
  NotificationRecord,
  Subject,
  Task,
  UserProfile,
} from '@ace/shared';

export type Db = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  created_at TEXT NOT NULL,
  preferences TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  target_hours_per_week REAL NOT NULL,
  progress REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL,
  due_date TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  category TEXT,
  subject_id TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  subject_id TEXT,
  notes TEXT,
  location TEXT
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_minutes INTEGER NOT NULL,
  break_minutes INTEGER NOT NULL,
  type TEXT NOT NULL,
  subject_id TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  ts TEXT NOT NULL,
  model TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  ts TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings_kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks (completed);
CREATE INDEX IF NOT EXISTS idx_events_start ON events (start);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions (started_at);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes (subject_id);
`;

/**
 * Opens (and migrates) the SQLite database file. If the file path contains
 * a directory that doesn't exist yet it's created automatically — this is
 * how `ace-core` first boots on the Pi with a clean SD card.
 */
export function openDatabase(file: string): Db {
  const dir = path.dirname(file);
  if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

export function closeDatabase(db: Db) {
  try {
    db.close();
  } catch {
    /* swallow */
  }
}

/* -------------------------------------------------------------------------- */
/* Row mappers                                                                  */
/* -------------------------------------------------------------------------- */

// Row helpers accept `unknown` so they can consume the narrow-but-untyped
// results from better-sqlite3 without forcing every caller to cast.
function asRow(r: unknown): Record<string, unknown> {
  if (!r || typeof r !== 'object') return {};
  return r as Record<string, unknown>;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const rowToTask = (r: unknown): Task => {
  const row = asRow(r);
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : undefined,
    priority: String(row.priority) as Task['priority'],
    dueDate: row.due_date ? String(row.due_date) : undefined,
    completed: num(row.completed) === 1,
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    category: row.category ? String(row.category) : undefined,
    subjectId: row.subject_id ? String(row.subject_id) : undefined,
  };
};

export const rowToSubject = (r: unknown): Subject => {
  const row = asRow(r);
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
    description: row.description ? String(row.description) : undefined,
    targetHoursPerWeek: num(row.target_hours_per_week),
    progress: num(row.progress),
    createdAt: String(row.created_at),
  };
};

export const rowToEvent = (r: unknown): CalendarEvent => {
  const row = asRow(r);
  return {
    id: String(row.id),
    title: String(row.title),
    type: String(row.type) as CalendarEvent['type'],
    start: String(row.start),
    end: String(row.end),
    subjectId: row.subject_id ? String(row.subject_id) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    location: row.location ? String(row.location) : undefined,
  };
};

export const rowToNote = (r: unknown): NoteRecord => {
  const row = asRow(r);
  return {
    id: String(row.id),
    subjectId: String(row.subject_id),
    title: String(row.title),
    body: String(row.body),
    tags: safeJsonArray(row.tags) as string[],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    revisionCount: num(row.revision_count),
  };
};

export const rowToSession = (r: unknown): FocusSession => {
  const row = asRow(r);
  return {
    id: String(row.id),
    startedAt: String(row.started_at),
    endedAt: row.ended_at ? String(row.ended_at) : undefined,
    durationMinutes: num(row.duration_minutes),
    breakMinutes: num(row.break_minutes),
    type: String(row.type) as FocusSession['type'],
    subjectId: row.subject_id ? String(row.subject_id) : undefined,
    completed: num(row.completed) === 1,
    notes: row.notes ? String(row.notes) : undefined,
  };
};

export const rowToMessage = (r: unknown): ChatMessage => {
  const row = asRow(r);
  return {
    id: String(row.id),
    role: String(row.role) as ChatMessage['role'],
    content: String(row.content),
    ts: String(row.ts),
    model: row.model ? String(row.model) : undefined,
  };
};

export const rowToNotification = (r: unknown): NotificationRecord => {
  const row = asRow(r);
  return {
    id: String(row.id),
    title: String(row.title),
    message: String(row.message),
    ts: String(row.ts),
    read: num(row.read) === 1,
    category: String(row.category) as NotificationRecord['category'],
  };
};

export const rowToUser = (r: unknown): UserProfile => {
  const row = asRow(r);
  return {
    id: String(row.id),
    name: String(row.name),
    avatar: String(row.avatar),
    createdAt: String(row.created_at),
    preferences: safeJson(row.preferences),
  };
};

function safeJsonArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return [];
  try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

/**
 * Default preferences restored when a user record's `preferences`
 * column is missing or unreadable. Mirrors `defaultPrefs` in
 * `@ace/shared/src/store.ts` so a freshly seeded SQLite user lands
 * on the same look as a freshly hydrated one (the wizard's
 * "Dark + #60a5fa + 18 px + Student").
 *
 * Kept here as well so `safeJson`'s fallback path can't drift from
 * the seed path; the unit tests in `backend/tests/db.test.ts` pin
 * both branches to the same object shape.
 */
const DEFAULT_PREFERENCES: UserProfile['preferences'] = {
  theme: 'dark',
  accentColor: '#60a5fa',
  fontScale: 1,
  notificationsEnabled: true,
  reduceMotion: false,
  username: 'Student',
};

function safeJson(v: unknown): UserProfile['preferences'] {
  if (typeof v !== 'string') return DEFAULT_PREFERENCES;
  try { return JSON.parse(v); } catch { return DEFAULT_PREFERENCES; }
}
