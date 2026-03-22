const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  detectChannelByManifest,
  readChannelMarkerFromZip,
  resolveChannel,
} = require('./channel-utils');

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

function verifyZip({ zipPath, expectedChannel, expectedVersion }) {
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Zip not found: ${zipPath}`);
  }
  const manifest = readManifestFromZip(zipPath);
  const actualChannel = readChannelMarkerFromZip(zipPath) || detectChannelByManifest(manifest);
  const actualVersion = String(manifest.version || '');

  if (actualChannel !== expectedChannel) {
    throw new Error(
      [
        `Channel mismatch in ${path.basename(zipPath)}.`,
        `Expected: ${expectedChannel}`,
        `Actual: ${actualChannel}`,
        `Hint: run \`npm run build:${expectedChannel}\` before packing this channel.`,
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
    path.join(root, `LeafTab-${expectedChannel}-chrome-edge-v${expectedVersion}.zip`),
    path.join(root, `LeafTab-${expectedChannel}-firefox-v${expectedVersion}.zip`),
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
