const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const SQLiteStore = require('connect-sqlite3')(session);
const cookieParser = require('cookie-parser');
const {
  initializeBackendEnv,
  parseIntEnv,
  parseBoolEnv,
  resolveTrustProxy,
  parseSameSiteEnv,
} = require('./lib/env');
const { parseAllowlist, createCorsOriginValidator } = require('./lib/corsPolicy');
const { createReleaseUpdateService } = require('./lib/releaseUpdateService');
const { initializeDatabase } = require('./lib/database');
const { createAuthHelpers } = require('./lib/auth');
const { createRateLimiters } = require('./lib/rateLimiters');
const { validateUsername, validatePassword } = require('./lib/validation');
const { registrableDomain } = require('./lib/domainUtils');
const { registerAuthRoutes } = require('./routes/authRoutes');
const { registerUserRoutes } = require('./routes/userRoutes');
const { registerDomainRoutes } = require('./routes/domainRoutes');

const createApp = () => {
  initializeBackendEnv();

  const app = express();
  const port = 3001; // We'll run this on port 3001
  const secretKey = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
  const sessionSecret = process.env.SESSION_SECRET || secretKey;
  const updateReleaseCacheTtlMs = parseIntEnv('UPDATE_RELEASE_CACHE_TTL_MS', 10 * 60 * 1000, 60 * 1000);
  const githubToken = (process.env.GITHUB_TOKEN || '').trim();

  const authLimitWindowMs = parseIntEnv('AUTH_LIMIT_WINDOW_MS', 15 * 60 * 1000, 60 * 1000);
  const authLimitMax = parseIntEnv('AUTH_LIMIT_MAX', 8, 1);
  const apiLimitWindowMs = parseIntEnv('API_LIMIT_WINDOW_MS', 15 * 60 * 1000, 60 * 1000);
  const apiLimitMax = parseIntEnv('API_LIMIT_MAX', 100, 1);
  const shortcutsLimitWindowMs = parseIntEnv('SHORTCUTS_LIMIT_WINDOW_MS', 60 * 1000, 1000);
  const shortcutsLimitMax = parseIntEnv('SHORTCUTS_LIMIT_MAX', 100, 1);
  const syncIpLimitWindowMs = parseIntEnv('SYNC_IP_LIMIT_WINDOW_MS', 60 * 1000, 1000);
  const syncIpLimitMax = parseIntEnv('SYNC_IP_LIMIT_MAX', 90, 1);
  const captchaLimitWindowMs = parseIntEnv('CAPTCHA_LIMIT_WINDOW_MS', 15 * 60 * 1000, 60 * 1000);
  const captchaLimitMax = parseIntEnv('CAPTCHA_LIMIT_MAX', 30, 1);
  const updateLimitWindowMs = parseIntEnv('UPDATE_LIMIT_WINDOW_MS', 60 * 1000, 1000);
  const updateLimitMax = parseIntEnv('UPDATE_LIMIT_MAX', 20, 1);
  const bcryptRounds = parseIntEnv('BCRYPT_ROUNDS', 10, 8, 14);
  const requestLogEnabled = parseBoolEnv('REQUEST_LOG_ENABLED', process.env.NODE_ENV !== 'production');
  const trustProxy = resolveTrustProxy(
    process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? '1' : 'false')
  );
  const allowExtensionOrigins = parseBoolEnv('ALLOW_EXTENSION_ORIGINS', true);
  const sessionCookieSecureDefault = process.env.NODE_ENV === 'production';
  const sessionCookieSecure = parseBoolEnv('SESSION_COOKIE_SECURE', sessionCookieSecureDefault);
  const sessionCookieSameSiteDefault = (
    process.env.NODE_ENV === 'production' && allowExtensionOrigins
  ) ? 'none' : 'lax';
  const sessionCookieSameSite = parseSameSiteEnv('SESSION_COOKIE_SAME_SITE', sessionCookieSameSiteDefault);
  const effectiveSessionCookieSecure = sessionCookieSameSite === 'none'
    ? true
    : sessionCookieSecure;

  const adminApiKey = (process.env.ADMIN_API_KEY || '').trim();
  const { isAdminRequest, authenticateToken } = createAuthHelpers({ secretKey, adminApiKey });

  const {
    authLimiter,
    apiLimiter,
    shortcutsLimiter,
    syncIpLimiter,
    captchaLimiter,
    updateLimiter,
  } = createRateLimiters({
    authLimitWindowMs,
    authLimitMax,
    apiLimitWindowMs,
    apiLimitMax,
    shortcutsLimitWindowMs,
    shortcutsLimitMax,
    syncIpLimitWindowMs,
    syncIpLimitMax,
    captchaLimitWindowMs,
    captchaLimitMax,
    updateLimitWindowMs,
    updateLimitMax,
    isAdminRequest,
  });

  const { getLatestReleaseCached } = createReleaseUpdateService({
    githubToken,
    cacheTtlMs: updateReleaseCacheTtlMs,
    fetchImpl: globalThis.fetch,
  });

  app.use(cookieParser());
  app.set('trust proxy', trustProxy);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(session({
    store: new SQLiteStore({
      db: 'sessions.db',
      dir: __dirname,
      ttl: 30 * 24 * 60 * 60, // seconds
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: effectiveSessionCookieSecure,
      sameSite: sessionCookieSameSite,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }));

  const allowlist = parseAllowlist(process.env.CLIENT_URLS || process.env.CLIENT_URL || '');
  const corsOrigin = createCorsOriginValidator({
    allowlist,
    allowExtensionOrigins,
    allowLocalhost: true,
  });

  app.use(cors({
    origin: corsOrigin,
    credentials: true,
  }));
  app.use(bodyParser.json({ limit: '10mb' }));

  if (requestLogEnabled) {
    app.use((req, _res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });
  }

  // Error handling for JSON parsing
  app.use((err, _req, res, next) => {
    if (err && err.message === 'Not allowed by CORS') {
      return res.status(403).json({ error: 'Origin is not allowed by CORS' });
    }
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      console.error('JSON Parsing Error:', err.message);
      return res.status(400).json({ error: 'Invalid JSON format' });
    }
    next();
  });

  const dbPath = path.resolve(__dirname, 'users.db');
  const db = initializeDatabase(dbPath);

  registerAuthRoutes({
    app,
    db,
    bcrypt,
    jwt,
    secretKey,
    bcryptRounds,
    validateUsername,
    validatePassword,
    authLimiter,
    captchaLimiter,
    updateLimiter,
    getLatestReleaseCached,
  });

  registerUserRoutes({
    app,
    db,
    apiLimiter,
    shortcutsLimiter,
    syncIpLimiter,
    authenticateToken,
    isAdminRequest,
  });

  registerDomainRoutes({
    app,
    db,
    apiLimiter,
    authenticateToken,
    isAdminRequest,
    registrableDomain,
  });

  // Basic health check
  app.get('/', (_req, res) => {
    res.send('Auth Server is running');
  });

  return {
    app,
    port,
  };
};

module.exports = {
  createApp,
};
