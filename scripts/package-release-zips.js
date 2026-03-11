const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const version = String(pkg.version || '0.0.0');

const buildDir = path.join(root, 'build');
const firefoxDir = path.join(root, 'build-firefox');

const chromeZip = path.join(root, `LeafTab-chrome-edge-v${version}.zip`);
const firefoxZip = path.join(root, `LeafTab-firefox-v${version}.zip`);
const verifyScript = path.join(root, 'scripts', 'verify-release-channel.js');

function assertBuild(dir, label) {
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(dir) || !fs.existsSync(manifestPath)) {
    console.error(`[pack] Missing ${label} build. Please run a build first.`);
    console.error(`[pack] Expected: ${manifestPath}`);
    process.exit(1);
  }
}

function packZip(cwd, outFile) {
  if (fs.existsSync(outFile)) fs.rmSync(outFile, { force: true });
  execSync(`zip -qr "${outFile}" .`, { cwd, stdio: 'inherit' });
}

assertBuild(buildDir, 'Chrome/Edge');
assertBuild(firefoxDir, 'Firefox');

console.log('[pack] Creating release zip files...');
packZip(buildDir, chromeZip);
packZip(firefoxDir, firefoxZip);
console.log('[pack] Verifying zip channel/version...');
execSync(`node "${verifyScript}" community "${chromeZip}" "${firefoxZip}"`, { cwd: root, stdio: 'inherit' });
console.log(`[pack] Done:
- ${path.basename(chromeZip)}
- ${path.basename(firefoxZip)}`);
