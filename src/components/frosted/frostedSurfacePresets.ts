import { useSyncExternalStore } from 'react';

export type FrostedSurfacePreset =
  | 'search-pill'
  | 'search-panel'
  | 'dropdown-panel'
  | 'popover-panel'
  | 'floating-toolbar'
  | 'dialog-panel';

export type FrostedSurfaceMaterialTokens = {
  lightSurfaceOverlayOpacity: number;
  darkSurfaceOverlayOpacity: number;
  borderVisible: boolean;
  sampleScale: number;
  sampleOverscanPx: number;
  sampleBlurPx: number;
  backdropMaskStrength: number;
};

export type FrostedSurfacePresetConfig = {
  shellClassName: string;
  radiusClassName: string;
  contentClassName: string;
  material: FrostedSurfaceMaterialTokens;
};

export type FrostedSurfaceMaterialTokenOverrides = Partial<FrostedSurfaceMaterialTokens>;

export const FROSTED_SURFACE_PRESET_ORDER = [
  'search-pill',
  'search-panel',
  'dropdown-panel',
  'popover-panel',
  'floating-toolbar',
  'dialog-panel',
] as const satisfies ReadonlyArray<FrostedSurfacePreset>;

const FROSTED_SURFACE_OVERRIDE_STORAGE_KEY = 'leaftab_frosted_surface_overrides_v1';
const FROSTED_SURFACE_OVERRIDE_EVENT = 'leaftab-frosted-surface-overrides-changed';
export const FROSTED_SURFACE_MATERIAL_TOKEN_KEYS = [
  'lightSurfaceOverlayOpacity',
  'darkSurfaceOverlayOpacity',
  'borderVisible',
  'sampleScale',
  'sampleOverscanPx',
  'sampleBlurPx',
  'backdropMaskStrength',
] as const satisfies ReadonlyArray<keyof FrostedSurfaceMaterialTokens>;
let cachedFrostedSurfaceOverrides: FrostedSurfaceMaterialTokenOverrides | null = null;
let cachedResolvedFrostedSurfaceMaterialTokens: FrostedSurfaceMaterialTokens | null = null;
let cachedResolvedFrostedSurfacePresets: Record<FrostedSurfacePreset, FrostedSurfacePresetConfig> | null = null;
let cachedFrostedSurfaceOverrideSignature: string | null = null;

const DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS: FrostedSurfaceMaterialTokens = {
  lightSurfaceOverlayOpacity: 0.9,
  darkSurfaceOverlayOpacity: 0.74,
  borderVisible: false,
  sampleScale: 1,
  sampleOverscanPx: 100,
  sampleBlurPx: 0,
  backdropMaskStrength: 1,
};

const LEGACY_PRESET_OVERRIDE_MIGRATION_PRIORITY: readonly FrostedSurfacePreset[] = [
  'dialog-panel',
  'dropdown-panel',
  'popover-panel',
  'search-panel',
  'search-pill',
  'floating-toolbar',
];

