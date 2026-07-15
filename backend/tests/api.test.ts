import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { openDatabase, closeDatabase, type Db } from '../src/db.js';
import { createApp } from '../src/server.js';
import { seedIfEmpty } from '../src/seed.js';

let db: Db;
let app: ReturnType<typeof createApp>;
let tmpFile: string;

beforeAll(async () => {
  tmpFile = path.join(os.tmpdir(), `ace-test-${Date.now()}.db`);
  db = openDatabase(tmpFile);
  await seedIfEmpty(db);
  app = createApp({ db });
});

afterAll(() => {
  closeDatabase(db);
  if (fs.existsSync(tmpFile)) fs.rmSync(tmpFile, { force: true });
});

beforeEach(() => {
  // Wipe between tests so state stays predictable.
  db.exec(`
    DELETE FROM tasks; DELETE FROM events; DELETE FROM notes; DELETE FROM sessions;
    DELETE FROM messages; DELETE FROM notifications; DELETE FROM subjects; DELETE FROM users;
    DELETE FROM settings_kv;
  `);
});

describe('health', () => {
  it('responds ok on /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('emits a request id header on every response', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toMatch(/^[a-z0-9]{8,}$/);
  });
});

describe('users', () => {
  it('auto-creates the default profile', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('Student');
    expect(res.body.data.preferences.theme).toBe('dark');
  });

  it('updates preferences and persists the change', async () => {
    await request(app).patch('/api/users/me').send({ name: 'Alex' });
    const res = await request(app).get('/api/users/me');
    expect(res.body.data.name).toBe('Alex');
  });

  it('rejects an empty name', async () => {
    const res = await request(app).patch('/api/users/me').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('validation_error');
  });
});

describe('tasks', () => {
  it('creates, lists, updates and deletes a task', async () => {
    const create = await request(app).post('/api/tasks').send({
      title: 'Read chapter',
      priority: 'medium',
      completed: false,
    });
    expect(create.status).toBe(201);
    expect(create.body.ok).toBe(true);
    expect(create.body.data.id).toMatch(/^tsk_/);

    const list = await request(app).get('/api/tasks');
    expect(list.body.data.length).toBe(1);

    const patch = await request(app).patch(`/api/tasks/${create.body.data.id}`).send({ completed: true });
    expect(patch.body.data.completed).toBe(true);
    expect(patch.body.data.completedAt).toBeTruthy();

    const del = await request(app).delete(`/api/tasks/${create.body.data.id}`);
    expect(del.body.ok).toBe(true);
    expect(del.body.data.ok).toBe(true);

    const empty = await request(app).get('/api/tasks');
    expect(empty.body.data.length).toBe(0);
  });

  it('rejects unknown priority on create', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'X', priority: 'yikes' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('rejects an empty title on create', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '', priority: 'low' });
    expect(res.status).toBe(400);
  });
});

describe('calendar', () => {
  it('rejects events without ISO timestamps', async () => {
    const res = await request(app).post('/api/calendar').send({
      title: 'Bad', type: 'event', start: 'friday', end: 'friday',
    });
    expect(res.status).toBe(400);
  });

  it('rejects end before start', async () => {
    const start = new Date().toISOString();
    const end = new Date(Date.now() - 60_000).toISOString();
    const res = await request(app).post('/api/calendar').send({ title: 'X', type: 'event', start, end });
    expect(res.status).toBe(400);
  });

  it('rejects empty title', async () => {
    const res = await request(app).post('/api/calendar').send({
      title: '', type: 'event',
      start: new Date().toISOString(), end: new Date(Date.now() + 3600e3).toISOString(),
    });
    expect(res.status).toBe(400);
  });

  it('creates and lists events', async () => {
    const res = await request(app).post('/api/calendar').send({
      title: 'Maths', type: 'class',
      start: new Date().toISOString(), end: new Date(Date.now() + 3600e3).toISOString(),
    });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    const list = await request(app).get('/api/calendar');
    expect(list.body.data.length).toBe(1);
  });
});

describe('subjects + notes', () => {
  it('CRUD roundtrip', async () => {
    const s = await request(app).post('/api/subjects').send({
      name: 'Maths', color: '#60a5fa', targetHoursPerWeek: 5, progress: 0.2,
    });
    expect(s.status).toBe(201);
    expect(s.body.ok).toBe(true);

    const n = await request(app).post('/api/notes').send({
      subjectId: s.body.data.id, title: 'Integration', body: '...', tags: ['unit-test'],
    });
    expect(n.status).toBe(201);
    expect(n.body.data.revisionCount).toBe(0);

    const edited = await request(app).patch(`/api/notes/${n.body.data.id}`).send({ body: 'edited' });
    expect(edited.body.data.revisionCount).toBe(1);
  });

  it('rejects out-of-range progress', async () => {
    const res = await request(app).post('/api/subjects').send({
      name: 'X', color: '#fff', targetHoursPerWeek: 1, progress: 2,
    });
    expect(res.status).toBe(400);
  });
});

