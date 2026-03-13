const registerDomainRoutes = ({
  app,
  db,
  apiLimiter,
  authenticateToken,
  isAdminRequest,
  registrableDomain,
}) => {
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
    db.get('SELECT privacy_consent FROM users WHERE id = ?', [userId], (err, row) => {
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
      const uniqueDomains = Array.from(unique);
      db.exec('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
        if (beginErr) return res.status(500).json({ error: beginErr.message });
        const insertUserDomain = db.prepare(`INSERT OR IGNORE INTO domain_user_stats
                                             (registrable_domain, user_id, first_seen, last_seen)
                                             VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
        const touchUserDomain = db.prepare(`UPDATE domain_user_stats
                                            SET last_seen = CURRENT_TIMESTAMP
                                            WHERE registrable_domain = ? AND user_id = ?`);
        const incrementDomainUsers = db.prepare(`INSERT INTO domain_stats
                                                 (registrable_domain, count, first_seen, last_seen)
                                                 VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                                                 ON CONFLICT(registrable_domain) DO UPDATE SET
                                                   count = count + 1,
                                                   last_seen = CURRENT_TIMESTAMP`);
        const touchDomain = db.prepare(`INSERT INTO domain_stats
                                        (registrable_domain, count, first_seen, last_seen)
                                        VALUES (?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                                        ON CONFLICT(registrable_domain) DO UPDATE SET
                                          last_seen = CURRENT_TIMESTAMP`);

        let finished = false;
        let newlyCounted = 0;

        const finalizeStatements = (cb) => {
          insertUserDomain.finalize(() => {
            touchUserDomain.finalize(() => {
              incrementDomainUsers.finalize(() => {
                touchDomain.finalize(() => cb());
              });
            });
          });
        };

        const failAndRollback = (errObj) => {
          if (finished) return;
          finished = true;
          finalizeStatements(() => {
            db.exec('ROLLBACK', () => res.status(500).json({ error: errObj.message || 'Transaction failed' }));
          });
        };

        const commitAndRespond = () => {
          if (finished) return;
          finished = true;
          finalizeStatements(() => {
            db.exec('COMMIT', (commitErr) => {
              if (commitErr) {
                return db.exec('ROLLBACK', () => res.status(500).json({ error: commitErr.message }));
              }
              return res.json({ ok: true, accepted: uniqueDomains.length, newlyCounted });
            });
          });
        };

        const processDomain = (index) => {
          if (index >= uniqueDomains.length) {
            return commitAndRespond();
          }
          const apex = uniqueDomains[index];
          insertUserDomain.run([apex, userId], function onInsertUserDomain(insertErr) {
            if (insertErr) return failAndRollback(insertErr);
            const isNewForUser = this && this.changes > 0;
            if (isNewForUser) {
              newlyCounted += 1;
              return incrementDomainUsers.run([apex], (incErr) => {
                if (incErr) return failAndRollback(incErr);
                return processDomain(index + 1);
              });
            }
            touchUserDomain.run([apex, userId], (touchUserErr) => {
              if (touchUserErr) return failAndRollback(touchUserErr);
              touchDomain.run([apex], (touchDomainErr) => {
                if (touchDomainErr) return failAndRollback(touchDomainErr);
                return processDomain(index + 1);
              });
            });
          });
        };

        processDomain(0);
      });
    });
  });

  // Admin: Export aggregated domains (deduplicated registrable domains)
  app.get('/admin/domains/export', authenticateToken, apiLimiter, (req, res) => {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const sql = `SELECT
                   registrable_domain AS domain,
                   COUNT(*) AS count,
                   MIN(first_seen) AS first_seen,
                   MAX(last_seen) AS last_seen
                 FROM domain_user_stats
                 GROUP BY registrable_domain
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
        (SELECT COUNT(DISTINCT registrable_domain) FROM domain_user_stats) AS domains_unique
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
};

module.exports = {
  registerDomainRoutes,
};
