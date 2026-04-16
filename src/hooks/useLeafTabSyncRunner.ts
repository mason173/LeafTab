import { useCallback, useEffect, useRef } from 'react';
import type { LeafTabSyncEngineProgress, LeafTabSyncInitialChoice } from '@/sync/leaftab';

export type LeafTabSyncRunnerOptionsBase = {
  mode?: LeafTabSyncInitialChoice | 'auto';
  silentSuccess?: boolean;
  requestBookmarkPermission?: boolean;
  allowDestructiveBookmarkChanges?: boolean;
  showProgressIndicator?: boolean;
  progressTaskId?: string | null;
  progressDetail?: string;
  onProgress?: (progress: LeafTabSyncEngineProgress) => void;
  allowEncryptionPrompt?: boolean;
  _retriedAfterUnlock?: boolean;
};

type LongTaskApi = {
  start: (options: { title: string; detail?: string; progress?: number }) => string;
  update: (id: string, options: { title?: string; detail?: string; progress?: number }) => void;
  finish: (id: string, options?: { title?: string; detail?: string }) => void;
  clear: (id?: string) => void;
};

type RunnerContext<TResult, TOptions extends LeafTabSyncRunnerOptionsBase> = {
  options: TOptions;
  progressTaskId: string | null;
  shouldManageProgressIndicator: boolean;
  updateSyncIndicator: (progress: LeafTabSyncEngineProgress) => void;
  retry: (nextOptions: TOptions) => Promise<TResult | null>;
};

type ExecuteLeafTabSyncRunParams<TResult, TOptions extends LeafTabSyncRunnerOptionsBase> = {
  providerLabel: string;
  options?: TOptions;
  runSync: (
    mode: LeafTabSyncInitialChoice | 'auto',
    progressOptions?: {
      onProgress?: (progress: LeafTabSyncEngineProgress) => void;
      allowDestructiveBookmarkChanges?: boolean;
    },
  ) => Promise<TResult | null>;
  refreshAnalysis?: () => Promise<unknown>;
  resolveSyncEncryptionError?: (providerLabel: string, error: unknown) => Promise<boolean>;
  requestBookmarkPermission: () => Promise<unknown>;
  longTask: LongTaskApi;
  getInitialProgressCopy: () => { title: string; detail?: string; progress?: number };
  getPermissionProgressCopy: (options: TOptions) => { title: string; detail?: string; progress?: number };
  getSuccessText: (result: TResult) => string;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  formatErrorMessage: (error: unknown) => string;
  onSuccess?: (result: TResult, context: RunnerContext<TResult, TOptions>) => Promise<void> | void;
  onError?: (error: unknown, context: RunnerContext<TResult, TOptions>) => Promise<TResult | null | undefined>;
};

export async function executeLeafTabSyncRun<TResult, TOptions extends LeafTabSyncRunnerOptionsBase>(
  params: ExecuteLeafTabSyncRunParams<TResult, TOptions>,
): Promise<TResult | null> {
  const options = (params.options || {}) as TOptions;
  const progressTaskId = options.progressTaskId
    ?? (options.showProgressIndicator === true ? params.longTask.start(params.getInitialProgressCopy()) : null);
  const shouldManageProgressIndicator = !options.progressTaskId && options.showProgressIndicator === true;
  const defaultProgressDetail = params.getInitialProgressCopy().detail;

  const updateSyncIndicator = (progress: LeafTabSyncEngineProgress) => {
    options.onProgress?.(progress);
    if (!progressTaskId) return;
    params.longTask.update(progressTaskId, {
      title: progress.message,
      detail: options.progressDetail || defaultProgressDetail,
      progress: progress.progress,
    });
  };

  const retry = (nextOptions: TOptions) => {
    return executeLeafTabSyncRun({
      ...params,
      options: nextOptions,
    });
  };

  const context: RunnerContext<TResult, TOptions> = {
    options,
    progressTaskId,
    shouldManageProgressIndicator,
    updateSyncIndicator,
    retry,
  };

  try {
    if (options.requestBookmarkPermission) {
      const copy = params.getPermissionProgressCopy(options);
      options.onProgress?.({
        stage: 'reading-state',
        message: copy.title,
        progress: copy.progress ?? 10,
      });
      if (progressTaskId) {
        params.longTask.update(progressTaskId, copy);
      }
      await params.requestBookmarkPermission();
    }

    const result = await params.runSync(options.mode || 'auto', {
      onProgress: updateSyncIndicator,
      allowDestructiveBookmarkChanges: options.allowDestructiveBookmarkChanges,
    });
    if (!result) return null;

    const successText = params.getSuccessText(result);
    await params.onSuccess?.(result, context);
    if (shouldManageProgressIndicator && progressTaskId) {
      params.longTask.finish(progressTaskId, {
        title: successText || params.getInitialProgressCopy().title,
        detail: successText || params.getInitialProgressCopy().detail,
      });
    }
    if (!options.silentSuccess) {
      params.notifySuccess(successText || params.getInitialProgressCopy().title);
    }
    await params.refreshAnalysis?.();
    return result;
  } catch (error) {
    if (options.allowEncryptionPrompt !== false && !options._retriedAfterUnlock && params.resolveSyncEncryptionError) {
      const resolved = await params.resolveSyncEncryptionError(params.providerLabel, error);
      if (resolved) {
        return retry({
          ...options,
          _retriedAfterUnlock: true,
        });
      }
    }

    const handled = await params.onError?.(error, context);
    if (handled !== undefined) {
      return handled;
    }

    if (shouldManageProgressIndicator && progressTaskId) {
      params.longTask.clear(progressTaskId);
    }
    params.notifyError(params.formatErrorMessage(error));
    return null;
  }
}

export function useLeafTabSyncRunner<TResult, TOptions extends LeafTabSyncRunnerOptionsBase>(
  params: Omit<ExecuteLeafTabSyncRunParams<TResult, TOptions>, 'options'>,
) {
  const latestParamsRef = useRef(params);

  useEffect(() => {
    latestParamsRef.current = params;
  }, [params]);

  return useCallback((options?: TOptions) => {
    return executeLeafTabSyncRun({
      ...latestParamsRef.current,
      options,
    });
  }, []);
}
