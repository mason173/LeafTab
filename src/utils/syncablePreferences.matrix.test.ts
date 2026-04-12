import { afterEach, describe, expect, it } from 'vitest';
import {
  getDefaultSyncablePreferences,
  normalizeSyncablePreferences,
  readSyncablePreferencesFromStorage,
  writeSyncablePreferencesToStorage,
} from '@/utils/syncablePreferences';

const booleanVariants = [true, false] as const;
const timeAnimationModes = ['on', 'off'] as const;

describe('syncablePreferences matrix', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('round-trips representative preference combinations', () => {
    const cases = [];

    for (const openInNewTab of booleanVariants) {
      for (const preventDuplicateNewTab of booleanVariants) {
        for (const showSeconds of booleanVariants) {
          for (const showLunar of booleanVariants) {
            for (const timeAnimationMode of timeAnimationModes) {
              cases.push({
                openInNewTab,
                preventDuplicateNewTab,
                showSeconds,
                showLunar,
                timeAnimationMode,
              });
            }
          }
        }
      }
    }

    for (const testCase of cases) {
      const next = normalizeSyncablePreferences({
        ...getDefaultSyncablePreferences(),
        ...testCase,
        shortcutIconAppearance: 'accent',
        shortcutIconCornerRadius: 37,
        shortcutIconScale: 112,
        weatherManualLocation: {
          city: 'Hangzhou',
          latitude: 30.2741,
          longitude: 120.1551,
        },
      });

      writeSyncablePreferencesToStorage(next);
      const restored = readSyncablePreferencesFromStorage();

      expect(restored.openInNewTab).toBe(testCase.openInNewTab);
      expect(restored.preventDuplicateNewTab).toBe(testCase.preventDuplicateNewTab);
      expect(restored.showSeconds).toBe(testCase.showSeconds);
      expect(restored.showLunar).toBe(testCase.showLunar);
      expect(restored.timeAnimationMode).toBe(testCase.timeAnimationMode);
      expect(restored.shortcutIconAppearance).toBe('accent');
      expect(restored.shortcutIconCornerRadius).toBe(37);
      expect(restored.shortcutIconScale).toBe(112);
      expect(restored.weatherManualLocation).toEqual({
        city: 'Hangzhou',
        latitude: 30.2741,
        longitude: 120.1551,
      });
    }
  });

  it('falls back the legacy rich shortcut variant to compact when normalizing preferences', () => {
    const normalized = normalizeSyncablePreferences({
      ...getDefaultSyncablePreferences(),
      shortcutCardVariant: 'default',
    });

    expect(normalized.shortcutCardVariant).toBe('compact');
  });

  it('falls back the persisted rich shortcut variant to compact when reading from storage', () => {
    localStorage.setItem('shortcutCardVariant', 'default');
    localStorage.setItem('shortcutGridColumnsByVariant', JSON.stringify({
      default: 4,
      compact: 9,
    }));

    const restored = readSyncablePreferencesFromStorage();

    expect(restored.shortcutCardVariant).toBe('compact');
    expect(restored.shortcutGridColumnsByVariant.compact).toBe(9);
  });
});
