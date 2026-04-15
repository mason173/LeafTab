import { access, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PACKAGE_CONFIGS = [
  {
    dependencyName: '@leaftab/workspace-core',
    workspaceDir: path.join('packages', 'grid-core'),
  },
  {
    dependencyName: '@leaftab/workspace-react',
    workspaceDir: path.join('packages', 'grid-react'),
  },
  {
    dependencyName: '@leaftab/workspace-preset-leaftab',
    workspaceDir: path.join('packages', 'grid-preset-leaftab'),
  },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const vendorDir = path.join(repoRoot, 'vendor', 'leaftab-workspace');

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseArgs(argv) {
  const args = {
    workspacePath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--workspace') {
      args.workspacePath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (!token.startsWith('-') && !args.workspacePath) {
      args.workspacePath = token;
    }
  }

  return args;
}

async function exists(targetPath) {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveWorkspaceRoot(explicitWorkspacePath) {
  const candidates = [
    explicitWorkspacePath,
    process.env.LEAFTAB_WORKSPACE_DIR,
    path.resolve(repoRoot, '..', 'leaftab-workspace'),
    path.resolve(repoRoot, '..', 'leaftab-grid'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolvedCandidate = path.resolve(candidate);
    const packageJsonPath = path.join(resolvedCandidate, 'package.json');
    if (!await exists(packageJsonPath)) continue;

    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    if (packageJson.name === 'leaftab-workspace') {
      return resolvedCandidate;
    }
  }

  throw new Error(
    '[grid:vendor] Could not find a local leaftab-workspace checkout. ' +
    'Pass one with `npm run grid:vendor:update -- /path/to/leaftab-workspace` ' +
    'or set LEAFTAB_WORKSPACE_DIR.',
  );
}

function runCommand(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
}

function runCommandJson(command, args, cwd) {
  const output = execFileSync(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'inherit'],
    env: process.env,
  });
  return JSON.parse(output.toString('utf8'));
}

async function ensureWorkspacePackages(workspaceRoot) {
  for (const config of PACKAGE_CONFIGS) {
    const packageJsonPath = path.join(workspaceRoot, config.workspaceDir, 'package.json');
    if (!await exists(packageJsonPath)) {
      throw new Error(`[grid:vendor] Missing workspace package: ${packageJsonPath}`);
    }

    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    if (packageJson.name !== config.dependencyName) {
      throw new Error(
        `[grid:vendor] Expected ${config.dependencyName} in ${packageJsonPath}, found ${packageJson.name || 'unknown package'}.`,
      );
    }
  }
}

async function ensureWorkspaceDependencies(workspaceRoot) {
  const nodeModulesPath = path.join(workspaceRoot, 'node_modules');
  if (await exists(nodeModulesPath)) {
    return;
  }

  console.log('[grid:vendor] workspace dependencies missing, running npm install');
  runCommand('npm', ['install'], workspaceRoot);
}

async function cleanPreviousTarballs() {
  await mkdir(vendorDir, { recursive: true });
  const entries = await readdir(vendorDir, { withFileTypes: true });
  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tgz'))
    .map((entry) => rm(path.join(vendorDir, entry.name), { force: true })));
}

async function packWorkspacePackages(workspaceRoot) {
  const packedFiles = new Map();

  for (const config of PACKAGE_CONFIGS) {
    const packageDir = path.join(workspaceRoot, config.workspaceDir);
    const packResult = runCommandJson(
      'npm',
      ['pack', '--json', '--pack-destination', vendorDir],
      packageDir,
    );

    const firstResult = Array.isArray(packResult) ? packResult[0] : null;
    const filename = firstResult?.filename;
    if (!filename) {
      throw new Error(`[grid:vendor] Failed to pack ${config.dependencyName}.`);
    }

    packedFiles.set(config.dependencyName, filename);
  }

  return packedFiles;
}

async function updateRootDependencyRefs(packedFiles) {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  let packageJsonText = await readFile(packageJsonPath, 'utf8');

  for (const config of PACKAGE_CONFIGS) {
    const filename = packedFiles.get(config.dependencyName);
    if (!filename) {
      throw new Error(`[grid:vendor] Missing packed filename for ${config.dependencyName}.`);
    }

    const dependencyPattern = new RegExp(`("${escapeRegExp(config.dependencyName)}":\\s*")([^"]+)(")`);
    const nextValue = `file:vendor/leaftab-workspace/${filename}`;
    if (!dependencyPattern.test(packageJsonText)) {
      throw new Error(`[grid:vendor] Could not update dependency ${config.dependencyName} in package.json.`);
    }
    packageJsonText = packageJsonText.replace(dependencyPattern, `$1${nextValue}$3`);
  }

  await writeFile(packageJsonPath, packageJsonText);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const workspaceRoot = await resolveWorkspaceRoot(args.workspacePath);
  await ensureWorkspacePackages(workspaceRoot);
  await ensureWorkspaceDependencies(workspaceRoot);

  const workspacePackageJson = JSON.parse(
    await readFile(path.join(workspaceRoot, 'package.json'), 'utf8'),
  );
  const buildScript = workspacePackageJson.scripts?.['build:packages'] ? 'build:packages' : 'build';

  console.log(`[grid:vendor] workspace root: ${workspaceRoot}`);
  console.log(`[grid:vendor] building workspace packages via npm run ${buildScript}`);
  runCommand('npm', ['run', buildScript], workspaceRoot);

  console.log(`[grid:vendor] refreshing tarballs in ${vendorDir}`);
  await cleanPreviousTarballs();
  const packedFiles = await packWorkspacePackages(workspaceRoot);

  console.log('[grid:vendor] updating root dependency refs');
  await updateRootDependencyRefs(packedFiles);

  console.log('[grid:vendor] reinstalling root dependencies');
  runCommand('npm', ['install'], repoRoot);

  console.log('[grid:vendor] verifying published dependency mode');
  runCommand('npm', ['run', 'grid:check:published'], repoRoot);

  console.log('[grid:vendor] vendor refresh complete');
  for (const config of PACKAGE_CONFIGS) {
    const filename = packedFiles.get(config.dependencyName);
    if (filename) {
      console.log(`[grid:vendor] ${config.dependencyName} -> vendor/leaftab-workspace/${filename}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
