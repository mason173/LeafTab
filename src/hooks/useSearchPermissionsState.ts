import { useCallback, useEffect, useState } from 'react';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import { scheduleAfterInteractivePaint } from '@/utils/mainThreadScheduler';
import type { SearchSuggestionPermission } from '@/utils/searchCommands';

const SEARCH_PERMISSION_KEYS: SearchSuggestionPermission[] = ['bookmarks', 'history', 'tabs'];

type UseSearchPermissionsStateArgs = {
  onPermissionDenied?: (permission: SearchSuggestionPermission) => void;
  onRequestFailed?: () => void;
};

export function useSearchPermissionsState({
  onPermissionDenied,
  onRequestFailed,
}: UseSearchPermissionsStateArgs = {}) {
  const [searchPermissions, setSearchPermissions] = useState<Record<SearchSuggestionPermission, boolean>>(() => ({
    bookmarks: typeof chrome === 'undefined' || !chrome.runtime?.id,
    history: typeof chrome === 'undefined' || !chrome.runtime?.id,
    tabs: typeof chrome === 'undefined' || !chrome.runtime?.id,
  }));
  const [searchPermissionsReady, setSearchPermissionsReady] = useState<boolean>(() => (
    typeof chrome === 'undefined' || !chrome.runtime?.id
  ));
  const [permissionRequestInFlight, setPermissionRequestInFlight] = useState<SearchSuggestionPermission | null>(null);
  const [permissionWarmup, setPermissionWarmup] = useState<SearchSuggestionPermission | null>(null);

  const setSearchPermissionGranted = useCallback((permission: SearchSuggestionPermission, granted: boolean) => {
    setSearchPermissions((prev) => {
      if (prev[permission] === granted) return prev;
      return {
        ...prev,
        [permission]: granted,
      };
    });
    setSearchPermissionsReady(true);
  }, []);

  const refreshSearchPermissionStatus = useCallback((
    permissions: SearchSuggestionPermission[] = SEARCH_PERMISSION_KEYS,
  ) => {
    void Promise.all(
      permissions.map((permission) => ensureExtensionPermission(permission, { requestIfNeeded: false })
        .then((granted) => ({ permission, granted }))
        .catch(() => ({ permission, granted: false }))),
    ).then((results) => {
      setSearchPermissions((prev) => {
        let changed = false;
        const next = { ...prev };
        results.forEach(({ permission, granted }) => {
          if (next[permission] !== granted) {
            next[permission] = granted;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      setSearchPermissionsReady(true);
    });
  }, []);

  useEffect(() => {
    refreshSearchPermissionStatus();
  }, [refreshSearchPermissionStatus]);

  useEffect(() => {
    const permissionsApi = globalThis.chrome?.permissions;
    if (!permissionsApi?.onAdded || !permissionsApi?.onRemoved) return;

    const handlePermissionsChanged = () => {
      refreshSearchPermissionStatus();
    };

    permissionsApi.onAdded.addListener(handlePermissionsChanged);
    permissionsApi.onRemoved.addListener(handlePermissionsChanged);
    return () => {
      permissionsApi.onAdded.removeListener(handlePermissionsChanged);
      permissionsApi.onRemoved.removeListener(handlePermissionsChanged);
    };
  }, [refreshSearchPermissionStatus]);

  const runAfterSearchPermission = useCallback((
    permission: SearchSuggestionPermission,
    onGranted: () => void,
  ) => {
    if (searchPermissions[permission]) {
      onGranted();
      return;
    }
    if (permissionRequestInFlight === permission) return;

    const chromeApi = (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome;
    const runtime = chromeApi?.runtime;
    const permissionsApi = chromeApi?.permissions;
    if (!runtime?.id || !permissionsApi?.request) {
      setSearchPermissionGranted(permission, true);
      onGranted();
      return;
    }

    setPermissionRequestInFlight(permission);
    permissionsApi.request({ permissions: [permission] }, (allowed: boolean) => {
      setPermissionRequestInFlight((current) => (current === permission ? null : current));
      const lastError = runtime.lastError;
      if (lastError) {
        onRequestFailed?.();
        return;
      }
      if (!allowed) {
        setSearchPermissionGranted(permission, false);
        onPermissionDenied?.(permission);
        return;
      }
      setSearchPermissionGranted(permission, true);
      setPermissionWarmup(permission);
      scheduleAfterInteractivePaint(() => {
        setPermissionWarmup((current) => (current === permission ? null : current));
        onGranted();
      });
    });
  }, [
    onPermissionDenied,
    onRequestFailed,
    permissionRequestInFlight,
    searchPermissions,
    setSearchPermissionGranted,
  ]);

  return {
    searchPermissions,
    searchPermissionsReady,
    permissionRequestInFlight,
    permissionWarmup,
    setSearchPermissionGranted,
    refreshSearchPermissionStatus,
    runAfterSearchPermission,
  };
}
