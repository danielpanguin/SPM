// src/lib/notificationsBus.ts
type Handler = () => void;

const subs = new Set<Handler>();

export function onNotificationsHint(cb: Handler) {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function emitNotificationsHint() {
  for (const cb of subs) cb();
}
