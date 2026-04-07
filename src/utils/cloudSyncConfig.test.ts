import { afterEach, describe, expect, it } from 'vitest';
import {
  applyCloudDangerousBookmarkChoiceToStorage,
  readCloudSyncConfigFromStorage,
  writeCloudSyncConfigToStorage,
} from '@/utils/cloudSyncConfig';

describe('cloudSyncConfig', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('marks cloud sync enabled and turns bookmark sync off after dangerous bookmark choices', () => {
    writeCloudSyncConfigToStorage({
      enabled: false,
      syncBookmarksEnabled: true,
      autoSyncToastEnabled: true,
      intervalMinutes: 10,
    });

    applyCloudDangerousBookmarkChoiceToStorage();

    expect(readCloudSyncConfigFromStorage()).toEqual(expect.objectContaining({
      enabled: true,
      syncBookmarksEnabled: false,
    }));
  });
});
