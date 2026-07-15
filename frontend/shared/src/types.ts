// Shared type definitions used across the A.C.E OS applications.
// Anything a module exposes to the desktop shell should live here
// so that the shell can statically understand the contract.

// AppId is the full historical union. Only ids currently listed in
// `apps-registry.ts` actually ship — the others are intentionally parked
// in `later/apps/` and surface via AppHost's "Coming soon" stub.
export type AppId =
  /** @deprecated parked in later/apps/home — move it back to ship. */
  | 'home'
  /** @deprecated parked in later/apps/planner — move it back to ship. */
  | 'planner'
  /** @deprecated parked in later/apps/tasks — move it back to ship. */
  | 'tasks'
  /** @deprecated parked in later/apps/focus — move it back to ship. */
  | 'focus'
  /** @deprecated parked in later/apps/subjects — move it back to ship. */
  | 'subjects'
  | 'ai'
  /** @deprecated parked in later/apps/statistics — move it back to ship. */
  | 'statistics'
  | 'settings';

export interface AppManifest {
  /** Stable identifier, used for routing & persistence */
  id: AppId;
  /** Human readable name shown in launcher */
  name: string;
  /** Short tagline */
  description: string;
  /** Emoji icon - keeps the launcher dependency free. */
  icon: string;
  /** Accent color used for the app tile & open window accent. */
  accent: string;
  /** Order in the launcher drawer (lower = earlier) */
  order: number;
}

export interface OpenWindow {
  id: string;
  appId: AppId;
  title: string;
  /** Pixel position relative to the desktop work area */
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // Emoji or data URI
  createdAt: string; // ISO
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  fontScale: number;
  notificationsEnabled: boolean;
  reduceMotion: boolean;
  username: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string; // ISO
  completed: boolean;
  createdAt: string; // ISO
  completedAt?: string;
  category?: string;
  subjectId?: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  description?: string;
  targetHoursPerWeek: number;
  progress: number; // 0..1
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'assignment' | 'exam' | 'class' | 'session' | 'event';
  start: string; // ISO
  end: string;   // ISO
  subjectId?: string;
  notes?: string;
  location?: string;
}

export interface FocusSession {
  id: string;
  startedAt: string; // ISO
  endedAt?: string;
  durationMinutes: number;
  breakMinutes: number;
  type: 'pomodoro' | 'long' | 'short';
  subjectId?: string;
  completed: boolean;
  notes?: string;
}

export interface NoteRecord {
  id: string;
  subjectId: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  revisionCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: string;
  model?: string;
}

export interface DeviceInfo {
  hostname: string;
  model: 'rpi4' | 'rpi5' | 'unknown';
  cpuTempC: number;
  memory: { totalMb: number; usedMb: number; freeMb: number };
  storage: { totalGb: number; usedGb: number };
  ip: string;
  uptimeSeconds: number;
  kernel: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  ts: string;
  read: boolean;
  category: 'system' | 'task' | 'reminder' | 'ai';
}

export interface SystemToast {
  id: string;
  title: string;
  body: string;
  variant: 'info' | 'success' | 'warning' | 'error';
  ts: number;
}

/**
 * Snapshot of the AI Tutor's Ollama wiring, returned by
 * `GET /api/ai/status`. Used to drive the frontend's "Set up Ollama"
 * CTA and the install-progress polling UI.
 *
 * - `running` is a live probe against `${host}/api/tags`.
 * - `installing` flips true while `install-ollama.sh` is spawning.
 * - `installable` is `false` if the script can't be located on disk.
 * - `lastInstallAt` + `lastInstallOk` are the most recent run results
 *   (used to surface "install failed" hints to the user).
 */
export interface AiStatus {
  running: boolean;
  host: string;
  model: string;
  installing: boolean;
  installable: boolean;
  lastInstallAt?: string;
  lastInstallOk?: boolean;
}

export interface ApiError {
  error: string;
  details?: string;
}
