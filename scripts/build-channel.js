const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { resolveChannel, writeChannelMarkerToDir } = require('./channel-utils');

const channel = resolveChannel(process.argv[2] || process.env.VITE_DIST_CHANNEL);
const root = path.resolve(__dirname, '..');
const env = { ...process.env, VITE_DIST_CHANNEL: channel };
const switchManifestScript = path.join(root, 'scripts', 'switch-manifest.js');
const buildDir = path.join(root, 'build');

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env });
}

console.log(`[build] channel: ${channel}`);
try {
  run(`node "${switchManifestScript}" ${channel}`);
  run('npx vite build');
  if (fs.existsSync(buildDir)) {
    writeChannelMarkerToDir(buildDir, channel);
  }
  run(`node "${path.join(root, 'scripts', 'build-firefox.js')}"`);
} finally {
  // Always restore tracked manifest to community template to prevent accidental store-manifest commits.
  run(`node "${switchManifestScript}" community`);
}
