import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_HOST = '127.0.0.1';
const CLOUD_API_PREFIX = '/api/user/leaftab-sync';
const MOCK_ADMIN_PREFIX = '/__mock/admin';
const MOCK_WEBDAV_PREFIX = '/__mock_webdav__';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function createDefaultState() {
  return {
    cloud: {
      lock: null,
      head: null,
      commit: null,
      snapshot: null,
      files: {},
    },
    webdav: {
      entries: new Map([
        ['', { kind: 'dir' }],
      ]),
    },
  };
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function serializeState(state) {
  return {
    cloud: {
      lock: cloneJson(state.cloud.lock),
      head: cloneJson(state.cloud.head),
      commit: cloneJson(state.cloud.commit),
      snapshot: cloneJson(state.cloud.snapshot),
      files: cloneJson(state.cloud.files),
    },
    webdav: {
      entries: Object.fromEntries(
        Array.from(state.webdav.entries.entries()).map(([entryPath, entry]) => [
          entryPath,
          cloneJson(entry),
        ]),
      ),
    },
  };
}

function applySeed(state, seed) {
  if (!seed || typeof seed !== 'object') return;

  if (seed.cloud && typeof seed.cloud === 'object') {
    const nextCloud = seed.cloud;
    if ('lock' in nextCloud) state.cloud.lock = cloneJson(nextCloud.lock);
    if ('head' in nextCloud) state.cloud.head = cloneJson(nextCloud.head);
    if ('commit' in nextCloud) state.cloud.commit = cloneJson(nextCloud.commit);
    if ('snapshot' in nextCloud) state.cloud.snapshot = cloneJson(nextCloud.snapshot);
    if (nextCloud.files && typeof nextCloud.files === 'object') {
      state.cloud.files = cloneJson(nextCloud.files);
    }
  }

  if (seed.webdav && typeof seed.webdav === 'object') {
    state.webdav.entries = new Map([['', { kind: 'dir' }]]);
    const entries = seed.webdav.entries;
    if (entries && typeof entries === 'object') {
      for (const [entryPath, entry] of Object.entries(entries)) {
        state.webdav.entries.set(normalizeWebdavPath(entryPath), cloneJson(entry));
      }
    }
  }
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function sendEmpty(response, statusCode = 204) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
  });
  response.end();
}

