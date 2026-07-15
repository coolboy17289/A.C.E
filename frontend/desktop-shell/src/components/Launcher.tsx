import React from 'react';
import { APP_REGISTRY, AppTile, Icon, useAceStore } from '@ace/shared';

/**
 * Drawer-style launcher. Slides up from the taskbar when the A.C.E button is
 * pressed; this is the user's primary launch surface. The launcher also has
 * a side column listing the most-recent notifications — the topbar bell
 * still toggles the dedicated `NotificationCenter` panel for the
 * keyboard-style "just show me the alerts" path.
 */
export const Launcher: React.FC = () => {
  const setLauncherOpen = useAceStore((s) => s.setLauncherOpen);
  const openApp = useAceStore((s) => s.openApp);
  const setUser = useAceStore((s) => s.setUser);

  const username = useAceStore((s) => s.username);
  const avatar = useAceStore((s) => s.avatar);
  const notifications = useAceStore((s) => s.notifications);
  const markRead = useAceStore((s) => s.markRead);
  const clearNotifications = useAceStore((s) => s.clearNotifications);

  // Centralised so the click handlers agree on the "open + close" sequence.
  const launch = React.useCallback(
    (id: Parameters<typeof openApp>[0]) => {
      setLauncherOpen(false);
      openApp(id);
    },
    [openApp, setLauncherOpen],
  );

  return (
    <div className="absolute inset-0 z-40 animate-fade-up">
      <button
        aria-label="Close launcher"
        onClick={close}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        className="absolute left-0 right-0 bottom-0 max-h-[80%] rounded-t-3xl border-t border-white/10 backdrop-blur shadow-window p-5 overflow-y-auto"
        style={{ background: 'var(--ace-glass)' }}
      >
        <div className="mx-auto w-12 h-1.5 rounded-full bg-white/20 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold">All Apps</h2>
              <span className="text-xs text-ace-muted">{APP_REGISTRY.length} installed</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {APP_REGISTRY.map((app) => (
                <button
                  key={app.id}
                  data-testid={`launcher-${app.id}`}
                  onClick={() => launch(app.id)}
                  className="ace-tile p-4 text-left flex flex-col gap-3"
                >
                  <AppTile appId={app.id} accent={app.accent} size={56} />
                  <div className="leading-tight">
                    <div className="font-semibold">{app.name}</div>
                    <div className="text-xs text-ace-muted mt-1 line-clamp-2">{app.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="ace-card">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--ace-accent-soft)' }}
                >
                  <Icon name="user" size={26} style={{ color: 'var(--ace-accent)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    className="ace-input"
                    value={username}
                    onChange={(e) => setUser(e.target.value, avatar)}
                    aria-label="Display name"
                  />
                  <p className="mt-2 text-[11px] text-ace-muted">
                    Tap{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => launch('settings')}
                    >
                      Settings
                    </button>{' '}
                    to change wallpaper, theme and accent.
                  </p>
                </div>
              </div>
            </div>

            <div className="ace-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon name="bell" size={16} style={{ color: 'var(--ace-accent)' }} />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-ace-muted">
                    Notifications
                  </h3>
                </div>
                <button
                  className="text-xs text-ace-muted hover:text-white"
                  onClick={clearNotifications}
                >
                  Clear all
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-ace-muted">All quiet here.</p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-auto">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`p-3 rounded-xl border border-white/10 cursor-pointer ${
                        n.read ? 'bg-white/[0.02]' : 'bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">{n.title}</div>
                          <p className="text-xs text-ace-muted mt-1">{n.message}</p>
                        </div>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full mt-1" style={{ background: 'var(--ace-accent)' }} />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>

        <button
          type="button"
          className="ace-nav-row mt-4"
          onClick={() => launch('settings')}
        >
          <Icon name="palette" size={18} />
          Theme & Wallpaper
        </button>
      </div>
    </div>
  );
};
