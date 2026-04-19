import type { RootDragInteractionMode } from '../drag/types';
import { isShortcutFolder } from '../model/selectors';
import type { Shortcut } from '../shortcutTypes';

export type GridFixedObstacleKind = 'large-folder';

export type GridInteractionProfileKind =
  | 'root-normal'
  | 'root-folder-drag'
  | 'root-large-folder-drag'
  | 'root-extracted-child'
  | 'folder-internal';

export type GridInteractionProfile = {
  kind: GridInteractionProfileKind;
  rootDragMode: RootDragInteractionMode;
  allowMerge: boolean;
  allowEnterFolder: boolean;
  treatAllTargetZonesAsReorder: boolean;
  reorderDwellMs: number;
  mergeDwellMs: number;
  bypassReorderDwellAfterLeavingCore: boolean;
  allowBoundaryExtract: boolean;
  fixedObstacleKinds: readonly GridFixedObstacleKind[];
};

export type GridInteractionProfileLike = GridInteractionProfileKind | GridInteractionProfile;

const SHARED_FIXED_OBSTACLE_KINDS: readonly GridFixedObstacleKind[] = ['large-folder'];

const GRID_INTERACTION_PROFILE_PRESETS: Record<GridInteractionProfileKind, GridInteractionProfile> = {
  'root-normal': {
    kind: 'root-normal',
    rootDragMode: 'normal',
    allowMerge: true,
    allowEnterFolder: true,
    treatAllTargetZonesAsReorder: false,
    reorderDwellMs: 200,
    mergeDwellMs: 100,
    bypassReorderDwellAfterLeavingCore: true,
    allowBoundaryExtract: true,
    fixedObstacleKinds: SHARED_FIXED_OBSTACLE_KINDS,
  },
  'root-folder-drag': {
    kind: 'root-folder-drag',
    rootDragMode: 'reorder-only',
    allowMerge: false,
    allowEnterFolder: false,
    treatAllTargetZonesAsReorder: true,
    reorderDwellMs: 0,
    mergeDwellMs: 100,
    bypassReorderDwellAfterLeavingCore: true,
    allowBoundaryExtract: true,
    fixedObstacleKinds: SHARED_FIXED_OBSTACLE_KINDS,
  },
  'root-large-folder-drag': {
    kind: 'root-large-folder-drag',
    rootDragMode: 'reorder-only',
    allowMerge: false,
    allowEnterFolder: false,
    treatAllTargetZonesAsReorder: true,
    reorderDwellMs: 0,
    mergeDwellMs: 100,
    bypassReorderDwellAfterLeavingCore: true,
    allowBoundaryExtract: true,
    fixedObstacleKinds: SHARED_FIXED_OBSTACLE_KINDS,
  },
  'root-extracted-child': {
    kind: 'root-extracted-child',
    rootDragMode: 'external-insert',
    allowMerge: false,
    allowEnterFolder: false,
    treatAllTargetZonesAsReorder: true,
    reorderDwellMs: 0,
    mergeDwellMs: 100,
    bypassReorderDwellAfterLeavingCore: true,
    allowBoundaryExtract: true,
    fixedObstacleKinds: SHARED_FIXED_OBSTACLE_KINDS,
  },
  'folder-internal': {
    kind: 'folder-internal',
    rootDragMode: 'reorder-only',
    allowMerge: false,
    allowEnterFolder: false,
    treatAllTargetZonesAsReorder: true,
    reorderDwellMs: 0,
    mergeDwellMs: 100,
    bypassReorderDwellAfterLeavingCore: true,
    allowBoundaryExtract: true,
    fixedObstacleKinds: SHARED_FIXED_OBSTACLE_KINDS,
  },
};

function cloneGridInteractionProfile(profile: GridInteractionProfile): GridInteractionProfile {
  return {
    ...profile,
    fixedObstacleKinds: [...profile.fixedObstacleKinds],
  };
}

export function createGridInteractionProfile(
  kind: GridInteractionProfileKind,
): GridInteractionProfile {
  return cloneGridInteractionProfile(GRID_INTERACTION_PROFILE_PRESETS[kind]);
}

export function normalizeGridInteractionProfile(
  profile: GridInteractionProfileLike,
): GridInteractionProfile {
  return typeof profile === 'string'
    ? createGridInteractionProfile(profile)
    : cloneGridInteractionProfile(profile);
}

export function resolveGridInteractionProfileForRoot(params: {
  interactionProfile?: GridInteractionProfileLike | null;
  forceReorderOnly?: boolean;
  sourceRootShortcutId: string | null;
  activeShortcut: Shortcut;
}): GridInteractionProfile {
  const {
    interactionProfile = null,
    forceReorderOnly = false,
    sourceRootShortcutId,
    activeShortcut,
  } = params;

  if (interactionProfile) {
    return normalizeGridInteractionProfile(interactionProfile);
  }

  if (forceReorderOnly) {
    return createGridInteractionProfile('folder-internal');
  }

  if (sourceRootShortcutId) {
    return createGridInteractionProfile('root-extracted-child');
  }

  if (isShortcutFolder(activeShortcut)) {
    return createGridInteractionProfile(
      activeShortcut.folderDisplayMode === 'large'
        ? 'root-large-folder-drag'
        : 'root-folder-drag',
    );
  }

  return createGridInteractionProfile('root-normal');
}

export function resolveRootDragInteractionModeFromProfile(
  profile: GridInteractionProfile,
): RootDragInteractionMode {
  return profile.rootDragMode;
}
