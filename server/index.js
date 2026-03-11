const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const svgCaptcha = require('svg-captcha');
const session = require('express-session');
const helmet = require('helmet');
const SQLiteStore = require('connect-sqlite3')(session);
const cookieParser = require('cookie-parser');
const {
  initializeBackendEnv,
  parseIntEnv,
  parseBoolEnv,
  resolveTrustProxy,
} = require('./lib/env');
const { parseAllowlist, createCorsOriginValidator } = require('./lib/corsPolicy');
const { createReleaseUpdateService } = require('./lib/releaseUpdateService');

initializeBackendEnv();

const app = express();
const PORT = 3001; // We'll run this on port 3001
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const SESSION_SECRET = process.env.SESSION_SECRET || SECRET_KEY;
const UPDATE_RELEASE_CACHE_TTL_MS = parseIntEnv('UPDATE_RELEASE_CACHE_TTL_MS', 10 * 60 * 1000, 60 * 1000);
const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || '').trim();

const AUTH_LIMIT_WINDOW_MS = parseIntEnv('AUTH_LIMIT_WINDOW_MS', 15 * 60 * 1000, 60 * 1000);
const AUTH_LIMIT_MAX = parseIntEnv('AUTH_LIMIT_MAX', 8, 1);
const API_LIMIT_WINDOW_MS = parseIntEnv('API_LIMIT_WINDOW_MS', 15 * 60 * 1000, 60 * 1000);
const API_LIMIT_MAX = parseIntEnv('API_LIMIT_MAX', 100, 1);
const SHORTCUTS_LIMIT_WINDOW_MS = parseIntEnv('SHORTCUTS_LIMIT_WINDOW_MS', 60 * 1000, 1000);
const SHORTCUTS_LIMIT_MAX = parseIntEnv('SHORTCUTS_LIMIT_MAX', 50, 1);
const CAPTCHA_LIMIT_WINDOW_MS = parseIntEnv('CAPTCHA_LIMIT_WINDOW_MS', 15 * 60 * 1000, 60 * 1000);
const CAPTCHA_LIMIT_MAX = parseIntEnv('CAPTCHA_LIMIT_MAX', 30, 1);
const UPDATE_LIMIT_WINDOW_MS = parseIntEnv('UPDATE_LIMIT_WINDOW_MS', 60 * 1000, 1000);
const UPDATE_LIMIT_MAX = parseIntEnv('UPDATE_LIMIT_MAX', 20, 1);
const BCRYPT_ROUNDS = parseIntEnv('BCRYPT_ROUNDS', 10, 8, 14);
const REQUEST_LOG_ENABLED = parseBoolEnv('REQUEST_LOG_ENABLED', process.env.NODE_ENV !== 'production');
const TRUST_PROXY = resolveTrustProxy(process.env.TRUST_PROXY);
const ALLOW_EXTENSION_ORIGINS = parseBoolEnv('ALLOW_EXTENSION_ORIGINS', true);
const { getLatestReleaseCached } = createReleaseUpdateService({
  githubToken: GITHUB_TOKEN,
  cacheTtlMs: UPDATE_RELEASE_CACHE_TTL_MS,
  fetchImpl: globalThis.fetch,
});

app.use(cookieParser());
app.set('trust proxy', TRUST_PROXY);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: __dirname,
    ttl: 30 * 24 * 60 * 60 // seconds
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));

// Domain helpers (normalize and registrable domain extraction)
const normalizeDomain = (domain) => {
  if (!domain || typeof domain !== 'string') return '';
  let d = domain.trim().toLowerCase();
  try {
    if (/^https?:\/\//i.test(d)) {
      const u = new URL(d);
      d = u.hostname;
    } else if (d.includes('/')) {
      const u = new URL(`http://${d}`);
      d = u.hostname;
    }
  } catch (_) {}
  if (d.startsWith('www.')) d = d.slice(4);
  if (!/^[a-z0-9.-]+$/.test(d)) return '';
  if (!d.includes('.')) return '';
  return d;
};

