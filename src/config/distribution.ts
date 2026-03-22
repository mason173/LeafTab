export type DistributionChannel = 'community' | 'store';

function resolveChannel(raw: unknown): DistributionChannel {
  if (typeof raw !== 'string') return 'community';
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'store') return 'store';
  return 'community';
}

export const DIST_CHANNEL: DistributionChannel = resolveChannel((import.meta as any).env?.VITE_DIST_CHANNEL);
export const IS_STORE_BUILD = DIST_CHANNEL === 'store';
export const ENABLE_CUSTOM_API_SERVER = !IS_STORE_BUILD;
