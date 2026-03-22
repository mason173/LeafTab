import type { LeafTabSyncMergeResult, LeafTabSyncMergeSource } from './merge';
import type { LeafTabSyncSnapshot } from './schema';

export interface LeafTabSyncChangeSummary {
  scenariosAdded: number;
  scenariosUpdated: number;
  scenariosDeleted: number;
  shortcutsAdded: number;
  shortcutsUpdated: number;
  shortcutsDeleted: number;
  bookmarkFoldersAdded: number;
  bookmarkFoldersUpdated: number;
  bookmarkFoldersDeleted: number;
  bookmarkItemsAdded: number;
  bookmarkItemsUpdated: number;
  bookmarkItemsDeleted: number;
  ordersMerged: number;
  conflicts: number;
}

const createEmptySummary = (): LeafTabSyncChangeSummary => ({
  scenariosAdded: 0,
  scenariosUpdated: 0,
  scenariosDeleted: 0,
  shortcutsAdded: 0,
  shortcutsUpdated: 0,
  shortcutsDeleted: 0,
  bookmarkFoldersAdded: 0,
  bookmarkFoldersUpdated: 0,
  bookmarkFoldersDeleted: 0,
  bookmarkItemsAdded: 0,
  bookmarkItemsUpdated: 0,
  bookmarkItemsDeleted: 0,
  ordersMerged: 0,
  conflicts: 0,
});

const isSame = (left: unknown, right: unknown) => {
  return JSON.stringify(left) === JSON.stringify(right);
};

export const summarizeLeafTabSyncMerge = (
  baseSnapshot: LeafTabSyncSnapshot,
  mergeResult: LeafTabSyncMergeResult,
): LeafTabSyncChangeSummary => {
  const summary = createEmptySummary();
  const finalSnapshot = mergeResult.snapshot;

  const scenarioIds = new Set([
    ...Object.keys(baseSnapshot.scenarios),
    ...Object.keys(finalSnapshot.scenarios),
  ]);
  scenarioIds.forEach((id) => {
    const baseEntity = baseSnapshot.scenarios[id];
    const finalEntity = finalSnapshot.scenarios[id];
    if (!baseEntity && finalEntity) {
      summary.scenariosAdded += 1;
      return;
    }
    if (baseEntity && !finalEntity) {
      summary.scenariosDeleted += 1;
      return;
    }
    if (baseEntity && finalEntity && !isSame(baseEntity, finalEntity)) {
      summary.scenariosUpdated += 1;
    }
  });

  const shortcutIds = new Set([
    ...Object.keys(baseSnapshot.shortcuts),
    ...Object.keys(finalSnapshot.shortcuts),
  ]);
  shortcutIds.forEach((id) => {
    const baseEntity = baseSnapshot.shortcuts[id];
    const finalEntity = finalSnapshot.shortcuts[id];
    if (!baseEntity && finalEntity) {
      summary.shortcutsAdded += 1;
      return;
    }
    if (baseEntity && !finalEntity) {
      summary.shortcutsDeleted += 1;
      return;
    }
    if (baseEntity && finalEntity && !isSame(baseEntity, finalEntity)) {
      summary.shortcutsUpdated += 1;
    }
  });

  const bookmarkFolderIds = new Set([
    ...Object.keys(baseSnapshot.bookmarkFolders),
    ...Object.keys(finalSnapshot.bookmarkFolders),
  ]);
  bookmarkFolderIds.forEach((id) => {
    const baseEntity = baseSnapshot.bookmarkFolders[id];
    const finalEntity = finalSnapshot.bookmarkFolders[id];
    if (!baseEntity && finalEntity) {
      summary.bookmarkFoldersAdded += 1;
      return;
    }
    if (baseEntity && !finalEntity) {
      summary.bookmarkFoldersDeleted += 1;
      return;
    }
    if (baseEntity && finalEntity && !isSame(baseEntity, finalEntity)) {
      summary.bookmarkFoldersUpdated += 1;
    }
  });

  const bookmarkItemIds = new Set([
    ...Object.keys(baseSnapshot.bookmarkItems),
    ...Object.keys(finalSnapshot.bookmarkItems),
  ]);
  bookmarkItemIds.forEach((id) => {
    const baseEntity = baseSnapshot.bookmarkItems[id];
    const finalEntity = finalSnapshot.bookmarkItems[id];
    if (!baseEntity && finalEntity) {
      summary.bookmarkItemsAdded += 1;
      return;
    }
    if (baseEntity && !finalEntity) {
      summary.bookmarkItemsDeleted += 1;
      return;
    }
    if (baseEntity && finalEntity && !isSame(baseEntity, finalEntity)) {
      summary.bookmarkItemsUpdated += 1;
    }
  });

  summary.ordersMerged = Object.values(mergeResult.orderSources).filter(
    (source: LeafTabSyncMergeSource) => source === 'merged',
  ).length;
  summary.conflicts = mergeResult.conflicts.length;

  return summary;
};

export const formatLeafTabSyncSummaryText = (summary: LeafTabSyncChangeSummary) => {
  const parts: string[] = [];
  if (summary.scenariosAdded) parts.push(`新增 ${summary.scenariosAdded} 个场景`);
  if (summary.scenariosUpdated) parts.push(`更新 ${summary.scenariosUpdated} 个场景`);
  if (summary.scenariosDeleted) parts.push(`删除 ${summary.scenariosDeleted} 个场景`);
  if (summary.shortcutsAdded) parts.push(`新增 ${summary.shortcutsAdded} 个快捷方式`);
  if (summary.shortcutsUpdated) parts.push(`更新 ${summary.shortcutsUpdated} 个快捷方式`);
  if (summary.shortcutsDeleted) parts.push(`删除 ${summary.shortcutsDeleted} 个快捷方式`);
  if (summary.bookmarkFoldersAdded) parts.push(`新增 ${summary.bookmarkFoldersAdded} 个书签文件夹`);
  if (summary.bookmarkFoldersUpdated) parts.push(`更新 ${summary.bookmarkFoldersUpdated} 个书签文件夹`);
  if (summary.bookmarkFoldersDeleted) parts.push(`删除 ${summary.bookmarkFoldersDeleted} 个书签文件夹`);
  if (summary.bookmarkItemsAdded) parts.push(`新增 ${summary.bookmarkItemsAdded} 个书签`);
  if (summary.bookmarkItemsUpdated) parts.push(`更新 ${summary.bookmarkItemsUpdated} 个书签`);
  if (summary.bookmarkItemsDeleted) parts.push(`删除 ${summary.bookmarkItemsDeleted} 个书签`);
  if (summary.ordersMerged) parts.push(`合并 ${summary.ordersMerged} 处排序`);
  if (summary.conflicts) parts.push(`${summary.conflicts} 处冲突待处理`);
  return parts.length ? parts.join('，') : '未检测到变更';
};
