import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultScenarioModes } from '@/scenario/scenario';
import type { ScenarioMode, ScenarioShortcuts } from '@/types';
import {
  LOCAL_PROFILE_SNAPSHOT_KEY,
  persistLocalProfileSnapshot,
  readLocalNeedsCloudReconcileReason,
} from '@/utils/localProfileStorage';
import { LOCAL_PROFILE_UPDATED_MESSAGE_TYPE } from '@/utils/localProfileSync';
import { useShortcutPersistenceSync } from './useShortcutPersistenceSync';

const useCloudSyncMock = vi.fn();

vi.mock('@/hooks/useCloudSync', () => ({
  useCloudSync: (...args: unknown[]) => useCloudSyncMock(...args),
}));

vi.mock('@/utils/roleProfile', () => ({
  loadRoleProfileDataForReset: vi.fn(async () => ({
    profileData: null,
    role: null,
  })),
}));

function createBaseParams(overrides: Partial<Parameters<typeof useShortcutPersistenceSync>[0]> = {}) {
  const scenarioModes: ScenarioMode[] = [
    ...defaultScenarioModes,
    { id: 'work-mode', name: 'Work', color: '#224466', icon: 'briefcase' },
  ];
  const selectedScenarioId = scenarioModes[0].id;
  const scenarioShortcuts: ScenarioShortcuts = {
    [scenarioModes[0].id]: [
      { id: 'shortcut-1', title: 'LeafTab', url: 'https://leaftab.dev', icon: '' },
    ],
    'work-mode': [],
  };

  return {
    user: null,
    API_URL: 'https://api.example.com',
    handleLogout: vi.fn(),
    isDragging: false,
    scenarioModes,
    selectedScenarioId,
    scenarioShortcuts,
    setScenarioModes: vi.fn(),
    setSelectedScenarioId: vi.fn(),
    setScenarioShortcuts: vi.fn(),
    scenarioModesRef: { current: scenarioModes },
    selectedScenarioIdRef: { current: selectedScenarioId },
    scenarioShortcutsRef: { current: scenarioShortcuts },
    normalizeScenarioModesList: (raw: unknown) => raw as ScenarioMode[],
    normalizeScenarioShortcuts: (raw: unknown) => raw as ScenarioShortcuts,
    localDirtyRef: { current: false },
    language: 'en',
    defaultProfileData: undefined,
    ...overrides,
  };
}

describe('useShortcutPersistenceSync', () => {
  beforeEach(() => {
    localStorage.clear();
    useCloudSyncMock.mockReset();
    useCloudSyncMock.mockReturnValue({
      setCloudSyncInitialized: vi.fn(),
      syncState: 'idle',
      conflictModalOpen: false,
      setConflictModalOpen: vi.fn(),
      pendingLocalPayload: null,
      setPendingLocalPayload: vi.fn(),
      pendingCloudPayload: null,
      setPendingCloudPayload: vi.fn(),
      cloudConflictPending: false,
      lastSavedShortcutsJson: { current: '' },
      resolveWithCloud: vi.fn(),
      resolveWithLocal: vi.fn(),
      resolveWithMerge: vi.fn(),
      applyUndoPayload: vi.fn(),
      triggerCloudSyncNow: vi.fn(),
    });
  });

  it('persists the local profile snapshot and marks signed-out edits for reconcile', async () => {
    const params = createBaseParams();

    renderHook(() => useShortcutPersistenceSync(params));

    await waitFor(() => {
      expect(localStorage.getItem(LOCAL_PROFILE_SNAPSHOT_KEY)).not.toBeNull();
    });

    expect(readLocalNeedsCloudReconcileReason()).toBe('signed_out_edit');
  });

  it('writes signed-in cache payloads and clears local reconcile markers', async () => {
    localStorage.setItem('leaf_tab_local_needs_cloud_reconcile_v1', 'true');
    localStorage.setItem('leaf_tab_local_needs_cloud_reconcile_reason_v1', 'signed_out_edit');

    const params = createBaseParams({
      user: 'alice',
    });

    renderHook(() => useShortcutPersistenceSync(params));

    await waitFor(() => {
      expect(localStorage.getItem('leaf_tab_shortcuts_cache')).not.toBeNull();
    });

    expect(localStorage.getItem('leaf_tab_sync_pending')).toBe('true');
    expect(readLocalNeedsCloudReconcileReason()).toBeNull();
  });

  it('refreshes shortcut state from local profile updates emitted across contexts', async () => {
    const setScenarioModes = vi.fn();
    const setSelectedScenarioId = vi.fn();
    const setScenarioShortcuts = vi.fn();
    const params = createBaseParams({
      setScenarioModes,
      setSelectedScenarioId,
      setScenarioShortcuts,
    });

    renderHook(() => useShortcutPersistenceSync(params));

    const nextScenarioModes: ScenarioMode[] = [
      ...params.scenarioModes,
      { id: 'study-mode', name: 'Study', color: '#7755aa', icon: 'book' },
    ];
    const nextScenarioShortcuts: ScenarioShortcuts = {
      ...params.scenarioShortcuts,
      'study-mode': [
        { id: 'shortcut-2', title: 'Docs', url: 'https://docs.example', icon: '' },
      ],
    };

    persistLocalProfileSnapshot({
      scenarioModes: nextScenarioModes,
      selectedScenarioId: 'study-mode',
      scenarioShortcuts: nextScenarioShortcuts,
    });

    window.dispatchEvent(new StorageEvent('storage', {
      key: LOCAL_PROFILE_SNAPSHOT_KEY,
    }));
    window.dispatchEvent(new Event(LOCAL_PROFILE_UPDATED_MESSAGE_TYPE));

    await waitFor(() => {
      expect(setScenarioModes).toHaveBeenCalledWith(nextScenarioModes);
    });

    expect(setSelectedScenarioId).toHaveBeenCalledWith('study-mode');
    expect(setScenarioShortcuts).toHaveBeenCalledWith(nextScenarioShortcuts);
    expect(params.scenarioModesRef.current).toEqual(nextScenarioModes);
    expect(params.selectedScenarioIdRef.current).toBe('study-mode');
    expect(params.scenarioShortcutsRef.current).toEqual(nextScenarioShortcuts);
  });
});
