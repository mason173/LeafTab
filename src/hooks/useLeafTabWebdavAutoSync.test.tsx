import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLeafTabWebdavAutoSync } from './useLeafTabWebdavAutoSync';
import { WEBDAV_STORAGE_KEYS } from '@/utils/webdavConfig';

const toastSuccessSpy = vi.fn();

vi.mock('@/components/ui/sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessSpy(...args),
  },
}));

function enableScheduledWebdavSync() {
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncEnabled, 'true');
  localStorage.setItem(WEBDAV_STORAGE_KEYS.url, 'https://dav.example.test/leaftab');
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncBySchedule, 'true');
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncIntervalMinutes, '1');
  localStorage.setItem(WEBDAV_STORAGE_KEYS.autoSyncToastEnabled, 'false');
}

function renderAutoSync(onSync: () => Promise<boolean>) {
  return renderHook(() => useLeafTabWebdavAutoSync({
    conflictModalOpen: false,
    isDragging: false,
    syncing: false,
    onSync,
  }));
}

function disableScheduledWebdavSync() {
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncEnabled, 'false');
  window.dispatchEvent(new Event('webdav-config-changed'));
}

describe('useLeafTabWebdavAutoSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T06:00:00.000Z'));
    localStorage.clear();
    toastSuccessSpy.mockReset();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  it('backs off failed automatic sync attempts', async () => {
    enableScheduledWebdavSync();
    localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, new Date(Date.now() + 1_000).toISOString());
    const onSync = vi.fn().mockResolvedValue(false);

    renderAutoSync(onSync);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(onSync).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_000);
    });
    expect(onSync).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(onSync).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(119_000);
    });
    expect(onSync).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(onSync).toHaveBeenCalledTimes(3);
  });

  it('does not run sync while another tab owns the auto-sync lease', async () => {
    enableScheduledWebdavSync();
    localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, new Date(Date.now() + 1_000).toISOString());
    localStorage.setItem('webdav_auto_sync_lease_v1', JSON.stringify({
      ownerId: 'other-tab',
      expiresAt: Date.now() + 180_000,
    }));
    const onSync = vi.fn().mockResolvedValue(true);

    renderAutoSync(onSync);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(onSync).not.toHaveBeenCalled();
  });

  it('clears the next sync and lease renewal timers when WebDAV sync is disabled', async () => {
    enableScheduledWebdavSync();
    localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, new Date(Date.now() + 1_000).toISOString());
    const onSync = vi.fn().mockResolvedValue(true);

    renderAutoSync(onSync);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(onSync).toHaveBeenCalledTimes(1);
    act(() => {
      disableScheduledWebdavSync();
    });

    expect(localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt)).toBeNull();
    expect(localStorage.getItem('webdav_auto_sync_lease_v1')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });

    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('does not schedule another automatic sync when sync is disabled during an in-flight run', async () => {
    enableScheduledWebdavSync();
    localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, new Date(Date.now() + 1_000).toISOString());
    let resolveSync: ((value: boolean) => void) | null = null;
    const onSync = vi.fn(() => new Promise<boolean>((resolve) => {
      resolveSync = resolve;
    }));

    renderAutoSync(onSync);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(onSync).toHaveBeenCalledTimes(1);

    act(() => {
      disableScheduledWebdavSync();
    });

    await act(async () => {
      resolveSync?.(true);
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });

    expect(onSync).toHaveBeenCalledTimes(1);
  });
});