const registrableDomain = (domain) => {
  const d = normalizeDomain(domain);
  if (!d) return '';
  const parts = d.split('.');
  if (parts.length <= 2) return parts.join('.');
  const last2 = parts.slice(-2).join('.');
  const multiSuffixes = new Set([
    'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
    'co.uk', 'org.uk', 'ac.uk',
    'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp', 'gr.jp', 'ed.jp', 'ad.jp',
    'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
    'com.hk', 'com.tw'
  ]);
  if (multiSuffixes.has(last2)) {
    if (parts.length >= 3) return parts.slice(-3).join('.');
  }
  return last2;
};

// Rate Limiter Configuration
const ADMIN_API_KEY = (process.env.ADMIN_API_KEY || '').trim();
const isAdminRequest = (req) => {
  if (!ADMIN_API_KEY) return false;
  const key = req.headers['x-admin-key'];
  if (typeof key !== 'string') return false;
  return key === ADMIN_API_KEY;
};

const authLimiter = rateLimit({
  windowMs: AUTH_LIMIT_WINDOW_MS,
  max: AUTH_LIMIT_MAX,
  message: { error: 'Too many login/register attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => false
});

const apiLimiter = rateLimit({
  windowMs: API_LIMIT_WINDOW_MS,
  max: API_LIMIT_MAX,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req);
    if (req.user && req.user.id) return `${req.user.id}:${ipKey}`;
    return ipKey;
  },
  skip: (req) => {
    return isAdminRequest(req);
  }
});

const shortcutsLimiter = rateLimit({
  windowMs: SHORTCUTS_LIMIT_WINDOW_MS,
  max: SHORTCUTS_LIMIT_MAX,
  message: { error: 'Too many shortcut sync requests, please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user && req.user.id) return `shortcuts:${req.user.id}`;
    return ipKeyGenerator(req);
  },
  skip: (req) => {
    return isAdminRequest(req);
  }
});

