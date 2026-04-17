import {
  renderLeaftabFolderDragPreview,
  renderLeaftabFolderItem,
  renderRootShortcutGridCard,
  renderRootShortcutGridDragPreview,
  renderRootShortcutGridSelectionIndicator,
} from '@/features/shortcuts/components/leaftabGridVisuals';

export const defaultRootShortcutGridRenderers = {
  renderShortcutCard: renderRootShortcutGridCard,
  renderDragPreview: renderRootShortcutGridDragPreview,
  renderSelectionIndicator: renderRootShortcutGridSelectionIndicator,
};

export const defaultFolderShortcutSurfaceRenderers = {
  renderShortcutCard: renderLeaftabFolderItem,
  renderDragPreview: renderLeaftabFolderDragPreview,
};
