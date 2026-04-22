import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncCenterActions } from './useSyncCenterActions';

const toastErrorSpy = vi.fn();
const toastInfoSpy = vi.fn();
const toastSuccessSpy = vi.fn();
const ensureExtensionPermissionSpy = vi.fn();

vi.mock('@/components/ui/sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorSpy(...args),
    info: (...args: unknown[]) => toastInfoSpy(...args),
    success: (...args: unknown[]) => toastSuccessSpy(...args),
  },
}));

vi.mock('@/utils/extensionPermissions', () => ({
  ensureExtensionPermission: (...args: unknown[]) => ensureExtensionPermissionSpy(...args),
}));

function translate(key: string, options?: Record<string, unknown>) {
  const template = typeof options?.defaultValue === 'string'
    ? options.defaultValue
    : key;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, token) => String(options?.[token] ?? ''));
}

function createHarness(overrides?: Partial<Parameters<typeof useSyncCenterActions>[0]>) {
  const handleCloudLeafTabSync = vi.fn().mockResolvedValue(true);
  const handleLeafTabSync = vi.fn().mockResolvedValue(true);
  const setCloudSyncBookmarksPermissionGranted = vi.fn();
  const ensureSyncEncryptionAccess = vi.fn().mockResolvedValue(true);
  const ensureCloudLegacyMigrationReady = vi.fn().mockResolvedValue(true);
  const setIsAuthModalOpen = vi.fn();
  const setLeafTabSyncDialogOpen = vi.fn();
  const setCloudSyncConfigOpen = vi.fn();
  const setCloudNextSyncAt = vi.fn();
  const openLeafTabSyncConfig = vi.fn();
  const runLongTask = vi.fn(async (_initial, runner) => runner({ update: vi.fn() }));

  const hook = renderHook(() => useSyncCenterActions({
    user: 'mason',
    t: translate,
    leafTabSyncHasConfig: true,
    cloudSyncing: false,
    webdavSyncing: false,
    webdavSyncBookmarksEnabled: true,
    cloudSyncBookmarksConfigured: true,
    cloudSyncBookmarksEnabled: false,
    cloudSyncEncryptionScopeKey: 'cloud-scope',
    cloudSyncEncryptedTransport: null,
    setCloudSyncBookmarksPermissionGranted,
    ensureSyncEncryptionAccess,
    ensureCloudLegacyMigrationReady,
    handleCloudLeafTabSync,
    handleLeafTabSync,
    setIsAuthModalOpen,
    setLeafTabSyncDialogOpen,
    setCloudSyncConfigOpen,
    runLongTask,
    setCloudNextSyncAt,
    openLeafTabSyncConfig,
    ...overrides,
  }));

  return {
    ...hook,
    handleCloudLeafTabSync,
    handleLeafTabSync,
    setCloudSyncBookmarksPermissionGranted,
    ensureSyncEncryptionAccess,
    ensureCloudLegacyMigrationReady,
    setIsAuthModalOpen,
    setLeafTabSyncDialogOpen,
    setCloudSyncConfigOpen,
    runLongTask,
  };
}

describe('useSyncCenterActions', () => {
  beforeEach(() => {
    localStorage.clear();
    toastErrorSpy.mockReset();
    toastInfoSpy.mockReset();
    toastSuccessSpy.mockReset();
    ensureExtensionPermissionSpy.mockReset();
  });

  it('forces bookmark sync during cloud repair after permission is granted', async () => {
    ensureExtensionPermissionSpy.mockResolvedValue(true);
    const {
      result,
      handleCloudLeafTabSync,
      setCloudSyncBookmarksPermissionGranted,
      setLeafTabSyncDialogOpen,
    } = createHarness();

    let repaired = false;
    await act(async () => {
      repaired = await result.current.handleCloudRepairFromCenter('pull-remote');
    });

    expect(repaired).toBe(true);
    expect(ensureExtensionPermissionSpy).toHaveBeenCalledWith('bookmarks', { requestIfNeeded: true });
    expect(setCloudSyncBookmarksPermissionGranted).toHaveBeenCalledWith(true);
    expect(setLeafTabSyncDialogOpen).toHaveBeenCalledWith(false);
    expect(handleCloudLeafTabSync).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'pull-remote',
      allowWhenDisabled: true,
      allowDestructiveBookmarkChanges: true,
      requestBookmarkPermission: false,
      forceBookmarksForThisRun: true,
      retryAfterConflictRefresh: true,
      retryAfterForceUnlock: true,
      silentSuccess: true,
      progressTaskId: null,
      onProgress: expect.any(Function),
    }));
  });

  it('requests bookmark permission for cloud sync when bookmarks are configured but not currently enabled', async () => {
    const { result, handleCloudLeafTabSync, ensureSyncEncryptionAccess } = createHarness();

    let synced = false;
    await act(async () => {
      synced = await result.current.handleCloudSyncNowFromCenter();
    });

    expect(synced).toBe(true);
    expect(ensureSyncEncryptionAccess).toHaveBeenCalled();
    expect(handleCloudLeafTabSync).toHaveBeenCalledWith(expect.objectContaining({
      requestBookmarkPermission: true,
      retryAfterConflictRefresh: true,
      retryAfterForceUnlock: true,
      silentSuccess: true,
      progressTaskId: null,
      onProgress: expect.any(Function),
    }));
  });
});
