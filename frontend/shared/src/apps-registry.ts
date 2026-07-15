import type { AppManifest } from './types.js';

/**
 * App registry. Everything listed here ships in the touch-first desktop
 * shell. The visual order in the launcher is decided by the smart
 * launcher (`@ace/shared/launcher.rankApps`) — the static `order`
 * field is a tie-breaker / fallback for first-run when there's no
 * launch history.
 *
 * To add a new app:
 *   1. Create `frontend/apps/<id>/` workspace.
 *   2. Add an entry below.
 *   3. Add a lazy import in `desktop-shell/src/Dashboard.tsx`'s
 *      `APP_COMPONENTS` map.
 *   4. Add the workspace to root `package.json`'s `workspaces` array.
 */
export const APP_REGISTRY: readonly AppManifest[] = [
  {
    id: 'home',
    name: 'Home',
    description: "Today overview with quick actions and an app launcher",
    icon: '🏠',
    accent: '#3da8ff',
    order: 0,
  },
  {
    id: 'tasks',
    name: 'Tasks',
    description: 'Touch-driven to-do list with categories and priorities',
    icon: '✅',
    accent: '#8a5cff',
    order: 1,
  },
  {
    id: 'focus',
    name: 'Focus',
    description: 'Pomodoro timer with break tracking and session history',
    icon: '⏱️',
    accent: '#34d399',
    order: 2,
  },
  {
    id: 'subjects',
    name: 'Subjects',
    description: 'Subjects you study, target hours, and progress',
    icon: '📚',
    accent: '#f59e0b',
    order: 3,
  },
  {
    id: 'planner',
    name: 'Planner',
    description: 'Calendar of classes, exams, and study sessions',
    icon: '🗓️',
    accent: '#ec4899',
    order: 4,
  },
  {
    id: 'notes',
    name: 'Notes',
    description: 'Quick notes per subject, searchable and taggable',
    icon: '📝',
    accent: '#06b6d4',
    order: 5,
  },
  {
    id: 'statistics',
    name: 'Statistics',
    description: 'Focus minutes, tasks completed, and subject breakdowns',
    icon: '📊',
    accent: '#a78bfa',
    order: 6,
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Profile, theme, wallpaper, network, device & system',
    icon: '⚙️',
    accent: '#94a3b8',
    order: 7,
  },
] as const;

// AI Tutor intentionally dropped from the v2 --beta shipped shell.
// The backend route at /api/ai/* stays alive for the legacy web-shell
// and dev usage, but the touch-first launcher doesn't include the AI
// tile — Ollama + Vision adds boot time + battery cost without a
// guaranteed classroom Wi-Fi connection. The shell's "Coming soon"
// stub swallows any AppId outside APP_REGISTRY should the registry
// letter accidentally re-include 'ai'.

export function getApp(id: string): AppManifest | undefined {
  return APP_REGISTRY.find((a) => a.id === id);
}
