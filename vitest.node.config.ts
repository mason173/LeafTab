import { defineConfig } from 'vite';
import baseConfigFactory from './vite.config';

export default defineConfig(async () => {
  const baseConfig = typeof baseConfigFactory === 'function'
    ? await baseConfigFactory()
    : baseConfigFactory;

  return {
    ...baseConfig,
    test: {
      environment: 'node',
      setupFiles: [],
      include: [
        'src/hooks/useLeafTabSnapshotBridge.test.ts',
        'src/hooks/useLeafTabSyncRunner.test.ts',
        'src/hooks/useLeafTabSyncEngine.test.ts',
        'src/sync/leaftab/bookmarkSyncMode.test.ts',
        'src/sync/leaftab/bookmarks.test.ts',
        'src/sync/leaftab/engine.test.ts',
        'src/sync/leaftab/fileMap.test.ts',
        'src/sync/leaftab/legacySingleFileCompat.test.ts',
        'src/sync/leaftab/legacyWebdavMigration.test.ts',
        'src/sync/leaftab/localBackup.test.ts',
        'src/sync/leaftab/merge.test.ts',
        'src/sync/leaftab/snapshot.test.ts',
        'src/sync/leaftab/snapshot.bookmarks.test.ts',
        'src/features/shortcuts/drag/__tests__/dragMotion.test.ts',
        'src/features/shortcuts/drag/__tests__/gridLayout.test.ts',
        'src/features/shortcuts/drag/__tests__/pointerDragSession.test.ts',
        'src/features/shortcuts/drag/__tests__/resolveRootDropIntent.test.ts',
        'src/features/shortcuts/engine/__tests__/gridEngine.test.ts',
        'src/features/shortcuts/domain/__tests__/dropIntents.test.ts',
        'src/features/shortcuts/model/__tests__/constraints.test.ts',
        'src/features/shortcuts/model/__tests__/operations.test.ts',
        'src/popup/activeTab.test.ts',
        'src/utils/shortcutColorHsl.test.ts',
        'src/utils.favicon.test.ts',
        'src/utils/shortcutIconPreferences.test.ts',
        'src/utils/shortcutFolders.test.ts',
        'src/utils/cloudSyncBookmarksPolicy.test.ts',
        'src/utils/syncablePreferences.matrix.test.ts',
        'src/utils/localBackupScopePolicy.test.ts',
        'src/utils/legacyShortcutMirror.test.ts',
        'src/utils/searchSuggestionSources.test.ts',
        'src/utils/shortcutsPayload.test.ts',
        'src/utils/rolePresetRegistry.test.ts',
        'src/utils/roleProfile.test.ts',
      ],
    },
  };
});
