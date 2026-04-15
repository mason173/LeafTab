import React from 'react';
import { RootShortcutGrid, type RootShortcutGridProps } from './RootShortcutGrid';

// V2 now delegates to the shared workspace-react root grid adapter.
// The package runtime measures real DOM rects on pointer/scroll updates,
// which keeps drag overlay, hover intent, and projected preview in one
// geometry system during drawer auto-scroll.
export const RootShortcutGridV2 = React.memo(function RootShortcutGridV2(
  props: RootShortcutGridProps,
) {
  return <RootShortcutGrid {...props} />;
});