const captchaLimiter = rateLimit({
  windowMs: CAPTCHA_LIMIT_WINDOW_MS,
  max: CAPTCHA_LIMIT_MAX,
  message: { error: 'Too many captcha requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const updateLimiter = rateLimit({
  windowMs: UPDATE_LIMIT_WINDOW_MS,
  max: UPDATE_LIMIT_MAX,
  message: { error: 'Too many update checks, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
});


// Validation Helpers
const validateUsername = (username) => {
    // Alphanumeric + underscore + dot + at, 3-50 chars
    // Updated to support email-like usernames
    const re = /^[a-zA-Z0-9_.@]{3,50}$/; 
    return re.test(username);
};

const validatePassword = (password) => {
    // Min 6 chars
    return typeof password === 'string' && password.length >= 6; 
};

const allowlist = parseAllowlist(process.env.CLIENT_URLS || process.env.CLIENT_URL || '');
const corsOrigin = createCorsOriginValidator({
  allowlist,
  allowExtensionOrigins: ALLOW_EXTENSION_ORIGINS,
  allowLocalhost: true,
});

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(bodyParser.json());

if (REQUEST_LOG_ENABLED) {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Error Handling for JSON parsing
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin is not allowed by CORS' });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parsing Error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next();
});

// Initialize SQLite Database
const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);      
  } else {
    console.log('Connected to the SQLite database.');
    // Create users table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            shortcuts TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            role TEXT DEFAULT 'user',
            shortcuts_updated_at DATETIME,
            shortcuts_version INTEGER DEFAULT 0,
            privacy_consent INTEGER DEFAULT 0,
            privacy_consent_ts DATETIME
        )`, (err) => {
            if (err) {
                console.error('Error creating table', err.message);
            } else {
                // Migration: Check if shortcuts column exists, if not add it
                db.all("PRAGMA table_info(users)", (err, rows) => {
                    if (err) {
                        console.error('Error getting table info', err);
                        return;
                    }
                    const hasShortcuts = rows.some(row => row.name === 'shortcuts');
                    if (!hasShortcuts) {
                        console.log('Adding shortcuts column to users table...');
                        db.run("ALTER TABLE users ADD COLUMN shortcuts TEXT", (err) => {
                            if (err) console.error('Error adding shortcuts column', err);
                            else console.log('Shortcuts column added successfully');
                        });
                    }
                    
                    // Migration: Check if role column exists, if not add it
                    const hasRole = rows.some(row => row.name === 'role');
                    if (!hasRole) {
                        console.log('Adding role column to users table...');
                        db.run("ALTER TABLE users ADD COLUMN role TEXT", (err) => {
                            if (err) console.error('Error adding role column', err);
                            else console.log('Role column added successfully');
                        });
                    }

                    // Migration: shortcuts_updated_at timestamp
                    const hasShortcutsUpdatedAt = rows.some(row => row.name === 'shortcuts_updated_at');
                    if (!hasShortcutsUpdatedAt) {
                        console.log('Adding shortcuts_updated_at column to users table...');
                        db.run("ALTER TABLE users ADD COLUMN shortcuts_updated_at DATETIME", (err) => {
                            if (err) console.error('Error adding shortcuts_updated_at column', err);
                            else console.log('shortcuts_updated_at column added successfully');
                        });
                    }

                    // Migration: shortcuts_version for optimistic concurrency
                    const hasShortcutsVersion = rows.some(row => row.name === 'shortcuts_version');
                    if (!hasShortcutsVersion) {
                        console.log('Adding shortcuts_version column to users table...');
                        db.run("ALTER TABLE users ADD COLUMN shortcuts_version INTEGER DEFAULT 0", (err) => {
                            if (err) console.error('Error adding shortcuts_version column', err);
                            else console.log('shortcuts_version column added successfully');
                        });
                    }
                    const hasPrivacyConsent = rows.some(row => row.name === 'privacy_consent');
                    if (!hasPrivacyConsent) {
                        console.log('Adding privacy_consent column to users table...');
                        db.run("ALTER TABLE users ADD COLUMN privacy_consent INTEGER DEFAULT 0", (err) => {
                            if (err) console.error('Error adding privacy_consent column', err);
                            else console.log('privacy_consent column added successfully');
                        });
                    }
                    const hasPrivacyTs = rows.some(row => row.name === 'privacy_consent_ts');
                    if (!hasPrivacyTs) {
                        console.log('Adding privacy_consent_ts column to users table...');
                        db.run("ALTER TABLE users ADD COLUMN privacy_consent_ts DATETIME", (err) => {
                            if (err) console.error('Error adding privacy_consent_ts column', err);
                            else console.log('privacy_consent_ts column added successfully');
                        });
                    }
                });
            }
        });
  }
});

// Anonymous domain stats table
db.run(`CREATE TABLE IF NOT EXISTS domain_stats (
  registrable_domain TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
  if (err) console.error('Error creating domain_stats table', err.message);
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: 'Unauthorized' }); // Explicit JSON

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' }); // Explicit JSON
    req.user = user;
    next();
  });
};

// Captcha Endpoint
app.get('/captcha', captchaLimiter, (req, res) => {
  const captcha = svgCaptcha.create({
    size: 4, // 4 chars
    ignoreChars: '0o1i', // ignore confusing chars
    noise: 2, // noise lines
    color: true, // color chars
    background: '#cc9966' // background color
  });
  
  req.session.captcha = captcha.text.toLowerCase();
  res.type('svg');
  res.status(200).send(captcha.data);
});

// Public: latest release info for extension update checks.
app.get('/update/latest', updateLimiter, async (_req, res) => {
  const latest = await getLatestReleaseCached();
  if (latest) return res.json(latest);
  return res.status(503).json({ error: 'Unable to resolve latest release' });
});


