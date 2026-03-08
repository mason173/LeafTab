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
  // Begin transaction
  db.run("BEGIN TRANSACTION");

  // Delete all users
  db.run("DELETE FROM users", function(err) {
    if (err) {
      console.error('Error clearing users:', err.message);
      db.run("ROLLBACK");
      process.exit(1);
    }
    console.log(`Deleted ${this.changes} rows from users table.`);
  });

  // Reset auto-increment ID
  db.run("DELETE FROM sqlite_sequence WHERE name='users'", function(err) {
      if (err) {
          console.error('Error resetting sequence (non-fatal):', err.message);
      } else {
          console.log("Reset auto-increment counter.");
      }
  });

  db.run("COMMIT", (err) => {
      if (err) {
          console.error("Error committing:", err.message);
      } else {
          console.log("✅ All user data cleared successfully.");
      }
  });
});

db.close();
