import { beforeEach, describe, expect, it } from 'vitest';
import { LOCAL_PROFILE_SNAPSHOT_KEY, LOCAL_SHORTCUTS_KEY } from '@/utils/localProfileStorage';
import { saveShortcutToLocalProfile } from '@/utils/shortcutPersistence';

describe('saveShortcutToLocalProfile', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('appends a shortcut into the selected scenario snapshot and marks local edits', () => {
    const result = saveShortcutToLocalProfile({
      title: 'Example',
      url: 'https://example.com',
      icon: '',
      useOfficialIcon: false,
      autoUseOfficialIcon: true,
      officialIconAvailableAtSave: false,
      iconRendering: 'favicon',
      iconColor: '',
    });

    expect(result.ok).toBe(true);
    const snapshot = JSON.parse(localStorage.getItem(LOCAL_PROFILE_SNAPSHOT_KEY) || 'null');
    expect(snapshot.selectedScenarioId).toBeTruthy();
    expect(snapshot.scenarioShortcuts[snapshot.selectedScenarioId]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Example',
          url: 'https://example.com',
        }),
      ]),
    );
    expect(localStorage.getItem(LOCAL_SHORTCUTS_KEY)).toContain('https://example.com');
    expect(localStorage.getItem('leaf_tab_local_needs_cloud_reconcile_v1')).toBe('true');
  });

  it('rejects duplicate shortcuts by normalized url identity', () => {
    saveShortcutToLocalProfile({
      title: 'Example',
      url: 'https://www.example.com/path/',
      icon: '',
      useOfficialIcon: false,
      autoUseOfficialIcon: true,
      officialIconAvailableAtSave: false,
      iconRendering: 'favicon',
      iconColor: '',
    });

    const result = saveShortcutToLocalProfile({
      title: 'Duplicate',
      url: 'https://example.com/path',
      icon: '',
      useOfficialIcon: false,
      autoUseOfficialIcon: true,
      officialIconAvailableAtSave: false,
      iconRendering: 'favicon',
      iconColor: '',
    });

    expect(result).toEqual({
      ok: false,
      reason: 'duplicate',
    });
  });
});
