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
    leafTabWebdavConfigured: true,
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
    openLeafTabSyncConfig,
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

  it('enables future bookmark sync after successful cloud repair', async () => {
    ensureExtensionPermissionSpy.mockResolvedValue(true);
    const onCloudBookmarkRepairSuccess = vi.fn();
    const { result } = createHarness({ onCloudBookmarkRepairSuccess });

    await act(async () => {
      await result.current.handleCloudRepairFromCenter('pull-remote');
    });

    expect(onCloudBookmarkRepairSuccess).toHaveBeenCalledTimes(1);
  });

  it('forces bookmark sync during cloud repair even when bookmark sync is not configured', async () => {
    ensureExtensionPermissionSpy.mockResolvedValue(true);
    const {
      result,
      handleCloudLeafTabSync,
    } = createHarness({
      cloudSyncBookmarksConfigured: false,
      cloudSyncBookmarksEnabled: false,
    });

    let repaired = false;
    await act(async () => {
      repaired = await result.current.handleCloudRepairFromCenter('pull-remote');
    });

    expect(repaired).toBe(true);
    expect(handleCloudLeafTabSync).toHaveBeenCalledWith(expect.objectContaining({
      forceBookmarksForThisRun: true,
      requestBookmarkPermission: false,
    }));
  });

  it('runs cloud remote repair directly without opening sync settings', async () => {
    ensureExtensionPermissionSpy.mockResolvedValue(true);
    const {
      result,
      handleCloudLeafTabSync,
      setLeafTabSyncDialogOpen,
      setCloudSyncConfigOpen,
      openLeafTabSyncConfig,
    } = createHarness();

    let repaired = false;
    await act(async () => {
      repaired = await result.current.handleCloudRepairFromCenter('pull-remote');
    });

    expect(repaired).toBe(true);
    expect(setLeafTabSyncDialogOpen).toHaveBeenCalledWith(false);
    expect(setCloudSyncConfigOpen).not.toHaveBeenCalled();
    expect(openLeafTabSyncConfig).not.toHaveBeenCalled();
    expect(handleCloudLeafTabSync).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'pull-remote',
      allowDestructiveBookmarkChanges: true,
      allowWhenDisabled: true,
    }));
  });

  it('runs cloud local repair directly without opening sync settings', async () => {
    ensureExtensionPermissionSpy.mockResolvedValue(true);
    const {
      result,
      handleCloudLeafTabSync,
      setLeafTabSyncDialogOpen,
      setCloudSyncConfigOpen,
      openLeafTabSyncConfig,
    } = createHarness();

    let repaired = false;
    await act(async () => {
      repaired = await result.current.handleCloudRepairFromCenter('push-local');
    });

    expect(repaired).toBe(true);
    expect(setLeafTabSyncDialogOpen).toHaveBeenCalledWith(false);
    expect(setCloudSyncConfigOpen).not.toHaveBeenCalled();
    expect(openLeafTabSyncConfig).not.toHaveBeenCalled();
    expect(handleCloudLeafTabSync).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'push-local',
      allowDestructiveBookmarkChanges: true,
      allowWhenDisabled: true,
    }));
  });

  it('runs WebDAV repair directly when config exists even if runtime is not ready yet', async () => {
    ensureExtensionPermissionSpy.mockResolvedValue(true);
    const {
      result,
      handleLeafTabSync,
      setLeafTabSyncDialogOpen,
      openLeafTabSyncConfig,
    } = createHarness({
      leafTabSyncHasConfig: false,
      leafTabWebdavConfigured: true,
    });

    let repaired = false;
    await act(async () => {
      repaired = await result.current.handleWebdavRepairFromCenter('pull-remote');
    });

    expect(repaired).toBe(true);
    expect(setLeafTabSyncDialogOpen).toHaveBeenCalledWith(false);
    expect(openLeafTabSyncConfig).not.toHaveBeenCalled();
    expect(handleLeafTabSync).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'pull-remote',
      allowDestructiveBookmarkChanges: true,
      allowDangerousSyncPrompt: false,
      allowConfigPrompt: false,
      forceBookmarksForThisRun: true,
      requestBookmarkPermission: false,
    }));
  });

  it('enables future bookmark sync after successful WebDAV repair', async () => {
    ensureExtensionPermissionSpy.mockResolvedValue(true);
    const onWebdavBookmarkRepairSuccess = vi.fn();
    const { result } = createHarness({ onWebdavBookmarkRepairSuccess });

    await act(async () => {
      await result.current.handleWebdavRepairFromCenter('pull-remote');
    });

    expect(onWebdavBookmarkRepairSuccess).toHaveBeenCalledTimes(1);
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

  it('keeps WebDAV auto sync non-interactive', async () => {
    const { result, handleLeafTabSync } = createHarness();

    let synced = false;
    await act(async () => {
      synced = await result.current.handleLeafTabAutoSync();
    });

    expect(synced).toBe(true);
    expect(handleLeafTabSync).toHaveBeenCalledWith(expect.objectContaining({
      silentSuccess: true,
      allowConfigPrompt: false,
      allowDangerousSyncPrompt: false,
      allowEncryptionPrompt: false,
    }));
  });
});
