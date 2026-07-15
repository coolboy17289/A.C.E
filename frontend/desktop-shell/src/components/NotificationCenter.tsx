import React from 'react';
import { Icon, useAceStore } from '@ace/shared';

/**
 * Floating side panel that lists every notification. Toggled from the
 * topbar bell; also auto-opens when a previously-empty notification list
 * gains its first unread item. Either path is fine to dismiss by
 * clicking outside or pressing the Hide button.
 */
export const NotificationCenter: React.FC = () => {
  // Subscribe to the store flag the bell toggles. Keeping the open/closed
  // state on the store (not local component state) means the bell button
  // in TopBar and the panel itself always agree.
  const open = useAceStore((s) => s.notifCenterOpen);
  const setOpen = useAceStore((s) => s.setNotifCenterOpen);
  const notifications = useAceStore((s) => s.notifications);
  const read = useAceStore((s) => s.markRead);
  const clearAll = useAceStore((s) => s.clearNotifications);

  // Auto-open only on a *transition* to "has unread". Reading the latest
  // `hasUnread` value via a ref so the effect's dependency stays
  // `notifications.length` (cheap, stable) instead of a derived boolean
  // that flips on every change.
  const hasUnreadRef = React.useRef(false);
  React.useEffect(() => {
    const hasUnread = notifications.some((n) => !n.read);
    if (hasUnread && !hasUnreadRef.current) setOpen(true);
    hasUnreadRef.current = hasUnread;
  }, [notifications, setOpen]);

  if (!open || notifications.length === 0) return null;

  return (
    <div className="absolute right-3 top-14 z-40 w-80 origin-top-right animate-fade-up">
      <div className="ace-card" style={{ boxShadow: 'var(--ace-shadow)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2" style={{ color: 'var(--ace-accent)' }}>
            <Icon name="bell" size={16} />
            <h3 className="font-semibold text-ace-ink">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="text-xs text-ace-muted hover:text-white"
              onClick={clearAll}
            >
              Clear all
            </button>
            <button
              className="text-xs text-ace-muted hover:text-white"
              onClick={() => setOpen(false)}
            >
              Hide
            </button>
          </div>
        </div>
        <ul className="space-y-2 max-h-96 overflow-auto">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="p-3 rounded-xl border cursor-pointer"
              style={{
                background: n.read ? 'rgba(255,255,255,0.02)' : 'var(--ace-accent-soft)',
                borderColor: n.read ? 'var(--ace-border)' : 'color-mix(in srgb, var(--ace-accent) 35%, transparent)',
              }}
              onClick={() => read(n.id)}
            >
              <div className="font-medium text-sm">{n.title}</div>
              <p className="text-xs text-ace-muted mt-1">{n.message}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
