const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHANNELS = new Set(['community', 'store']);

function resolveChannel(raw) {
  const normalized = String(raw || '').trim().toLowerCase();
  return CHANNELS.has(normalized) ? normalized : 'community';
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function readManifestFromZip(zipPath) {
  try {
    const text = execSync(`unzip -p "${zipPath}" manifest.json`, { encoding: 'utf-8' });
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Cannot read manifest.json from zip: ${zipPath}`);
  }
}

function has(value, target) {
  return Array.isArray(value) && value.includes(target);
}

function detectChannelByManifest(manifest) {
  const hasHttpsAllHosts = has(manifest.host_permissions, 'https://*/*');
  const hasHttpAllHosts = has(manifest.host_permissions, 'http://*/*');
  if (hasHttpsAllHosts && hasHttpAllHosts) return 'community';
  return 'store';
}

function verifyZip({ zipPath, expectedChannel, expectedVersion }) {
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Zip not found: ${zipPath}`);
  }
  const manifest = readManifestFromZip(zipPath);
  const actualChannel = detectChannelByManifest(manifest);
  const actualVersion = String(manifest.version || '');

  if (actualChannel !== expectedChannel) {
    throw new Error(
      [
        `Channel mismatch in ${path.basename(zipPath)}.`,
        `Expected: ${expectedChannel}`,
        `Actual: ${actualChannel}`,
        'Hint: run `npm run build` (community) before `npm run pack:release`.',
      ].join(' ')
    );
  }
  if (actualVersion !== expectedVersion) {
    throw new Error(
      [
        `Version mismatch in ${path.basename(zipPath)}.`,
        `Expected: ${expectedVersion}`,
        `Actual: ${actualVersion || '(empty)'}`,
      ].join(' ')
    );
  }

  console.log(
    `[verify] ${path.basename(zipPath)} OK (channel=${actualChannel}, version=${actualVersion})`
  );
}

function main() {
  const root = path.resolve(__dirname, '..');
  const pkg = readJson(path.join(root, 'package.json'));
  const expectedVersion = String(pkg.version || '');
  if (!expectedVersion) {
    throw new Error('Missing package.json version.');
  }

  const expectedChannel = resolveChannel(process.argv[2] || 'community');
  const args = process.argv.slice(3);
  const defaultZips = [
    path.join(root, `LeafTab-chrome-edge-v${expectedVersion}.zip`),
    path.join(root, `LeafTab-firefox-v${expectedVersion}.zip`),
  ];
  const zipPaths = args.length > 0 ? args.map((p) => path.resolve(root, p)) : defaultZips;

  console.log(
    `[verify] expected channel=${expectedChannel}, expected version=${expectedVersion}`
  );
  zipPaths.forEach((zipPath) => {
    verifyZip({
      zipPath,
      expectedChannel,
      expectedVersion,
    });
  });
  console.log('[verify] All release zip checks passed.');
}

try {
  main();
} catch (error) {
  console.error(`[verify] ${error.message}`);
  process.exit(1);
}
