const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  db.run(`CREATE TABLE IF NOT EXISTS domain_stats (
    registrable_domain TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS domain_user_stats (
    registrable_domain TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (registrable_domain, user_id)
  )`);

  db.run('DELETE FROM domain_user_stats', function(err) {
    if (err) {
      console.error('Error clearing domain_user_stats:', err.message);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log(`Deleted ${this.changes} rows from domain_user_stats.`);
  });

  db.run('DELETE FROM domain_stats', function(err) {
    if (err) {
      console.error('Error clearing domain_stats:', err.message);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log(`Deleted ${this.changes} rows from domain_stats.`);
  });

  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing:', err.message);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('✅ Domain stats cleared successfully.');
    db.close();
  });
});