describe('focus sessions', () => {
  it('records a Pomodoro with default-ish fields', async () => {
    const res = await request(app).post('/api/focus').send({
      startedAt: new Date().toISOString(),
      durationMinutes: 25, breakMinutes: 5, type: 'pomodoro',
      completed: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('pomodoro');

    const list = await request(app).get('/api/focus');
    expect(list.body.data.length).toBe(1);
  });

  it('rejects negative durationMinutes', async () => {
    const res = await request(app).post('/api/focus').send({
      startedAt: new Date().toISOString(),
      durationMinutes: -1, breakMinutes: 5, type: 'pomodoro',
    });
    expect(res.status).toBe(400);
  });
});

describe('AI chat', () => {
  it('persists a user message and returns an assistant reply', async () => {
    const res = await request(app).post('/api/ai/messages').send({ content: 'How do I study physics?' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.role).toBe('assistant');
    expect(res.body.data.content.length).toBeGreaterThan(0);

    const list = await request(app).get('/api/ai/messages');
    expect(list.body.data.length).toBe(2);
  });

  it('rejects an empty prompt', async () => {
    const res = await request(app).post('/api/ai/messages').send({ content: '   ' });
    expect(res.status).toBe(400);
  });

  it('reset clears the history', async () => {
    await request(app).post('/api/ai/messages').send({ content: 'Hi' });
    await request(app).post('/api/ai/reset').expect(200);
    const list = await request(app).get('/api/ai/messages');
    expect(list.body.data.length).toBe(0);
  });
});

describe('notifications', () => {
  it('push + read', async () => {
    const res = await request(app).post('/api/notifications').send({
      title: 'Task due', message: 'Calc problem set due tomorrow', category: 'reminder',
    });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    const id = res.body.data.id;
    const patch = await request(app).patch(`/api/notifications/${id}`).send({ read: true });
    expect(patch.body.data.read).toBe(true);
  });

  it('rejects unknown category', async () => {
    const res = await request(app).post('/api/notifications').send({
      title: 'X', message: 'Y', category: 'whatever',
    });
    expect(res.status).toBe(400);
  });
});

describe('settings', () => {
  it('round-trips a settings object', async () => {
    await request(app).put('/api/settings').send({ wifi: 'home-5g', bluetooth: true });
    const res = await request(app).get('/api/settings');
    expect(res.body.data.wifi).toBe('home-5g');
    expect(res.body.data.bluetooth).toBe(true);
  });
});

describe('hardware & system', () => {
  it('returns DeviceInfo with sensible keys', async () => {
    const res = await request(app).get('/api/hardware/device');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('hostname');
    expect(res.body.data).toHaveProperty('memory');
  });

  it('rejects out-of-range pins', async () => {
    const bad = await request(app).post('/api/hardware/led').send({ pin: 99, on: true });
    expect(bad.status).toBe(400);
  });

  it('rejects non-integer pins', async () => {
    const bad = await request(app).post('/api/hardware/led').send({ pin: 1.5, on: true });
    expect(bad.status).toBe(400);
  });

  it('accepts in-range pins and reports mode', async () => {
    const res = await request(app).post('/api/hardware/led').send({ pin: 17, on: true });
    expect(res.status).toBe(200);
    expect(['real', 'stub']).toContain(res.body.data.mode);
  });

  it('shutdown + restart are non-throwing in dev', async () => {
    const s = await request(app).post('/api/system/shutdown');
    expect(s.status).toBe(200);
    const r = await request(app).post('/api/system/restart');
    expect(r.status).toBe(200);
  });
});

describe('error handling', () => {
  it('returns JSON 404 for unknown /api routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('not_found');
  });

  it('rejects payloads over 512kb', async () => {
    const huge = 'a'.repeat(600 * 1024);
    const res = await request(app).post('/api/notes').send({ subjectId: 'x', title: 'huge', body: huge });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('payload_too_large');
  });
});

describe('rate limiting', () => {
  it('429s once the burst is exhausted', async () => {
    // Drain whatever is in the bucket from prior tests. We don't care
    // about the exact count - only that we can hit a 429 by spamming.
    // 60 attempts is comfortably above the burst capacity (10) plus
    // any refill (2/sec * small elapsed).
    let lastStatus = 200;
    let hitLimit = false;
    for (let i = 0; i < 60; i++) {
      const r = await request(app).get('/api/ai/status');
      lastStatus = r.status;
      if (r.status === 429) { hitLimit = true; break; }
    }
    expect(hitLimit).toBe(true);
    expect(lastStatus).toBe(429);
  });
});
