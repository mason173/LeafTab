const sqlite3 = require('sqlite3').verbose();

const initializeDatabase = (dbPath) => {
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
          )`, (createErr) => {
        if (createErr) {
          console.error('Error creating table', createErr.message);
        } else {
          // Migration: Check if shortcuts column exists, if not add it
          db.all('PRAGMA table_info(users)', (tableInfoErr, rows) => {
            if (tableInfoErr) {
              console.error('Error getting table info', tableInfoErr);
              return;
            }
            const hasShortcuts = rows.some((row) => row.name === 'shortcuts');
            if (!hasShortcuts) {
              console.log('Adding shortcuts column to users table...');
              db.run('ALTER TABLE users ADD COLUMN shortcuts TEXT', (alterErr) => {
                if (alterErr) console.error('Error adding shortcuts column', alterErr);
                else console.log('Shortcuts column added successfully');
              });
            }

            // Migration: Check if role column exists, if not add it
            const hasRole = rows.some((row) => row.name === 'role');
            if (!hasRole) {
              console.log('Adding role column to users table...');
              db.run('ALTER TABLE users ADD COLUMN role TEXT', (alterErr) => {
                if (alterErr) console.error('Error adding role column', alterErr);
                else console.log('Role column added successfully');
              });
            }

            // Migration: shortcuts_updated_at timestamp
            const hasShortcutsUpdatedAt = rows.some((row) => row.name === 'shortcuts_updated_at');
            if (!hasShortcutsUpdatedAt) {
              console.log('Adding shortcuts_updated_at column to users table...');
              db.run('ALTER TABLE users ADD COLUMN shortcuts_updated_at DATETIME', (alterErr) => {
                if (alterErr) console.error('Error adding shortcuts_updated_at column', alterErr);
                else console.log('shortcuts_updated_at column added successfully');
              });
            }

            // Migration: shortcuts_version for optimistic concurrency
            const hasShortcutsVersion = rows.some((row) => row.name === 'shortcuts_version');
            if (!hasShortcutsVersion) {
              console.log('Adding shortcuts_version column to users table...');
              db.run('ALTER TABLE users ADD COLUMN shortcuts_version INTEGER DEFAULT 0', (alterErr) => {
                if (alterErr) console.error('Error adding shortcuts_version column', alterErr);
                else console.log('shortcuts_version column added successfully');
              });
            }
            const hasPrivacyConsent = rows.some((row) => row.name === 'privacy_consent');
            if (!hasPrivacyConsent) {
              console.log('Adding privacy_consent column to users table...');
              db.run('ALTER TABLE users ADD COLUMN privacy_consent INTEGER DEFAULT 0', (alterErr) => {
                if (alterErr) console.error('Error adding privacy_consent column', alterErr);
                else console.log('privacy_consent column added successfully');
              });
            }
            const hasPrivacyTs = rows.some((row) => row.name === 'privacy_consent_ts');
            if (!hasPrivacyTs) {
              console.log('Adding privacy_consent_ts column to users table...');
              db.run('ALTER TABLE users ADD COLUMN privacy_consent_ts DATETIME', (alterErr) => {
                if (alterErr) console.error('Error adding privacy_consent_ts column', alterErr);
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

  // Unique user-domain mapping table (one row per user per registrable domain)
  db.run(`CREATE TABLE IF NOT EXISTS domain_user_stats (
    registrable_domain TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (registrable_domain, user_id)
  )`, (err) => {
    if (err) console.error('Error creating domain_user_stats table', err.message);
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_domain_user_stats_user_id
          ON domain_user_stats (user_id)`, (err) => {
    if (err) console.error('Error creating idx_domain_user_stats_user_id', err.message);
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_domain_user_stats_domain
          ON domain_user_stats (registrable_domain)`, (err) => {
    if (err) console.error('Error creating idx_domain_user_stats_domain', err.message);
  });

  return db;
};

module.exports = {
  initializeDatabase,
};
