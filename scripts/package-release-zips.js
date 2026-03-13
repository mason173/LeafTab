const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const version = String(pkg.version || '0.0.0');
const CHANNELS = new Set(['community', 'store']);

const buildDir = path.join(root, 'build');
const firefoxDir = path.join(root, 'build-firefox');

const verifyScript = path.join(root, 'scripts', 'verify-release-channel.js');

function assertBuild(dir, label) {
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(dir) || !fs.existsSync(manifestPath)) {
    console.error(`[pack] Missing ${label} build. Please run a build first.`);
    console.error(`[pack] Expected: ${manifestPath}`);
    process.exit(1);
  }
}

function readManifest(dir) {
  const manifestPath = path.join(dir, 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
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

function resolveExpectedChannel(raw) {
  const normalized = String(raw || '').trim().toLowerCase();
  return CHANNELS.has(normalized) ? normalized : '';
}

function packZip(cwd, outFile) {
  if (fs.existsSync(outFile)) fs.rmSync(outFile, { force: true });
  execSync(`zip -qr "${outFile}" .`, { cwd, stdio: 'inherit' });
}

assertBuild(buildDir, 'Chrome/Edge');
assertBuild(firefoxDir, 'Firefox');

const chromeChannel = detectChannelByManifest(readManifest(buildDir));
const firefoxChannel = detectChannelByManifest(readManifest(firefoxDir));
if (chromeChannel !== firefoxChannel) {
  console.error('[pack] Channel mismatch between build and build-firefox outputs.');
  console.error(`[pack] build: ${chromeChannel}, build-firefox: ${firefoxChannel}`);
  process.exit(1);
}

const builtChannel = chromeChannel;
const expectedChannel = resolveExpectedChannel(process.argv[2] || process.env.VITE_DIST_CHANNEL);
if (expectedChannel && expectedChannel !== builtChannel) {
  console.error(`[pack] Expected channel "${expectedChannel}" but build output is "${builtChannel}".`);
  console.error('[pack] Please run the matching build channel first.');
  process.exit(1);
}

const chromeZip = path.join(root, `LeafTab-${builtChannel}-chrome-edge-v${version}.zip`);
const firefoxZip = path.join(root, `LeafTab-${builtChannel}-firefox-v${version}.zip`);

console.log('[pack] Creating release zip files...');
packZip(buildDir, chromeZip);
packZip(firefoxDir, firefoxZip);
console.log('[pack] Verifying zip channel/version...');
execSync(`node "${verifyScript}" ${builtChannel} "${chromeZip}" "${firefoxZip}"`, { cwd: root, stdio: 'inherit' });
console.log(`[pack] Done:
- ${path.basename(chromeZip)}
- ${path.basename(firefoxZip)}`);
