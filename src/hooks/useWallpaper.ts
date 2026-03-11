import { useState, useEffect } from 'react';
import { getWallpaper } from '../db';
import imgImage from "../assets/Default_wallpaper.png";
import { COLOR_WALLPAPER_PRESETS, DEFAULT_COLOR_WALLPAPER_ID } from '@/components/wallpaper/colorWallpapers';

const DEFAULT_WALLPAPER_MASK_OPACITY = 10;

const parseMaskOpacity = (value: string | null): number => {
  if (!value) return DEFAULT_WALLPAPER_MASK_OPACITY;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_WALLPAPER_MASK_OPACITY;
  return Math.max(0, Math.min(100, parsed));
};

export function useWallpaper() {
  const [bingWallpaper, setBingWallpaper] = useState('');
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);
  const [wallpaperMode, setWallpaperMode] = useState<'bing' | 'weather' | 'color' | 'custom'>(() => {
    const saved = localStorage.getItem('wallpaperMode');
    return (saved === 'bing' || saved === 'weather' || saved === 'color' || saved === 'custom') ? saved : 'bing';
  });
  const [weatherCode, setWeatherCode] = useState<number>(2);
  const [wallpaperMaskOpacity, setWallpaperMaskOpacity] = useState<number>(() =>
    parseMaskOpacity(localStorage.getItem('wallpaperMaskOpacity')),
  );
  const [colorWallpaperId, setColorWallpaperId] = useState<string>(() => {
    const saved = localStorage.getItem('colorWallpaperId');
    if (!saved) return DEFAULT_COLOR_WALLPAPER_ID;
    const exists = COLOR_WALLPAPER_PRESETS.some((preset) => preset.id === saved);
    return exists ? saved : DEFAULT_COLOR_WALLPAPER_ID;
  });

  useEffect(() => {
    localStorage.setItem('wallpaperMode', wallpaperMode);
  }, [wallpaperMode]);

  useEffect(() => {
    localStorage.setItem('wallpaperMaskOpacity', String(wallpaperMaskOpacity));
  }, [wallpaperMaskOpacity]);

  useEffect(() => {
    localStorage.setItem('colorWallpaperId', colorWallpaperId);
  }, [colorWallpaperId]);

  useEffect(() => {
    getWallpaper().then((wallpaper) => {
      if (wallpaper) setCustomWallpaper(wallpaper);
    });
  }, []);

  useEffect(() => {
    const fetchBingWallpaper = async () => {
      try {
        const market = navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
        const response = await fetch(`https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=${market}`);
        const data = await response.json();
        if (data.url) setBingWallpaper(data.url);
        else setBingWallpaper(imgImage);
      } catch (error) {
        setBingWallpaper(imgImage);
      }
    };
    fetchBingWallpaper();
  }, []);

  return {
    bingWallpaper, setBingWallpaper,
    customWallpaper, setCustomWallpaper,
    wallpaperMode, setWallpaperMode,
    weatherCode, setWeatherCode,
    wallpaperMaskOpacity, setWallpaperMaskOpacity,
    colorWallpaperId, setColorWallpaperId,
  };
}
