export type RotatableWallpaperMode = "dynamic" | "color" | "custom";

export type WallpaperRotationInterval = "off" | "hourly" | "six-hours" | "daily";

export type WallpaperRotationSettings = Record<RotatableWallpaperMode, WallpaperRotationInterval>;

export type WallpaperRotationOffsets = Record<RotatableWallpaperMode, number>;

export const ROTATABLE_WALLPAPER_MODES: RotatableWallpaperMode[] = ["dynamic", "color", "custom"];

export const DEFAULT_WALLPAPER_ROTATION_SETTINGS: WallpaperRotationSettings = {
  dynamic: "off",
  color: "off",
  custom: "off",
};

export const DEFAULT_WALLPAPER_ROTATION_OFFSETS: WallpaperRotationOffsets = {
  dynamic: 0,
  color: 0,
  custom: 0,
};

const WALLPAPER_ROTATION_INTERVAL_MS: Record<Exclude<WallpaperRotationInterval, "off">, number> = {
  hourly: 60 * 60 * 1000,
  "six-hours": 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

export const isRotatableWallpaperMode = (value: string): value is RotatableWallpaperMode =>
  value === "dynamic" || value === "color" || value === "custom";

export const isWallpaperRotationInterval = (value: unknown): value is WallpaperRotationInterval =>
  value === "off" || value === "hourly" || value === "six-hours" || value === "daily";

export const normalizeWallpaperRotationSettings = (value: unknown): WallpaperRotationSettings => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_WALLPAPER_ROTATION_SETTINGS;
  }

  const candidate = value as Partial<Record<RotatableWallpaperMode, unknown>>;
  return {
    dynamic: isWallpaperRotationInterval(candidate.dynamic) ? candidate.dynamic : DEFAULT_WALLPAPER_ROTATION_SETTINGS.dynamic,
    color: isWallpaperRotationInterval(candidate.color) ? candidate.color : DEFAULT_WALLPAPER_ROTATION_SETTINGS.color,
    custom: isWallpaperRotationInterval(candidate.custom) ? candidate.custom : DEFAULT_WALLPAPER_ROTATION_SETTINGS.custom,
  };
};

export const normalizeWallpaperRotationOffsets = (value: unknown): WallpaperRotationOffsets => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_WALLPAPER_ROTATION_OFFSETS;
  }

  const candidate = value as Partial<Record<RotatableWallpaperMode, unknown>>;
  const normalizeValue = (offset: unknown) => (Number.isFinite(Number(offset)) ? Number(offset) : 0);

  return {
    dynamic: normalizeValue(candidate.dynamic),
    color: normalizeValue(candidate.color),
    custom: normalizeValue(candidate.custom),
  };
};

const getLocalWallClockMs = (date = new Date()): number =>
  date.getTime() - date.getTimezoneOffset() * 60 * 1000;

export const getWallpaperRotationSlot = (
  interval: Exclude<WallpaperRotationInterval, "off">,
  date = new Date(),
): number => {
  const intervalMs = WALLPAPER_ROTATION_INTERVAL_MS[interval];
  return Math.floor(getLocalWallClockMs(date) / intervalMs);
};

export const getWallpaperRotationNextDelay = (
  interval: Exclude<WallpaperRotationInterval, "off">,
  date = new Date(),
): number => {
  const localMs = getLocalWallClockMs(date);
  const intervalMs = WALLPAPER_ROTATION_INTERVAL_MS[interval];
  const nextBoundary = (Math.floor(localMs / intervalMs) + 1) * intervalMs;
  return Math.max(1000, nextBoundary - localMs + 120);
};

export const normalizeWallpaperRotationIndex = (value: number, length: number): number => {
  if (length <= 0) return 0;
  return ((value % length) + length) % length;
};