// Register Endpoint
app.post('/register', authLimiter, (req, res) => {
  const { username, password, captcha } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Validate Captcha
  const captchaInput = typeof captcha === 'string' ? captcha : '';
  if (!captchaInput) {
    return res.status(400).json({ error: 'Captcha is required' });
  }

  if (!req.session) {
    return res.status(503).json({ error: 'Session unavailable, please retry.' });
  }

  if (!req.session.captcha || captchaInput.toLowerCase() !== req.session.captcha) {
    return res.status(400).json({ error: 'Invalid captcha' });
  }

  // Clear captcha after use (success or fail) to prevent replay
  req.session.captcha = null;

  if (!validateUsername(username)) {
    return res.status(400).json({ error: 'Invalid username format. Use 3-20 alphanumeric characters or underscores.' });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  bcrypt.hash(password, BCRYPT_ROUNDS, (hashErr, hashedPassword) => {
    if (hashErr) {
      console.error('bcrypt hash failed:', hashErr.message);
      return res.status(500).json({ error: 'Failed to process password' });
    }

    const sql = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;
    db.run(sql, [username, hashedPassword, 'user'], function(err) {
      if (!err) {
        return res.json({ message: 'User registered successfully', userId: this.lastID });
      }

      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      if (err.message.includes('database is locked')) {
        return res.status(503).json({ error: 'Database is busy, please retry in a moment.' });
      }
      return res.status(500).json({ error: err.message });
    });
  });
});

// Login Endpoint
app.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const sql = `SELECT * FROM users WHERE username = ?`;        
  db.get(sql, [username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });     
    }
    if (!row) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    bcrypt.compare(password, row.password, (compareErr, passwordIsValid) => {
      if (compareErr) {
        console.error('bcrypt compare failed:', compareErr.message);
        return res.status(500).json({ error: 'Failed to verify password' });
      }
      if (!passwordIsValid) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }

      const token = jwt.sign({ id: row.id, username: row.username }, SECRET_KEY, {       
        expiresIn: '30d' // 30 days
      });

      let shortcutsOut = row.shortcuts;
      if (typeof shortcutsOut === 'string' && shortcutsOut) {
        try {
          const parsed = JSON.parse(shortcutsOut);
          if (!parsed || parsed.type !== 'leaftab_backup') {
            shortcutsOut = JSON.stringify({
              type: 'leaftab_backup',
              version: 4,
              timestamp: new Date().toISOString(),
              meta: { platform: 'cloud' },
              data: parsed,
            });
          }
        } catch {}
      }
      res.json({ 
        auth: true, 
        token: token, 
        username: row.username, 
        shortcuts: shortcutsOut,
        role: row.role || 'user',
        createdAt: row.created_at,
        privacyConsent: row.privacy_consent_ts ? !!row.privacy_consent : null
      });
    });
  });
});

// Update Privacy Consent
app.post('/user/privacy', authenticateToken, apiLimiter, (req, res) => {
  const userId = req.user.id;
  const { consent } = req.body;
  const value = consent ? 1 : 0;
  const sql = `UPDATE users SET privacy_consent = ?, privacy_consent_ts = CURRENT_TIMESTAMP WHERE id = ?`;
  db.run(sql, [value, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ ok: true, privacyConsent: !!value });
  });
});

app.post('/domains/report', authenticateToken, apiLimiter, (req, res) => {
  const userId = req.user.id;
  const { domains } = req.body || {};
  if (!Array.isArray(domains)) {
    return res.status(400).json({ error: 'Invalid domains format. Must be an array.' });
  }
  if (domains.length === 0) {
    return res.json({ ok: true, accepted: 0 });
  }
  if (domains.length > 500) {
    return res.status(400).json({ error: 'Too many domains' });
  }
  db.get(`SELECT privacy_consent FROM users WHERE id = ?`, [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || !row.privacy_consent) return res.status(403).json({ error: 'Privacy consent required' });
    const unique = new Set();
    for (const d of domains) {
      if (typeof d !== 'string') continue;
      const apex = registrableDomain(d);
      if (!apex) continue;
      unique.add(apex);
      if (unique.size >= 300) break;
    }
    if (unique.size === 0) return res.json({ ok: true, accepted: 0 });
    db.exec('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
      if (beginErr) return res.status(500).json({ error: beginErr.message });
      const upsert = db.prepare(`INSERT INTO domain_stats (registrable_domain, count, first_seen, last_seen)
                                 VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                                 ON CONFLICT(registrable_domain) DO UPDATE SET 
                                   count = count + 1,
                                   last_seen = CURRENT_TIMESTAMP`);
      try {
        for (const apex of unique) {
          upsert.run(apex);
        }
      } catch (e) {}
      upsert.finalize(() => {
        db.exec('COMMIT', (commitErr) => {
          if (commitErr) {
            return db.exec('ROLLBACK', () => res.status(500).json({ error: commitErr.message }));
          }
          return res.json({ ok: true, accepted: unique.size });
        });
      });
    });
  });
});

