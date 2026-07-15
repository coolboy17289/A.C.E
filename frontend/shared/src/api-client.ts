// Tiny HTTP client shared by the desktop shell *and* every app
// so they all talk to the backend using identical semantics.

import type {
  AiStatus,
  CalendarEvent,
  ChatMessage,
  DeviceInfo,
  FocusSession,
  NoteRecord,
  NotificationRecord,
  Subject,
  Task,
  UserProfile,
} from './types.js';

const DEFAULT_BASE_URL =
  (typeof window !== 'undefined' && (window as any).__ACE_API_URL__) ||
  (import.meta as any)?.env?.VITE_API_URL ||
  'http://localhost:4317';

let baseUrl = DEFAULT_BASE_URL;

export function configureClient(url: string) {
  baseUrl = url.replace(/\/+$/, '');
}

export function clientBaseUrl() {
  return baseUrl;
}

export class AceApiError extends Error {
  constructor(public status: number, public payload: unknown) {
    super(`Ace API ${status}: ${String((payload as any)?.error ?? payload)}`);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  // `baseUrl` is the API root (e.g. '' for same-origin, or
  // 'http://localhost:4317'). Resource paths already include the '/api'
  // prefix, so we just join them. A trailing slash on `baseUrl` is
  // stripped by `configureClient`; a leading one on `path` is required.
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const text = await res.text();
  if (!res.ok) {
    // Surface a sane error message even when the server returned HTML
    // (Vite's dev server falls back to index.html for unknown routes).
    const trimmed = text.slice(0, 120);
    throw new AceApiError(res.status, trimmed || null);
  }
  // 204 / empty body — return null cast to the expected shape.
  if (!text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    // Server returned non-JSON on a 2xx — treat as empty rather than
    // crashing the hydration path. The wallpaper/save flow can then
    // continue with local state until the backend is reachable.
    return null as T;
  }
}

export const api = {
  // User
  getUser: () => request<UserProfile>('GET', '/api/users/me'),
  updateUser: (patch: Partial<UserProfile>) => request<UserProfile>('PATCH', '/api/users/me', patch),
  // Tasks
  listTasks: () => request<Task[]>('GET', '/api/tasks'),
  createTask: (t: Omit<Task, 'id' | 'createdAt'>) => request<Task>('POST', '/api/tasks', t),
  updateTask: (id: string, patch: Partial<Task>) => request<Task>('PATCH', `/api/tasks/${id}`, patch),
  deleteTask: (id: string) => request<{ ok: true }>('DELETE', `/api/tasks/${id}`),
  // Calendar
  listEvents: () => request<CalendarEvent[]>('GET', '/api/calendar'),
  createEvent: (e: Omit<CalendarEvent, 'id'>) => request<CalendarEvent>('POST', '/api/calendar', e),
  updateEvent: (id: string, patch: Partial<CalendarEvent>) =>
    request<CalendarEvent>('PATCH', `/api/calendar/${id}`, patch),
  deleteEvent: (id: string) => request<{ ok: true }>('DELETE', `/api/calendar/${id}`),
  // Subjects
  listSubjects: () => request<Subject[]>('GET', '/api/subjects'),
  createSubject: (s: Omit<Subject, 'id' | 'createdAt'>) =>
    request<Subject>('POST', '/api/subjects', s),
  updateSubject: (id: string, patch: Partial<Subject>) =>
    request<Subject>('PATCH', `/api/subjects/${id}`, patch),
  deleteSubject: (id: string) => request<{ ok: true }>('DELETE', `/api/subjects/${id}`),
  // Notes
  listNotes: () => request<NoteRecord[]>('GET', '/api/notes'),
  createNote: (n: Omit<NoteRecord, 'id' | 'createdAt' | 'updatedAt' | 'revisionCount'>) =>
    request<NoteRecord>('POST', '/api/notes', n),
  updateNote: (id: string, patch: Partial<NoteRecord>) =>
    request<NoteRecord>('PATCH', `/api/notes/${id}`, patch),
  // Focus
  listSessions: () => request<FocusSession[]>('GET', '/api/focus'),
  createSession: (s: Omit<FocusSession, 'id'>) =>
    request<FocusSession>('POST', '/api/focus', s),
  updateSession: (id: string, patch: Partial<FocusSession>) =>
    request<FocusSession>('PATCH', `/api/focus/${id}`, patch),
  // Focus (nested aliases — handy when apps want a namespaced surface)
  focus: {
    list: () => request<FocusSession[]>('GET', '/api/focus'),
  },
  // Tasks (nested aliases)
  tasks: {
    list: () => request<Task[]>('GET', '/api/tasks'),
  },
  // AI
  listMessages: () => request<ChatMessage[]>('GET', '/api/ai/messages'),
  sendMessage: (content: string) =>
    request<ChatMessage>('POST', '/api/ai/messages', { content }),
  describeImage: (prompt: string) =>
    request<ChatMessage>('POST', '/api/ai/vision', { prompt }),
  resetChat: () => request<{ ok: true }>('POST', '/api/ai/reset'),
  // Cheap status probe used by the AI Tutor's "Set up Ollama" CTA and
  // background poll while waiting for an in-flight install to land.
  getAiStatus: () => request<AiStatus>('GET', '/api/ai/status'),
  installOllama: () => request<{ started: boolean }>('POST', '/api/ai/install'),
  // Notifications
  listNotifications: () => request<NotificationRecord[]>('GET', '/api/notifications'),
  markNotification: (id: string, read: boolean) =>
    request<NotificationRecord>('PATCH', `/api/notifications/${id}`, { read }),
  // Settings / hardware
  getSettings: () => request<Record<string, unknown>>('GET', '/api/settings'),
  saveSettings: (s: Record<string, unknown>) =>
    request<Record<string, unknown>>('PUT', '/api/settings', s),
  getDevice: () => request<DeviceInfo>('GET', '/api/hardware/device'),
  setLed: (pin: number, on: boolean) =>
    request<{ ok: true; pin: number; on: boolean }>('POST', '/api/hardware/led', { pin, on }),
  triggerShutdown: () => request<{ ok: true }>('POST', '/api/system/shutdown'),
  triggerRestart: () => request<{ ok: true }>('POST', '/api/system/restart'),
};

export type Api = typeof api;
