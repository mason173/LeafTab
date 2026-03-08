import { useState, useEffect } from 'react';
import { getWallpaper } from '../db';
import imgImage from "../assets/Default_wallpaper.png";

export function useWallpaper() {
  const [bingWallpaper, setBingWallpaper] = useState('');
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);
  const [wallpaperMode, setWallpaperMode] = useState<'bing' | 'weather' | 'custom'>(() => {
    const saved = localStorage.getItem('wallpaperMode');
    return (saved === 'bing' || saved === 'weather' || saved === 'custom') ? saved : 'bing';
  });
  const [weatherCode, setWeatherCode] = useState<number>(2);
  const [isWallpaperExpanded, setIsWallpaperExpanded] = useState(false);

  useEffect(() => {
    localStorage.setItem('wallpaperMode', wallpaperMode);
  }, [wallpaperMode]);

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
    isWallpaperExpanded, setIsWallpaperExpanded,
  };
}
