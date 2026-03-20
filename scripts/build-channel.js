const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { resolveChannel, writeChannelMarkerToDir } = require('./channel-utils');

const channel = resolveChannel(process.argv[2] || process.env.VITE_DIST_CHANNEL);
const root = path.resolve(__dirname, '..');
const env = {
  ...process.env,
  VITE_DIST_CHANNEL: channel,
  VITE_BROWSER_TARGET: 'chromium',
  VITE_BUILD_OUT_DIR: 'build',
};
const switchManifestScript = path.join(root, 'scripts', 'switch-manifest.js');
const buildDir = path.join(root, 'build');
const BUILD_MANIFEST_TEMPLATE_FILES = [
  'manifest.community.json',
  'manifest.store.json',
  'manifest.firefox.json',
];

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env });
}

function removeBuildManifestTemplates(dirPath) {
  for (const fileName of BUILD_MANIFEST_TEMPLATE_FILES) {
    const filePath = path.join(dirPath, fileName);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

console.log(`[build] channel: ${channel}`);
try {
  run(`node "${switchManifestScript}" ${channel}`);
  run('npx vite build');
  if (fs.existsSync(buildDir)) {
    removeBuildManifestTemplates(buildDir);
    writeChannelMarkerToDir(buildDir, channel);
  }
  run(`node "${path.join(root, 'scripts', 'build-firefox.js')}"`);
} finally {
  // Always restore tracked manifest to community template to prevent accidental store-manifest commits.
  run(`node "${switchManifestScript}" community`);
}
