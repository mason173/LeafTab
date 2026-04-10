import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RETRY_STORAGE_PREFIX = 'leaftab_lazy_reload_once:';

const isChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return [
    'Failed to fetch dynamically imported module',
    'Importing a module script failed',
    'Loading chunk',
    'ChunkLoadError',
    'ERR_FILE_NOT_FOUND',
  ].some((pattern) => message.includes(pattern));
};

const hangForever = () => new Promise<never>(() => {});

export function lazyWithPageReload<TModule, TComponent extends ComponentType<any>>(
  cacheKey: string,
  importer: () => Promise<TModule>,
  resolveDefault: (module: TModule) => TComponent,
): LazyExoticComponent<TComponent> {
  return lazy(async () => {
    try {
      const loaded = await importer();
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem(`${RETRY_STORAGE_PREFIX}${cacheKey}`);
        } catch {}
      }
      return { default: resolveDefault(loaded) };
    } catch (error) {
      if (typeof window !== 'undefined' && isChunkLoadError(error)) {
        const storageKey = `${RETRY_STORAGE_PREFIX}${cacheKey}`;
        let shouldReload = false;
        try {
          shouldReload = sessionStorage.getItem(storageKey) !== '1';
          if (shouldReload) {
            sessionStorage.setItem(storageKey, '1');
          } else {
            sessionStorage.removeItem(storageKey);
          }
        } catch {
          shouldReload = true;
        }

        if (shouldReload) {
          window.location.reload();
          return hangForever();
        }
      }
      throw error;
    }
  });
}
