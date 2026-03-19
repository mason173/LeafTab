const fs = require('fs');
const path = require('path');
const {
  detectChannelByManifest,
  readChannelMarkerFromDir,
  writeChannelMarkerToDir,
  resolveChannel,
} = require('./channel-utils');

const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'build');
const firefoxDir = path.join(root, 'build-firefox');
const manifestPath = path.join(buildDir, 'manifest.json');

if (!fs.existsSync(buildDir) || !fs.existsSync(manifestPath)) {
  console.error('Missing build or manifest.json');
  process.exit(1);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
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
copyDir(buildDir, firefoxDir);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const buildChannel = readChannelMarkerFromDir(buildDir)
  || (process.env.VITE_DIST_CHANNEL ? resolveChannel(process.env.VITE_DIST_CHANNEL) : '')
  || detectChannelByManifest(manifest);
writeChannelMarkerToDir(firefoxDir, buildChannel);

const filteredPermissions = Array.isArray(manifest.permissions)
  ? manifest.permissions.filter((p) => !['topSites', 'favicon', 'search', 'permissions'].includes(p))
  : manifest.permissions;
const firefoxBackground = manifest.background?.service_worker
  ? {
      ...manifest.background,
      // Firefox expects scripts/page for background. Keep scripts only for AMO compatibility.
      scripts: [manifest.background.service_worker],
    }
  : manifest.background;
if (firefoxBackground && 'service_worker' in firefoxBackground) {
  delete firefoxBackground.service_worker;
}

const firefoxManifest = {
  ...manifest,
  background: firefoxBackground,
  permissions: filteredPermissions,
  browser_specific_settings: {
    gecko: {
      id: 'leaftab@cc',
      strict_min_version: '142.0',
      data_collection_permissions: {
        required: ["none"],
        optional: [
          "locationInfo",
          "authenticationInfo"
        ]
      }
    },
  },
};

fs.writeFileSync(path.join(firefoxDir, 'manifest.json'), JSON.stringify(firefoxManifest, null, 2));
const patchedCount = rewriteInnerHtmlAssignments(path.join(firefoxDir, 'assets'));
if (patchedCount > 0) {
  console.log(`Patched innerHTML assignments in ${patchedCount} JS file(s) for AMO compatibility.`);
}
console.log('Firefox extension build created at:', firefoxDir);
