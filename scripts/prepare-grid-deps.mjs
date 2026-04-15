import { readFile, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const GRID_PACKAGE_NAMES = [
  '@leaftab/workspace-core',
  '@leaftab/workspace-react',
  '@leaftab/workspace-preset-leaftab',
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  return {
    localOnly: argv.includes('--local-only'),
    publishedOnly: argv.includes('--published-only'),
    skipBuild: argv.includes('--skip-build'),
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function assertExists(targetPath, message) {
  try {
    await access(targetPath, fsConstants.F_OK);
  } catch {
    throw new Error(message);
  }
}

function classifyDependency(version) {
  if (typeof version !== 'string' || version.trim() === '') {
    return 'missing';
  }

  return version.startsWith('file:') ? 'local' : 'published';
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed in ${cwd}`));
    });
  });
}

async function resolveGridDependencies() {
  const packageJson = await readJson(path.join(repoRoot, 'package.json'));
  const dependencies = packageJson.dependencies ?? {};

  return GRID_PACKAGE_NAMES.map((name) => {
    const version = dependencies[name];
    return {
      name,
      version,
      mode: classifyDependency(version),
    };
  });
}

async function verifyLocalDependency(dep) {
  const relativeTarget = dep.version.slice('file:'.length);
  const packageDir = path.resolve(repoRoot, relativeTarget);
  const packageJsonPath = path.join(packageDir, 'package.json');
  await assertExists(
    packageJsonPath,
    `[grid] Local dependency for ${dep.name} is missing: ${packageJsonPath}`,
  );

  const targetPackageJson = await readJson(packageJsonPath);
  if (targetPackageJson.name !== dep.name) {
    throw new Error(
      `[grid] Expected ${dep.name} at ${packageJsonPath}, found ${targetPackageJson.name || 'unknown package'} instead.`,
    );
  }

  return {
    packageDir,
    repoDir: path.resolve(packageDir, '..', '..'),
    packageVersion: targetPackageJson.version ?? '0.0.0',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.localOnly && args.publishedOnly) {
    throw new Error('[grid] --local-only and --published-only cannot be used together.');
  }

  const gridDependencies = await resolveGridDependencies();
  const missing = gridDependencies.filter((dep) => dep.mode === 'missing');
  if (missing.length > 0) {
    throw new Error(`[grid] Missing dependencies: ${missing.map((dep) => dep.name).join(', ')}`);
  }

  const modes = new Set(gridDependencies.map((dep) => dep.mode));
  if (modes.size !== 1) {
    throw new Error(
      `[grid] Mixed dependency sources detected. Keep ${GRID_PACKAGE_NAMES.join(', ')} all local or all published.`,
    );
  }

  const mode = gridDependencies[0].mode;
  if (args.localOnly && mode !== 'local') {
    throw new Error('[grid] Expected local file: dependencies for grid packages.');
  }
  if (args.publishedOnly && mode !== 'published') {
    throw new Error('[grid] Expected published version dependencies for grid packages.');
  }

  if (mode === 'published') {
    for (const dep of gridDependencies) {
      console.log(`[grid] Using published package ${dep.name}@${dep.version}`);
    }
    return;
  }

  const localTargets = await Promise.all(gridDependencies.map((dep) => verifyLocalDependency(dep)));
  for (const [index, dep] of gridDependencies.entries()) {
    console.log(
      `[grid] Using local source of truth ${dep.name}@${localTargets[index].packageVersion} -> ${localTargets[index].packageDir}`,
    );
  }

  if (args.skipBuild) {
    return;
  }

  const repoDirs = [...new Set(localTargets.map((target) => target.repoDir))];
  for (const repoDir of repoDirs) {
    const packageJsonPath = path.join(repoDir, 'package.json');
    await assertExists(packageJsonPath, `[grid] Missing grid workspace package.json: ${packageJsonPath}`);
    console.log(`[grid] Building local grid workspace in ${repoDir}`);
    await runCommand('npm', ['run', 'build'], repoDir);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
