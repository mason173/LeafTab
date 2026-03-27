import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CloudShortcutsPayloadV3 } from '@/types';
import { syncPayloadToCloudWithDeps } from './syncPayloadToCloud';

const createCloudSyncAdapterMock = vi.fn();

vi.mock('./cloudSyncAdapter', () => ({
  createCloudSyncAdapter: (...args: unknown[]) => createCloudSyncAdapterMock(...args),
}));

const createPayload = (suffix: string): CloudShortcutsPayloadV3 => ({
  version: 3,
  scenarioModes: [
    {
      id: 'work',
      name: `Work ${suffix}`,
      color: '#000000',
      icon: 'briefcase',
    },
  ],
  selectedScenarioId: 'work',
  scenarioShortcuts: {
    work: [
      {
        id: `shortcut-${suffix}`,
        title: `Shortcut ${suffix}`,
        url: `https://${suffix}.example.com`,
        icon: '',
      },
    ],
  },
});

const createStateSetters = () => ({
  setPendingLocalPayload: vi.fn(),
  setPendingCloudPayload: vi.fn(),
  setConflictModalOpen: vi.fn(),
});

describe('syncPayloadToCloudWithDeps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'token-1');
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  it('retries with the latest remote version when prefer_local hits a 409', async () => {
    const payload = createPayload('local');
    const stateSetters = createStateSetters();
    const push = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 409, version: null, contentType: 'application/json' })
      .mockResolvedValueOnce({ ok: true, status: 200, version: 6, contentType: 'application/json' });
    const pull = vi.fn(async () => ({
      status: 200,
      payload: createPayload('remote'),
      version: 6,
      meta: {},
    }));

    createCloudSyncAdapterMock.mockReturnValue({ pull, push });

    const lastSavedShortcutsJson = { current: '' };
    const result = await syncPayloadToCloudWithDeps({
      user: 'alice',
      API_URL: 'https://api.example.com',
      payload,
      options: { conflictStrategy: 'prefer_local' },
      handleLogout: vi.fn(),
      t: (key: string) => key,
      normalizeCloudShortcutsPayload: (raw: unknown) => raw as CloudShortcutsPayloadV3,
      notifyRateLimited: vi.fn(),
      persistPendingConflict: vi.fn(),
      clearPendingConflict: vi.fn(),
      refs: {
        lastSavedShortcutsJson,
        cloudShortcutsVersionRef: { current: 5 },
        pendingCloudVersionRef: { current: null },
        syncInFlightRef: { current: null },
        syncInFlightPayloadJsonRef: { current: '' },
      },
      stateSetters,
    });

    expect(result).toBe(true);
    expect(push).toHaveBeenNthCalledWith(1, payload, {
      expectedVersion: 5,
      mode: 'prefer_local',
    });
    expect(push).toHaveBeenNthCalledWith(2, payload, {
      expectedVersion: 6,
      mode: 'prefer_local',
    });
    expect(lastSavedShortcutsJson.current).toBe(JSON.stringify(payload));
    expect(localStorage.getItem('leaf_tab_sync_pending')).toBeNull();
  });

  it('stores pending conflict payloads when strict sync hits a 409 with different remote data', async () => {
    const payload = createPayload('local');
    const remotePayload = createPayload('remote');
    const stateSetters = createStateSetters();
    const persistPendingConflict = vi.fn();

    createCloudSyncAdapterMock.mockReturnValue({
      push: vi.fn(async () => ({ ok: false, status: 409, version: null, contentType: 'application/json' })),
      pull: vi.fn(async () => ({
        status: 200,
        payload: remotePayload,
        version: 8,
        meta: {},
      })),
    });

    const result = await syncPayloadToCloudWithDeps({
      user: 'alice',
      API_URL: 'https://api.example.com',
      payload,
      options: { conflictStrategy: 'modal' },
      handleLogout: vi.fn(),
      t: (key: string) => key,
      normalizeCloudShortcutsPayload: (raw: unknown) => raw as CloudShortcutsPayloadV3,
      notifyRateLimited: vi.fn(),
      persistPendingConflict,
      clearPendingConflict: vi.fn(),
      refs: {
        lastSavedShortcutsJson: { current: '' },
        cloudShortcutsVersionRef: { current: 5 },
        pendingCloudVersionRef: { current: null },
        syncInFlightRef: { current: null },
        syncInFlightPayloadJsonRef: { current: '' },
      },
      stateSetters,
    });

    expect(result).toBe(false);
    expect(stateSetters.setPendingLocalPayload).toHaveBeenCalledWith(payload);
    expect(stateSetters.setPendingCloudPayload).toHaveBeenCalledWith(remotePayload);
    expect(stateSetters.setConflictModalOpen).toHaveBeenCalledWith(true);
    expect(persistPendingConflict).toHaveBeenCalledWith(payload, remotePayload, 8);
  });
});
