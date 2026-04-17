import React from 'react';
import { RootShortcutGrid, type RootShortcutGridProps } from './RootShortcutGrid';

// V2 stays as the compatibility entrypoint while the self-owned root grid
// surface lives in RootShortcutGrid.
export const RootShortcutGridV2 = React.memo(function RootShortcutGridV2(
  props: RootShortcutGridProps,
) {
  return <RootShortcutGrid {...props} />;
});
