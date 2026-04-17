import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const rootGridFile = path.join(repoRoot, 'src/features/shortcuts/components/RootShortcutGrid.tsx');
const folderSurfaceFile = path.join(repoRoot, 'src/features/shortcuts/components/FolderShortcutSurface.tsx');
const shortcutGridShimFile = path.join(repoRoot, 'src/components/ShortcutGrid.tsx');
const srcRoot = path.join(repoRoot, 'src');

const forbiddenWorkspaceImports = [
  '@leaftab/workspace-core',
  '@leaftab/workspace-react',
  '@leaftab/workspace-preset-leaftab',
];

async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

async function collectSourceFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(entryPath);
    }
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      return [];
    }
    return [entryPath];
  }));

  return files.flat();
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
  const [rootGridSource, folderSurfaceSource, shortcutGridShimSource, sourceFiles] = await Promise.all([
    readText(rootGridFile),
    readText(folderSurfaceFile),
    readText(shortcutGridShimFile),
    collectSourceFiles(srcRoot),
  ]);

  assertIncludes(
    shortcutGridShimSource,
    shortcutGridShimFile,
    "from '@/features/shortcuts/components/RootShortcutGrid'",
    'ShortcutGrid compatibility shim must forward to the self-owned RootShortcutGrid implementation.',
  );

  assertIncludes(
    rootGridSource,
    rootGridFile,
    "from '@/features/shortcuts/drag/useResolvedPointerDragSession'",
    'RootShortcutGrid should bind through the shared self-owned drag session hook.',
  );
  assertIncludes(
    folderSurfaceSource,
    folderSurfaceFile,
    "from '@/features/shortcuts/drag/useResolvedPointerDragSession'",
    'FolderShortcutSurface should bind through the shared self-owned drag session hook.',
  );

  for (const marker of forbiddenWorkspaceImports) {
    assertExcludes(
      rootGridSource,
      rootGridFile,
      marker,
      `RootShortcutGrid must not import deprecated workspace packages: ${marker}`,
    );
    assertExcludes(
      folderSurfaceSource,
      folderSurfaceFile,
      marker,
      `FolderShortcutSurface must not import deprecated workspace packages: ${marker}`,
    );
    assertExcludes(
      shortcutGridShimSource,
      shortcutGridShimFile,
      marker,
      `ShortcutGrid shim must not import deprecated workspace packages: ${marker}`,
    );
  }

  for (const filePath of sourceFiles) {
    const source = await readText(filePath);
    for (const marker of forbiddenWorkspaceImports) {
      assertExcludes(
        source,
        filePath,
        marker,
        `Application source must stay fully self-owned and not import workspace packages: ${marker}`,
      );
    }
  }

  console.log(
    '[grid-boundary] Grid runtime source stays self-owned, ShortcutGrid still forwards to RootShortcutGrid, and no workspace package imports remain under src/.',
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
