import balconyDaydreamVideo from '@/assets/dynamic-wallpapers/balcony-daydream.webm';
import balconyDaydreamPoster from '@/assets/dynamic-wallpapers/balcony-daydream-poster.jpg';
import courtyardEveningVideo from '@/assets/dynamic-wallpapers/courtyard-evening.webm';
import courtyardEveningPoster from '@/assets/dynamic-wallpapers/courtyard-evening-poster.jpg';
import courtyardHeartVideo from '@/assets/dynamic-wallpapers/courtyard-heart.webm';
import courtyardHeartPoster from '@/assets/dynamic-wallpapers/courtyard-heart-poster.jpg';
import courtyardNightVideo from '@/assets/dynamic-wallpapers/courtyard-night.webm';
import courtyardNightPoster from '@/assets/dynamic-wallpapers/courtyard-night-poster.jpg';
import dynamicNewOneVideo from '@/assets/dynamic-wallpapers/dynamic-new-1.webm';
import dynamicNewOnePoster from '@/assets/dynamic-wallpapers/dynamic-new-1-poster.jpg';
import meadowDaydreamVideo from '@/assets/dynamic-wallpapers/meadow-daydream.webm';
import meadowDaydreamPoster from '@/assets/dynamic-wallpapers/meadow-daydream-poster.jpg';
import roseCourtyardVideo from '@/assets/dynamic-wallpapers/rose-courtyard.webm';
import roseCourtyardPoster from '@/assets/dynamic-wallpapers/rose-courtyard-poster.jpg';

export type DynamicWallpaperId =
  | 'balcony-daydream'
  | 'courtyard-night'
  | 'courtyard-evening'
  | 'courtyard-heart'
  | 'dynamic-new-1'
  | 'meadow-daydream'
  | 'rose-courtyard';

export type DynamicWallpaperOption = {
  id: DynamicWallpaperId;
  name: string;
  src: string;
  posterSrc: string;
  playbackRate?: number;
  accentPalette: string[];
};

export const DYNAMIC_WALLPAPER_OPTIONS: DynamicWallpaperOption[] = [
  {
    id: 'balcony-daydream',
    name: 'Balcony Daydream',
    src: balconyDaydreamVideo,
    posterSrc: balconyDaydreamPoster,
    accentPalette: ['#7aa6b8', '#c7826f', '#f1b978', '#6b8f74', '#d97a88', '#5d7199'],
  },
  {
    id: 'courtyard-night',
    name: 'Courtyard Night',
    src: courtyardNightVideo,
    posterSrc: courtyardNightPoster,
    accentPalette: ['#4f6f9f', '#7d70a8', '#d48b78', '#5f8f8a', '#c8a76b', '#364968'],
  },
  {
    id: 'courtyard-evening',
    name: 'Courtyard Evening',
    src: courtyardEveningVideo,
    posterSrc: courtyardEveningPoster,
    accentPalette: ['#d98a5f', '#6f8fb0', '#c5a35e', '#8a6fa8', '#587a6b', '#b55d6a'],
  },
  {
    id: 'courtyard-heart',
    name: 'Courtyard Heart',
    src: courtyardHeartVideo,
    posterSrc: courtyardHeartPoster,
    accentPalette: ['#d56f85', '#89a75f', '#c6a15d', '#6f9bb1', '#aa6c98', '#5f7f70'],
  },
  {
    id: 'dynamic-new-1',
    name: 'Ripple Reverie',
    src: dynamicNewOneVideo,
    posterSrc: dynamicNewOnePoster,
    playbackRate: 0.5,
    accentPalette: ['#5aa7d8', '#7fbc8c', '#d7a95f', '#9077c8', '#d7749b', '#4f8f9f'],
  },
  {
    id: 'meadow-daydream',
    name: 'Meadow Daydream',
    src: meadowDaydreamVideo,
    posterSrc: meadowDaydreamPoster,
    accentPalette: ['#75a85d', '#60a7c8', '#d9b45f', '#d27a73', '#8b74b8', '#5c8f78'],
  },
  {
    id: 'rose-courtyard',
    name: 'Rose Courtyard',
    src: roseCourtyardVideo,
    posterSrc: roseCourtyardPoster,
    accentPalette: ['#d66f8f', '#8ba85d', '#c99a63', '#6f9fbd', '#a86da0', '#5f806f'],
  },
] as const;

export const DEFAULT_DYNAMIC_WALLPAPER_ID: DynamicWallpaperId = DYNAMIC_WALLPAPER_OPTIONS[0].id;

export function isDynamicWallpaperId(value: string | null | undefined): value is DynamicWallpaperId {
  if (!value) return false;
  return DYNAMIC_WALLPAPER_OPTIONS.some((option) => option.id === value);
}

export function resolveDynamicWallpaperById(id: string | null | undefined): DynamicWallpaperOption {
  if (id) {
    const matched = DYNAMIC_WALLPAPER_OPTIONS.find((option) => option.id === id);
    if (matched) return matched;
  }
  return DYNAMIC_WALLPAPER_OPTIONS[0];
}

export function resolveDynamicWallpaperAccentPaletteBySrc(src: string | null | undefined): string[] | null {
  if (!src) return null;
  const matched = DYNAMIC_WALLPAPER_OPTIONS.find((option) => option.src === src);
  return matched?.accentPalette || null;
}
