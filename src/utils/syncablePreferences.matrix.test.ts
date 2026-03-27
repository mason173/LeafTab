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
      expect(restored.weatherManualLocation).toEqual({
        city: 'Hangzhou',
        latitude: 30.2741,
        longitude: 120.1551,
      });
    }
  });
});
