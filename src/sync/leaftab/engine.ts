import { createLeafTabSyncBaseline, type LeafTabSyncBaselineStore, getLeafTabSyncBaselineSnapshot } from './baseline';
import { mergeLeafTabSyncSnapshot, type LeafTabSyncMergeResult } from './merge';
import type { LeafTabSyncSnapshot } from './schema';
import { formatLeafTabSyncSummaryText, summarizeLeafTabSyncMerge, type LeafTabSyncChangeSummary } from './summary';
import type { LeafTabSyncRemoteStore } from './remoteStore';

export type LeafTabSyncInitialChoice = 'push-local' | 'pull-remote' | 'merge';
export type LeafTabSyncRunMode = 'auto' | LeafTabSyncInitialChoice;

export interface LeafTabSyncDataSummary {
  scenarios: number;
  shortcuts: number;
  bookmarkFolders: number;
  bookmarkItems: number;
  tombstones: number;
}

export interface LeafTabSyncAnalysis {
  hasBaseline: boolean;
  localSummary: LeafTabSyncDataSummary;
  remoteSummary: LeafTabSyncDataSummary;
  requiresInitialChoice: boolean;
  suggestedInitialChoice: LeafTabSyncInitialChoice | null;
  remoteCommitId: string | null;
}

export interface LeafTabSyncEngineResult {
  kind: 'noop' | 'push' | 'pull' | 'merge' | 'conflict';
  remoteCommitId: string | null;
  snapshot: LeafTabSyncSnapshot;
  mergeResult?: LeafTabSyncMergeResult;
  summary?: LeafTabSyncChangeSummary;
  summaryText?: string;
}

export interface LeafTabSyncEngineProgress {
  stage:
    | 'reading-state'
    | 'merging'
    | 'acquiring-lock'
    | 'rechecking-remote'
    | 'uploading-remote'
    | 'applying-local'
    | 'finalizing'
    | 'completed';
  progress: number;
  message: string;
}

export interface LeafTabSyncEngineConfig {
  deviceId: string;
  remoteStore: LeafTabSyncRemoteStore;
  baselineStore: LeafTabSyncBaselineStore;
  buildLocalSnapshot: () => Promise<LeafTabSyncSnapshot>;
  applyLocalSnapshot: (snapshot: LeafTabSyncSnapshot) => Promise<void>;
  createEmptySnapshot: () => LeafTabSyncSnapshot;
  rootPath?: string;
}

export interface LeafTabSyncEngineRunOptions {
  localSnapshotOverride?: LeafTabSyncSnapshot;
  onProgress?: (progress: LeafTabSyncEngineProgress) => void;
}

export interface LeafTabSyncEngineAnalyzeOptions {
  onProgress?: (progress: LeafTabSyncEngineProgress) => void;
}

const summarizeSnapshot = (snapshot: LeafTabSyncSnapshot | null): LeafTabSyncDataSummary => {
  if (!snapshot) {
    return {
      scenarios: 0,
      shortcuts: 0,
      bookmarkFolders: 0,
      bookmarkItems: 0,
      tombstones: 0,
    };
  }
  return {
    scenarios: Object.keys(snapshot.scenarios).length,
    shortcuts: Object.keys(snapshot.shortcuts).length,
    bookmarkFolders: Object.keys(snapshot.bookmarkFolders).length,
    bookmarkItems: Object.keys(snapshot.bookmarkItems).length,
    tombstones: Object.keys(snapshot.tombstones).length,
  };
};

const sameSnapshotContent = (
  left: LeafTabSyncSnapshot | null,
  right: LeafTabSyncSnapshot | null,
) => {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return JSON.stringify({
    scenarios: left.scenarios,
    shortcuts: left.shortcuts,
    bookmarkFolders: left.bookmarkFolders,
    bookmarkItems: left.bookmarkItems,
    scenarioOrder: left.scenarioOrder,
    shortcutOrders: left.shortcutOrders,
    bookmarkOrders: left.bookmarkOrders,
    tombstones: left.tombstones,
  }) === JSON.stringify({
    scenarios: right.scenarios,
    shortcuts: right.shortcuts,
    bookmarkFolders: right.bookmarkFolders,
    bookmarkItems: right.bookmarkItems,
    scenarioOrder: right.scenarioOrder,
    shortcutOrders: right.shortcutOrders,
    bookmarkOrders: right.bookmarkOrders,
    tombstones: right.tombstones,
  });
};

