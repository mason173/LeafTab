export const SYNC_DIAGNOSTICS_ENABLED_KEY = 'leaftab_sync_diagnostics_enabled';
export const SYNC_DIAGNOSTICS_EVENTS_KEY = 'leaftab_sync_diagnostics_events_v1';
export const SYNC_DIAGNOSTICS_MAX_EVENTS = 240;

export type SyncDiagnosticsProvider = 'webdav' | 'cloud' | 'sync';

export type SyncDiagnosticsEvent = {
  id: string;
  at: string;
  provider: SyncDiagnosticsProvider;
  action: string;
  durationMs?: number;
  detail?: Record<string, unknown>;
};

const nowIso = () => new Date().toISOString();

const createId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const getStorage = () => {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
};

export const isSyncDiagnosticsEnabled = () => {
  return getStorage()?.getItem(SYNC_DIAGNOSTICS_ENABLED_KEY) === 'true';
};

export const setSyncDiagnosticsEnabled = (enabled: boolean) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(SYNC_DIAGNOSTICS_ENABLED_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('leaftab-sync-diagnostics-changed'));
};

export const readSyncDiagnosticsEvents = (): SyncDiagnosticsEvent[] => {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(SYNC_DIAGNOSTICS_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((event): event is SyncDiagnosticsEvent => (
      Boolean(event)
      && typeof event === 'object'
      && typeof event.id === 'string'
      && typeof event.at === 'string'
      && typeof event.provider === 'string'
      && typeof event.action === 'string'
    ));
  } catch {
    return [];
  }
};

export const clearSyncDiagnosticsEvents = () => {
  getStorage()?.removeItem(SYNC_DIAGNOSTICS_EVENTS_KEY);
  window.dispatchEvent(new CustomEvent('leaftab-sync-diagnostics-changed'));
};

export const recordSyncDiagnosticEvent = (
  event: Omit<SyncDiagnosticsEvent, 'id' | 'at'>,
) => {
  if (!isSyncDiagnosticsEnabled()) return;
  const storage = getStorage();
  if (!storage) return;
  const nextEvent: SyncDiagnosticsEvent = {
    id: createId(),
    at: nowIso(),
    provider: event.provider,
    action: event.action,
    durationMs: typeof event.durationMs === 'number' ? Math.round(event.durationMs) : undefined,
    detail: event.detail,
  };
  try {
    const previous = readSyncDiagnosticsEvents();
    const next = [...previous, nextEvent].slice(-SYNC_DIAGNOSTICS_MAX_EVENTS);
    storage.setItem(SYNC_DIAGNOSTICS_EVENTS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('leaftab-sync-diagnostics-changed'));
  } catch {}
};

export const recordSyncDiagnosticSample = (
  provider: SyncDiagnosticsProvider,
  action: string,
  intervalMs: number,
  detail?: Record<string, unknown>,
) => {
  if (!isSyncDiagnosticsEnabled()) return;
  const key = `__leaftabSyncDiagnosticSample:${provider}:${action}`;
  const target = globalThis as typeof globalThis & Record<string, number | undefined>;
  const nowMs = Date.now();
  const lastAt = target[key] || 0;
  if (nowMs - lastAt < intervalMs) return;
  target[key] = nowMs;
  recordSyncDiagnosticEvent({
    provider,
    action,
    detail,
  });
};

export const measureSyncDiagnostic = async <T>(
  provider: SyncDiagnosticsProvider,
  action: string,
  detail: Record<string, unknown> | undefined,
  runner: () => Promise<T>,
) => {
  if (!isSyncDiagnosticsEnabled()) {
    return runner();
  }
  const startedAt = performance.now();
  try {
    const result = await runner();
    recordSyncDiagnosticEvent({
      provider,
      action,
      durationMs: performance.now() - startedAt,
      detail: {
        ...(detail || {}),
        ok: true,
      },
    });
    return result;
  } catch (error) {
    recordSyncDiagnosticEvent({
      provider,
      action,
      durationMs: performance.now() - startedAt,
      detail: {
        ...(detail || {}),
        ok: false,
        error: String((error as Error)?.message || error),
      },
    });
    throw error;
  }
};
