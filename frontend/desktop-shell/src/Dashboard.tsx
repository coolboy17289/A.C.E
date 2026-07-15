import { useState, Suspense, lazy, type ComponentType } from 'react';
import {
  TouchButton, TouchCard, palette,
  type ThemeMode, useResolvedTheme,
} from '@ace/design-system';
import { APP_REGISTRY, getApp } from '@ace/shared';

/**
 * Dashboard — the always-on kiosk view. Two regions:
 *
 *   Header (logo + open-app close button + focused app name)
 *   Body — the currently open app (one at a time, kiosk paradigm).
 *
 * Why no window stack? This device has a single 800x480 screen on the
 * back of its chassis. Multi-window UX on that form factor causes the
 * user's hand to constantly obscure corners. We use a single-app
 * paradigm: the launcher grid in the Home app swaps the active app.
 *
 * Apps are loaded via `React.lazy` with `Suspense` so each app's
 * Vite chunk only downloads when first opened.
 */
const APP_COMPONENTS: Record<string, ComponentType<{ theme?: ThemeMode }>> = {
  home: lazy(() => import('@ace/app-home').then((m) => ({ default: m.HomeApp }))),
  tasks: lazy(() => import('@ace/app-tasks').then((m) => ({ default: m.TasksApp }))),
  focus: lazy(() => import('@ace/app-focus').then((m) => ({ default: m.FocusApp }))),
  settings: lazy(() => import('@ace/app-settings').then((m) => ({ default: m.SettingsApp }))),
};

export function Dashboard() {
  const theme = useResolvedTheme();
  const p = palette(theme);
  const [active, setActive] = useState<string>('home');

  const manifest = getApp(active);
  const AppComponent = APP_COMPONENTS[active];

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: p.bg, color: p.text,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header — slim strip, contains app title + close button. */}
      <header style={{
        background: manifest?.accent ? `${manifest.accent}22` : p.bgRaised,
        borderBottom: `2px solid ${manifest?.accent ?? p.border}`,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 16,
        minHeight: 64,
      }}>
        <TouchButton
          theme={theme} size="sm" variant="ghost" icon="⌂"
          onClick={() => setActive('home')}
          aria-label="Back to launcher"
        >
          A.C.E
        </TouchButton>
        <div style={{
          flex: 1, fontSize: 24, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 28 }}>{manifest?.icon ?? '•'}</span>
          {manifest?.name ?? 'A.C.E'}
        </div>
      </header>

      {/* Body — the active app's content. */}
      <main style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'auto' }}>
        <Suspense fallback={
          <div style={{
            height: '100%', display: 'grid', placeItems: 'center',
            color: p.textMuted, fontSize: 24,
          }}>
            Loading {manifest?.name}…
          </div>
        }>
          {AppComponent ? <AppComponent theme={theme} /> : null}
        </Suspense>
      </main>

      {/* Launcher row — bottom strip with every app's icon button. */}
      <nav style={{
        background: p.bgRaised, borderTop: `1px solid ${p.border}`,
        padding: '8px 12px',
        display: 'flex', gap: 8, justifyContent: 'center',
        minHeight: 80,
      }}>
        {APP_REGISTRY.map((app) => (
          <TouchButton
            key={app.id}
            theme={theme}
            size="sm"
            variant={active === app.id ? 'primary' : 'ghost'}
            icon={app.icon}
            onClick={() => setActive(app.id)}
            aria-label={`Open ${app.name}`}
            // Announce the currently-open app to screen readers and
            // assistive browse-mode so a student navigating with a
            // refreshable Braille display sees which tile is live.
            aria-current={active === app.id ? 'page' : undefined}
          >
            <div style={{ fontSize: 14, marginTop: 2 }}>{app.name}</div>
          </TouchButton>
        ))}
      </nav>
    </div>
  );
}
