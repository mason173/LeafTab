import { lazy } from 'react';

export const LazyWallpaperSelector = lazy(() => import('../components/WallpaperSelector'));

export const LazyUpdateAvailableDialog = lazy(() =>
  import('../components/UpdateAvailableDialog').then((module) => ({
    default: module.UpdateAvailableDialog,
  })),
);

export const LazyRoleSelector = lazy(() =>
  import('../components/RoleSelector').then((module) => ({ default: module.RoleSelector })),
);

export const LazyWeatherCard = lazy(() =>
  import('../components/WeatherCard').then((module) => ({ default: module.WeatherCard })),
);
