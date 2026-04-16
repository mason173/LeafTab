import { access, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GRID_PACKAGES = [
  {
    name: '@leaftab/workspace-core',
    dir: 'packages/grid-core',
  },
  {
    name: '@leaftab/workspace-react',
    dir: 'packages/grid-react',
  },
  {
    name: '@leaftab/workspace-preset-leaftab',
    dir: 'packages/grid-preset-leaftab',
  },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  return {
    localOnly: argv.includes('--local-only'),
    publishedOnly: argv.includes('--published-only'),
  };
}

async function assertExists(targetPath, message) {
  try {
    await access(targetPath, fsConstants.F_OK);
  } catch {
    throw new Error(message);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.publishedOnly) {
    throw new Error(
      '[grid] Published vendor packages were removed. Grid code now lives directly in this repo under packages/.',
    );
  }

  for (const gridPackage of GRID_PACKAGES) {
    const packageDir = path.join(repoRoot, gridPackage.dir);
    const packageJsonPath = path.join(packageDir, 'package.json');
    const srcIndexPath = path.join(packageDir, 'src', 'index.ts');

    await assertExists(
      packageJsonPath,
      `[grid] Missing local grid package manifest: ${packageJsonPath}`,
    );
    await assertExists(
      srcIndexPath,
      `[grid] Missing local grid package source entry: ${srcIndexPath}`,
    );

    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    if (packageJson.name !== gridPackage.name) {
      throw new Error(
        `[grid] Expected ${gridPackage.name} in ${packageJsonPath}, found ${packageJson.name || 'unknown package'}.`,
      );
    }
  }

  if (args.localOnly) {
    console.log('[grid] Verified in-repo grid packages.');
    return;
  }

  console.log('[grid] Using in-repo grid packages from packages/.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
