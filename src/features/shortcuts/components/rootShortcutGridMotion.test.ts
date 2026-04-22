import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@/types';
import {
  buildRootLayoutAnimationSignature,
  buildRootShortcutGridItems,
  type RootShortcutGridItemLayout,
} from '../../../../packages/grid-react/src/rootShortcutGridHelpers';

function createShortcut(id: string): Shortcut {
  return {
    id,
    title: id,
    url: `https://${id}.example`,
    icon: '',
  };
}

function createLayout(width: number, overrides?: Partial<RootShortcutGridItemLayout>): RootShortcutGridItemLayout {
  return {
    width,
    height: width + 16,
    ...overrides,
  };
}

describe('buildRootLayoutAnimationSignature', () => {
  it('stays stable when only icon dimensions change', () => {
    const shortcuts = [createShortcut('alpha'), createShortcut('beta')];
    const compactItems = buildRootShortcutGridItems({
      shortcuts,
      resolveItemLayout: () => createLayout(72),
    });
    const enlargedItems = buildRootShortcutGridItems({
      shortcuts,
      resolveItemLayout: () => createLayout(88),
    });

    expect(buildRootLayoutAnimationSignature(enlargedItems)).toBe(
      buildRootLayoutAnimationSignature(compactItems),
    );
  });

  it('changes when root order changes', () => {
    const forwardItems = buildRootShortcutGridItems({
      shortcuts: [createShortcut('alpha'), createShortcut('beta')],
      resolveItemLayout: () => createLayout(72),
    });
    const reorderedItems = buildRootShortcutGridItems({
      shortcuts: [createShortcut('beta'), createShortcut('alpha')],
      resolveItemLayout: () => createLayout(72),
    });

    expect(buildRootLayoutAnimationSignature(reorderedItems)).not.toBe(
      buildRootLayoutAnimationSignature(forwardItems),
    );
  });

  it('changes when an item span changes', () => {
    const shortcuts = [createShortcut('folder')];
    const smallItems = buildRootShortcutGridItems({
      shortcuts,
      resolveItemLayout: () => createLayout(72, { columnSpan: 1, rowSpan: 1 }),
    });
    const largeItems = buildRootShortcutGridItems({
      shortcuts,
      resolveItemLayout: () => createLayout(72, { columnSpan: 2, rowSpan: 2 }),
    });

    expect(buildRootLayoutAnimationSignature(largeItems)).not.toBe(
      buildRootLayoutAnimationSignature(smallItems),
    );
  });
});
