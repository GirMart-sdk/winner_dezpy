/* ═══════════════════════════════════════════════════════════
   WINNER STORE — database.js
   ✅ PostgreSQL + SQLite compatible
   Auto-detecta según variables de ambiente
   ═══════════════════════════════════════════════════════════ */
'use strict';

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

let db;

if (DB_TYPE === 'postgres') {
  // ═══════════════════ PostgreSQL ═══════════════════
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error('❌ Pool error:', err);
  });

  console.log('📦 Inicializando PostgreSQL...');
  console.log('   Host:', process.env.DB_HOST);
  console.log('   Base de datos:', process.env.DB_NAME);

  db = {
    run: (query, params = [], callback = null) => {
      if (!callback) return; // Ignorar si no hay callback
      pool.query(query, params, (err, result) => {
        callback(err);
      });
    },
    
    get: (query, params = [], callback) => {
      pool.query(query, params, (err, result) => {
        if (err) return callback(err);
        callback(null, result?.rows?.[0]);
      });
    },
    
    all: (query, params = [], callback) => {
      pool.query(query, params, (err, result) => {
        if (err) return callback(err);
        callback(null, result?.rows || []);
      });
    },

    exec: (query, callback) => {
      pool.query(query, (err, result) => {
        callback(err);
      });
    },

    close: () => {
      return pool.end();
    }
  };

  // Conectar y verificar
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('❌ Error conectando a PostgreSQL:', err.message);
      process.exit(1);
    }
    console.log('✅ Conectado a PostgreSQL');
    initializeSchema();
  });

} else {
  // ═══════════════════ SQLite ═══════════════════
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');

  const dbPath = path.resolve(__dirname, process.env.DB_PATH || 'winner_store.db');

  console.log('📦 Inicializando SQLite...');
  console.log('   Ruta:', dbPath);

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error conectando a SQLite:', err.message);
      process.exit(1);
    }
    console.log('✅ Conectado a SQLite');

    // Optimizaciones
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA foreign_keys = ON;');
    db.run('PRAGMA synchronous = NORMAL;');
    
    initializeSchema();
  });
}

