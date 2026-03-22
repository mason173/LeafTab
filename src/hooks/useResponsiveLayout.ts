import { useEffect, useMemo, useState } from 'react';

export type LayoutDensity = 'compact' | 'regular' | 'large';

export type ResponsiveLayout = {
  density: LayoutDensity;
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  mainTopMargin: number;
  mainGap: number;
  wallpaperHeight: number;
  wallpaperRadius: number;
  clockFontSize: number;
  clockMetaFontSize: number;
  searchHeight: number;
  searchInputFontSize: number;
  searchHorizontalPadding: number;
  searchActionSize: number;
  compactShortcutSize: number;
  compactShortcutTitleSize: number;
  defaultShortcutIconSize: number;
  defaultShortcutTitleSize: number;
  defaultShortcutUrlSize: number;
  defaultShortcutVerticalPadding: number;
  compactRowGap: number;
  defaultRowGap: number;
  baseRows: number;
};

const classifyDensity = (width: number, height: number): LayoutDensity => {
  if (width >= 1920 && height >= 1000) return 'large';
  if (width <= 1366 || height <= 800) return 'compact';
  return 'regular';
};

const readViewport = () => {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export function useResponsiveLayout(): ResponsiveLayout {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    let rafId = 0;
    const onResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setViewport(readViewport());
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return useMemo(() => {
    const density = classifyDensity(viewport.width, viewport.height);
    if (density === 'compact') {
      return {
        density,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        contentWidth: 920,
        mainTopMargin: 20,
        mainGap: 12,
        wallpaperHeight: 220,
        wallpaperRadius: 24,
        clockFontSize: 76,
        clockMetaFontSize: 14,
        searchHeight: 46,
        searchInputFontSize: 16,
        searchHorizontalPadding: 18,
        searchActionSize: 38,
        compactShortcutSize: 60,
        compactShortcutTitleSize: 11,
        defaultShortcutIconSize: 32,
        defaultShortcutTitleSize: 13,
        defaultShortcutUrlSize: 10,
        defaultShortcutVerticalPadding: 7,
        compactRowGap: 16,
        defaultRowGap: 8,
        baseRows: 3,
      };
    }
    if (density === 'large') {
      return {
        density,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        contentWidth: 1160,
        mainTopMargin: 36,
        mainGap: 18,
        wallpaperHeight: 292,
        wallpaperRadius: 32,
        clockFontSize: 112,
        clockMetaFontSize: 17,
        searchHeight: 58,
        searchInputFontSize: 20,
        searchHorizontalPadding: 28,
        searchActionSize: 46,
        compactShortcutSize: 80,
        compactShortcutTitleSize: 13,
        defaultShortcutIconSize: 40,
        defaultShortcutTitleSize: 15,
        defaultShortcutUrlSize: 11,
        defaultShortcutVerticalPadding: 8,
        compactRowGap: 24,
        defaultRowGap: 8,
        baseRows: 5,
      };
    }
    return {
      density: 'regular',
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      contentWidth: 1000,
      mainTopMargin: 32,
      mainGap: 16,
      wallpaperHeight: 252,
      wallpaperRadius: 28,
      clockFontSize: 100,
      clockMetaFontSize: 16,
      searchHeight: 52,
      searchInputFontSize: 18,
      searchHorizontalPadding: 24,
      searchActionSize: 42,
      compactShortcutSize: 72,
      compactShortcutTitleSize: 12,
      defaultShortcutIconSize: 36,
      defaultShortcutTitleSize: 14,
      defaultShortcutUrlSize: 10,
      defaultShortcutVerticalPadding: 8,
      compactRowGap: 20,
      defaultRowGap: 8,
      baseRows: 4,
    };
  }, [viewport.height, viewport.width]);
}
