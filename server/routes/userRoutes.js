const {
  buildCommit,
  buildHead,
  isLockActive,
  normalizeCommit,
  normalizeFileStore,
  normalizeHead,
  normalizeLockRow,
  normalizeSnapshot,
  normalizeSummary,
  normalizeStateRow,
  sameStateContent,
} = require('../lib/leaftabSyncState');

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

const attachLeafTabSyncHeaders = (res, row) => {
  try {
    const version = Number(row.leaftab_sync_version || 0);
    res.setHeader('ETag', `W/"${version}"`);
    res.setHeader('X-LeafTab-Sync-Version', String(version));
    if (row.leaftab_sync_updated_at) {
      res.setHeader('Last-Modified', new Date(row.leaftab_sync_updated_at).toUTCString());
    }
  } catch {}
};

const registerUserRoutes = ({
  app,
  db,
  apiLimiter,
  shortcutsLimiter,
  syncIpLimiter,
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
  app.get('/user/shortcuts', authenticateToken, syncIpLimiter, shortcutsLimiter, (req, res) => {
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
  app.post('/user/shortcuts', authenticateToken, syncIpLimiter, shortcutsLimiter, (req, res) => {
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

  app.get('/user/leaftab-sync/state', authenticateToken, syncIpLimiter, shortcutsLimiter, (req, res) => {
    const userId = req.user.id;
    const sql = `SELECT leaftab_sync_head, leaftab_sync_commit, leaftab_sync_snapshot, leaftab_sync_updated_at, leaftab_sync_version
                 FROM users WHERE id = ?`;

    db.get(sql, [userId], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'User not found' });
      }

      const state = normalizeStateRow(row);
      if (!state.head?.commitId || !state.commit || (!state.snapshot && !state.fileStore)) {
        return res.status(404).json({ error: 'LeafTab sync state not found' });
      }

      attachLeafTabSyncHeaders(res, row);
      const response = {
        head: state.head,
        commit: state.commit,
        updatedAt: state.updatedAt,
        version: state.version,
      };
      if (state.snapshot) {
        response.snapshot = state.snapshot;
      } else {
        response.storage = 'file-store';
      }
      return res.json(response);
    });
  });

  app.post('/user/leaftab-sync/files/read', authenticateToken, syncIpLimiter, shortcutsLimiter, (req, res) => {
    const userId = req.user.id;
    const paths = Array.isArray(req.body?.paths)
      ? req.body.paths.filter((entry) => typeof entry === 'string' && entry.trim()).map((entry) => entry.trim())
      : [];

    if (!paths.length) {
      return res.json({ files: {} });
    }

    db.get(
      `SELECT leaftab_sync_head, leaftab_sync_commit, leaftab_sync_snapshot, leaftab_sync_updated_at, leaftab_sync_version
       FROM users WHERE id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!row) {
          return res.status(404).json({ error: 'User not found' });
        }

        const state = normalizeStateRow(row);
        if (!state.head?.commitId || !state.commit || !state.fileStore) {
          return res.status(404).json({ error: 'LeafTab sync file store not found' });
        }

        attachLeafTabSyncHeaders(res, row);
        return res.json({
          files: Object.fromEntries(
            paths.map((path) => [path, typeof state.fileStore.files[path] === 'string' ? state.fileStore.files[path] : null]),
          ),
        });
      },
    );
  });

  app.post('/user/leaftab-sync/lock', authenticateToken, syncIpLimiter, shortcutsLimiter, (req, res) => {
    const userId = req.user.id;
    const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId.trim() : '';
    const ttlMsRaw = Number(req.body?.ttlMs);
    const ttlMs = Number.isFinite(ttlMsRaw)
      ? Math.max(15 * 1000, Math.min(10 * 60 * 1000, Math.round(ttlMsRaw)))
      : 2 * 60 * 1000;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    db.get(
      `SELECT leaftab_sync_lock_device_id, leaftab_sync_lock_acquired_at, leaftab_sync_lock_expires_at
       FROM users WHERE id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!row) {
          return res.status(404).json({ error: 'User not found' });
        }

        const currentLock = normalizeLockRow(row);
        if (isLockActive(currentLock) && currentLock.deviceId !== deviceId) {
          return res.status(409).json({
            error: 'LeafTab sync lock is held by another device',
            lock: currentLock,
          });
        }

        const now = new Date();
        const nextLock = {
          deviceId,
          acquiredAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
        };

        db.run(
          `UPDATE users
           SET leaftab_sync_lock_device_id = ?, leaftab_sync_lock_acquired_at = ?, leaftab_sync_lock_expires_at = ?
           WHERE id = ?`,
          [nextLock.deviceId, nextLock.acquiredAt, nextLock.expiresAt, userId],
          function runAcquireLock(updateErr) {
            if (updateErr) {
              return res.status(500).json({ error: updateErr.message });
            }
            return res.json(nextLock);
          },
        );
      },
    );
  });

  app.delete('/user/leaftab-sync/lock', authenticateToken, syncIpLimiter, shortcutsLimiter, (req, res) => {
    const userId = req.user.id;
    db.run(
      `UPDATE users
       SET leaftab_sync_lock_device_id = NULL,
           leaftab_sync_lock_acquired_at = NULL,
           leaftab_sync_lock_expires_at = NULL
       WHERE id = ?`,
      [userId],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        return res.status(204).end();
      },
    );
  });

  app.post('/user/leaftab-sync/state', authenticateToken, syncIpLimiter, shortcutsLimiter, (req, res) => {
    const userId = req.user.id;
    const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId.trim() : '';
    const parentCommitId = typeof req.body?.parentCommitId === 'string' && req.body.parentCommitId.trim()
      ? req.body.parentCommitId.trim()
      : null;
    const createdAt = typeof req.body?.createdAt === 'string' && req.body.createdAt.trim()
      ? req.body.createdAt.trim()
      : new Date().toISOString();
    const snapshot = normalizeSnapshot(req.body?.snapshot);
    const summary = normalizeSummary(req.body?.summary);

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    if (!snapshot) {
      return res.status(400).json({ error: 'snapshot is required' });
    }

    db.get(
      `SELECT leaftab_sync_head, leaftab_sync_commit, leaftab_sync_snapshot, leaftab_sync_updated_at, leaftab_sync_version,
              leaftab_sync_lock_device_id, leaftab_sync_lock_acquired_at, leaftab_sync_lock_expires_at
       FROM users WHERE id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!row) {
          return res.status(404).json({ error: 'User not found' });
        }

        const currentState = normalizeStateRow(row);
        const currentLock = normalizeLockRow(row);
        const incomingStatePayload = snapshot;
        const currentStatePayload = currentState.snapshot;
        if (isLockActive(currentLock) && currentLock.deviceId !== deviceId) {
          return res.status(409).json({
            error: 'LeafTab sync lock is held by another device',
            lock: currentLock,
          });
        }

        if (currentState.commit?.id && parentCommitId && currentState.commit.id !== parentCommitId) {
          return res.status(409).json({
            error: 'Conflict: remote commit changed',
            currentCommitId: currentState.commit.id,
          });
        }

        if (!parentCommitId && currentState.commit?.id && !sameStateContent(currentStatePayload, incomingStatePayload)) {
          return res.status(409).json({
            error: 'Conflict: parent commit required',
            currentCommitId: currentState.commit.id,
          });
        }

        const commit = buildCommit({
          snapshot,
          summary,
          deviceId,
          parentCommitId: currentState.commit?.id || parentCommitId,
          createdAt,
        });
        const head = buildHead(commit.id, commit.createdAt);

        db.run(
          `UPDATE users
           SET leaftab_sync_head = ?,
               leaftab_sync_commit = ?,
               leaftab_sync_snapshot = ?,
               leaftab_sync_updated_at = CURRENT_TIMESTAMP,
               leaftab_sync_version = leaftab_sync_version + 1
           WHERE id = ?`,
          [
            JSON.stringify(head),
            JSON.stringify(commit),
            JSON.stringify(incomingStatePayload),
            userId,
          ],
          function runWriteState(updateErr) {
            if (updateErr) {
              return res.status(500).json({ error: updateErr.message });
            }

            db.get(
              'SELECT leaftab_sync_updated_at, leaftab_sync_version FROM users WHERE id = ?',
              [userId],
              (readErr, updatedRow) => {
                if (!readErr && updatedRow) {
                  attachLeafTabSyncHeaders(res, updatedRow);
                }
                return res.json({
                  head,
                  commit,
                });
              },
            );
          },
        );
      },
    );
  });

  app.post('/user/leaftab-sync/files/write', authenticateToken, syncIpLimiter, shortcutsLimiter, (req, res) => {
    const userId = req.user.id;
    const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId.trim() : '';
    const parentCommitId = typeof req.body?.parentCommitId === 'string' && req.body.parentCommitId.trim()
      ? req.body.parentCommitId.trim()
      : null;
    const commit = normalizeCommit(req.body?.commit);
    const head = normalizeHead(req.body?.head);
    const rawFiles = req.body?.files && typeof req.body.files === 'object' && !Array.isArray(req.body.files)
      ? req.body.files
      : {};
    const files = Object.fromEntries(
      Object.entries(rawFiles)
        .filter(([path, content]) => typeof path === 'string' && typeof content === 'string')
        .map(([path, content]) => [path, content]),
    );

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    if (!commit || !head) {
      return res.status(400).json({ error: 'head and commit are required' });
    }
    if (commit.deviceId !== deviceId || head.commitId !== commit.id) {
      return res.status(400).json({ error: 'invalid head/commit payload' });
    }
    if (commit.encryption?.mode !== 'encrypted-sharded-v1' || !commit.encryption.metadata) {
      return res.status(400).json({ error: 'encrypted sharded commit is required' });
    }

    db.get(
      `SELECT leaftab_sync_head, leaftab_sync_commit, leaftab_sync_snapshot, leaftab_sync_updated_at, leaftab_sync_version,
              leaftab_sync_lock_device_id, leaftab_sync_lock_acquired_at, leaftab_sync_lock_expires_at
       FROM users WHERE id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!row) {
          return res.status(404).json({ error: 'User not found' });
        }

        const currentState = normalizeStateRow(row);
        const currentLock = normalizeLockRow(row);
        if (isLockActive(currentLock) && currentLock.deviceId !== deviceId) {
          return res.status(409).json({
            error: 'LeafTab sync lock is held by another device',
            lock: currentLock,
          });
        }

        if (currentState.commit?.id && parentCommitId && currentState.commit.id !== parentCommitId) {
          return res.status(409).json({
            error: 'Conflict: remote commit changed',
            currentCommitId: currentState.commit.id,
          });
        }

        if (!parentCommitId && currentState.commit?.id) {
          return res.status(409).json({
            error: 'Conflict: parent commit required',
            currentCommitId: currentState.commit.id,
          });
        }

        const currentFiles = currentState.fileStore?.files || {};
        const nextFileStore = normalizeFileStore({
          kind: 'leaftab-sync-file-store',
          version: 1,
          files: {
            ...currentFiles,
            ...files,
          },
        });

        db.run(
          `UPDATE users
           SET leaftab_sync_head = ?,
               leaftab_sync_commit = ?,
               leaftab_sync_snapshot = ?,
               leaftab_sync_updated_at = CURRENT_TIMESTAMP,
               leaftab_sync_version = leaftab_sync_version + 1
           WHERE id = ?`,
          [
            JSON.stringify(head),
            JSON.stringify(commit),
            JSON.stringify(nextFileStore),
            userId,
          ],
          function runWriteState(updateErr) {
            if (updateErr) {
              return res.status(500).json({ error: updateErr.message });
            }

            db.get(
              'SELECT leaftab_sync_updated_at, leaftab_sync_version FROM users WHERE id = ?',
              [userId],
              (readErr, updatedRow) => {
                if (!readErr && updatedRow) {
                  attachLeafTabSyncHeaders(res, updatedRow);
                }
                return res.json({
                  head,
                  commit,
                });
              },
            );
          },
        );
      },
    );
  });
};

module.exports = {
  registerUserRoutes,
};
