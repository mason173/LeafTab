const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');
const { OAuth2Client } = require('google-auth-library');

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

const issueAuthResponse = ({ res, jwt, secretKey, row, isNewUser = false }) => {
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
    isNewUser,
  });
};

const sanitizeGoogleUsernameSeed = (value) => {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_.@]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized;
};

const buildGoogleBaseUsername = ({ payload, googleSub }) => {
  const email = String(payload?.email || '').trim().toLowerCase();
  const emailLocalPart = email.includes('@') ? email.split('@')[0] : '';
  const nameSeed = sanitizeGoogleUsernameSeed(payload?.name);
  const emailSeed = sanitizeGoogleUsernameSeed(emailLocalPart);
  const fallbackSeed = `google_${String(googleSub || '').slice(-10)}`.replace(/[^a-z0-9_]/g, '');
  const base = (nameSeed || emailSeed || fallbackSeed || 'google_user').slice(0, 46);
  return base.length >= 3 ? base : `google_${String(googleSub || '').slice(-8)}`;
};

const resolveAvailableUsername = ({ db, validateUsername, baseUsername, callback, suffix = 0 }) => {
  const suffixPart = suffix === 0 ? '' : `_${suffix}`;
  const baseMaxLength = Math.max(3, 50 - suffixPart.length);
  const candidate = `${baseUsername.slice(0, baseMaxLength)}${suffixPart}`.toLowerCase();

  if (!validateUsername(candidate)) {
    return callback(new Error('Failed to generate a valid username from Google profile'));
  }

  db.get('SELECT id FROM users WHERE username = ?', [candidate], (err, row) => {
    if (err) return callback(err);
    if (row) {
      if (suffix >= 9999) return callback(new Error('Unable to allocate username for Google account'));
      return resolveAvailableUsername({
        db,
        validateUsername,
        baseUsername,
        callback,
        suffix: suffix + 1,
      });
    }
    return callback(null, candidate);
  });
};

const attachGoogleIdentityToExistingUser = ({
  db,
  email,
  googleSub,
  callback,
}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    callback(null, null);
    return;
  }

  db.get(
    'SELECT * FROM users WHERE lower(username) = lower(?) LIMIT 1',
    [normalizedEmail],
    (lookupErr, existingUser) => {
      if (lookupErr) {
        callback(lookupErr);
        return;
      }
      if (!existingUser) {
        callback(null, null);
        return;
      }
      if (existingUser.google_sub && existingUser.google_sub !== googleSub) {
        callback(null, null);
        return;
      }

      db.run(
        `UPDATE users
         SET google_sub = ?,
             auth_provider = CASE
               WHEN auth_provider IS NULL OR auth_provider = '' THEN 'google'
               ELSE auth_provider
             END
         WHERE id = ? AND (google_sub IS NULL OR google_sub = '' OR google_sub = ?)`,
        [googleSub, existingUser.id, googleSub],
        (updateErr) => {
          if (updateErr) {
            callback(updateErr);
            return;
          }

          db.get('SELECT * FROM users WHERE id = ?', [existingUser.id], (readErr, linkedUser) => {
            if (readErr) {
              callback(readErr);
              return;
            }
            callback(null, linkedUser || null);
          });
        },
      );
    },
  );
};

