import { beforeEach, describe, expect, it } from 'vitest';
import {
  getDefaultSyncablePreferences,
  readSyncablePreferencesFromStorage,
} from '@/utils/syncablePreferences';

describe('syncablePreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults preventDuplicateNewTab to false', () => {
    expect(getDefaultSyncablePreferences().preventDuplicateNewTab).toBe(false);
    expect(readSyncablePreferencesFromStorage().preventDuplicateNewTab).toBe(false);
  });

  it('preserves an explicitly stored preventDuplicateNewTab value', () => {
    localStorage.setItem('leaftab_prevent_duplicate_newtab', 'true');

    expect(readSyncablePreferencesFromStorage().preventDuplicateNewTab).toBe(true);
  });
});
