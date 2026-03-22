import { getAlignedNextRunAt, getRandomJitterMs } from './core';

export const DEFAULT_SYNC_JITTER_MAX_MS = 30 * 1000;
export const DEFAULT_SYNC_MIN_DELAY_MS = 500;

const toSafeIntervalMinutes = (intervalMinutes: number) => {
  const n = Number(intervalMinutes);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.round(n));
};

const parsePersistedTargetMs = (persistedNextAtIso?: string | null) => {
  if (!persistedNextAtIso) return Number.NaN;
  return new Date(persistedNextAtIso).getTime();
};

export const getAlignedJitteredNextAt = (
  intervalMinutes: number,
  options?: {
    nowMs?: number;
    jitterMaxMs?: number;
  }
) => {
  const nowMs = options?.nowMs ?? Date.now();
  const jitterMaxMs = options?.jitterMaxMs ?? DEFAULT_SYNC_JITTER_MAX_MS;
  const intervalMs = toSafeIntervalMinutes(intervalMinutes) * 60 * 1000;
  const aligned = getAlignedNextRunAt(intervalMs, nowMs);
  return aligned + getRandomJitterMs(jitterMaxMs);
};

export const resolveInitialAlignedJitteredTargetAt = (options: {
  intervalMinutes: number;
  persistedNextAtIso?: string | null;
  nowMs?: number;
  jitterMaxMs?: number;
  minDelayMs?: number;
}) => {
  const nowMs = options.nowMs ?? Date.now();
  const jitterMaxMs = options.jitterMaxMs ?? DEFAULT_SYNC_JITTER_MAX_MS;
  const minDelayMs = options.minDelayMs ?? DEFAULT_SYNC_MIN_DELAY_MS;
  const intervalMs = toSafeIntervalMinutes(options.intervalMinutes) * 60 * 1000;
  const scheduledNext = getAlignedJitteredNextAt(options.intervalMinutes, {
    nowMs,
    jitterMaxMs,
  });
  const persistedNextAt = parsePersistedTargetMs(options.persistedNextAtIso);
  if (!Number.isFinite(persistedNextAt)) return scheduledNext;
  if (persistedNextAt <= nowMs) return nowMs + minDelayMs;
  const maxWindowMs = intervalMs + Math.max(0, Math.floor(jitterMaxMs));
  if (persistedNextAt - nowMs > maxWindowMs) return scheduledNext;
  return persistedNextAt;
};
