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

function getExpectedManifest(channel, root) {
  const manifestPath = path.join(root, 'public', `manifest.${channel}.json`);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest template: ${manifestPath}`);
  }
  return readJson(manifestPath);
}

function readManifestFromZip(zipPath) {
  try {
    const text = execSync(`unzip -p "${zipPath}" manifest.json`, { encoding: 'utf-8' });
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Cannot read manifest.json from zip: ${zipPath}`);
  }
}

function verifyZip({ zipPath, expectedChannel, expectedVersion, expectedVersionName }) {
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Zip not found: ${zipPath}`);
  }
  const manifest = readManifestFromZip(zipPath);
  const actualChannel = readChannelMarkerFromZip(zipPath) || detectChannelByManifest(manifest);
  const actualVersion = String(manifest.version || '');
  const actualVersionName = String(manifest.version_name || '');

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
  if (String(expectedVersionName || '') !== actualVersionName) {
    throw new Error(
      [
        `Version name mismatch in ${path.basename(zipPath)}.`,
        `Expected: ${expectedVersionName || '(empty)'}`,
        `Actual: ${actualVersionName || '(empty)'}`,
      ].join(' ')
    );
  }

  console.log(
    `[verify] ${path.basename(zipPath)} OK (channel=${actualChannel}, version=${actualVersion}, version_name=${actualVersionName || '(empty)'})`
  );
}

function main() {
  const root = path.resolve(__dirname, '..');
  const pkg = readJson(path.join(root, 'package.json'));
  const releaseVersion = String(pkg.version || '');
  if (!releaseVersion) {
    throw new Error('Missing package.json version.');
  }

  const expectedChannel = resolveChannel(process.argv[2] || 'community');
  const expectedManifest = getExpectedManifest(expectedChannel, root);
  const expectedVersion = String(expectedManifest.version || '');
  const expectedVersionName = String(expectedManifest.version_name || '');
  if (!expectedVersion) {
    throw new Error(`Missing manifest version for channel "${expectedChannel}".`);
  }
  const args = process.argv.slice(3);
  const defaultZips = [
    path.join(root, `LeafTab-${expectedChannel}-chrome-edge-v${releaseVersion}.zip`),
    path.join(root, `LeafTab-${expectedChannel}-firefox-v${releaseVersion}.zip`),
  ];
  const zipPaths = args.length > 0 ? args.map((p) => path.resolve(root, p)) : defaultZips;

  console.log(
    `[verify] expected channel=${expectedChannel}, expected version=${expectedVersion}, expected version_name=${expectedVersionName || '(empty)'}, release tag version=${releaseVersion}`
  );
  zipPaths.forEach((zipPath) => {
    verifyZip({
      zipPath,
      expectedChannel,
      expectedVersion,
      expectedVersionName,
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
