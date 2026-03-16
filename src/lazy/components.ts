import { lazy } from 'react';

export const LazyAppDialogs = lazy(() =>
  import('../components/AppDialogs').then((module) => ({ default: module.AppDialogs })),
);

export const LazyWallpaperSelector = lazy(() => import('../components/WallpaperSelector'));

export const LazyUpdateAvailableDialog = lazy(() =>
  import('../components/UpdateAvailableDialog').then((module) => ({
    default: module.UpdateAvailableDialog,
  })),
);

export const LazyRoleSelector = lazy(() =>
  import('../components/RoleSelector').then((module) => ({ default: module.RoleSelector })),
);

export const LazyDynamicWallpaperScene = lazy(() =>
  import('../components/wallpaper/LazyDynamicWallpaperScene').then((module) => ({
    default: module.LazyDynamicWallpaperScene,
  })),
);

export const LazyWeatherCard = lazy(() =>
  import('../components/WeatherCard').then((module) => ({ default: module.WeatherCard })),
);
