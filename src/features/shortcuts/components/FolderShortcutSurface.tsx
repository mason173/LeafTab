import { FolderShortcutSurface as PackageFolderShortcutSurface } from '@leaftab/grid-react';
import { createLeaftabFolderSurfacePreset } from '@leaftab/grid-preset-leaftab';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { ShortcutIconRenderContext, type ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import type {
  FolderExtractDragStartPayload,
  FolderShortcutDropIntent,
} from '@/features/shortcuts/drag/types';
import {
  renderLeaftabFolderDragPreview,
  renderLeaftabFolderDropPreview,
  renderLeaftabFolderEmptyState,
  renderLeaftabFolderItem,
} from './leaftabGridVisuals';

export type { FolderExtractDragStartPayload } from '@/features/shortcuts/drag/types';

type FolderShortcutSurfaceProps = {
  folderId: string;
  shortcuts: Shortcut[];
  emptyText: string;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  forceTextWhite?: boolean;
  showShortcutTitles?: boolean;
  maskBoundaryRef: React.RefObject<HTMLElement | null>;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu?: (event: React.MouseEvent<HTMLDivElement>, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  onDragActiveChange?: (active: boolean) => void;
};

export function FolderShortcutSurface({
  folderId,
  shortcuts,
  emptyText,
  compactIconSize = 72,
  iconCornerRadius,
  iconAppearance,
  forceTextWhite = false,
  showShortcutTitles = true,
  maskBoundaryRef,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutDropIntent,
  onExtractDragStart,
  onDragActiveChange,
}: FolderShortcutSurfaceProps) {
  const firefox = isFirefoxBuildTarget();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);
  const shortcutIconRenderContextValue = useMemo(() => ({
    monochromeTone: 'theme-adaptive' as ShortcutMonochromeTone,
    monochromeTileBackdropBlur: false,
  }), []);

  useLayoutEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;

    const updateColumns = () => {
      const nextColumns = node.clientWidth >= 640 ? 4 : 3;
      setColumns((current) => (current === nextColumns ? current : nextColumns));
    };

    updateColumns();
    const observer = new ResizeObserver(() => {
      updateColumns();
    });
    observer.observe(node);
    window.addEventListener('resize', updateColumns, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateColumns);
    };
  }, []);

  const folderSurfacePreset = useMemo(() => createLeaftabFolderSurfacePreset({
    compactIconSize,
    iconCornerRadius,
  }), [compactIconSize, iconCornerRadius]);

  return (
    <ShortcutIconRenderContext.Provider value={shortcutIconRenderContextValue}>
      <div ref={wrapperRef}>
        <PackageFolderShortcutSurface
          folderId={folderId}
          shortcuts={shortcuts}
          emptyText={emptyText}
          columns={columns}
          columnGap={16}
          rowGap={20}
          maskBoundaryRef={maskBoundaryRef}
          isFirefox={firefox}
          resolveItemLayout={folderSurfacePreset.resolveItemLayout}
          renderEmptyState={() => renderLeaftabFolderEmptyState(emptyText)}
          renderDropPreview={renderLeaftabFolderDropPreview}
          renderItem={(params) => renderLeaftabFolderItem({
            shortcut: params.shortcut,
            compactIconSize,
            iconCornerRadius,
            iconAppearance,
            forceTextWhite,
            showShortcutTitles,
            onOpen: params.onOpen,
            onContextMenu: params.onContextMenu,
          })}
          renderDragPreview={(params) => renderLeaftabFolderDragPreview({
            shortcut: params.shortcut,
            compactIconSize,
            iconCornerRadius,
            iconAppearance,
            forceTextWhite,
          })}
          onShortcutOpen={onShortcutOpen}
          onShortcutContextMenu={onShortcutContextMenu}
          onShortcutDropIntent={onShortcutDropIntent}
          onExtractDragStart={onExtractDragStart}
          onDragActiveChange={onDragActiveChange}
        />
      </div>
    </ShortcutIconRenderContext.Provider>
  );
}