// Admin: Export aggregated domains (deduplicated registrable domains)
app.get('/admin/domains/export', authenticateToken, apiLimiter, (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const sql = `SELECT registrable_domain AS domain, count, first_seen, last_seen 
               FROM domain_stats 
               ORDER BY count DESC, last_seen DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json({ domains: rows || [] });
  });
});

app.get('/admin/stats', authenticateToken, apiLimiter, (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM users) AS users_total,
      (SELECT COUNT(*) FROM domain_stats) AS domains_unique
  `;
  db.get(sql, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ summary: row || {} });
  });
});

app.post('/admin/domains/rebuild', authenticateToken, apiLimiter, (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return res.status(410).json({ error: 'Deprecated' });
});
// Update Role Endpoint
app.post('/user/role', authenticateToken, apiLimiter, (req, res) => {
    const userId = req.user.id;
    const { role } = req.body;

    if (typeof role !== 'string' || role.length < 1 || role.length > 30) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    const sql = `UPDATE users SET role = ? WHERE id = ?`;
    db.run(sql, [role, userId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Role updated successfully' });
    });
});

// Get Shortcuts Endpoint
app.get('/user/shortcuts', authenticateToken, shortcutsLimiter, (req, res) => {  
    const userId = req.user.id;
    const sql = `SELECT shortcuts, role, created_at, shortcuts_updated_at, shortcuts_version FROM users WHERE id = ?`;    

    db.get(sql, [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }
        let shortcutsOut = row.shortcuts;
        if (typeof shortcutsOut === 'string' && shortcutsOut) {
          try {
            const parsed = JSON.parse(shortcutsOut);
            if (!parsed || parsed.type !== 'leaftab_backup') {
              shortcutsOut = JSON.stringify({
                type: 'leaftab_backup',
                version: 4,
                timestamp: new Date().toISOString(),
                meta: { platform: 'cloud' },
                data: parsed,
              });
              try {
                db.run(`UPDATE users SET shortcuts = ? WHERE id = ?`, [shortcutsOut, userId]);
              } catch {}
            }
          } catch {}
        }
        try {
            const version = Number(row.shortcuts_version || 0);
            res.setHeader('ETag', `W/"${version}"`);
            res.setHeader('X-Shortcuts-Version', String(version));
            if (row.shortcuts_updated_at) res.setHeader('Last-Modified', new Date(row.shortcuts_updated_at).toUTCString());
        } catch {}
        res.json({ 
            shortcuts: shortcutsOut,
            role: row.role,
            createdAt: row.created_at,
            updatedAt: row.shortcuts_updated_at,
            version: row.shortcuts_version
        });
    });
});