const DEFAULT_FROSTED_SURFACE_PRESETS: Record<FrostedSurfacePreset, FrostedSurfacePresetConfig> = {
  'search-pill': {
    shellClassName: 'content-stretch group relative isolate flex w-full min-w-0 self-stretch cursor-text items-center rounded-[999px]',
    radiusClassName: 'rounded-[999px]',
    contentClassName: 'relative z-10 flex w-full min-w-0 items-center',
    material: { ...DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS },
  },
  'search-panel': {
    shellClassName: 'relative isolate overflow-hidden rounded-[20px]',
    radiusClassName: 'rounded-[20px]',
    contentClassName: 'relative z-[1]',
    material: { ...DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS },
  },
  'dropdown-panel': {
    shellClassName: 'relative isolate overflow-hidden rounded-[18px] shadow-[0_16px_44px_rgba(8,12,18,0.18)]',
    radiusClassName: 'rounded-[18px]',
    contentClassName: 'relative z-[1]',
    material: { ...DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS },
  },
  'popover-panel': {
    shellClassName: 'relative isolate overflow-hidden rounded-xl shadow-[0_16px_44px_rgba(8,12,18,0.16)]',
    radiusClassName: 'rounded-xl',
    contentClassName: 'relative z-[1]',
    material: { ...DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS },
  },
  'floating-toolbar': {
    shellClassName: 'content-stretch group relative isolate rounded-[999px] shadow-xl',
    radiusClassName: 'rounded-[999px]',
    contentClassName: 'relative z-10',
    material: { ...DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS },
  },
  'dialog-panel': {
    shellClassName: 'relative isolate shadow-[0_20px_56px_rgba(8,12,18,0.24)]',
    radiusClassName: 'rounded-[32px]',
    contentClassName: 'relative z-10 grid min-w-0',
    material: { ...DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS },
  },
};

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeFrostedSurfaceOverride(
  key: keyof FrostedSurfaceMaterialTokens,
  value: unknown,
): FrostedSurfaceMaterialTokens[keyof FrostedSurfaceMaterialTokens] | undefined {
  if (key === 'borderVisible') {
    if (typeof value !== 'boolean') return undefined;
    return value;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  switch (key) {
    case 'lightSurfaceOverlayOpacity':
    case 'darkSurfaceOverlayOpacity':
      return clampNumber(value, 0, 1);
    case 'sampleScale':
      return clampNumber(value, 1, 1.12);
    case 'sampleOverscanPx':
      return clampNumber(Math.round(value), 0, 160);
    case 'sampleBlurPx':
      return clampNumber(Math.round(value), 0, 24);
    case 'backdropMaskStrength':
      return clampNumber(value, 0, 1.5);
    default:
      return undefined;
  }
}

function normalizeFrostedSurfaceMaterialTokenOverrides(
  raw: Record<string, unknown>,
): FrostedSurfaceMaterialTokenOverrides {
  const next: FrostedSurfaceMaterialTokenOverrides = {};
  const legacySurfaceOverlayOpacity = normalizeFrostedSurfaceOverride(
    'lightSurfaceOverlayOpacity',
    raw.surfaceOverlayOpacity,
  );

  FROSTED_SURFACE_MATERIAL_TOKEN_KEYS.forEach((tokenKey) => {
    const normalizedValue = normalizeFrostedSurfaceOverride(tokenKey, raw[tokenKey]);
    if (normalizedValue !== undefined) {
      next[tokenKey] = normalizedValue as never;
      return;
    }
    if (
      legacySurfaceOverlayOpacity !== undefined
      && (tokenKey === 'lightSurfaceOverlayOpacity' || tokenKey === 'darkSurfaceOverlayOpacity')
    ) {
      next[tokenKey] = legacySurfaceOverlayOpacity as never;
    }
  });

  return next;
}

function normalizeFrostedSurfaceOverrides(raw: unknown): FrostedSurfaceMaterialTokenOverrides {
  if (!raw || typeof raw !== 'object') return {};

  const record = raw as Record<string, unknown>;
  const hasFlatMaterialTokens = FROSTED_SURFACE_MATERIAL_TOKEN_KEYS.some((key) => key in record)
    || 'surfaceOverlayOpacity' in record;
  if (hasFlatMaterialTokens) {
    return normalizeFrostedSurfaceMaterialTokenOverrides(record);
  }

  for (const preset of LEGACY_PRESET_OVERRIDE_MIGRATION_PRIORITY) {
    const presetOverrides = record[preset];
    if (!presetOverrides || typeof presetOverrides !== 'object') continue;
    const normalized = normalizeFrostedSurfaceMaterialTokenOverrides(
      presetOverrides as Record<string, unknown>,
    );
    if (Object.keys(normalized).length > 0) {
      return normalized;
    }
  }

  return {};
}

function readStoredFrostedSurfaceOverrides(): FrostedSurfaceMaterialTokenOverrides {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(FROSTED_SURFACE_OVERRIDE_STORAGE_KEY);
    if (!raw) return {};
    return normalizeFrostedSurfaceOverrides(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeStoredFrostedSurfaceOverrides(next: FrostedSurfaceMaterialTokenOverrides) {
  if (typeof window === 'undefined') return;
  try {
    if (Object.keys(next).length === 0) {
      window.localStorage.removeItem(FROSTED_SURFACE_OVERRIDE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(FROSTED_SURFACE_OVERRIDE_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {}
}

function buildResolvedFrostedSurfacePresetMap(
  overrides: FrostedSurfaceMaterialTokenOverrides,
): Record<FrostedSurfacePreset, FrostedSurfacePresetConfig> {
  return Object.fromEntries(
    FROSTED_SURFACE_PRESET_ORDER.map((preset) => {
      const defaults = DEFAULT_FROSTED_SURFACE_PRESETS[preset];
      const resolved: FrostedSurfacePresetConfig = Object.keys(overrides).length === 0
        ? defaults
        : {
            ...defaults,
            material: {
              ...defaults.material,
              ...overrides,
            },
          };
      return [preset, resolved];
    }),
  ) as Record<FrostedSurfacePreset, FrostedSurfacePresetConfig>;
}

function setCachedFrostedSurfaceOverrideState(next: FrostedSurfaceMaterialTokenOverrides) {
  const signature = JSON.stringify(next);
  if (
    cachedFrostedSurfaceOverrideSignature === signature
    && cachedFrostedSurfaceOverrides
    && cachedResolvedFrostedSurfaceMaterialTokens
    && cachedResolvedFrostedSurfacePresets
  ) {
    return;
  }
  cachedFrostedSurfaceOverrides = next;
  cachedResolvedFrostedSurfaceMaterialTokens = Object.keys(next).length === 0
    ? DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS
    : {
        ...DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS,
        ...next,
      };
  cachedResolvedFrostedSurfacePresets = buildResolvedFrostedSurfacePresetMap(next);
  cachedFrostedSurfaceOverrideSignature = signature;
}

function ensureCachedFrostedSurfaceOverrideState() {
  if (
    cachedFrostedSurfaceOverrides
    && cachedResolvedFrostedSurfaceMaterialTokens
    && cachedResolvedFrostedSurfacePresets
  ) {
    return;
  }
  setCachedFrostedSurfaceOverrideState(readStoredFrostedSurfaceOverrides());
}

function refreshCachedFrostedSurfaceOverrideState() {
  setCachedFrostedSurfaceOverrideState(readStoredFrostedSurfaceOverrides());
}

function emitFrostedSurfaceOverrideChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(FROSTED_SURFACE_OVERRIDE_EVENT));
  }
}

function subscribeFrostedSurfacePreset(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handleChange = () => {
    refreshCachedFrostedSurfaceOverrideState();
    listener();
  };
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key !== null && event.key !== FROSTED_SURFACE_OVERRIDE_STORAGE_KEY) {
      return;
    }
    refreshCachedFrostedSurfaceOverrideState();
    listener();
  };
  window.addEventListener(FROSTED_SURFACE_OVERRIDE_EVENT, handleChange);
  window.addEventListener('storage', handleStorageChange);
  return () => {
    window.removeEventListener(FROSTED_SURFACE_OVERRIDE_EVENT, handleChange);
    window.removeEventListener('storage', handleStorageChange);
  };
}

export function getDefaultFrostedSurfacePreset(preset: FrostedSurfacePreset) {
  return DEFAULT_FROSTED_SURFACE_PRESETS[preset];
}

export function getDefaultFrostedSurfaceMaterialTokens() {
  return DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS;
}

export function getFrostedSurfaceMaterialTokenOverrides() {
  ensureCachedFrostedSurfaceOverrideState();
  return cachedFrostedSurfaceOverrides ?? {};
}

export function getFrostedSurfaceMaterialTokens(): FrostedSurfaceMaterialTokens {
  ensureCachedFrostedSurfaceOverrideState();
  return cachedResolvedFrostedSurfaceMaterialTokens ?? DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS;
}

export function getFrostedSurfacePreset(preset: FrostedSurfacePreset): FrostedSurfacePresetConfig {
  ensureCachedFrostedSurfaceOverrideState();
  return cachedResolvedFrostedSurfacePresets?.[preset] ?? DEFAULT_FROSTED_SURFACE_PRESETS[preset];
}

export function useFrostedSurfacePreset(preset: FrostedSurfacePreset) {
  return useSyncExternalStore(
    subscribeFrostedSurfacePreset,
    () => getFrostedSurfacePreset(preset),
    () => DEFAULT_FROSTED_SURFACE_PRESETS[preset],
  );
}

export function useFrostedSurfaceMaterialTokens() {
  return useSyncExternalStore(
    subscribeFrostedSurfacePreset,
    getFrostedSurfaceMaterialTokens,
    () => DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS,
  );
}

export function updateFrostedSurfaceMaterialTokenOverride(
  key: keyof FrostedSurfaceMaterialTokens,
  value: FrostedSurfaceMaterialTokens[keyof FrostedSurfaceMaterialTokens],
) {
  const normalizedValue = normalizeFrostedSurfaceOverride(key, value);
  if (normalizedValue === undefined) return;
  const current = readStoredFrostedSurfaceOverrides();
  const nextOverrides: FrostedSurfaceMaterialTokenOverrides = {
    ...current,
    [key]: normalizedValue,
  };
  if (nextOverrides[key] === DEFAULT_FROSTED_SURFACE_MATERIAL_TOKENS[key]) {
    delete nextOverrides[key];
  }
  writeStoredFrostedSurfaceOverrides(nextOverrides);
  setCachedFrostedSurfaceOverrideState(nextOverrides);
  emitFrostedSurfaceOverrideChange();
}

export function resetFrostedSurfaceMaterialTokenOverrides() {
  writeStoredFrostedSurfaceOverrides({});
  setCachedFrostedSurfaceOverrideState({});
  emitFrostedSurfaceOverrideChange();
}
