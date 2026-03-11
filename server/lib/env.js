const fs = require('fs');
const path = require('path');

const BACKEND_ENV_FILE = path.resolve(__dirname, '../../deployment/leaftab-backend.env');

function loadEnvFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  });
}

function initializeBackendEnv() {
  loadEnvFileIfExists(BACKEND_ENV_FILE);
}

function parseIntEnv(key, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const raw = process.env[key];
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseBoolEnv(key, fallback = false) {
  const raw = String(process.env[key] ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  return fallback;
}

function resolveTrustProxy(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return false;
  if (value === 'true' || value === '1' || value === 'yes' || value === 'on') return 1;
  if (value === 'false' || value === '0' || value === 'no' || value === 'off') return false;
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return false;
}

module.exports = {
  initializeBackendEnv,
  parseIntEnv,
  parseBoolEnv,
  resolveTrustProxy,
};
