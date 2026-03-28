/* ═══════════════════════════════════════════════════════════
   WINNER STORE — database.js
   ✅ SQLite robusto con mejor manejo de errores
   Schema completo y sincronizado con server.js + admin-panel
   ═══════════════════════════════════════════════════════════ */
'use strict';

const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const dbPath = path.resolve(__dirname, process.env.DB_PATH || 'winner_store.db');

console.log('📦 Inicializando BD SQLite...');
console.log('   Ruta:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error fatal al conectar con la BD:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado a SQLite:', dbPath);
  
  // Optimizaciones de rendimiento
  db.run('PRAGMA journal_mode = WAL;', (err) => {
    if (err) console.error('⚠️  No se pudo activar WAL:', err.message);
    else console.log('✅ WAL mode activado (mejor concurrencia)');
  });
  
  db.run('PRAGMA foreign_keys = ON;', (err) => {
    if (err) console.error('⚠️  No se pudo activar foreign keys:', err.message);
    else console.log('✅ Foreign keys activadas');
  });

  db.run('PRAGMA synchronous = NORMAL;', (err) => {
    if (err) console.error('⚠️  No se pudo ajustar synchronous:', err.message);
    else console.log('✅ Synchronous = NORMAL (rendimiento equilibrado)');
  });

  initializeSchema();
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
      description TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Error creating products table:', err.message);
    else console.log('✅ Tabla products lista');
  });

  /* ── INVENTORY (stock por talla) ───────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      product_id  TEXT    NOT NULL,
      size        TEXT    NOT NULL,
      qty         INTEGER DEFAULT 0,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_id, size),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating inventory table:', err.message);
    else console.log('✅ Tabla inventory lista');
  });

  /* ── SALES (Ventas) ────────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id          TEXT PRIMARY KEY,
      timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
      channel     TEXT,
      vendor      TEXT,
      client      TEXT,
      method      TEXT,
      subtotal    REAL DEFAULT 0,
      discount    REAL DEFAULT 0,
      total       REAL NOT NULL,
      items       TEXT
    )
  `, (err) => {
    if (err) console.error('❌ Error creating sales table:', err.message);
    else console.log('✅ Tabla sales lista');
  });

  /* ── SALE ITEMS ──────────────────────────────────────────– */
  db.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id     TEXT NOT NULL,
      product_name TEXT NOT NULL,
      qty         INTEGER NOT NULL,
      price       REAL NOT NULL,
      size        TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating sale_items table:', err.message);
    else console.log('✅ Tabla sale_items lista');
  });

  /* ── SESSIONS (Optional tracking) ──────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token       TEXT PRIMARY KEY,
      user        TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at  DATETIME NOT NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating sessions table:', err.message);
    else console.log('✅ Tabla sessions lista');
  });

  console.log('✅ Schema inicializado correctamente');
}

module.exports = db;

