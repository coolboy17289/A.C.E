import React, { useEffect } from 'react';
import { api, useAceStore, WALLPAPER_STORAGE_KEY, type UserPreferences } from '@ace/shared';
import { BootScreen } from './components/BootScreen';
import { TopBar } from './components/TopBar';
import { Taskbar } from './components/Taskbar';
import { Launcher } from './components/Launcher';
import { WindowManager } from './components/WindowManager';
import { NotificationCenter } from './components/NotificationCenter';
import { ToastStack } from './components/ToastStack';
import { Wallpaper } from './components/Wallpaper';

const ACCENT_KEY = 'ace:accent';

export function App() {
  const booting = useAceStore((s) => s.booting);
  const launcherOpen = useAceStore((s) => s.launcherOpen);
  const prefs = useAceStore((s) => s.preferences);
  const setWallpaper = useAceStore((s) => s.setWallpaper);
  const setPreferences = useAceStore((s) => s.setPreferences);

  // -------- Theme + wallpaper application on document root --------
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--ace-accent', prefs.accentColor || '#60a5fa');
    document.documentElement.dataset.theme = prefs.theme === 'light' ? 'light' : 'dark';
    // `reduceMotion` is also picked up via the browser's
    // `prefers-reduced-motion` media query in styles.css; we mirror it
    // as a data-attribute so JS-driven animations (zustand subscribers,
    // inline `style.transition`, etc.) can opt out too.
    document.documentElement.dataset.reduceMotion = prefs.reduceMotion ? 'true' : 'false';

    // Cache locally so the next boot is themed before the backend responds.
    try {
      localStorage.setItem(ACCENT_KEY, prefs.accentColor ?? '');
    } catch { /* ignore quota errors */ }
  }, [prefs.accentColor, prefs.theme, prefs.reduceMotion]);

  // -------- Load saved settings on first paint --------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) Hydrate theme from localStorage for an instant paint.
        const cachedAccent = localStorage.getItem(ACCENT_KEY);
        const cachedWp = localStorage.getItem(WALLPAPER_STORAGE_KEY);
        if (cachedWp) setWallpaper(cachedWp);
        if (cachedAccent && cachedAccent !== prefs.accentColor) {
          setPreferences({ accentColor: cachedAccent });
        }
        // 2) Then pull the canonical state from the backend.
        const user = await api.getUser();
        if (cancelled) return;
        // Use a snapshot of the prefs at *app boot* (the closure value
        // above) as the "untouched" baseline. Any field the user edits
        // via the UI between mount and now has a different value, so we
        // preserve the user's local edit instead of clobbering it with
        // the backend's value.
        const initial = prefs;
        const backend = user.preferences;
        const keep = <K extends keyof UserPreferences>(k: K): UserPreferences[K] => {
          const current = useAceStore.getState().preferences[k];
          return current === initial[k] ? (backend[k] ?? initial[k]) : current;
        };
        setPreferences({
          accentColor: keep('accentColor'),
          fontScale: keep('fontScale'),
          reduceMotion: keep('reduceMotion'),
          notificationsEnabled: keep('notificationsEnabled'),
          theme: keep('theme'),
          username: keep('username') || backend.username || user.name,
        });
        const settings = await api.getSettings();
        if (cancelled) return;
        const s = settings as { wallpaper?: unknown };
        if (typeof s.wallpaper === 'string') {
          setWallpaper(s.wallpaper);
          try { localStorage.setItem(WALLPAPER_STORAGE_KEY, s.wallpaper); } catch { /* */ }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ace] settings hydration failed', err);
        useAceStore.getState().toast({
          title: 'Settings unavailable',
          body: 'Showing defaults. Backend may be offline.',
          variant: 'warning',
        });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- Compose the desktop --------
  return (
    <div
      className="relative w-full h-full overflow-hidden text-ace-ink"
      style={{ ['--ace-font-scale' as string]: String(prefs.fontScale ?? 1) }}
    >
      <Wallpaper />
      <WindowManager />
      <NotificationCenter />
      <ToastStack />
      <TopBar />
      <Taskbar />
      {launcherOpen && <Launcher />}

      {booting && <BootScreen />}
    </div>
  );
}
