const STORAGE_WRITE_DELAY_MS = 120;

const pendingWrites = new Map<string, string | null>();
let flushTimer: number | null = null;
let lifecycleBound = false;

function flushPendingWrites() {
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (pendingWrites.size === 0) return;

  const entries = Array.from(pendingWrites.entries());
  pendingWrites.clear();

  entries.forEach(([key, value]) => {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch {}
  });
}

function bindLifecycleFlush() {
  if (lifecycleBound || typeof window === 'undefined' || typeof document === 'undefined') return;

  const flushOnHidden = () => {
    if (document.hidden) {
      flushPendingWrites();
    }
  };

  window.addEventListener('pagehide', flushPendingWrites);
  document.addEventListener('visibilitychange', flushOnHidden);
  lifecycleBound = true;
}

function scheduleFlush() {
  if (typeof window === 'undefined') return;
  bindLifecycleFlush();
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushPendingWrites();
  }, STORAGE_WRITE_DELAY_MS);
}

export function queueLocalStorageSetItem(key: string, value: string) {
  if (typeof window === 'undefined') return;
  pendingWrites.set(key, value);
  scheduleFlush();
}

export function queueLocalStorageRemoveItem(key: string) {
  if (typeof window === 'undefined') return;
  pendingWrites.set(key, null);
  scheduleFlush();
}

export function flushQueuedLocalStorageWrites() {
  if (typeof window === 'undefined') return;
  flushPendingWrites();
}