function initializeSchema() {
  const isSQLite = DB_TYPE !== 'postgres';
  
  // Funciones helper para conversión de tipos SQL
  const TIMESTAMP = isSQLite ? 'DATETIME' : 'TIMESTAMP';
  const AUTOINCREMENT = isSQLite ? 'AUTOINCREMENT' : 'GENERATED ALWAYS AS IDENTITY';
  const DEFAULT_NOW = isSQLite ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';

  console.log(`\n🔧 Inicializando schema (${DB_TYPE.toUpperCase()})...\n`);

  /* ── PRODUCTS ──────────────────────────────────────────── */
  const createProducts = `
    CREATE TABLE IF NOT EXISTS products (
      id          VARCHAR(50) PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      price       NUMERIC(10,2) NOT NULL,
      oldPrice    NUMERIC(10,2),
      cost        NUMERIC(10,2) DEFAULT 0,
      category    VARCHAR(50),
      image       VARCHAR(500),
      badge       VARCHAR(50),
      badgeType   VARCHAR(50),
      sku         VARCHAR(100) UNIQUE,
      description TEXT,
      created_at  ${TIMESTAMP} DEFAULT ${DEFAULT_NOW},
      updated_at  ${TIMESTAMP} DEFAULT ${DEFAULT_NOW}
    )
  `;

  db.run(createProducts, (err) => {
    if (err && !err.message.includes('already exists')) {
      console.error('❌ Error creating products table:', err.message);
    } else {
      console.log('✅ Tabla products lista');
    }
  });

  /* ── INVENTORY ──────────────────────────────────────────– */
  const createInventory = `
    CREATE TABLE IF NOT EXISTS inventory (
      product_id  VARCHAR(50) NOT NULL,
      size        VARCHAR(10) NOT NULL,
      qty         INTEGER DEFAULT 0,
      updated_at  ${TIMESTAMP} DEFAULT ${DEFAULT_NOW},
      PRIMARY KEY (product_id, size)
      ${isSQLite ? '' : ',FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE'}
    )
  `;

  db.run(createInventory, (err) => {
    if (err && !err.message.includes('already exists')) {
      console.error('❌ Error creating inventory table:', err.message);
    } else {
      console.log('✅ Tabla inventory lista');
    }
  });

  /* ── SALES ──────────────────────────────────────────– */
  const createSales = `
    CREATE TABLE IF NOT EXISTS sales (
      id                    VARCHAR(50) PRIMARY KEY,
      timestamp             ${TIMESTAMP} DEFAULT ${DEFAULT_NOW},
      channel               VARCHAR(50),
      vendor                VARCHAR(100),
      client                VARCHAR(255),
      method                VARCHAR(50),
      subtotal              NUMERIC(10,2) DEFAULT 0,
      discount              NUMERIC(10,2) DEFAULT 0,
      total                 NUMERIC(10,2) NOT NULL,
      items                 TEXT,
      payment_method        VARCHAR(50),
      payment_status        VARCHAR(50) DEFAULT 'pending',
      customer_email        VARCHAR(255),
      customer_phone        VARCHAR(20),
      shipping_address      TEXT,
      reference_number      VARCHAR(100)
    )
  `;

  db.run(createSales, (err) => {
    if (err && !err.message.includes('already exists')) {
      console.error('❌ Error creating sales table:', err.message);
    } else {
      console.log('✅ Tabla sales lista');
    }
  });

  /* ── SALE ITEMS ──────────────────────────────────────────– */
  const createSaleItems = `
    CREATE TABLE IF NOT EXISTS sale_items (
      id            SERIAL PRIMARY KEY,
      sale_id       VARCHAR(50) NOT NULL,
      product_name  VARCHAR(255) NOT NULL,
      qty           INTEGER NOT NULL,
      price         NUMERIC(10,2) NOT NULL,
      size          VARCHAR(10)
      ${isSQLite ? '' : ',FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE'}
    )
  `.replace('SERIAL PRIMARY KEY', isSQLite ? 'INTEGER PRIMARY KEY ' + AUTOINCREMENT : 'SERIAL PRIMARY KEY');

  db.run(createSaleItems, (err) => {
    if (err && !err.message.includes('already exists')) {
      console.error('❌ Error creating sale_items table:', err.message);
    } else {
      console.log('✅ Tabla sale_items lista');
    }
  });

  /* ── CUSTOMER PROFILES ──────────────────────────────────────────– */
  const createCustomerProfiles = `
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id              VARCHAR(50) PRIMARY KEY,
      email           VARCHAR(255) UNIQUE,
      name            VARCHAR(255),
      phone           VARCHAR(20),
      country         VARCHAR(50),
      total_spent     NUMERIC(10,2) DEFAULT 0,
      total_orders    INTEGER DEFAULT 0,
      last_purchase   ${TIMESTAMP},
      vip_status      VARCHAR(50) DEFAULT 'standard',
      created_at      ${TIMESTAMP} DEFAULT ${DEFAULT_NOW},
      updated_at      ${TIMESTAMP} DEFAULT ${DEFAULT_NOW}
    )
  `;

  db.run(createCustomerProfiles, (err) => {
    if (err && !err.message.includes('already exists')) {
      console.error('❌ Error creating customer_profiles table:', err.message);
    } else {
      console.log('✅ Tabla customer_profiles lista');
    }
  });

  /* ── ORDERS ──────────────────────────────────────────– */
  const createOrders = `
    CREATE TABLE IF NOT EXISTS orders (
      id                      VARCHAR(50) PRIMARY KEY,
      sale_id                 VARCHAR(50) UNIQUE NOT NULL,
      customer_email          VARCHAR(255),
      customer_phone          VARCHAR(20),
      shipping_address        TEXT,
      shipping_method         VARCHAR(100),
      shipping_cost           NUMERIC(10,2) DEFAULT 0,
      tracking_number         VARCHAR(100),
      order_status            VARCHAR(50) DEFAULT 'pending',
      estimated_delivery      VARCHAR(50),
      created_at              ${TIMESTAMP} DEFAULT ${DEFAULT_NOW},
      updated_at              ${TIMESTAMP} DEFAULT ${DEFAULT_NOW}
      ${isSQLite ? '' : ',FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE'}
    )
  `;

  db.run(createOrders, (err) => {
    if (err && !err.message.includes('already exists')) {
      console.error('❌ Error creating orders table:', err.message);
    } else {
      console.log('✅ Tabla orders lista');
    }
  });

  console.log('\n✅ Schema inicializado completamente\n');
}

module.exports = db;
