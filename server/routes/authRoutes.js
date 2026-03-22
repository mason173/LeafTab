const svgCaptcha = require('svg-captcha');

const normalizeShortcutsPayload = (shortcutsValue) => {
  let shortcutsOut = shortcutsValue;
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
  return shortcutsOut;
};

const registerAuthRoutes = ({
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
}) => {
  // Captcha Endpoint
  app.get('/captcha', captchaLimiter, (req, res) => {
    const captcha = svgCaptcha.create({
      size: 4, // 4 chars
      ignoreChars: '0o1i', // ignore confusing chars
      noise: 2, // noise lines
      color: true, // color chars
      background: '#cc9966', // background color
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

    bcrypt.hash(password, bcryptRounds, (hashErr, hashedPassword) => {
      if (hashErr) {
        console.error('bcrypt hash failed:', hashErr.message);
        return res.status(500).json({ error: 'Failed to process password' });
      }

      const sql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
      db.run(sql, [username, hashedPassword, 'user'], function registerRun(err) {
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

    const sql = 'SELECT * FROM users WHERE username = ?';
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

        const token = jwt.sign({ id: row.id, username: row.username }, secretKey, {
          expiresIn: '30d', // 30 days
        });

        const shortcutsOut = normalizeShortcutsPayload(row.shortcuts);
        res.json({
          auth: true,
          token,
          username: row.username,
          shortcuts: shortcutsOut,
          role: row.role || 'user',
          createdAt: row.created_at,
          privacyConsent: row.privacy_consent_ts ? !!row.privacy_consent : null,
        });
      });
    });
  });
};

module.exports = {
  registerAuthRoutes,
};