// Update Shortcuts Endpoint
app.post('/user/shortcuts', authenticateToken, shortcutsLimiter, (req, res) => { 
    const userId = req.user.id;
    const { shortcuts, expectedUpdatedAt, expectedVersion, force, syncMode } = req.body; // Expecting JSON string or object

    let shortcutsStr;
    try {
        if (typeof shortcuts === 'object' && shortcuts !== null) {
            shortcutsStr = JSON.stringify(shortcuts);
        } else if (typeof shortcuts === 'string') {
            // Validate if it is parseable JSON
            JSON.parse(shortcuts);
            shortcutsStr = shortcuts;
        } else {
            return res.status(400).json({ error: 'Invalid shortcuts format. Must be a JSON object or string.' });
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON string in shortcuts.' });
    }

    let normalizedShortcutsStr = shortcutsStr;
    try {
      const parsed = JSON.parse(shortcutsStr);
      if (!parsed || parsed.type !== 'leaftab_backup') {
        normalizedShortcutsStr = JSON.stringify({
          type: 'leaftab_backup',
          version: 4,
          timestamp: new Date().toISOString(),
          meta: { platform: 'cloud' },
          data: parsed,
        });
      }
    } catch {}

    const incomingExpected = expectedUpdatedAt || req.headers['if-unmodified-since'] || null;
    let incomingVersion = (expectedVersion !== undefined ? expectedVersion : undefined);
    const headerIfMatch = req.headers['if-match'];
    if (incomingVersion === undefined && headerIfMatch && /^W\/\"(\d+)\"$|^\"(\d+)\"$/.test(headerIfMatch)) {
        const m = headerIfMatch.match(/^W\/\"(\d+)\"$|^\"(\d+)\"$/);
        const val = m[1] || m[2];
        if (val) incomingVersion = parseInt(val, 10);
    }
    const isAdmin = isAdminRequest(req);
    if (force && isAdmin) {
        const updateSql = `UPDATE users SET shortcuts = ?, shortcuts_updated_at = CURRENT_TIMESTAMP, shortcuts_version = shortcuts_version + 1 WHERE id = ?`; 
        db.run(updateSql, [normalizedShortcutsStr, userId], function(err) {        
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            db.get(`SELECT shortcuts_updated_at, shortcuts_version FROM users WHERE id = ?`, [userId], (e2, row2) => {
                if (!e2 && row2) {
                    try {
                        const v = Number(row2.shortcuts_version || 0);
                        res.setHeader('ETag', `W/"${v}"`);
                        res.setHeader('X-Shortcuts-Version', String(v));
                        if (row2.shortcuts_updated_at) res.setHeader('Last-Modified', new Date(row2.shortcuts_updated_at).toUTCString());
                    } catch {}
                }
                return res.json({ message: 'Shortcuts updated successfully', version: row2?.shortcuts_version, updatedAt: row2?.shortcuts_updated_at });
            });
        });
    } else if (syncMode === 'prefer_local') {
        const updateSql = `UPDATE users SET shortcuts = ?, shortcuts_updated_at = CURRENT_TIMESTAMP, shortcuts_version = shortcuts_version + 1 WHERE id = ?`;
        db.run(updateSql, [normalizedShortcutsStr, userId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            db.get(`SELECT shortcuts_updated_at, shortcuts_version FROM users WHERE id = ?`, [userId], (e2, row2) => {
                if (!e2 && row2) {
                    try {
                        const v = Number(row2.shortcuts_version || 0);
                        res.setHeader('ETag', `W/"${v}"`);
                        res.setHeader('X-Shortcuts-Version', String(v));
                        if (row2.shortcuts_updated_at) res.setHeader('Last-Modified', new Date(row2.shortcuts_updated_at).toUTCString());
                    } catch {}
                }
                return res.json({ message: 'Shortcuts updated successfully', version: row2?.shortcuts_version, updatedAt: row2?.shortcuts_updated_at, mode: 'prefer_local' });
            });
        });
    } else {
        let params;
        let updateSql;
        if (incomingVersion !== undefined) {
            updateSql = `UPDATE users 
                         SET shortcuts = ?, shortcuts_updated_at = CURRENT_TIMESTAMP, shortcuts_version = shortcuts_version + 1
                         WHERE id = ? AND shortcuts_version = ?`;
            params = [normalizedShortcutsStr, userId, incomingVersion];
        } else {
            updateSql = `UPDATE users 
                         SET shortcuts = ?, shortcuts_updated_at = CURRENT_TIMESTAMP, shortcuts_version = shortcuts_version + 1
                         WHERE id = ? AND (shortcuts_updated_at = ? OR ? IS NULL)`;
            params = [normalizedShortcutsStr, userId, incomingExpected, incomingExpected];
        }
        db.run(updateSql, params, function(err) {        
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(409).json({ 
                    error: 'Conflict: shortcuts have been modified by another update'
                });
            }
            db.get(`SELECT shortcuts_updated_at, shortcuts_version FROM users WHERE id = ?`, [userId], (e2, row2) => {
                if (!e2 && row2) {
                    try {
                        const v = Number(row2.shortcuts_version || 0);
                        res.setHeader('ETag', `W/"${v}"`);
                        res.setHeader('X-Shortcuts-Version', String(v));
                        if (row2.shortcuts_updated_at) res.setHeader('Last-Modified', new Date(row2.shortcuts_updated_at).toUTCString());
                    } catch {}
                }
                return res.json({ message: 'Shortcuts updated successfully', version: row2?.shortcuts_version, updatedAt: row2?.shortcuts_updated_at });
            });
        });
    }
});

// Basic Health Check
app.get('/', (req, res) => {
  res.send('Auth Server is running');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