const cloneSnapshot = (snapshot: LeafTabSyncSnapshot) => {
  return JSON.parse(JSON.stringify(snapshot)) as LeafTabSyncSnapshot;
};

const reportProgress = (
  onProgress: ((progress: LeafTabSyncEngineProgress) => void) | undefined,
  progress: LeafTabSyncEngineProgress,
) => {
  onProgress?.({
    ...progress,
    progress: Math.max(0, Math.min(100, Math.round(progress.progress))),
  });
};

export class LeafTabSyncEngine {
  private readonly config: LeafTabSyncEngineConfig;

  constructor(config: LeafTabSyncEngineConfig) {
    this.config = config;
  }

  async analyze(options?: LeafTabSyncEngineAnalyzeOptions): Promise<LeafTabSyncAnalysis> {
    reportProgress(options?.onProgress, {
      stage: 'reading-state',
      progress: 10,
      message: '正在读取本地与云端状态',
    });
    const [baseline, localSnapshot, remoteState] = await Promise.all([
      this.config.baselineStore.load(),
      this.config.buildLocalSnapshot(),
      this.config.remoteStore.readState(),
    ]);

    const remoteSnapshot = remoteState.snapshot;
    const hasBaseline = Boolean(baseline?.snapshot || baseline?.commitId);

    const result = {
      hasBaseline,
      localSummary: summarizeSnapshot(localSnapshot),
      remoteSummary: summarizeSnapshot(remoteSnapshot),
      requiresInitialChoice: false,
      suggestedInitialChoice: null,
      remoteCommitId: remoteState.commit?.id || null,
    };
    reportProgress(options?.onProgress, {
      stage: 'completed',
      progress: 100,
      message: '同步状态分析完成',
    });
    return result;
  }

