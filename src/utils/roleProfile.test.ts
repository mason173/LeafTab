import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROLE_SEED_PROFILE_KEY } from './localProfileStorage';
import { loadRoleProfileDataForReset } from './roleProfile';

type StorageMap = Map<string, string>;

const createLocalStorageMock = (seed?: Record<string, string>) => {
  const store: StorageMap = new Map(Object.entries(seed || {}));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

const legacyPresetPayload = {
  type: 'leaftab_backup',
  version: 4,
  data: {
    scenarioModes: [
      { id: 'preset', name: 'Preset', color: '#000000', icon: 'briefcase' },
    ],
    selectedScenarioId: 'preset',
    scenarioShortcuts: {
      preset: [{ id: 'preset-item', title: 'Preset', url: 'https://preset.example', icon: '' }],
    },
  },
};

const seedSnapshot = {
  scenarioModes: [
    { id: 'seed', name: 'Seed', color: '#ff0000', icon: 'rocket' },
  ],
  selectedScenarioId: 'seed',
  scenarioShortcuts: {
    seed: [{ id: 'seed-item', title: 'Seed', url: 'https://seed.example', icon: '' }],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('loadRoleProfileDataForReset', () => {
  it('prefers built-in registry presets over old local seed snapshots', async () => {
    vi.stubGlobal('localStorage', createLocalStorageMock({
      role: 'programmer',
      [ROLE_SEED_PROFILE_KEY]: JSON.stringify(seedSnapshot),
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => legacyPresetPayload,
    }));

    const result = await loadRoleProfileDataForReset({
      roleId: 'programmer',
      language: 'zh-CN',
      defaultProfileData: { selectedScenarioId: 'default' },
    });

    expect(result.role).toBe('programmer');
    expect(result.profileData.selectedScenarioId).toBe('preset');
    expect(result.profileData.scenarioShortcuts.preset).toEqual([
      { id: 'preset-item', title: 'Preset', url: 'https://preset.example', icon: '' },
    ]);
  });

  it('falls back to old local seed snapshots when preset loading fails', async () => {
    vi.stubGlobal('localStorage', createLocalStorageMock({
      role: 'programmer',
      [ROLE_SEED_PROFILE_KEY]: JSON.stringify(seedSnapshot),
    }));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')));

    const result = await loadRoleProfileDataForReset({
      roleId: 'programmer',
      language: 'zh-CN',
      defaultProfileData: { selectedScenarioId: 'default' },
    });

    expect(result.profileData.selectedScenarioId).toBe('seed');
    expect(result.profileData.scenarioShortcuts.seed).toEqual([
      { id: 'seed-item', title: 'Seed', url: 'https://seed.example', icon: '' },
    ]);
  });
});
