const path = require('path');
const { execSync } = require('child_process');

const CHANNELS = new Set(['community', 'store']);

function resolveChannel(raw) {
  const normalized = String(raw || '').trim().toLowerCase();
  if (CHANNELS.has(normalized)) return normalized;
  return 'community';
}

const channel = resolveChannel(process.argv[2] || process.env.VITE_DIST_CHANNEL);
const root = path.resolve(__dirname, '..');
const env = { ...process.env, VITE_DIST_CHANNEL: channel };
const switchManifestScript = path.join(root, 'scripts', 'switch-manifest.js');

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env });
}

console.log(`[build] channel: ${channel}`);
try {
  run(`node "${switchManifestScript}" ${channel}`);
  run('npx vite build');
  run(`node "${path.join(root, 'scripts', 'build-firefox.js')}"`);
} finally {
  // Always restore tracked manifest to community template to prevent accidental store-manifest commits.
  run(`node "${switchManifestScript}" community`);
}
