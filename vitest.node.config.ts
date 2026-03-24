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
        'src/sync/leaftab/merge.test.ts',
        'src/utils/rolePresetRegistry.test.ts',
        'src/utils/roleProfile.test.ts',
      ],
    },
  };
});
