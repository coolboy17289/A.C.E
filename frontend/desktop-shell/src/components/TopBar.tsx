import React, { useEffect, useState } from 'react';
import { AppTile, Icon, useAceStore } from '@ace/shared';

/**
 * Top bar with the system clock, search entry-point and the user profile.
 * All glyphs are SVG icons so the chrome stays consistent with the rest
 * of the desktop shell.
 */
export const TopBar: React.FC = () => {
  const username = useAceStore((s) => s.username);
  const avatar = useAceStore((s) => s.avatar);
  const unread = useAceStore((s) =>
    s.notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
  );
  const openApp = useAceStore((s) => s.openApp);
  // Brand tile uses the live theme accent — keeps the chrome visually
  // tied to the user's choice instead of a hard-coded colour.
  const brandAccent = useAceStore((s) => s.preferences.accentColor);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const date = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="absolute top-0 left-0 right-0 h-12 z-30 px-4 flex items-center justify-between text-sm bg-gradient-to-b from-black/50 to-transparent">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <AppTile appId="ai" accent={brandAccent || '#60a5fa'} size={26} />
          <span>A.C.E OS</span>
        </div>
        <div className="hidden md:flex ace-pill">
          <span>{date}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          aria-label="Open AI Tutor"
          className="ace-btn"
          onClick={() => openApp('ai')}
        >
          <Icon name="search" size={18} />
          <span className="hidden md:inline">Ask AI</span>
        </button>
        <div className="ace-pill font-mono tabular-nums" data-testid="topbar-clock">
          {time}
        </div>
        <NotificationsButton count={unread} />
        <button
          aria-label="Open settings"
          className="ace-btn"
          onClick={() => openApp('settings')}
          title={username}
        >
          <Icon name="user" size={18} />
          <span className="hidden md:inline">{avatar} {username}</span>
        </button>
      </div>
    </header>
  );
};

// The bell opens the dedicated notification panel (rendered by
// `NotificationCenter`), not the app launcher. The launcher has its own
// "Notifications" column for a fuller list — the bell is the
// system-chrome shortcut for "what just happened?".
const NotificationsButton: React.FC<{ count: number }> = ({ count }) => {
  const toggle = useAceStore((s) => s.toggleNotifCenter);
  return (
    <button
      aria-label={`Notifications (${count} unread)`}
      aria-haspopup="dialog"
      className="ace-btn relative"
      onClick={toggle}
    >
      <Icon name="bell" size={18} />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
          style={{ background: 'var(--ace-accent)' }}
        >
          {count}
        </span>
      )}
    </button>
  );
};
