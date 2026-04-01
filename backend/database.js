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
    initializeSchema();
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
      else console.log('✅ WAL mode activado');
    });
    
    db.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) console.error('⚠️  No se pudo activar foreign keys:', err.message);
      else console.log('✅ Foreign keys activadas');
    });

    db.run('PRAGMA synchronous = NORMAL;', (err) => {
      if (err) console.error('⚠️  No se pudo ajustar synchronous:', err.message);
      else console.log('✅ Synchronous = NORMAL');
    });

    initializeSchema();
  });
}

function initializeSchema() {
  const isSQLite = DB_TYPE !== 'postgres';
  
  console.log(`\n🔧 Inicializando schema (${DB_TYPE.toUpperCase()})...\n`);

  /* ── PRODUCTS ──────────────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id          VARCHAR(50) PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      price       DECIMAL(10,2) NOT NULL,
      oldPrice    DECIMAL(10,2),
      cost        DECIMAL(10,2) DEFAULT 0,
      category    VARCHAR(50),
      image       TEXT,
      badge       VARCHAR(50),
      badgeType   VARCHAR(50),
      sku         VARCHAR(100) UNIQUE,
      description TEXT,
      created_at  ${isSQLite ? 'DATETIME' : 'TIMESTAMP'} DEFAULT CURRENT_TIMESTAMP,
      updated_at  ${isSQLite ? 'DATETIME' : 'TIMESTAMP'} DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.error('❌ Error creating products table:', err.message);
      }
    } else {
      console.log('✅ Tabla products lista');
    }
  });

  /* ── INVENTORY (stock por talla) ───────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      product_id  VARCHAR(50) NOT NULL,
      size        VARCHAR(10) NOT NULL,
      qty         INTEGER DEFAULT 0,
      updated_at  ${isSQLite ? 'DATETIME' : 'TIMESTAMP'} DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_id, size)
    )
  `, (err) => {
    if (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.error('❌ Error creating inventory table:', err.message);
      }
    } else {
      console.log('✅ Tabla inventory lista');
    }
  });

  /* ── SALES (Ventas) ────────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id                    VARCHAR(50) PRIMARY KEY,
      timestamp             ${isSQLite ? 'DATETIME' : 'TIMESTAMP'} DEFAULT CURRENT_TIMESTAMP,
      channel               VARCHAR(50),
      vendor                VARCHAR(100),
      client                VARCHAR(255),
      method                VARCHAR(50),
      subtotal              DECIMAL(10,2) DEFAULT 0,
      discount              DECIMAL(10,2) DEFAULT 0,
      total                 DECIMAL(10,2) NOT NULL,
      items                 TEXT,
      payment_method        VARCHAR(50),
      payment_status        VARCHAR(50) DEFAULT 'pending',
      customer_email        VARCHAR(255),
      customer_phone        VARCHAR(20),
      shipping_address      TEXT,
      reference_number      VARCHAR(100)
    )
  `, (err) => {
    if (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.error('❌ Error creating sales table:', err.message);
      }
    } else {
      console.log('✅ Tabla sales lista');
    }
  });

  /* ── SALE ITEMS ──────────────────────────────────────────– */
  db.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id            ${isSQLite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      sale_id       VARCHAR(50) NOT NULL,
      product_name  VARCHAR(255) NOT NULL,
      qty           INTEGER NOT NULL,
      price         DECIMAL(10,2) NOT NULL,
      size          VARCHAR(10)
    )
  `, (err) => {
    if (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.error('❌ Error creating sale_items table:', err.message);
      }
    } else {
      console.log('✅ Tabla sale_items lista');
    }
  });

  /* ── SESSIONS ──────────────────────────────────────────– */
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token       VARCHAR(500) PRIMARY KEY,
      user        VARCHAR(255) NOT NULL,
      created_at  ${isSQLite ? 'DATETIME' : 'TIMESTAMP'} DEFAULT CURRENT_TIMESTAMP,
      expires_at  ${isSQLite ? 'DATETIME' : 'TIMESTAMP'} NOT NULL
    )
  `, (err) => {
    if (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.error('❌ Error creating sessions table:', err.message);
      }
    }
  });

  /* ── SHIPPING OPTIONS ──────────────────────────────────────────– */
  db.run(`
    CREATE TABLE IF NOT EXISTS shipping_options (
      id          VARCHAR(50) PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      description TEXT,
      price       DECIMAL(10,2) NOT NULL,
      days        INTEGER,
      enabled     BOOLEAN DEFAULT true,
      priority    INTEGER DEFAULT 0,
      created_at  ${isSQLite ? 'DATETIME' : 'TIMESTAMP'} DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.error('❌ Error creating shipping_options table:', err.message);
      }
    }
  });

  /* ── ORDERS ──────────────────────────────────────────– */
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id                      VARCHAR(50) PRIMARY KEY,
      sale_id                 VARCHAR(50) UNIQUE NOT NULL,
      customer_email          VARCHAR(255),
      customer_phone          VARCHAR(20),
      shipping_address        TEXT,
      shipping_method         VARCHAR(100),
      shipping_cost           DECIMAL(10,2) DEFAULT 0,
      tracking_number         VARCHAR(100),
      order_status            VARCHAR(50) DEFAULT 'pending',
      estimated_delivery      VARCHAR(50),
      created_at              ${isSQLite ? 'DATETIME' : 'TIMESTAMP'} DEFAULT CURRENT_TIMESTAMP,
      updated_at              ${isSQLite ? 'DATETIME' : 'TIMESTAMP'} DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.error('❌ Error creating orders table:', err.message);
      }
    }
  });

  /* ── CUSTOMER PROFILES ──────────────────────────────────────────– */
  db.run(`
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id              VARCHAR(50) PRIMARY KEY,
      email           VARCHAR(255) UNIQUE,
      name            VARCHAR(255),
      phone           VARCHAR(20),
      country         VARCHAR(50),
      total_spent     DECIMAL(10,2) DEFAULT 0,
      total_orders    INTEGER DEFAULT 0,
      last_purchase   ${isSQLite ? 'DATETIME' : 'TIMESTAMP'},
      vip_status      VARCHAR(50) DEFAULT 'standard',
      created_at      ${isSQLite ? 'DATETIME' : 'TIMESTAMP'} DEFAULT CURRENT_TIMESTAMP,
      updated_at      ${isSQLite ? 'DATETIME' : 'TIMESTAMP'} DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
        console.error('❌ Error creating customer_profiles table:', err.message);
      }
    }
  });

  console.log('✅ Schema inicializado completamente\n');
}

module.exports = db;

