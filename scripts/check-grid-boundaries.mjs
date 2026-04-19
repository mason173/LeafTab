import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const rootGridFile = path.join(repoRoot, 'src/features/shortcuts/components/RootShortcutGrid.tsx');
const folderSurfaceFile = path.join(repoRoot, 'src/features/shortcuts/components/FolderShortcutSurface.tsx');
const shortcutGridShimFile = path.join(repoRoot, 'src/components/ShortcutGrid.tsx');

const forbiddenEngineMarkers = [
  'resolveRootDropIntent(',
  'packGridItems(',
  'measureDragItems(',
  'buildProjectedGridItemsForRootReorder(',
  'useDragMotionState(',
];

const forbiddenHostEngineImports = [
  "from '@leaftab/workspace-core'",
  "from '@leaftab/grid-core'",
];

async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

function assertIncludes(text, filePath, pattern, message) {
  if (!text.includes(pattern)) {
    throw new Error(`[grid-boundary] ${message} (${filePath})`);
  }
}

function assertExcludes(text, filePath, pattern, message) {
  if (text.includes(pattern)) {
    throw new Error(`[grid-boundary] ${message} (${filePath})`);
  }
}

async function main() {
  const [rootGridSource, folderSurfaceSource, shortcutGridShimSource] = await Promise.all([
    readText(rootGridFile),
    readText(folderSurfaceFile),
    readText(shortcutGridShimFile),
  ]);

  assertIncludes(
    rootGridSource,
    rootGridFile,
    "from '@leaftab/workspace-react'",
    'RootShortcutGrid host adapter must import the shared package component.',
  );
  assertIncludes(
    rootGridSource,
    rootGridFile,
    'PackageRootShortcutGrid',
    'RootShortcutGrid host adapter should stay a thin wrapper around the package component.',
  );

  assertIncludes(
    folderSurfaceSource,
    folderSurfaceFile,
    "from '@leaftab/workspace-react'",
    'FolderShortcutSurface host adapter must import the shared package component.',
  );
  if (
    !folderSurfaceSource.includes('PackageFolderShortcutSurface')
    && !folderSurfaceSource.includes("from './RootShortcutGrid'")
  ) {
    throw new Error(
      `[grid-boundary] FolderShortcutSurface host adapter should stay thin and only compose shared grid wrappers (${folderSurfaceFile}).`,
    );
  }

  assertIncludes(
    shortcutGridShimSource,
    shortcutGridShimFile,
    "from '@/features/shortcuts/components/RootShortcutGrid'",
    'ShortcutGrid compatibility shim must forward to the host RootShortcutGrid wrapper.',
  );

  const shortcutGridLines = shortcutGridShimSource
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (shortcutGridLines.length > 20) {
    throw new Error(
      `[grid-boundary] ShortcutGrid compatibility shim has grown too large (${shortcutGridShimFile}). Keep engine logic out of this file.`,
    );
  }

  for (const marker of forbiddenEngineMarkers) {
    assertExcludes(
      rootGridSource,
      rootGridFile,
      marker,
      `RootShortcutGrid host adapter should not re-implement shared grid engine logic: ${marker}`,
    );
    assertExcludes(
      folderSurfaceSource,
      folderSurfaceFile,
      marker,
      `FolderShortcutSurface host adapter should not re-implement shared grid engine logic: ${marker}`,
    );
    assertExcludes(
      shortcutGridShimSource,
      shortcutGridShimFile,
      marker,
      `ShortcutGrid compatibility shim should not re-implement shared grid engine logic: ${marker}`,
    );
  }

  for (const marker of forbiddenHostEngineImports) {
    assertExcludes(
      rootGridSource,
      rootGridFile,
      marker,
      `RootShortcutGrid host adapter should not import shared grid engine internals directly: ${marker}`,
    );
    assertExcludes(
      folderSurfaceSource,
      folderSurfaceFile,
      marker,
      `FolderShortcutSurface host adapter should not import shared grid engine internals directly: ${marker}`,
    );
    assertExcludes(
      shortcutGridShimSource,
      shortcutGridShimFile,
      marker,
      `ShortcutGrid compatibility shim should not import shared grid engine internals directly: ${marker}`,
    );
  }

  console.log(
    '[grid-boundary] Host adapters still point at shared grid wrappers, remain thin, and do not own workspace engine behavior.',
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
