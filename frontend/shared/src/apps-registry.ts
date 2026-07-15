import type { AppManifest } from './types.js';

/**
 * Centralised registry of every shipping A.C.E application.
 *
 * The desktop shell and the backend both import this list, which is the
 * single source of truth for what apps the OS exposes.
 *
 * Each app workspace must export a manifest with the same `id` so that the
 * shell can pair the registry entry with the bundled React module.
 */
export const APP_REGISTRY: readonly AppManifest[] = [
  {
    id: 'home',
    name: 'Home',
    description: 'Today\'s overview, quick access & notifications',
    icon: '🏠',
    accent: '#60a5fa',
    order: 1,
  },
  {
    id: 'planner',
    name: 'Planner',
    description: 'Calendar, assignments, exams & timetable',
    icon: '🗓️',
    accent: '#a78bfa',
    order: 2,
  },
  {
    id: 'tasks',
    name: 'Tasks',
    description: 'Capture, prioritise and complete work',
    icon: '✅',
    accent: '#34d399',
    order: 3,
  },
  {
    id: 'focus',
    name: 'Focus',
    description: 'Pomodoro, study sessions & productivity',
    icon: '🍅',
    accent: '#f87171',
    order: 4,
  },
  {
    id: 'subjects',
    name: 'Subjects',
    description: 'Subjects, notes & revision tracking',
    icon: '📚',
    accent: '#fbbf24',
    order: 5,
  },
  {
    id: 'ai',
    name: 'AI Tutor',
    description: 'Conversational study assistant & quizzes',
    icon: '🧠',
    accent: '#22d3ee',
    order: 6,
  },
  {
    id: 'statistics',
    name: 'Statistics',
    description: 'Study hours, progress and learning trends',
    icon: '📊',
    accent: '#f472b6',
    order: 7,
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'User, network, hardware & device info',
    icon: '⚙️',
    accent: '#94a3b8',
    order: 8,
  },
] as const;

export function getApp(id: string): AppManifest | undefined {
  return APP_REGISTRY.find((a) => a.id === id);
}
