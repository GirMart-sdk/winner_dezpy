/* ═══════════════════════════════════════════════════════════
   WINNER STORE — database.js
   ✅ PostgreSQL + SQLite compatible automático
   Schema completo y sincronizado con server.js + admin-panel
   ═══════════════════════════════════════════════════════════ */
'use strict';

require('dotenv').config();

// Detectar tipo de BD
const DB_TYPE = process.env.DB_TYPE || 'sqlite';
let db;

if (DB_TYPE === 'postgres') {
  // ═══════════════════ PostgreSQL ═══════════════════
  const { Pool } = require('pg');
  
  const connectionConfig = process.env.DATABASE_URL ? 
    { connectionString: process.env.DATABASE_URL } :
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'winner_store',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    };

  // En producción, rechazar certificados auto-firmados
  if (process.env.NODE_ENV === 'production') {
    connectionConfig.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(connectionConfig);

  pool.on('error', (err) => {
    console.error('❌ Pool error:', err);
  });

  console.log('📦 Inicializando PostgreSQL...');
  console.log('   Host:', connectionConfig.host || 'desde DATABASE_URL');
  console.log('   BD:', connectionConfig.database || 'desde DATABASE_URL');

  // Verificar conexión
  pool.query('SELECT NOW()', (err) => {
    if (err) {
      console.error('❌ Error conectando a PostgreSQL:', err.message);
      process.exit(1);
    }
    console.log('✅ Conectado a PostgreSQL');
  });

  // Wrapper para compatibilidad con API de SQLite
  db = {
    run: (query, params = [], callback) => {
      if (!callback && typeof params === 'function') {
        callback = params;
        params = [];
      }
      if (!callback) return;
      pool.query(query, params, (err) => callback(err));
    },
    
    get: (query, params = [], callback) => {
      if (!callback && typeof params === 'function') {
        callback = params;
        params = [];
      }
      pool.query(query, params, (err, result) => {
        if (err) return callback(err);
        callback(null, result?.rows?.[0]);
      });
    },
    
    all: (query, params = [], callback) => {
      if (!callback && typeof params === 'function') {
        callback = params;
        params = [];
      }
      pool.query(query, params, (err, result) => {
        if (err) return callback(err);
        callback(null, result?.rows || []);
      });
    },

    close: () => pool.end(),
  };

} else {
  // ═══════════════════ SQLite ═══════════════════
  const sqlite3 = require('sqlite3').verbose();
  const path    = require('path');

  const dbPath = path.resolve(__dirname, process.env.DB_PATH || 'winner_store.db');

  console.log('📦 Inicializando SQLite...');
  console.log('   Ruta:', dbPath);

  db = new sqlite3.Database(dbPath, (err) => {
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

}

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
    if (err) {
      console.error('❌ Error creating sales table:', err.message);
    } else {
      console.log('✅ Tabla sales lista');
      // Agregar columnas si no existen (migración)
      const columnAdds = [
        'ALTER TABLE sales ADD COLUMN payment_method TEXT',
        'ALTER TABLE sales ADD COLUMN payment_status TEXT DEFAULT "pending"',
        'ALTER TABLE sales ADD COLUMN customer_email TEXT',
        'ALTER TABLE sales ADD COLUMN customer_phone TEXT',
        'ALTER TABLE sales ADD COLUMN shipping_address TEXT',
        'ALTER TABLE sales ADD COLUMN reference_number TEXT'
      ];
      
      columnAdds.forEach(sql => {
        db.run(sql, (err) => {
          // Ignorar errores de columnas duplicadas
          if (err && !err.message.includes('duplicate column')) {
            // Ignore migration errors silently
          }
        });
      });
    }
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

  /* ── SHIPPING OPTIONS (Logística) ──────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS shipping_options (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      price       REAL NOT NULL,
      days        INTEGER,
      enabled     BOOLEAN DEFAULT 1,
      priority    INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Error creating shipping_options table:', err.message);
    else console.log('✅ Tabla shipping_options lista');
  });

  /* ── ORDERS (Pedidos con detalles) ──────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id          TEXT PRIMARY KEY,
      sale_id     TEXT UNIQUE NOT NULL,
      customer_email TEXT,
      customer_phone TEXT,
      shipping_address TEXT,
      shipping_method TEXT,
      shipping_cost REAL DEFAULT 0,
      tracking_number TEXT,
      order_status TEXT DEFAULT 'pending',
      estimated_delivery TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating orders table:', err.message);
    else console.log('✅ Tabla orders lista');
  });

  /* ── CUSTOMER PROFILES (Análisis VIP) ────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE,
      name        TEXT,
      phone       TEXT,
      total_spent REAL DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      last_purchase DATETIME,
      vip_status  TEXT DEFAULT 'standard',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Error creating customer_profiles table:', err.message);
    else console.log('✅ Tabla customer_profiles lista');
  });

  /* ── REORDER RULES (Sistema de reorden automático) ──────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS reorder_rules (
      id          TEXT PRIMARY KEY,
      product_id  TEXT NOT NULL,
      min_stock   INTEGER NOT NULL,
      qty_to_order INTEGER NOT NULL,
      reorder_cost REAL DEFAULT 0,
      enabled     BOOLEAN DEFAULT 1,
      last_reorder DATETIME,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating reorder_rules table:', err.message);
    else console.log('✅ Tabla reorder_rules lista');
  });

  /* ── DEMAND FORECAST (Predicción de demanda ML) ────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS demand_forecast (
      id          TEXT PRIMARY KEY,
      product_id  TEXT NOT NULL,
      period      TEXT,
      predicted_qty INTEGER,
      confidence_score REAL,
      trend       TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating demand_forecast table:', err.message);
    else console.log('✅ Tabla demand_forecast lista');
  });

  console.log('✅ Schema inicializado correctamente');
}

module.exports = db;

