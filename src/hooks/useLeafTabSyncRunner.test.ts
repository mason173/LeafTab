import { describe, expect, it, vi } from 'vitest';
import { executeLeafTabSyncRun, type LeafTabSyncRunnerOptionsBase } from '@/hooks/useLeafTabSyncRunner';
import type { LeafTabSyncEngineProgress } from '@/sync/leaftab';

type TestResult = {
  summaryText?: string;
};

type TestOptions = LeafTabSyncRunnerOptionsBase & {
  retriedAfterConflictRefresh?: boolean;
};

const createLongTaskApi = () => ({
  start: vi.fn(() => 'task-id'),
  update: vi.fn(),
  finish: vi.fn(),
  clear: vi.fn(),
});

const createProgress = (message: string): LeafTabSyncEngineProgress => ({
  stage: 'reading-state',
  progress: 10,
  message,
});

describe('executeLeafTabSyncRun', () => {
  it('runs the shared success flow once and refreshes analysis', async () => {
    const longTask = createLongTaskApi();
    const notifySuccess = vi.fn();
    const refreshAnalysis = vi.fn(async () => undefined);
    const handleSuccess = vi.fn();

    const result = await executeLeafTabSyncRun<TestResult, TestOptions>({
      providerLabel: 'Cloud',
      options: {
        showProgressIndicator: true,
        requestBookmarkPermission: true,
      },
      runSync: vi.fn(async (_mode, progressOptions) => {
        progressOptions?.onProgress?.(createProgress('running'));
        return { summaryText: '同步完成' };
      }),
      refreshAnalysis,
      requestBookmarkPermission: vi.fn(async () => undefined),
      resolveSyncEncryptionError: vi.fn(async () => false),
      longTask,
      getInitialProgressCopy: () => ({
        title: '准备中',
        detail: '读取状态',
        progress: 6,
      }),
      getPermissionProgressCopy: () => ({
        title: '检查书签权限',
        detail: '需要访问书签',
        progress: 10,
      }),
      getSuccessText: (value) => value.summaryText || '同步完成',
      notifySuccess,
      notifyError: vi.fn(),
      formatErrorMessage: (error) => String(error),
      onSuccess: handleSuccess,
    });

    expect(result?.summaryText).toBe('同步完成');
    expect(longTask.start).toHaveBeenCalledOnce();
    expect(longTask.update).toHaveBeenCalled();
    expect(longTask.finish).toHaveBeenCalledOnce();
    expect(handleSuccess).toHaveBeenCalledOnce();
    expect(refreshAnalysis).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith('同步完成');
  });

  it('retries once after encryption unlock succeeds', async () => {
    const runSync = vi
      .fn()
      .mockRejectedValueOnce(new Error('need unlock'))
      .mockResolvedValueOnce({ summaryText: 'ok' });

    const result = await executeLeafTabSyncRun<TestResult, TestOptions>({
      providerLabel: 'WebDAV',
      options: {},
      runSync,
      refreshAnalysis: vi.fn(async () => undefined),
      requestBookmarkPermission: vi.fn(async () => undefined),
      resolveSyncEncryptionError: vi.fn(async () => true),
      longTask: createLongTaskApi(),
      getInitialProgressCopy: () => ({ title: '准备中', progress: 6 }),
      getPermissionProgressCopy: () => ({ title: '权限', progress: 10 }),
      getSuccessText: (value) => value.summaryText || '同步完成',
      notifySuccess: vi.fn(),
      notifyError: vi.fn(),
      formatErrorMessage: (error) => String(error),
    });

    expect(result?.summaryText).toBe('ok');
    expect(runSync).toHaveBeenCalledTimes(2);
  });

  it('lets provider-specific error handlers retry with updated options', async () => {
    const runSync = vi
      .fn()
      .mockRejectedValueOnce(new Error('refresh'))
      .mockResolvedValueOnce({ summaryText: 'ok after retry' });

    const result = await executeLeafTabSyncRun<TestResult, TestOptions>({
      providerLabel: 'Cloud',
      options: {},
      runSync,
      refreshAnalysis: vi.fn(async () => undefined),
      requestBookmarkPermission: vi.fn(async () => undefined),
      resolveSyncEncryptionError: vi.fn(async () => false),
      longTask: createLongTaskApi(),
      getInitialProgressCopy: () => ({ title: '准备中', progress: 6 }),
      getPermissionProgressCopy: () => ({ title: '权限', progress: 10 }),
      getSuccessText: (value) => value.summaryText || '同步完成',
      notifySuccess: vi.fn(),
      notifyError: vi.fn(),
      formatErrorMessage: (error) => String(error),
      onError: async (_error, context) => {
        if (context.options.retriedAfterConflictRefresh) {
          return null;
        }
        return context.retry({
          ...context.options,
          retriedAfterConflictRefresh: true,
        });
      },
    });

    expect(result?.summaryText).toBe('ok after retry');
    expect(runSync).toHaveBeenCalledTimes(2);
  });
});
