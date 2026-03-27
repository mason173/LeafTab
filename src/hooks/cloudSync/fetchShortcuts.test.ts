import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CloudShortcutsPayloadV3 } from '@/types';
import { fetchShortcutsWithDeps } from './fetchShortcuts';

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
  setScenarioModes: vi.fn(),
  setSelectedScenarioId: vi.fn(),
  setScenarioShortcuts: vi.fn(),
  setUserRole: vi.fn(),
  setCloudSyncInitialized: vi.fn(),
  setPendingLocalPayload: vi.fn(),
  setPendingCloudPayload: vi.fn(),
  setConflictModalOpen: vi.fn(),
});

describe('fetchShortcutsWithDeps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'token-1');
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  it('keeps local payload and marks sync pending when cloud differs outside explicit login flow', async () => {
    const localPayload = createPayload('local');
    const cloudPayload = createPayload('cloud');
    const setters = createStateSetters();

    createCloudSyncAdapterMock.mockReturnValue({
      pull: vi.fn(async () => ({
        status: 200,
        payload: cloudPayload,
        version: 7,
        meta: {},
      })),
    });

    const result = await fetchShortcutsWithDeps({
      user: 'alice',
      API_URL: 'https://api.example.com',
      handleLogout: vi.fn(),
      t: (key: string) => key,
      silent: true,
      promptOnDiff: false,
      buildCloudShortcutsPayload: () => localPayload,
      normalizeCloudShortcutsPayload: (raw: unknown) => raw as CloudShortcutsPayloadV3,
      loadLocalProfileSnapshotSafe: () => localPayload,
      notifyRateLimited: vi.fn(),
      persistPendingConflict: vi.fn(),
      clearPendingConflict: vi.fn(),
      refs: {
        cloudShortcutsVersionRef: { current: null },
        pendingCloudVersionRef: { current: null },
        lastSavedShortcutsJson: { current: '' },
      },
      setters,
    });

    expect(result).toBe('success');
    expect(setters.setScenarioModes).toHaveBeenCalledWith(localPayload.scenarioModes);
    expect(setters.setSelectedScenarioId).toHaveBeenCalledWith(localPayload.selectedScenarioId);
    expect(setters.setScenarioShortcuts).toHaveBeenCalledWith(localPayload.scenarioShortcuts);
    expect(localStorage.getItem('leaf_tab_sync_pending')).toBe('true');
    expect(localStorage.getItem('leaf_tab_shortcuts_cache')).toBe(JSON.stringify(localPayload));
  });

  it('opens a conflict modal during explicit login when local and cloud payloads differ', async () => {
    const localPayload = createPayload('local');
    const cloudPayload = createPayload('cloud');
    const setters = createStateSetters();
    const persistPendingConflict = vi.fn();

    createCloudSyncAdapterMock.mockReturnValue({
      pull: vi.fn(async () => ({
        status: 200,
        payload: cloudPayload,
        version: 9,
        meta: {},
      })),
    });

    const result = await fetchShortcutsWithDeps({
      user: 'alice',
      API_URL: 'https://api.example.com',
      handleLogout: vi.fn(),
      t: (key: string) => key,
      silent: true,
      promptOnDiff: true,
      buildCloudShortcutsPayload: () => localPayload,
      normalizeCloudShortcutsPayload: (raw: unknown) => raw as CloudShortcutsPayloadV3,
      loadLocalProfileSnapshotSafe: () => localPayload,
      notifyRateLimited: vi.fn(),
      persistPendingConflict,
      clearPendingConflict: vi.fn(),
      refs: {
        cloudShortcutsVersionRef: { current: null },
        pendingCloudVersionRef: { current: null },
        lastSavedShortcutsJson: { current: '' },
      },
      setters,
    });

    expect(result).toBe('conflict');
    expect(setters.setPendingLocalPayload).toHaveBeenCalledWith(localPayload);
    expect(setters.setPendingCloudPayload).toHaveBeenCalledWith(cloudPayload);
    expect(setters.setConflictModalOpen).toHaveBeenCalledWith(true);
    expect(persistPendingConflict).toHaveBeenCalledWith(localPayload, cloudPayload, 9);
  });
});
