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
};

export const DYNAMIC_WALLPAPER_OPTIONS: DynamicWallpaperOption[] = [
  {
    id: 'balcony-daydream',
    name: 'Balcony Daydream',
    src: balconyDaydreamVideo,
    posterSrc: balconyDaydreamPoster,
  },
  {
    id: 'courtyard-night',
    name: 'Courtyard Night',
    src: courtyardNightVideo,
    posterSrc: courtyardNightPoster,
  },
  {
    id: 'courtyard-evening',
    name: 'Courtyard Evening',
    src: courtyardEveningVideo,
    posterSrc: courtyardEveningPoster,
  },
  {
    id: 'courtyard-heart',
    name: 'Courtyard Heart',
    src: courtyardHeartVideo,
    posterSrc: courtyardHeartPoster,
  },
  {
    id: 'dynamic-new-1',
    name: 'Ripple Reverie',
    src: dynamicNewOneVideo,
    posterSrc: dynamicNewOnePoster,
    playbackRate: 0.5,
  },
  {
    id: 'meadow-daydream',
    name: 'Meadow Daydream',
    src: meadowDaydreamVideo,
    posterSrc: meadowDaydreamPoster,
  },
  {
    id: 'rose-courtyard',
    name: 'Rose Courtyard',
    src: roseCourtyardVideo,
    posterSrc: roseCourtyardPoster,
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