function normalizeWebdavPath(inputPath) {
  return String(inputPath || '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/\/+$/, '');
}

function getParentWebdavPath(entryPath) {
  const normalized = normalizeWebdavPath(entryPath);
  if (!normalized) return '';
  const lastSlashIndex = normalized.lastIndexOf('/');
  return lastSlashIndex >= 0 ? normalized.slice(0, lastSlashIndex) : '';
}

function ensureWebdavParentExists(state, entryPath) {
  const parentPath = getParentWebdavPath(entryPath);
  return state.webdav.entries.get(parentPath)?.kind === 'dir';
}

function removeWebdavEntry(state, entryPath) {
  const normalized = normalizeWebdavPath(entryPath);
  for (const key of Array.from(state.webdav.entries.keys())) {
    if (key === normalized || key.startsWith(`${normalized}/`)) {
      state.webdav.entries.delete(key);
    }
  }
}

async function handleMockAdmin(request, response, state) {
  if (request.method === 'POST' && request.url === `${MOCK_ADMIN_PREFIX}/reset`) {
    const rawBody = await readRequestBody(request);
    const nextSeed = rawBody ? JSON.parse(rawBody) : null;
    const nextState = createDefaultState();
    applySeed(nextState, nextSeed);
    state.cloud = nextState.cloud;
    state.webdav = nextState.webdav;
    sendEmpty(response);
    return true;
  }

  if (request.method === 'GET' && request.url === `${MOCK_ADMIN_PREFIX}/state`) {
    sendJson(response, 200, serializeState(state));
    return true;
  }

  return false;
}

async function handleCloudApi(request, response, state) {
  const requestUrl = new URL(request.url, 'http://localhost');
  const pathname = requestUrl.pathname;

  if (pathname === `${CLOUD_API_PREFIX}/lock` && request.method === 'POST') {
    const payload = JSON.parse(await readRequestBody(request) || '{}');
    const now = Date.now();
    const ttlMs = Number(payload.ttlMs) > 0 ? Number(payload.ttlMs) : 2 * 60 * 1000;
    const deviceId = String(payload.deviceId || 'unknown-device');
    const activeLock = state.cloud.lock;
    if (
      activeLock
      && Date.parse(activeLock.expiresAt) > now
      && activeLock.deviceId !== deviceId
    ) {
      sendJson(response, 409, { error: 'lock conflict', lock: activeLock });
      return true;
    }

    state.cloud.lock = {
      deviceId,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
    };
    sendJson(response, 200, state.cloud.lock);
    return true;
  }

  if (pathname === `${CLOUD_API_PREFIX}/lock` && request.method === 'DELETE') {
    state.cloud.lock = null;
    sendEmpty(response);
    return true;
  }

  if (pathname === `${CLOUD_API_PREFIX}/state` && request.method === 'GET') {
    sendJson(response, 200, {
      head: state.cloud.head,
      commit: state.cloud.commit,
      snapshot: state.cloud.snapshot,
    });
    return true;
  }

  if (pathname === `${CLOUD_API_PREFIX}/state` && request.method === 'POST') {
    const payload = JSON.parse(await readRequestBody(request) || '{}');
    const currentCommitId = state.cloud.commit?.id ?? null;
    if (currentCommitId && payload.parentCommitId !== currentCommitId) {
      sendJson(response, 409, { error: 'commit conflict' });
      return true;
    }
    state.cloud.snapshot = cloneJson(payload.snapshot ?? null);
    state.cloud.commit = cloneJson(payload.commit ?? state.cloud.commit ?? null);
    state.cloud.head = cloneJson(payload.head ?? state.cloud.head ?? null);
    sendJson(response, 200, {
      head: state.cloud.head,
      commit: state.cloud.commit,
    });
    return true;
  }

  if (pathname === `${CLOUD_API_PREFIX}/files/read` && request.method === 'POST') {
    const payload = JSON.parse(await readRequestBody(request) || '{}');
    const files = {};
    for (const requestedPath of Array.isArray(payload.paths) ? payload.paths : []) {
      files[requestedPath] = Object.prototype.hasOwnProperty.call(state.cloud.files, requestedPath)
        ? state.cloud.files[requestedPath]
        : null;
    }
    sendJson(response, 200, { files });
    return true;
  }

  if (pathname === `${CLOUD_API_PREFIX}/files/write` && request.method === 'POST') {
    const payload = JSON.parse(await readRequestBody(request) || '{}');
    const currentCommitId = state.cloud.commit?.id ?? null;
    const parentCommitId = payload.parentCommitId ?? null;
    if (currentCommitId && parentCommitId !== currentCommitId) {
      sendJson(response, 409, { error: 'commit conflict' });
      return true;
    }

    const nextFiles = payload.files && typeof payload.files === 'object' ? payload.files : {};
    for (const [filePath, body] of Object.entries(nextFiles)) {
      state.cloud.files[filePath] = typeof body === 'string' ? body : '';
    }
    state.cloud.head = cloneJson(payload.head ?? null);
    state.cloud.commit = cloneJson(payload.commit ?? null);
    sendJson(response, 200, {
      head: state.cloud.head,
      commit: state.cloud.commit,
    });
    return true;
  }

  return false;
}

async function handleWebdav(request, response, state) {
  const requestUrl = new URL(request.url, 'http://localhost');
  if (!requestUrl.pathname.startsWith(MOCK_WEBDAV_PREFIX)) {
    return false;
  }

  const relativePath = normalizeWebdavPath(decodeURIComponent(
    requestUrl.pathname.slice(MOCK_WEBDAV_PREFIX.length),
  ));
  const existingEntry = state.webdav.entries.get(relativePath) ?? null;

  if (request.method === 'GET') {
    if (!existingEntry || existingEntry.kind !== 'file') {
      sendEmpty(response, 404);
      return true;
    }
    sendText(response, 200, existingEntry.body || '', existingEntry.contentType || 'application/json; charset=utf-8');
    return true;
  }

  if (request.method === 'MKCOL') {
    if (!ensureWebdavParentExists(state, relativePath)) {
      sendEmpty(response, 409);
      return true;
    }
    if (existingEntry) {
      sendEmpty(response, existingEntry.kind === 'dir' ? 405 : 405);
      return true;
    }
    state.webdav.entries.set(relativePath, { kind: 'dir' });
    sendEmpty(response, 201);
    return true;
  }

  if (request.method === 'PUT') {
    if (!ensureWebdavParentExists(state, relativePath)) {
      sendEmpty(response, 409);
      return true;
    }
    const body = await readRequestBody(request);
    state.webdav.entries.set(relativePath, {
      kind: 'file',
      body,
      contentType: request.headers['content-type'] || 'application/octet-stream',
    });
    sendEmpty(response, existingEntry ? 204 : 201);
    return true;
  }

  if (request.method === 'DELETE') {
    removeWebdavEntry(state, relativePath);
    sendEmpty(response, 204);
    return true;
  }

  sendEmpty(response, 405);
  return true;
}

async function serveStaticFile(response, staticDir, requestPath) {
  const normalizedRequestPath = requestPath === '/' ? '/index.html' : requestPath;
  const candidatePath = path.resolve(staticDir, `.${normalizedRequestPath}`);
  const relativePath = path.relative(staticDir, candidatePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    sendEmpty(response, 403);
    return;
  }

  try {
    const stats = await fs.promises.stat(candidatePath);
    const filePath = stats.isDirectory() ? path.join(candidatePath, 'index.html') : candidatePath;
    const extension = path.extname(filePath).toLowerCase();
    const stream = fs.createReadStream(filePath);
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    stream.pipe(response);
  } catch {
    sendEmpty(response, 404);
  }
}

export async function startMockSyncService({
  host = DEFAULT_HOST,
  port = 0,
  staticDir = null,
} = {}) {
  const state = createDefaultState();

  const server = http.createServer(async (request, response) => {
    try {
      if (await handleMockAdmin(request, response, state)) return;
      if (await handleCloudApi(request, response, state)) return;
      if (await handleWebdav(request, response, state)) return;

      if (staticDir) {
        const requestUrl = new URL(request.url, 'http://localhost');
        await serveStaticFile(response, staticDir, requestUrl.pathname);
        return;
      }

      sendEmpty(response, 404);
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve mock sync service address');
  }

  return {
    host,
    port: address.port,
    url: `http://${host}:${address.port}`,
    resetState(seed = null) {
      const nextState = createDefaultState();
      applySeed(nextState, seed);
      state.cloud = nextState.cloud;
      state.webdav = nextState.webdav;
    },
    getState() {
      return serializeState(state);
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
