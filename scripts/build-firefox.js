const fs = require('fs');
const path = require('path');

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

fs.rmSync(firefoxDir, { recursive: true, force: true });
copyDir(buildDir, firefoxDir);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const filteredPermissions = Array.isArray(manifest.permissions)
  ? manifest.permissions.filter((p) => !['topSites', 'favicon'].includes(p))
  : manifest.permissions;

const firefoxManifest = {
  ...manifest,
  permissions: filteredPermissions,
  browser_specific_settings: {
    gecko: {
      id: 'leaftab@cc',
      strict_min_version: '109.0',
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
console.log('Firefox extension build created at:', firefoxDir);