const verifyGoogleIdentityToken = async ({
  googleOAuthClient,
  googleClientIds,
  idToken,
}) => {
  if (!googleOAuthClient || googleClientIds.length === 0) {
    const error = new Error('Google login is not enabled on this server');
    error.status = 503;
    throw error;
  }

  if (!idToken) {
    const error = new Error('Google ID token is required');
    error.status = 400;
    throw error;
  }

  let payload;
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience: googleClientIds,
    });
    payload = ticket.getPayload();
  } catch (verifyErr) {
    console.error('Google token verification failed:', verifyErr?.message || verifyErr);
    const error = new Error('Invalid Google ID token');
    error.status = 401;
    throw error;
  }

  const googleSub = String(payload?.sub || '').trim();
  if (!googleSub) {
    const error = new Error('Google sign-in is missing a stable user id');
    error.status = 400;
    throw error;
  }

  return {
    payload,
    googleSub,
    googleEmail: String(payload?.email || '').trim().toLowerCase(),
  };
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
  googleOAuthClientIds = [],
  authenticateToken,
}) => {
  const googleClientIds = googleOAuthClientIds.map((value) => String(value || '').trim()).filter(Boolean);
  const googleOAuthClient = googleClientIds.length > 0 ? new OAuth2Client() : null;

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
        return issueAuthResponse({
          res,
          jwt,
          secretKey,
          row,
          isNewUser: false,
        });
      });
    });
  });

  app.post('/auth/google', authLimiter, async (req, res) => {
    let payload;
    let googleSub;
    let googleEmail;
    try {
      const verified = await verifyGoogleIdentityToken({
        googleOAuthClient,
        googleClientIds,
        idToken: typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : '',
      });
      payload = verified.payload;
      googleSub = verified.googleSub;
      googleEmail = verified.googleEmail;
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.message });
    }

    db.get('SELECT * FROM users WHERE google_sub = ?', [googleSub], (lookupErr, existingUser) => {
      if (lookupErr) {
        return res.status(500).json({ error: lookupErr.message });
      }

      if (existingUser) {
        return issueAuthResponse({
          res,
          jwt,
          secretKey,
          row: existingUser,
          isNewUser: false,
        });
      }

      attachGoogleIdentityToExistingUser({
        db,
        email: googleEmail,
        googleSub,
        callback: (attachErr, linkedUser) => {
          if (attachErr) {
            return res.status(500).json({ error: attachErr.message });
          }

          if (linkedUser) {
            return issueAuthResponse({
              res,
              jwt,
              secretKey,
              row: linkedUser,
              isNewUser: false,
            });
          }

          const baseUsername = buildGoogleBaseUsername({ payload, googleSub });
          resolveAvailableUsername({
            db,
            validateUsername,
            baseUsername,
            callback: (usernameErr, availableUsername) => {
              if (usernameErr || !availableUsername) {
                console.error('Failed to resolve username for Google account:', usernameErr?.message || usernameErr);
                return res.status(500).json({ error: 'Failed to create account from Google profile' });
              }

              const randomPassword = crypto.randomBytes(32).toString('hex');
              bcrypt.hash(randomPassword, bcryptRounds, (hashErr, hashedPassword) => {
                if (hashErr) {
                  console.error('bcrypt hash failed for Google account:', hashErr.message);
                  return res.status(500).json({ error: 'Failed to process account credentials' });
                }

                const insertSql = 'INSERT INTO users (username, password, role, auth_provider, google_sub) VALUES (?, ?, ?, ?, ?)';
                db.run(insertSql, [availableUsername, hashedPassword, 'user', 'google', googleSub], function insertGoogleUser(insertErr) {
                  if (insertErr) {
                    if (insertErr.message.includes('UNIQUE constraint failed: users.google_sub')) {
                      return db.get('SELECT * FROM users WHERE google_sub = ?', [googleSub], (raceLookupErr, raceUser) => {
                        if (raceLookupErr) return res.status(500).json({ error: raceLookupErr.message });
                        if (!raceUser) return res.status(500).json({ error: 'Failed to finish Google login' });
                        return issueAuthResponse({
                          res,
                          jwt,
                          secretKey,
                          row: raceUser,
                          isNewUser: false,
                        });
                      });
                    }
                    if (insertErr.message.includes('UNIQUE constraint failed: users.username')) {
                      return res.status(409).json({ error: 'Username collision, please retry Google login' });
                    }
                    if (insertErr.message.includes('database is locked')) {
                      return res.status(503).json({ error: 'Database is busy, please retry in a moment.' });
                    }
                    return res.status(500).json({ error: insertErr.message });
                  }

                  return db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (createdErr, createdUser) => {
                    if (createdErr) {
                      return res.status(500).json({ error: createdErr.message });
                    }
                    if (!createdUser) {
                      return res.status(500).json({ error: 'Failed to load new Google account' });
                    }
                    return issueAuthResponse({
                      res,
                      jwt,
                      secretKey,
                      row: createdUser,
                      isNewUser: true,
                    });
                  });
                });
              });
            },
          });
        },
      });
    });
  });

  app.post('/auth/google/link', authenticateToken, authLimiter, async (req, res) => {
    let googleSub;
    try {
      const verified = await verifyGoogleIdentityToken({
        googleOAuthClient,
        googleClientIds,
        idToken: typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : '',
      });
      googleSub = verified.googleSub;
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.message });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [userId], (currentErr, currentUser) => {
      if (currentErr) {
        return res.status(500).json({ error: currentErr.message });
      }
      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      db.get('SELECT * FROM users WHERE google_sub = ?', [googleSub], (lookupErr, existingUser) => {
        if (lookupErr) {
          return res.status(500).json({ error: lookupErr.message });
        }

        if (existingUser && existingUser.id !== currentUser.id) {
          return res.status(409).json({ error: 'Google account is already linked to another user' });
        }

        if (existingUser && existingUser.id === currentUser.id) {
          return res.json({
            ok: true,
            username: currentUser.username,
            linked: true,
            alreadyLinked: true,
          });
        }

        db.run(
          'UPDATE users SET google_sub = ? WHERE id = ?',
          [googleSub, currentUser.id],
          (updateErr) => {
            if (updateErr) {
              if (updateErr.message.includes('UNIQUE constraint failed: users.google_sub')) {
                return res.status(409).json({ error: 'Google account is already linked to another user' });
              }
              return res.status(500).json({ error: updateErr.message });
            }

            return res.json({
              ok: true,
              username: currentUser.username,
              linked: true,
              alreadyLinked: false,
            });
          },
        );
      });
    });
  });
};

module.exports = {
  registerAuthRoutes,
};
