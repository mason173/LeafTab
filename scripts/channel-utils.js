const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHANNELS = new Set(['community', 'store']);
const DIST_CHANNEL_MARKER_FILE = '.dist-channel';

function resolveChannel(raw) {
  const normalized = String(raw || '').trim().toLowerCase();
  if (CHANNELS.has(normalized)) return normalized;
  return 'community';
}

function has(value, target) {
  return Array.isArray(value) && value.includes(target);
}

function detectChannelByManifest(manifest) {
  const hasHttpsAllHosts = has(manifest?.host_permissions, 'https://*/*');
  const hasHttpAllHosts = has(manifest?.host_permissions, 'http://*/*');
  if (hasHttpsAllHosts && hasHttpAllHosts) return 'community';
  return 'store';
}

function readChannelMarkerText(raw) {
  const normalized = String(raw || '').trim().toLowerCase();
  return CHANNELS.has(normalized) ? normalized : '';
}

function readChannelMarkerFromDir(dirPath) {
  const markerPath = path.join(dirPath, DIST_CHANNEL_MARKER_FILE);
  if (!fs.existsSync(markerPath)) return '';
  try {
    return readChannelMarkerText(fs.readFileSync(markerPath, 'utf-8'));
  } catch {
    return '';
  }
}

function writeChannelMarkerToDir(dirPath, channel) {
  const normalized = resolveChannel(channel);
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.join(dirPath, DIST_CHANNEL_MARKER_FILE), `${normalized}\n`);
}

function readChannelMarkerFromZip(zipPath) {
  try {
    const output = execSync(`unzip -p "${zipPath}" ${DIST_CHANNEL_MARKER_FILE}`, { encoding: 'utf-8' });
    return readChannelMarkerText(output);
  } catch {
    return '';
  }
}

module.exports = {
  CHANNELS,
  DIST_CHANNEL_MARKER_FILE,
  detectChannelByManifest,
  readChannelMarkerFromDir,
  readChannelMarkerFromZip,
  resolveChannel,
  writeChannelMarkerToDir,
};