  async sync(
    mode: LeafTabSyncRunMode = 'auto',
    runOptions?: LeafTabSyncEngineRunOptions,
  ): Promise<LeafTabSyncEngineResult> {
    reportProgress(runOptions?.onProgress, {
      stage: 'reading-state',
      progress: 8,
      message: '正在读取本地与云端数据',
    });
    const [baseline, localSnapshot, remoteState] = await Promise.all([
      this.config.baselineStore.load(),
      runOptions?.localSnapshotOverride
        ? Promise.resolve(cloneSnapshot(runOptions.localSnapshotOverride))
        : this.config.buildLocalSnapshot(),
      this.config.remoteStore.readState(),
    ]);

    const baseSnapshot =
      getLeafTabSyncBaselineSnapshot(baseline) || this.config.createEmptySnapshot();
    const remoteSnapshot = remoteState.snapshot || this.config.createEmptySnapshot();
    const hasBaseline = Boolean(baseline?.snapshot || baseline?.commitId);

    if (mode === 'push-local') {
      reportProgress(runOptions?.onProgress, {
        stage: 'acquiring-lock',
        progress: 34,
        message: '正在锁定云端目录',
      });
      await this.config.remoteStore.acquireLock(this.config.deviceId);
      try {
        reportProgress(runOptions?.onProgress, {
          stage: 'rechecking-remote',
          progress: 52,
          message: '正在重新确认云端最新状态',
        });
        const latestRemote = await this.config.remoteStore.readState();
        const latestRemoteSnapshot = latestRemote.snapshot || this.config.createEmptySnapshot();

        if (sameSnapshotContent(latestRemoteSnapshot, localSnapshot)) {
          reportProgress(runOptions?.onProgress, {
            stage: 'finalizing',
            progress: 92,
            message: '正在收尾同步结果',
          });
          await this.config.baselineStore.save(createLeafTabSyncBaseline({
            snapshot: localSnapshot,
            commitId: latestRemote.commit?.id || null,
            rootPath: this.config.rootPath,
          }));
          reportProgress(runOptions?.onProgress, {
            stage: 'completed',
            progress: 100,
            message: '同步完成',
          });
          return {
            kind: 'noop',
            remoteCommitId: latestRemote.commit?.id || null,
            snapshot: localSnapshot,
            summaryText: '远端数据已经和本地一致',
          };
        }

        reportProgress(runOptions?.onProgress, {
          stage: 'uploading-remote',
          progress: 68,
          message: '正在写入云端数据',
        });
        const writeResult = await this.config.remoteStore.writeState({
          snapshot: localSnapshot,
          previousSnapshot: latestRemote.snapshot,
          deviceId: this.config.deviceId,
          parentCommitId: latestRemote.commit?.id || null,
        });
        reportProgress(runOptions?.onProgress, {
          stage: 'finalizing',
          progress: 92,
          message: '正在收尾同步结果',
        });
        await this.config.baselineStore.save(createLeafTabSyncBaseline({
          snapshot: localSnapshot,
          commitId: writeResult.commit.id,
          rootPath: this.config.rootPath,
        }));
        reportProgress(runOptions?.onProgress, {
          stage: 'completed',
          progress: 100,
          message: '同步完成',
        });
        return {
          kind: 'push',
          remoteCommitId: writeResult.commit.id,
          snapshot: localSnapshot,
          summaryText: '已将本地数据写入远端',
        };
      } finally {
        await this.config.remoteStore.releaseLock();
      }
    }

    if (mode === 'pull-remote') {
      if (!sameSnapshotContent(localSnapshot, remoteSnapshot)) {
        reportProgress(runOptions?.onProgress, {
          stage: 'applying-local',
          progress: 62,
          message: '正在将云端数据写入本地',
        });
        await this.config.applyLocalSnapshot(remoteSnapshot);
      }
      reportProgress(runOptions?.onProgress, {
        stage: 'finalizing',
        progress: 92,
        message: '正在收尾同步结果',
      });
      await this.config.baselineStore.save(createLeafTabSyncBaseline({
        snapshot: remoteSnapshot,
        commitId: remoteState.commit?.id || null,
        rootPath: this.config.rootPath,
      }));
      reportProgress(runOptions?.onProgress, {
        stage: 'completed',
        progress: 100,
        message: '同步完成',
      });
      return {
        kind: sameSnapshotContent(localSnapshot, remoteSnapshot) ? 'noop' : 'pull',
        remoteCommitId: remoteState.commit?.id || null,
        snapshot: remoteSnapshot,
        summaryText: sameSnapshotContent(localSnapshot, remoteSnapshot)
          ? '本地与远端数据已经一致'
          : '已从远端拉取同步数据',
      };
    }

    reportProgress(runOptions?.onProgress, {
      stage: 'merging',
      progress: 24,
      message: '正在合并本地与云端差异',
    });
    const mergeResult = mergeLeafTabSyncSnapshot(
      baseSnapshot,
      localSnapshot,
      remoteSnapshot,
      {
        deviceId: this.config.deviceId,
      },
    );

    let finalMergeResult = mergeResult;
    let finalSnapshot = mergeResult.snapshot;
    let finalSummary = summarizeLeafTabSyncMerge(baseSnapshot, finalMergeResult);
    let finalSummaryText = formatLeafTabSyncSummaryText(finalSummary);

    if (!sameSnapshotContent(remoteSnapshot, finalSnapshot)) {
      reportProgress(runOptions?.onProgress, {
        stage: 'acquiring-lock',
        progress: 40,
        message: '正在锁定云端目录',
      });
      await this.config.remoteStore.acquireLock(this.config.deviceId);
      try {
        reportProgress(runOptions?.onProgress, {
          stage: 'rechecking-remote',
          progress: 54,
          message: '正在重新确认云端最新状态',
        });
        const latestRemote = await this.config.remoteStore.readState();
        const latestRemoteSnapshot = latestRemote.snapshot || this.config.createEmptySnapshot();
        if (!sameSnapshotContent(latestRemoteSnapshot, remoteSnapshot)) {
          finalMergeResult = mergeLeafTabSyncSnapshot(
            baseSnapshot,
            localSnapshot,
            latestRemoteSnapshot,
            { deviceId: this.config.deviceId },
          );
          finalSnapshot = finalMergeResult.snapshot;
          finalSummary = summarizeLeafTabSyncMerge(baseSnapshot, finalMergeResult);
          finalSummaryText = formatLeafTabSyncSummaryText(finalSummary);
        }

        if (!sameSnapshotContent(latestRemoteSnapshot, finalSnapshot)) {
          reportProgress(runOptions?.onProgress, {
            stage: 'uploading-remote',
            progress: 72,
            message: '正在写入云端数据',
          });
          const writeResult = await this.config.remoteStore.writeState({
            snapshot: finalSnapshot,
            previousSnapshot: latestRemote.snapshot,
            deviceId: this.config.deviceId,
            parentCommitId: latestRemote.commit?.id || null,
          });
          await this.config.baselineStore.save(createLeafTabSyncBaseline({
            snapshot: finalSnapshot,
            commitId: writeResult.commit.id,
            rootPath: this.config.rootPath,
          }));

          if (!sameSnapshotContent(localSnapshot, finalSnapshot)) {
            reportProgress(runOptions?.onProgress, {
              stage: 'applying-local',
              progress: 88,
              message: '正在将最新结果写入本地',
            });
            await this.config.applyLocalSnapshot(cloneSnapshot(finalSnapshot));
          }

          reportProgress(runOptions?.onProgress, {
            stage: 'completed',
            progress: 100,
            message: '同步完成',
          });
          return {
            kind: sameSnapshotContent(localSnapshot, finalSnapshot) ? 'push' : 'merge',
            remoteCommitId: writeResult.commit.id,
            snapshot: finalSnapshot,
            mergeResult: finalMergeResult,
            summary: finalSummary,
            summaryText: finalSummaryText,
          };
        }

        await this.config.baselineStore.save(createLeafTabSyncBaseline({
          snapshot: finalSnapshot,
          commitId: latestRemote.commit?.id || null,
          rootPath: this.config.rootPath,
        }));

        if (!sameSnapshotContent(localSnapshot, finalSnapshot)) {
          reportProgress(runOptions?.onProgress, {
            stage: 'applying-local',
            progress: 86,
            message: '正在将云端数据写入本地',
          });
          await this.config.applyLocalSnapshot(cloneSnapshot(finalSnapshot));
          reportProgress(runOptions?.onProgress, {
            stage: 'completed',
            progress: 100,
            message: '同步完成',
          });
          return {
            kind: 'pull',
            remoteCommitId: latestRemote.commit?.id || null,
            snapshot: finalSnapshot,
            mergeResult: finalMergeResult,
            summary: finalSummary,
            summaryText: finalSummaryText,
          };
        }

        reportProgress(runOptions?.onProgress, {
          stage: 'completed',
          progress: 100,
          message: '同步完成',
        });
        return {
          kind: 'noop',
          remoteCommitId: latestRemote.commit?.id || null,
          snapshot: finalSnapshot,
          mergeResult: finalMergeResult,
          summary: finalSummary,
          summaryText: finalSummaryText,
        };
      } finally {
        await this.config.remoteStore.releaseLock();
      }
    }

    if (sameSnapshotContent(localSnapshot, finalSnapshot)) {
      reportProgress(runOptions?.onProgress, {
        stage: 'finalizing',
        progress: 92,
        message: '正在收尾同步结果',
      });
      await this.config.baselineStore.save(createLeafTabSyncBaseline({
        snapshot: finalSnapshot,
        commitId: remoteState.commit?.id || null,
        rootPath: this.config.rootPath,
      }));
      reportProgress(runOptions?.onProgress, {
        stage: 'completed',
        progress: 100,
        message: '同步完成',
      });
      return {
        kind: 'noop',
        remoteCommitId: remoteState.commit?.id || null,
        snapshot: finalSnapshot,
        mergeResult: finalMergeResult,
        summary: finalSummary,
        summaryText: finalSummaryText,
      };
    }

    reportProgress(runOptions?.onProgress, {
      stage: 'applying-local',
      progress: 84,
      message: '正在将云端数据写入本地',
    });
    await this.config.applyLocalSnapshot(cloneSnapshot(finalSnapshot));
    reportProgress(runOptions?.onProgress, {
      stage: 'finalizing',
      progress: 94,
      message: '正在收尾同步结果',
    });
    await this.config.baselineStore.save(createLeafTabSyncBaseline({
      snapshot: finalSnapshot,
      commitId: remoteState.commit?.id || null,
      rootPath: this.config.rootPath,
    }));

    reportProgress(runOptions?.onProgress, {
      stage: 'completed',
      progress: 100,
      message: '同步完成',
    });

    return {
      kind: 'pull',
      remoteCommitId: remoteState.commit?.id || null,
      snapshot: finalSnapshot,
      mergeResult: finalMergeResult,
      summary: finalSummary,
      summaryText: finalSummaryText,
    };
  }
}
