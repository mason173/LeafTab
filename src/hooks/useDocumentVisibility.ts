import { useSyncExternalStore } from 'react';

type Listener = () => void;

const listeners = new Set<Listener>();
let subscribed = false;

function getSnapshot() {
  return typeof document === 'undefined' ? true : !document.hidden;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function ensureSubscription() {
  if (subscribed || typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', emitChange);
  subscribed = true;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  ensureSubscription();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && subscribed && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', emitChange);
      subscribed = false;
    }
  };
}

export function useDocumentVisibility() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
