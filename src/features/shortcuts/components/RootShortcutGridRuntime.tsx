import React from 'react';
import { RootShortcutGrid, type RootShortcutGridProps } from './RootShortcutGrid';
import { RootShortcutGridV2 } from './RootShortcutGridV2';

export type RootShortcutGridEngine = 'legacy' | 'v2';
export const ROOT_SHORTCUT_GRID_ENGINE_STORAGE_KEY = 'leaftab_root_shortcut_grid_engine';

export type RootShortcutGridRuntimeProps = RootShortcutGridProps & {
  engine?: RootShortcutGridEngine;
};

export const DEFAULT_ROOT_SHORTCUT_GRID_ENGINE: RootShortcutGridEngine = 'legacy';

export function resolveRootShortcutGridEngine(engine?: RootShortcutGridEngine): RootShortcutGridEngine {
  if (engine) {
    return engine;
  }

  if (typeof window !== 'undefined') {
    const storedValue = window.localStorage.getItem(ROOT_SHORTCUT_GRID_ENGINE_STORAGE_KEY);
    if (storedValue === 'legacy' || storedValue === 'v2') {
      return storedValue;
    }
  }

  return DEFAULT_ROOT_SHORTCUT_GRID_ENGINE;
}

export const RootShortcutGridRuntime = React.memo(function RootShortcutGridRuntime({
  engine,
  ...props
}: RootShortcutGridRuntimeProps) {
  if (resolveRootShortcutGridEngine(engine) === 'v2') {
    return <RootShortcutGridV2 {...props} />;
  }

  return <RootShortcutGrid {...props} />;
});
