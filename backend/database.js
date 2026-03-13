const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'winner_store.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.serialize(() => {
      initializeSchema();
    });
  }
});

function initializeSchema() {
  db.serialize(() => {
    // 1. PRODUCTS TABLE
    // id: primary key (string, like 'P001')
    // name, price, category, image, etc.
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT,
      image TEXT,
      badge TEXT,
      badgeType TEXT,
      oldPrice REAL
    )`);

    // 2. STOCK TABLE (Relational stock per size)
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
      product_id TEXT,
      size TEXT,
      qty INTEGER DEFAULT 0,
      PRIMARY KEY (product_id, size),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // 3. SALES TABLE
    db.run(`CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      vendor TEXT,
      client TEXT,
      method TEXT,
      total REAL NOT NULL
    )`);

    // 4. SALE ITEMS TABLE
    db.run(`CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id TEXT,
      product_name TEXT,
      qty INTEGER,
      price REAL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )`);
  });
}

module.exports = db;
