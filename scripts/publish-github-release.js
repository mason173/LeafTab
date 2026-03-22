const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const VALID_CHANNELS = new Set(['community', 'store']);
const DEFAULT_UPLOAD_RETRIES = 8;
const DEFAULT_RETRY_DELAY_MS = 1500;
const DEFAULT_MAX_RETRY_DELAY_MS = 8000;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, {
    stdio: 'inherit',
    cwd: options.cwd,
  });
}

function runCapture(cmd, args, options = {}) {
  try {
    const stdout = execFileSync(cmd, args, {
      cwd: options.cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, stdout: String(stdout || ''), stderr: '' };
  } catch (error) {
    const stdout = error && error.stdout ? String(error.stdout) : '';
    const stderr = error && error.stderr ? String(error.stderr) : '';
    return { ok: false, stdout, stderr, error };
  }
}

function parseBoolean(raw, fallback = false) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const value = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(value)) return false;
  return fallback;
}

function parsePositiveInt(raw, fallback) {
  const num = Number.parseInt(String(raw || ''), 10);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function sleep(ms) {
  const delay = Math.max(0, Number(ms) || 0);
  if (delay === 0) return;
  const lock = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(lock, 0, 0, delay);
}

function firstErrorLine(result) {
  const content = `${result && result.stderr ? result.stderr : ''}\n${result && result.stdout ? result.stdout : ''}`;
  const line = content
    .split('\n')
    .map((x) => x.trim())
    .find(Boolean);
  return line || 'unknown error';
}

function runWithRetry(taskName, task, options = {}) {
  const maxAttempts = parsePositiveInt(options.maxAttempts, DEFAULT_UPLOAD_RETRIES);
  const baseDelayMs = parsePositiveInt(options.baseDelayMs, DEFAULT_RETRY_DELAY_MS);
  const maxDelayMs = parsePositiveInt(options.maxDelayMs, DEFAULT_MAX_RETRY_DELAY_MS);
  const accept = typeof options.accept === 'function' ? options.accept : (result) => Boolean(result && result.ok);

  let lastResult = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = task(attempt);
    lastResult = result;

    if (accept(result)) {
      if (result && result.ok === false) {
        console.log(`[publish] ${taskName}: treated as success (${firstErrorLine(result)})`);
      } else {
        console.log(`[publish] ${taskName}: done`);
      }
      return result;
    }

    const errLine = firstErrorLine(result);
    console.warn(`[publish] ${taskName}: attempt ${attempt}/${maxAttempts} failed (${errLine})`);

    if (attempt < maxAttempts) {
      const delay = Math.min(baseDelayMs * (2 ** (attempt - 1)), maxDelayMs);
      console.warn(`[publish] ${taskName}: retrying in ${delay}ms`);
      sleep(delay);
    }
  }

  throw new Error(`${taskName} failed after ${maxAttempts} attempts (${firstErrorLine(lastResult)})`);
}

function resolveChannels(configChannels) {
  const normalized = Array.isArray(configChannels)
    ? configChannels.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean)
    : [];
  const filtered = normalized.filter((x) => VALID_CHANNELS.has(x));
  if (filtered.length === 0) return ['community'];
  return [...new Set(filtered)];
}

function releaseExists(tag, repo, root) {
  const result = runCapture('gh', ['release', 'view', tag, '--repo', repo], { cwd: root });
  return result.ok;
}

function getExistingAssets(tag, repo, root) {
  const result = runCapture(
    'gh',
    ['release', 'view', tag, '--repo', repo, '--json', 'assets', '--jq', '.assets[].name'],
    { cwd: root }
  );
  if (!result.ok) return new Set();
  const items = result.stdout
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  return new Set(items);
}

function isAlreadyUploaded(result) {
  const combined = `${result && result.stderr ? result.stderr : ''}\n${result && result.stdout ? result.stdout : ''}`.toLowerCase();
  return combined.includes('already exists');
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
  const shouldClobber = parseBoolean(process.env.RELEASE_CLOBBER, false);
  const uploadRetries = parsePositiveInt(process.env.RELEASE_UPLOAD_RETRIES, DEFAULT_UPLOAD_RETRIES);
  const retryDelayMs = parsePositiveInt(process.env.RELEASE_RETRY_DELAY_MS, DEFAULT_RETRY_DELAY_MS);
  const maxRetryDelayMs = parsePositiveInt(process.env.RELEASE_MAX_RETRY_DELAY_MS, DEFAULT_MAX_RETRY_DELAY_MS);

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

  const exists = releaseExists(tag, repo, root);
  console.log(`[publish] target release: ${repo}@${tag}`);
  console.log(`[publish] upload strategy: ${shouldClobber ? 'clobber (overwrite existing assets)' : 'resume (skip existing assets)'}`);
  console.log(`[publish] retry config: attempts=${uploadRetries}, baseDelay=${retryDelayMs}ms, maxDelay=${maxRetryDelayMs}ms`);

  if (!exists) {
    runWithRetry(
      'create release',
      () => runCapture('gh', ['release', 'create', tag, '--title', title, '--notes', notes, '--repo', repo], { cwd: root }),
      {
        maxAttempts: uploadRetries,
        baseDelayMs: retryDelayMs,
        maxDelayMs: maxRetryDelayMs,
      }
    );
  } else {
    console.log('[publish] release already exists, will upload assets incrementally');
  }

  const existingAssets = exists ? getExistingAssets(tag, repo, root) : new Set();
  for (const file of assets) {
    if (!shouldClobber && existingAssets.has(file)) {
      console.log(`[publish] skip existing asset: ${file}`);
      continue;
    }

    const args = ['release', 'upload', tag, file, '--repo', repo];
    if (shouldClobber) args.push('--clobber');

    runWithRetry(
      `upload ${file}`,
      () => runCapture('gh', args, { cwd: root }),
      {
        maxAttempts: uploadRetries,
        baseDelayMs: retryDelayMs,
        maxDelayMs: maxRetryDelayMs,
        accept: (result) => {
          if (result && result.ok) return true;
          return !shouldClobber && isAlreadyUploaded(result);
        },
      }
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
