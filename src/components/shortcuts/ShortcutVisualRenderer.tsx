import React from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import ShortcutIcon from '@/components/ShortcutIcon';
import { ShortcutFolderLargePreview, ShortcutFolderPreview } from './ShortcutFolderPreview';
import { isShortcutFolder } from '@/utils/shortcutFolders';
import { getShortcutIconBorderRadius } from '@/utils/shortcutIconSettings';

export interface ShortcutVisualRendererProps {
  shortcut: Shortcut;
  previewSize: number;
  largeFolder?: boolean;
  iconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  remoteIconScale?: number;
  dropTargetActive?: boolean;
  onOpenFolder?: () => void;
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  selectionDisabled?: boolean;
  folderPortalBackdrop?: boolean;
}

export const ShortcutVisualRenderer = React.memo(function ShortcutVisualRenderer({
  shortcut,
  previewSize,
  largeFolder = false,
  iconSize = previewSize,
  iconCornerRadius,
  iconAppearance,
  remoteIconScale = 1,
  dropTargetActive = false,
  onOpenFolder,
  onPreviewShortcutOpen,
  selectionDisabled = false,
  folderPortalBackdrop = false,
}: ShortcutVisualRendererProps) {
  if (isShortcutFolder(shortcut)) {
    if (largeFolder) {
      return (
        <ShortcutFolderLargePreview
          shortcut={shortcut}
          size={previewSize}
          iconCornerRadius={iconCornerRadius}
        iconAppearance={iconAppearance}
        highlightBorder={dropTargetActive}
        onOpenFolder={selectionDisabled ? undefined : onOpenFolder}
        onOpenShortcut={selectionDisabled ? undefined : onPreviewShortcutOpen}
        portalBackdrop={folderPortalBackdrop}
      />
    );
  }

    return (
      <ShortcutFolderPreview
        shortcut={shortcut}
        size={previewSize}
        iconCornerRadius={iconCornerRadius}
        iconAppearance={iconAppearance}
        highlightBorder={dropTargetActive}
        selectionDisabled={selectionDisabled}
        portalBackdrop={folderPortalBackdrop}
      />
    );
  }

  const iconBorderRadius = getShortcutIconBorderRadius(iconCornerRadius);

  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: iconSize,
        height: iconSize,
        borderRadius: iconBorderRadius,
        transition: 'box-shadow 150ms ease, filter 150ms ease',
        boxShadow: dropTargetActive
          ? '0 0 0 1px rgba(255,255,255,0.34), 0 0 0 6px rgba(232,236,240,0.22)'
          : undefined,
        filter: dropTargetActive ? 'brightness(1.04)' : undefined,
      }}
      data-shortcut-drop-target-active={dropTargetActive ? 'true' : 'false'}
    >
      <ShortcutIcon
        icon={shortcut.icon}
        url={shortcut.url}
        shortcutId={shortcut.id}
        size={iconSize}
        exact
        frame="never"
        fallbackStyle="emptyicon"
        fallbackLabel={shortcut.title}
        useOfficialIcon={shortcut.useOfficialIcon}
        autoUseOfficialIcon={shortcut.autoUseOfficialIcon}
        officialIconAvailableAtSave={shortcut.officialIconAvailableAtSave}
        officialIconColorOverride={shortcut.officialIconColorOverride}
        iconRendering={shortcut.iconRendering}
        iconColor={shortcut.iconColor}
        iconCornerRadius={iconCornerRadius}
        iconAppearance={iconAppearance}
        remoteIconScale={remoteIconScale}
      />
    </div>
  );
});
