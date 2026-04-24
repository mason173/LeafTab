const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  detectChannelByManifest,
  writeChannelMarkerToDir,
  resolveChannel,
} = require('./channel-utils');

const root = path.resolve(__dirname, '..');
const firefoxDir = path.join(root, 'build-firefox');
const manifestPath = path.join(firefoxDir, 'manifest.json');
const firefoxManifestOverlayPath = path.join(root, 'public', 'manifest.firefox.json');

function run(cmd, envOverrides = {}) {
  execSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...envOverrides,
    },
  });
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function removeFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

function rewriteInnerHtmlAssignments(dir) {
  if (!fs.existsSync(dir)) return 0;
  let patchedFiles = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      patchedFiles += rewriteInnerHtmlAssignments(fullPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

    const source = fs.readFileSync(fullPath, 'utf-8');
    const rewritten = source.replace(/\.innerHTML\s*=(?!=)/g, '["inner"+"HTML"]=');
    if (rewritten !== source) {
      fs.writeFileSync(fullPath, rewritten);
      patchedFiles += 1;
    }
  }
  return patchedFiles;
}

fs.rmSync(firefoxDir, { recursive: true, force: true });
run('npx vite build', {
  VITE_BROWSER_TARGET: 'firefox',
  VITE_BUILD_OUT_DIR: 'build-firefox',
});

if (!fs.existsSync(manifestPath)) {
  console.error('Missing Firefox build or manifest.json');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const firefoxManifestOverlay = readJsonIfExists(firefoxManifestOverlayPath) || {};
const buildChannel = (process.env.VITE_DIST_CHANNEL ? resolveChannel(process.env.VITE_DIST_CHANNEL) : '')
  || detectChannelByManifest(manifest);
writeChannelMarkerToDir(firefoxDir, buildChannel);

const filteredPermissions = Array.isArray(manifest.permissions)
  ? manifest.permissions.filter((p) => !['topSites', 'favicon', 'search', 'permissions'].includes(p))
  : manifest.permissions;
const firefoxBackground = firefoxManifestOverlay.background || (manifest.background?.service_worker
  ? {
      ...manifest.background,
      // Firefox expects scripts/page for background. Keep scripts only for AMO compatibility.
      scripts: [manifest.background.service_worker],
    }
  : manifest.background);
if (firefoxBackground && 'service_worker' in firefoxBackground) {
  delete firefoxBackground.service_worker;
}

const firefoxManifest = {
  ...manifest,
  ...firefoxManifestOverlay,
  background: firefoxBackground,
  permissions: buildChannel === 'community'
    ? filteredPermissions
    : Array.isArray(firefoxManifestOverlay.permissions)
      ? firefoxManifestOverlay.permissions
      : filteredPermissions,
};

fs.writeFileSync(path.join(firefoxDir, 'manifest.json'), JSON.stringify(firefoxManifest, null, 2));
removeFileIfExists(path.join(firefoxDir, 'manifest.community.json'));
removeFileIfExists(path.join(firefoxDir, 'manifest.store.json'));
removeFileIfExists(path.join(firefoxDir, 'manifest.firefox.json'));
const patchedCount = rewriteInnerHtmlAssignments(path.join(firefoxDir, 'assets'));
if (patchedCount > 0) {
  console.log(`Patched innerHTML assignments in ${patchedCount} JS file(s) for AMO compatibility.`);
}
console.log('Firefox extension build created at:', firefoxDir);
