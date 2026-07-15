// Global store for the desktop shell *and* all apps.
// Apps use this to communicate with the shell: open notifications, register
// events, request focus, etc.

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  AppId,
  NotificationRecord,
  OpenWindow,
  SystemToast,
  UserPreferences,
} from './types.js';

interface AceState {
  // User / preferences
  username: string;
  avatar: string; // emoji
  preferences: UserPreferences;
  setPreferences: (p: Partial<UserPreferences>) => void;
  setUser: (username: string, avatar: string) => void;

  // Windows
  windows: OpenWindow[];
  nextZ: number;
  openApp: (id: AppId, title?: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, w: number, h: number) => void;

  // Notifications
  notifications: NotificationRecord[];
  pushNotification: (n: Omit<NotificationRecord, 'id' | 'ts' | 'read'>) => void;
  markRead: (id: string) => void;
  clearNotifications: () => void;
  toasts: SystemToast[];
  toast: (t: Omit<SystemToast, 'id' | 'ts'>) => void;
  dismissToast: (id: string) => void;

  // Drawer / taskbar / boot
  launcherOpen: boolean;
  setLauncherOpen: (open: boolean) => void;
  booting: boolean;
  bootDone: () => void;
}

const defaultPrefs: UserPreferences = {
  theme: 'dark',
  accentColor: '#60a5fa',
  fontScale: 1,
  notificationsEnabled: true,
  reduceMotion: false,
  username: 'Student',
};

export const useAceStore = create<AceState>()(
  subscribeWithSelector((set, get) => ({
    username: defaultPrefs.username,
    avatar: '🦊',
    preferences: defaultPrefs,
    setPreferences: (p) =>
      set((s) => ({ preferences: { ...s.preferences, ...p } })),
    setUser: (username, avatar) => set({ username, avatar }),

    windows: [],
    nextZ: 10,
    openApp: (id, title) => {
      const existing = get().windows.find((w) => w.appId === id && !w.maximized);
      if (existing) {
        get().focusWindow(existing.id);
        return;
      }
      const z = get().nextZ + 1;
      const idStr = `${id}-${Math.random().toString(36).slice(2, 8)}`;
      const width = Math.min(820, Math.max(560, window.innerWidth - 80));
      const height = Math.min(620, Math.max(420, window.innerHeight - 140));
      const x = Math.max(24, (window.innerWidth - width) / 2);
      const y = Math.max(24, (window.innerHeight - height) / 3);
      set((s) => ({
        nextZ: z,
        windows: [
          ...s.windows,
          {
            id: idStr,
            appId: id,
            title: title ?? id[0].toUpperCase() + id.slice(1),
            x, y, width, height,
            zIndex: z,
            minimized: false,
            maximized: false,
          },
        ],
      }));
    },
    closeWindow: (id) =>
      set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),
    focusWindow: (id) => {
      const z = get().nextZ + 1;
      set((s) => ({
        nextZ: z,
        windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: false, zIndex: z } : w)),
      }));
    },
    minimizeWindow: (id) =>
      set((s) => ({
        windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)),
      })),
    toggleMaximizeWindow: (id) =>
      set((s) => ({
        windows: s.windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)),
      })),
    moveWindow: (id, x, y) =>
      set((s) => ({
        windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
      })),
    resizeWindow: (id, width, height) =>
      set((s) => ({
        windows: s.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
      })),

    notifications: [],
    pushNotification: (n) => {
      const id = `n${Math.random().toString(36).slice(2, 9)}`;
      const full: NotificationRecord = {
        ...n,
        id,
        ts: new Date().toISOString(),
        read: false,
      };
      set((s) => ({ notifications: [full, ...s.notifications].slice(0, 50) }));
      get().toast({ title: n.title, body: n.message, variant: 'info' });
    },
    markRead: (id) =>
      set((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      })),
    clearNotifications: () => set({ notifications: [] }),
    toasts: [],
    toast: (t) => {
      const id = `t${Math.random().toString(36).slice(2, 9)}`;
      set((s) => ({
        toasts: [...s.toasts, { ...t, id, ts: Date.now() }].slice(-6),
      }));
      setTimeout(() => get().dismissToast(id), 4200);
    },
    dismissToast: (id) =>
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    launcherOpen: false,
    setLauncherOpen: (open) => set({ launcherOpen: open }),
    booting: true,
    bootDone: () => set({ booting: false }),
  })),
);
