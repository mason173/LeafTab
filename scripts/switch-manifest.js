const fs = require('fs');
const path = require('path');

const CHANNELS = new Set(['community', 'store']);

function resolveChannel(raw) {
  const normalized = String(raw || '').trim().toLowerCase();
  if (CHANNELS.has(normalized)) return normalized;
  return 'community';
}

const channel = resolveChannel(process.argv[2] || process.env.VITE_DIST_CHANNEL);
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const sourcePath = path.join(publicDir, `manifest.${channel}.json`);
const targetPath = path.join(publicDir, 'manifest.json');

if (!fs.existsSync(sourcePath)) {
  console.error(`Manifest template not found: ${sourcePath}`);
  process.exit(1);
}

fs.copyFileSync(sourcePath, targetPath);
console.log(`[manifest] using ${path.basename(sourcePath)} -> public/manifest.json`);
