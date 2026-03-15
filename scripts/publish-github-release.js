const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const VALID_CHANNELS = new Set(['community', 'store']);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function run(cmd, args, options = {}) {
  execFileSync(cmd, args, {
    stdio: 'inherit',
    cwd: options.cwd,
  });
}

function resolveChannels(configChannels) {
  const normalized = Array.isArray(configChannels)
    ? configChannels.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)
    : [];
  const filtered = normalized.filter((x) => VALID_CHANNELS.has(x));
  if (filtered.length === 0) return ['community'];
  return [...new Set(filtered)];
}

function main() {
  const root = path.resolve(__dirname, '..');
  const pkg = readJson(path.join(root, 'package.json'));
  const config = readJson(path.join(root, 'release.config.json'));
  const ghConfig = config.githubRelease || {};

  const version = String(pkg.version || '').trim();
  if (!version) {
    throw new Error('Missing package.json version');
  }

  const channels = resolveChannels(ghConfig.channels);
  const repo = String(ghConfig.repo || '').trim();
  if (!repo) {
    throw new Error('Missing githubRelease.repo in release.config.json');
  }

  const titlePrefix = String(ghConfig.defaultTitlePrefix || 'v');
  const tag = `${titlePrefix}${version}`;
  const title = tag;
  const notes = process.env.RELEASE_NOTES || String(ghConfig.defaultNotes || '').trim();
  if (!notes) {
    throw new Error('Missing release notes: set githubRelease.defaultNotes or RELEASE_NOTES');
  }

  const assets = [];
  for (const channel of channels) {
    assets.push(`LeafTab-${channel}-chrome-edge-v${version}.zip`);
    assets.push(`LeafTab-${channel}-firefox-v${version}.zip`);
  }

  for (const file of assets) {
    if (!fs.existsSync(path.join(root, file))) {
      throw new Error(`Missing asset file: ${file}`);
    }
  }

  let exists = true;
  try {
    execFileSync('gh', ['release', 'view', tag, '--repo', repo], {
      stdio: 'ignore',
      cwd: root,
    });
  } catch (_error) {
    exists = false;
  }

  if (exists) {
    run('gh', ['release', 'upload', tag, ...assets, '--clobber', '--repo', repo], { cwd: root });
  } else {
    run(
      'gh',
      ['release', 'create', tag, ...assets, '--title', title, '--notes', notes, '--repo', repo],
      { cwd: root }
    );
  }

  run('gh', ['release', 'view', tag, '--repo', repo], { cwd: root });
}

try {
  main();
} catch (error) {
  console.error(`[publish] ${error.message}`);
  process.exit(1);
}
