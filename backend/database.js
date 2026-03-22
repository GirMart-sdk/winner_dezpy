/* ═══════════════════════════════════════════════════════════
   WINNER STORE — database.js
   Schema completo y sincronizado con server.js + admin-panel
   ═══════════════════════════════════════════════════════════ */
'use strict';

const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const dbPath = path.resolve(__dirname, 'winner_store.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar con la BD:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado a SQLite:', dbPath);
  db.run('PRAGMA journal_mode = WAL;');   // mejor concurrencia
  db.run('PRAGMA foreign_keys = ON;');   // integridad referencial
  db.serialize(initializeSchema);
});

function initializeSchema() {
  /* ── PRODUCTS ──────────────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      price       REAL NOT NULL,
      oldPrice    REAL,
      cost        REAL    DEFAULT 0,
      category    TEXT,
      image       TEXT,
      badge       TEXT,
      badgeType   TEXT,
      sku         TEXT    UNIQUE,
      description TEXT
    )
  `);

  /* ── INVENTORY (stock por talla) ───────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      product_id  TEXT    NOT NULL,
      size        TEXT    NOT NULL,
      qty         INTEGER DEFAULT 0,
      PRIMARY KEY (product_id, size),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  /* ── SALES ─────────────────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id          TEXT    PRIMARY KEY,
      timestamp   TEXT    NOT NULL,
      vendor      TEXT    DEFAULT 'Vendedor',
      client      TEXT    DEFAULT '—',
      method      TEXT,
      channel     TEXT    DEFAULT 'fisica',
      subtotal    REAL    DEFAULT 0,
      discount    REAL    DEFAULT 0,
      total       REAL    NOT NULL
    )
  `);

  /* ── SALE ITEMS ────────────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id       TEXT    NOT NULL,
      product_name  TEXT,
      qty           INTEGER DEFAULT 1,
      price         REAL    DEFAULT 0,
      size          TEXT    DEFAULT 'U',
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
  `);

  /* ── Migraciones seguras (ALTER TABLE IF NOT EXISTS column) */
  const migrations = [
    { table: 'products', col: 'cost',        def: 'REAL DEFAULT 0' },
    { table: 'products', col: 'sku',         def: 'TEXT' },
    { table: 'products', col: 'description', def: 'TEXT' },
    { table: 'sales',    col: 'channel',     def: "TEXT DEFAULT 'fisica'" },
    { table: 'sales',    col: 'subtotal',    def: 'REAL DEFAULT 0' },
    { table: 'sales',    col: 'discount',    def: 'REAL DEFAULT 0' },
    { table: 'sale_items', col: 'size',      def: "TEXT DEFAULT 'U'" },
  ];

  migrations.forEach(({ table, col, def }) => {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`, (err) => {
      // Ignorar error "duplicate column" — es el comportamiento esperado
      if (err && !err.message.includes('duplicate column')) {
        console.warn(`⚠ Migración ${table}.${col}:`, err.message);
      }
    });
  });
}

module.exports = db;
