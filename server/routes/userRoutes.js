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

const attachShortcutsHeaders = (res, row) => {
  try {
    const version = Number(row.shortcuts_version || 0);
    res.setHeader('ETag', `W/"${version}"`);
    res.setHeader('X-Shortcuts-Version', String(version));
    if (row.shortcuts_updated_at) {
      res.setHeader('Last-Modified', new Date(row.shortcuts_updated_at).toUTCString());
    }
  } catch {}
};

const registerUserRoutes = ({
  app,
  db,
  apiLimiter,
  shortcutsLimiter,
  authenticateToken,
  isAdminRequest,
}) => {
  // Update Privacy Consent
  app.post('/user/privacy', authenticateToken, apiLimiter, (req, res) => {
    const userId = req.user.id;
    const { consent } = req.body;
    const value = consent ? 1 : 0;
    const sql = 'UPDATE users SET privacy_consent = ?, privacy_consent_ts = CURRENT_TIMESTAMP WHERE id = ?';
    db.run(sql, [value, userId], function runUpdatePrivacy(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ ok: true, privacyConsent: !!value });
    });
  });

  // Update Role Endpoint
  app.post('/user/role', authenticateToken, apiLimiter, (req, res) => {
    const userId = req.user.id;
    const { role } = req.body;

    if (typeof role !== 'string' || role.length < 1 || role.length > 30) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const sql = 'UPDATE users SET role = ? WHERE id = ?';
    db.run(sql, [role, userId], function runUpdateRole(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Role updated successfully' });
    });
  });

  // Get Shortcuts Endpoint
  app.get('/user/shortcuts', authenticateToken, shortcutsLimiter, (req, res) => {
    const userId = req.user.id;
    const sql = 'SELECT shortcuts, role, created_at, shortcuts_updated_at, shortcuts_version FROM users WHERE id = ?';

    db.get(sql, [userId], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'User not found' });
      }
      const shortcutsOut = normalizeShortcutsPayload(row.shortcuts);
      if (shortcutsOut !== row.shortcuts) {
        try {
          db.run('UPDATE users SET shortcuts = ? WHERE id = ?', [shortcutsOut, userId]);
        } catch {}
      }
      attachShortcutsHeaders(res, row);
      res.json({
        shortcuts: shortcutsOut,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.shortcuts_updated_at,
        version: row.shortcuts_version,
      });
    });
  });

  // Update Shortcuts Endpoint
  app.post('/user/shortcuts', authenticateToken, shortcutsLimiter, (req, res) => {
    const userId = req.user.id;
    const {
      shortcuts,
      expectedUpdatedAt,
      expectedVersion,
      force,
      syncMode,
    } = req.body; // Expecting JSON string or object

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
      const updateSql = 'UPDATE users SET shortcuts = ?, shortcuts_updated_at = CURRENT_TIMESTAMP, shortcuts_version = shortcuts_version + 1 WHERE id = ?';
      db.run(updateSql, [normalizedShortcutsStr, userId], function runForceUpdate(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        db.get('SELECT shortcuts_updated_at, shortcuts_version FROM users WHERE id = ?', [userId], (e2, row2) => {
          if (!e2 && row2) attachShortcutsHeaders(res, row2);
          return res.json({
            message: 'Shortcuts updated successfully',
            version: row2?.shortcuts_version,
            updatedAt: row2?.shortcuts_updated_at,
          });
        });
      });
    } else if (syncMode === 'prefer_local') {
      const updateSql = 'UPDATE users SET shortcuts = ?, shortcuts_updated_at = CURRENT_TIMESTAMP, shortcuts_version = shortcuts_version + 1 WHERE id = ?';
      db.run(updateSql, [normalizedShortcutsStr, userId], function runPreferLocalUpdate(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        db.get('SELECT shortcuts_updated_at, shortcuts_version FROM users WHERE id = ?', [userId], (e2, row2) => {
          if (!e2 && row2) attachShortcutsHeaders(res, row2);
          return res.json({
            message: 'Shortcuts updated successfully',
            version: row2?.shortcuts_version,
            updatedAt: row2?.shortcuts_updated_at,
            mode: 'prefer_local',
          });
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
      db.run(updateSql, params, function runConditionalUpdate(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(409).json({
            error: 'Conflict: shortcuts have been modified by another update',
          });
        }
        db.get('SELECT shortcuts_updated_at, shortcuts_version FROM users WHERE id = ?', [userId], (e2, row2) => {
          if (!e2 && row2) attachShortcutsHeaders(res, row2);
          return res.json({
            message: 'Shortcuts updated successfully',
            version: row2?.shortcuts_version,
            updatedAt: row2?.shortcuts_updated_at,
          });
        });
      });
    }
  });
};

module.exports = {
  registerUserRoutes,
};
