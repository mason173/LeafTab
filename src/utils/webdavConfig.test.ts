import { afterEach, describe, expect, it } from 'vitest';
import {
  applyWebdavDangerousBookmarkChoiceToStorage,
  readWebdavStorageStateFromStorage,
  WEBDAV_STORAGE_KEYS,
  writeWebdavStorageStateToStorage,
} from '@/utils/webdavConfig';

describe('webdavConfig', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('defaults bookmark sync to disabled for existing configs', () => {
    localStorage.setItem(WEBDAV_STORAGE_KEYS.url, 'https://dav.example.com');

    expect(readWebdavStorageStateFromStorage().syncBookmarksEnabled).toBe(false);
  });

  it('reads and writes bookmark sync preference', () => {
    writeWebdavStorageStateToStorage({
      profileName: '默认配置',
      url: 'https://dav.example.com',
      username: 'demo',
      password: 'secret',
      filePath: 'leaftab_sync.leaftab',
      syncEnabled: true,
      syncBookmarksEnabled: false,
      syncBySchedule: true,
      autoSyncToastEnabled: true,
      syncIntervalMinutes: 10,
      syncConflictPolicy: 'merge',
    });

    expect(readWebdavStorageStateFromStorage().syncBookmarksEnabled).toBe(false);
  });

  it('marks WebDAV sync enabled and turns bookmark sync off after dangerous bookmark choices', () => {
    writeWebdavStorageStateToStorage({
      profileName: '默认配置',
      url: 'https://dav.example.com',
      username: 'demo',
      password: 'secret',
      filePath: 'leaftab_sync.leaftab',
      syncEnabled: false,
      syncBookmarksEnabled: true,
      syncBySchedule: true,
      autoSyncToastEnabled: true,
      syncIntervalMinutes: 10,
      syncConflictPolicy: 'merge',
    });

    applyWebdavDangerousBookmarkChoiceToStorage();

    expect(readWebdavStorageStateFromStorage()).toEqual(expect.objectContaining({
      syncEnabled: true,
      syncBookmarksEnabled: false,
    }));
  });
});
