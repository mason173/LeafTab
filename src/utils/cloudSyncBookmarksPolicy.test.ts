import { describe, expect, it, vi } from 'vitest';
import {
  resolveCloudSyncBookmarkApplyMode,
  resolveCloudSyncBookmarksEnabled,
  resolveCloudSyncBookmarksToggleIntent,
} from '@/utils/cloudSyncBookmarksPolicy';

describe('cloudSyncBookmarksPolicy', () => {
  it('enables bookmark sync only when configured and permission is granted', () => {
    expect(resolveCloudSyncBookmarksEnabled(true, true)).toBe(true);
    expect(resolveCloudSyncBookmarksEnabled(true, false)).toBe(false);
    expect(resolveCloudSyncBookmarksEnabled(false, true)).toBe(false);
  });

  it('switches apply mode to skip bookmark writes when bookmark sync is disabled', () => {
    expect(resolveCloudSyncBookmarkApplyMode(true)).toEqual({
      includeBookmarks: true,
      skipBookmarkApply: false,
    });
    expect(resolveCloudSyncBookmarkApplyMode(false)).toEqual({
      includeBookmarks: false,
      skipBookmarkApply: true,
    });
  });

  it('does not request permission when user turns bookmark sync off', async () => {
    const requestPermission = vi.fn(async () => true);

    const result = await resolveCloudSyncBookmarksToggleIntent({
      nextChecked: false,
      requestPermission,
    });

    expect(result).toEqual({
      enabled: false,
      permissionRequested: false,
      permissionDenied: false,
    });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('requests permission each time user turns bookmark sync on and keeps it off when denied', async () => {
    const requestPermission = vi.fn(async () => false);

    const first = await resolveCloudSyncBookmarksToggleIntent({
      nextChecked: true,
      requestPermission,
    });
    const second = await resolveCloudSyncBookmarksToggleIntent({
      nextChecked: true,
      requestPermission,
    });

    expect(first).toEqual({
      enabled: false,
      permissionRequested: true,
      permissionDenied: true,
    });
    expect(second).toEqual({
      enabled: false,
      permissionRequested: true,
      permissionDenied: true,
    });
    expect(requestPermission).toHaveBeenCalledTimes(2);
  });

  it('keeps toggle enabled when permission is granted', async () => {
    const requestPermission = vi.fn(async () => true);

    const result = await resolveCloudSyncBookmarksToggleIntent({
      nextChecked: true,
      requestPermission,
    });

    expect(result).toEqual({
      enabled: true,
      permissionRequested: true,
      permissionDenied: false,
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });
});
