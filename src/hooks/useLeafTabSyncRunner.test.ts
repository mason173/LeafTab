import { describe, expect, it, vi } from 'vitest';
import { executeLeafTabSyncRun } from './useLeafTabSyncRunner';

describe('executeLeafTabSyncRun', () => {
  it('clears the progress indicator when sync does not start', async () => {
    const clear = vi.fn();

    const result = await executeLeafTabSyncRun({
      providerLabel: 'WebDAV 同步',
      options: {
        showProgressIndicator: true,
      },
      runSync: vi.fn().mockResolvedValue(null),
      requestBookmarkPermission: vi.fn(),
      longTask: {
        start: vi.fn().mockReturnValue('task-1'),
        update: vi.fn(),
        finish: vi.fn(),
        clear,
      },
      getInitialProgressCopy: () => ({
        title: '正在准备同步数据',
        detail: '正在读取本地与云端状态',
        progress: 6,
      }),
      getPermissionProgressCopy: () => ({
        title: '正在检查书签权限',
        progress: 10,
      }),
      getSuccessText: () => '同步完成',
      notifySuccess: vi.fn(),
      notifyError: vi.fn(),
      formatErrorMessage: (error) => String(error),
    });

    expect(result).toBeNull();
    expect(clear).toHaveBeenCalledWith('task-1');
  });
});
