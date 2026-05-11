import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLeafTabWebdavAutoSync } from './useLeafTabWebdavAutoSync';
import { WEBDAV_STORAGE_KEYS } from '@/utils/webdavConfig';

const toastSuccessSpy = vi.fn();
const WEBDAV_AUTO_SYNC_CONFIG_MESSAGE_TYPE = 'LEAFTAB_WEBDAV_AUTO_SYNC_CONFIG';
const WEBDAV_AUTO_SYNC_TRIGGER_MESSAGE_TYPE = 'LEAFTAB_WEBDAV_AUTO_SYNC_TRIGGER';

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

type RuntimeMessageListener = (
  message: { type?: string; payload?: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => boolean | void;

function installRuntimeMessagingMock() {
  const listeners: RuntimeMessageListener[] = [];
  const sendMessage = vi.fn((_message: unknown, callback?: (response?: unknown) => void) => {
    callback?.({ success: true });
  });
  const runtime = {
    id: 'leaftab-test',
    lastError: undefined,
    sendMessage,
    onMessage: {
      addListener: vi.fn((listener: RuntimeMessageListener) => {
        listeners.push(listener);
      }),
      removeListener: vi.fn((listener: RuntimeMessageListener) => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      }),
    },
  };
  Object.defineProperty(globalThis, 'chrome', {
    configurable: true,
    value: {
      runtime,
    },
  });
  return {
    sendMessage,
    listeners,
  };
}

function getLastAutoSyncConfigMessage(sendMessage: ReturnType<typeof vi.fn>) {
  const messages = sendMessage.mock.calls
    .map((call) => call[0])
    .filter((message) => (
      message
      && typeof message === 'object'
      && (message as { type?: string }).type === WEBDAV_AUTO_SYNC_CONFIG_MESSAGE_TYPE
    ));
  return messages[messages.length - 1] as { payload?: { enabled?: boolean; nextSyncAt?: string | null } } | undefined;
}

function dispatchAutoSyncTrigger(listeners: RuntimeMessageListener[]) {
  return new Promise<any>((resolve, reject) => {
    const listener = listeners[0];
    if (!listener) {
      reject(new Error('missing_runtime_listener'));
      return;
    }
    let settled = false;
    const maybeAsync = listener(
      { type: WEBDAV_AUTO_SYNC_TRIGGER_MESSAGE_TYPE },
      {},
      (response?: unknown) => {
        if (settled) return;
        settled = true;
        resolve(response);
      },
    );
    if (maybeAsync !== true && !settled) {
      resolve(undefined);
    }
  });
}

describe('useLeafTabWebdavAutoSync', () => {
  let runtimeMock: ReturnType<typeof installRuntimeMessagingMock>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T06:00:00.000Z'));
    localStorage.clear();
    toastSuccessSpy.mockReset();
    runtimeMock = installRuntimeMessagingMock();
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
      await dispatchAutoSyncTrigger(runtimeMock.listeners);
    });

    expect(onSync).toHaveBeenCalledTimes(1);
    expect(new Date(localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt) || '').getTime()).toBe(Date.now() + 60_000);

    await act(async () => {
      vi.setSystemTime(new Date(Date.now() + 60_000));
      await dispatchAutoSyncTrigger(runtimeMock.listeners);
    });
    expect(onSync).toHaveBeenCalledTimes(2);
    expect(new Date(localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt) || '').getTime()).toBe(Date.now() + 120_000);

    await act(async () => {
      vi.setSystemTime(new Date(Date.now() + 120_000));
      await dispatchAutoSyncTrigger(runtimeMock.listeners);
    });
    expect(onSync).toHaveBeenCalledTimes(3);
    expect(new Date(localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt) || '').getTime()).toBe(Date.now() + 240_000);
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
      await dispatchAutoSyncTrigger(runtimeMock.listeners);
    });

    expect(onSync).not.toHaveBeenCalled();
    const lastConfig = getLastAutoSyncConfigMessage(runtimeMock.sendMessage);
    expect(lastConfig?.payload?.enabled).toBe(true);
  });

  it('clears the next sync alarm when WebDAV sync is disabled', async () => {
    enableScheduledWebdavSync();
    localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, new Date(Date.now() + 1_000).toISOString());
    const onSync = vi.fn().mockResolvedValue(true);

    renderAutoSync(onSync);

    await act(async () => {
      await dispatchAutoSyncTrigger(runtimeMock.listeners);
    });

    expect(onSync).toHaveBeenCalledTimes(1);
    act(() => {
      disableScheduledWebdavSync();
    });

    expect(localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt)).toBeNull();
    expect(localStorage.getItem('webdav_auto_sync_lease_v1')).toBeNull();
    expect(getLastAutoSyncConfigMessage(runtimeMock.sendMessage)?.payload?.enabled).toBe(false);

    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('does not restart auto sync after WebDAV is disabled even if status changes again', async () => {
    enableScheduledWebdavSync();
    localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, new Date(Date.now() + 1_000).toISOString());
    const onSync = vi.fn().mockResolvedValue(true);

    renderAutoSync(onSync);

    await act(async () => {
      await dispatchAutoSyncTrigger(runtimeMock.listeners);
    });

    expect(onSync).toHaveBeenCalledTimes(1);

    act(() => {
      disableScheduledWebdavSync();
    });

    act(() => {
      window.dispatchEvent(new Event('webdav-sync-status-changed'));
    });

    await act(async () => {
      await dispatchAutoSyncTrigger(runtimeMock.listeners);
    });

    expect(onSync).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt)).toBeNull();
    expect(localStorage.getItem('webdav_auto_sync_lease_v1')).toBeNull();
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
      void dispatchAutoSyncTrigger(runtimeMock.listeners);
      await Promise.resolve();
    });

    expect(onSync).toHaveBeenCalledTimes(1);

    act(() => {
      disableScheduledWebdavSync();
    });

    await act(async () => {
      resolveSync?.(true);
      await Promise.resolve();
    });

    expect(onSync).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt)).toBeNull();
    expect(getLastAutoSyncConfigMessage(runtimeMock.sendMessage)?.payload?.enabled).toBe(false);
  });
});
