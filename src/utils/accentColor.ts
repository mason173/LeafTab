export const WALLPAPER_ACCENT_SLOT_COUNT = 6;
export const WALLPAPER_ACCENT_SLOT_PREFIX = 'wallpaper-';
export const ADAPTIVE_NEUTRAL_ACCENT = 'adaptive-neutral';
export const DEFAULT_ACCENT_COLOR = `${WALLPAPER_ACCENT_SLOT_PREFIX}0`;
export const LIGHT_ADAPTIVE_NEUTRAL_ACCENT = '#3f3f46';
export const DARK_ADAPTIVE_NEUTRAL_ACCENT = '#ffffff';

export const LEGACY_NAMED_ACCENT_COLORS = {
  blue: '#3b82f6',
  purple: '#a855f7',
  green: '#22c55e',
  orange: '#f97316',
  pink: '#ec4899',
  red: '#ef4444',
} as const;

export const normalizeAccentColorSelection = (value: unknown): string => (
  typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_ACCENT_COLOR
);

export const getWallpaperAccentSlotKey = (index: number) => (
  `${WALLPAPER_ACCENT_SLOT_PREFIX}${Math.max(0, Math.min(WALLPAPER_ACCENT_SLOT_COUNT - 1, index))}`
);

export const getWallpaperAccentSlotIndex = (value: string): number | null => {
  const match = /^wallpaper-(\d+)$/.exec(value.trim());
  if (!match) return null;
  const index = Number(match[1]);
  if (!Number.isInteger(index) || index < 0 || index >= WALLPAPER_ACCENT_SLOT_COUNT) return null;
  return index;
};

export const isWallpaperAccentSelection = (value: string): boolean => (
  getWallpaperAccentSlotIndex(value) !== null
);

export const isHexAccentColor = (value: string): boolean => (
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
);

const normalizeHexColor = (value: string): string => {
  const trimmed = value.trim().replace('#', '');
  if (trimmed.length === 3) {
    return `#${trimmed.split('').map((char) => `${char}${char}`).join('')}`;
  }
  return `#${trimmed}`;
};

const hexToRgb = (value: string) => {
  const hex = normalizeHexColor(value);
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number) => (
  `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')}`
);

const mixHexColors = (value: string, target: '#000000' | '#ffffff', amount: number) => {
  const source = hexToRgb(value);
  const targetRgb = target === '#000000'
    ? { r: 0, g: 0, b: 0 }
    : { r: 255, g: 255, b: 255 };
  const safeAmount = Math.max(0, Math.min(1, amount));
  return rgbToHex(
    source.r + (targetRgb.r - source.r) * safeAmount,
    source.g + (targetRgb.g - source.g) * safeAmount,
    source.b + (targetRgb.b - source.b) * safeAmount,
  );
};

const getRelativeLuminance = (value: string) => {
  const { r, g, b } = hexToRgb(value);
  const toLinear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

export const getContrastRatio = (foreground: string, background: string) => {
  if (!isHexAccentColor(foreground) || !isHexAccentColor(background)) return 1;
  const lighter = Math.max(getRelativeLuminance(foreground), getRelativeLuminance(background));
  const darker = Math.min(getRelativeLuminance(foreground), getRelativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

export const darkenAccentColor = (value: string, amount = 0.22): string => {
  if (!isHexAccentColor(value)) return value;
  const hex = normalizeHexColor(value);
  const channelValues = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((channel) => Number.parseInt(channel, 16));
  const safeAmount = Math.max(0, Math.min(0.95, amount));
  return `#${channelValues
    .map((channel) => Math.round(channel * (1 - safeAmount)).toString(16).padStart(2, '0'))
    .join('')}`;
};

export const resolveAccentDetailColor = (
  value: string,
  options?: {
    minContrast?: number;
  },
): string => {
  if (!isHexAccentColor(value)) return value;
  const base = normalizeHexColor(value);
  const minContrast = Math.max(1, options?.minContrast ?? 2.4);
  const luminance = getRelativeLuminance(base);
  const darkerMixes = [0.18, 0.28, 0.38, 0.5, 0.62, 0.74, 0.84];
  const lighterMixes = [0.16, 0.26, 0.36, 0.48, 0.6, 0.72, 0.84];
  const preferredFirst = luminance > 0.4 ? ['dark', 'light'] as const : ['light', 'dark'] as const;
  const candidates = preferredFirst.flatMap((direction) => {
    const mixes = direction === 'dark' ? darkerMixes : lighterMixes;
    const target = direction === 'dark' ? '#000000' : '#ffffff';
    return mixes.map((amount) => {
      const candidate = mixHexColors(base, target, amount);
      return {
        amount,
        candidate,
        contrast: getContrastRatio(candidate, base),
      };
    });
  });

  const meetingTarget = candidates
    .filter((candidate) => candidate.contrast >= minContrast)
    .sort((left, right) => left.amount - right.amount);
  if (meetingTarget.length > 0) return meetingTarget[0].candidate;

  return candidates.reduce((best, current) => (
    current.contrast > best.contrast ? current : best
  )).candidate;
};

export const resolveAdaptiveNeutralAccent = (isDarkTheme: boolean): string => (
  isDarkTheme ? DARK_ADAPTIVE_NEUTRAL_ACCENT : LIGHT_ADAPTIVE_NEUTRAL_ACCENT
);

export const resolveLegacyNamedAccentColor = (
  value: string,
  isDarkTheme: boolean,
): string | null => {
  if (value === 'mono') return resolveAdaptiveNeutralAccent(isDarkTheme);
  return LEGACY_NAMED_ACCENT_COLORS[value as keyof typeof LEGACY_NAMED_ACCENT_COLORS] || null;
};
