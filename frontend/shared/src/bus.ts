// Pub/sub bus + app-facing helpers used by every React module.
// Apps can request to open other apps, push notifications or toasts, etc.
// Centralising this in shared means the shell and any app agree on the bus.

type Handler<T> = (payload: T) => void;

class Bus {
  private handlers: Map<string, Set<Handler<unknown>>> = new Map();
  on<T>(event: string, h: Handler<T>) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(h as Handler<unknown>);
    return () => this.handlers.get(event)?.delete(h as Handler<unknown>);
  }
  emit<T>(event: string, payload: T) {
    const set = this.handlers.get(event);
    if (!set) return;
    set.forEach((h) => {
      try {
        (h as Handler<T>)(payload);
      } catch (err) {
        console.error('[ace bus]', event, err);
      }
    });
  }
}

export const aceBus = new Bus();

export const ACE_EVENTS = {
  APP_OPEN: 'ace:app:open',
  APP_REQUEST_QUIT: 'ace:app:request-quit',
  NOTIFICATION_PUSH: 'ace:notification:push',
  HARDWARE_BATTERY: 'ace:hardware:battery',
  HW_BUTTON: 'ace:hardware:button',
} as const;
