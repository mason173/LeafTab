// Toggle this to quickly enable/disable the search-engine switcher UI.
// When disabled, the app will fall back to system search engine behavior.
export const ENABLE_SEARCH_ENGINE_SWITCHER = true;

const parseBooleanFlag = (raw: unknown, fallback: boolean) => {
  if (typeof raw !== 'string') return fallback;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const env = (import.meta as any).env || {};

// AI bookmark search is implemented as a read-only sidecar index.
// It stays enabled by default, but can still be overridden via Vite env when needed.
export const ENABLE_AI_BOOKMARK_SEARCH = parseBooleanFlag(
  env.VITE_ENABLE_AI_BOOKMARK_SEARCH,
  true,
);

// Auto warmup is intentionally disabled during local development to avoid
// downloading the model on every unrelated test run. Release packaging scripts
// explicitly turn it back on, and both modes can still be overridden via env.
export const ENABLE_AI_BOOKMARK_AUTO_WARMUP = ENABLE_AI_BOOKMARK_SEARCH && parseBooleanFlag(
  env.VITE_ENABLE_AI_BOOKMARK_AUTO_WARMUP,
  false,
);
