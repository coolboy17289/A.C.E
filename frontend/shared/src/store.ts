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
import { APP_REGISTRY } from './apps-registry.js';
import { DEFAULT_WALLPAPER_CSS, type WallpaperPreset } from './wallpapers.js';

interface AceState {
  // User / preferences
  username: string;
  avatar: string; // emoji or short identifier; the actual visual is rendered
  preferences: UserPreferences;
  setPreferences: (p: Partial<UserPreferences>) => void;
  setUser: (username: string, avatar: string) => void;

  // Wallpaper + theming
  /**
   * Either a CSS background string (preset or hand-built) or a `data:image/...`
   * url pointing at an uploaded image. Stored locally so the desktop stays
   * themed before the backend has responded.
   */
  wallpaper: string;
  setWallpaper: (css: string) => void;

  /**
   * Image presets auto-discovered from `desktop-shell/public/backgrounds/`
   * at build/dev time via `import.meta.glob` in `backgrounds-bridge.ts`.
   * Empty until the bridge fires on boot — the Settings app merges this
   * list in front of the static CSS presets so newly-dropped PNGs are
   * picked up automatically without code edits.
   */
  bundledBackgrounds: WallpaperPreset[];
  setBundledBackgrounds: (presets: WallpaperPreset[]) => void;

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

  // Drawer / taskbar / boot / notification panel
  launcherOpen: boolean;
  setLauncherOpen: (open: boolean) => void;
  /**
   * Separate flag for the bell-button notification panel. Kept distinct
   * from `launcherOpen` so the bell and the launcher don't fight each
   * other when the user has both panels in their head. The notification
   * panel auto-opens on a transition to "has unread" and can also be
   * toggled manually from the topbar bell.
   */
  notifCenterOpen: boolean;
  setNotifCenterOpen: (open: boolean) => void;
  toggleNotifCenter: () => void;
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

    wallpaper: DEFAULT_WALLPAPER_CSS,
    setWallpaper: (css) => set({ wallpaper: css || DEFAULT_WALLPAPER_CSS }),

    bundledBackgrounds: [],
    setBundledBackgrounds: (presets) => set({ bundledBackgrounds: presets }),

    windows: [],
    nextZ: 10,
    openApp: (id, title) => {
      const existing = get().windows.find((w) => w.appId === id && !w.maximized);
      if (existing) {
        get().focusWindow(existing.id);
        return;
      }
      // Resolve the title from the registry first so the window chrome
      // shows the same label the launcher tile does. Fall back to a
      // title-cased id for apps parked in later/ (no registry entry).
      const meta = APP_REGISTRY.find((a) => a.id === id);
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
            title:
              title ??
              meta?.name ??
              (id ? id[0].toUpperCase() + id.slice(1) : 'App'),
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

    notifCenterOpen: false,
    setNotifCenterOpen: (open) => set({ notifCenterOpen: open }),
    toggleNotifCenter: () => set((s) => ({ notifCenterOpen: !s.notifCenterOpen })),

    booting: true,
    bootDone: () => set({ booting: false }),
  })),
);
