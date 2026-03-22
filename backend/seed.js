/* ═══════════════════════════════════════════════════════════
   WINNER STORE — seed.js  v2.0
   25 productos + 45 ventas de muestra de los últimos 14 días
   Uso: node backend/seed.js   (desde la raíz del proyecto)
   ═══════════════════════════════════════════════════════════ */
'use strict';

const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const dbPath = path.resolve(__dirname, 'winner_store.db');
const db     = new sqlite3.Database(dbPath);

/* ── Productos ──────────────────────────────────────────── */
const PRODUCTS = [
  /* ══ MUJER ══════════════════════════════════════════════ */
  { id:'P001', sku:'WIN-001', name:'Crop Hoodie Oversize',         cat:'mujer',      price:89990,  oldPrice:115000, cost:42000, badge:'OFERTA',  badgeType:'sale', img:'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80', stock:{XS:6,S:10,M:14,L:8,XL:4,XXL:2} },
  { id:'P002', sku:'WIN-002', name:'Mini Dress Urbana',            cat:'mujer',      price:99990,  oldPrice:null,   cost:48000, badge:'NUEVO',   badgeType:'new',  img:'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80', stock:{XS:8,S:12,M:10,L:6,XL:3,XXL:1} },
  { id:'P003', sku:'WIN-003', name:'Set Legging + Top Deportivo',  cat:'mujer',      price:119990, oldPrice:145000, cost:55000, badge:'OFERTA',  badgeType:'sale', img:'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=400&q=80', stock:{XS:5,S:9,M:11,L:7,XL:3,XXL:0} },
  { id:'P004', sku:'WIN-004', name:'Blazer Crop Estructurado',     cat:'mujer',      price:159990, oldPrice:195000, cost:74000, badge:null,      badgeType:null,   img:'https://images.unsplash.com/photo-1591085686350-798c0f9faa7f?w=400&q=80', stock:{XS:3,S:7,M:9,L:5,XL:2,XXL:0} },
  { id:'P005', sku:'WIN-005', name:'Jogger Mom Fit',               cat:'mujer',      price:79990,  oldPrice:null,   cost:36000, badge:null,      badgeType:null,   img:'https://images.unsplash.com/photo-1594938298603-c8148c4b4e5d?w=400&q=80', stock:{XS:4,S:11,M:15,L:9,XL:4,XXL:1} },
  { id:'P006', sku:'WIN-006', name:'Camiseta Manga Larga Ribbed',  cat:'mujer',      price:59990,  oldPrice:74000,  cost:27000, badge:'OFERTA',  badgeType:'sale', img:'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&q=80', stock:{XS:7,S:13,M:17,L:10,XL:5,XXL:2} },
  { id:'P007', sku:'WIN-007', name:'Shorts Cargo Y2K',             cat:'mujer',      price:69990,  oldPrice:85000,  cost:31000, badge:'HOT',     badgeType:'hot',  img:'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=400&q=80', stock:{XS:5,S:10,M:13,L:8,XL:3,XXL:0} },
  { id:'P008', sku:'WIN-008', name:'Vestido Asimetrico Elegante',  cat:'mujer',      price:134990, oldPrice:165000, cost:62000, badge:null,      badgeType:null,   img:'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400&q=80', stock:{XS:2,S:6,M:8,L:5,XL:2,XXL:0} },
  /* ══ HOMBRE ══════════════════════════════════════════════ */
  { id:'P009', sku:'WIN-009', name:'Oversize Tee W Logo',          cat:'hombre',     price:59990,  oldPrice:null,   cost:22000, badge:'HOT',     badgeType:'hot',  img:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80', stock:{XS:3,S:15,M:20,L:16,XL:8,XXL:4} },
  { id:'P010', sku:'WIN-010', name:'Jogger Cargo Premium',         cat:'hombre',     price:94990,  oldPrice:119000, cost:43000, badge:'OFERTA',  badgeType:'sale', img:'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&q=80', stock:{XS:0,S:6,M:11,L:9,XL:5,XXL:2} },
  { id:'P011', sku:'WIN-011', name:'Bomber Reflex Tactico',        cat:'hombre',     price:189990, oldPrice:229000, cost:90000, badge:'NUEVO',   badgeType:'new',  img:'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80', stock:{XS:1,S:4,M:7,L:5,XL:3,XXL:1} },
  { id:'P012', sku:'WIN-012', name:'Hoodie Canguro Streetwear',    cat:'hombre',     price:109990, oldPrice:139000, cost:50000, badge:'OFERTA',  badgeType:'sale', img:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', stock:{XS:2,S:8,M:14,L:12,XL:6,XXL:3} },
  { id:'P013', sku:'WIN-013', name:'Camiseta Tecnica Dry-Fit',     cat:'hombre',     price:49990,  oldPrice:null,   cost:19000, badge:null,      badgeType:null,   img:'https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=400&q=80', stock:{XS:0,S:9,M:18,L:15,XL:7,XXL:3} },
  { id:'P014', sku:'WIN-014', name:'Short Deportivo 5in',          cat:'hombre',     price:64990,  oldPrice:79000,  cost:28000, badge:'OFERTA',  badgeType:'sale', img:'https://images.unsplash.com/photo-1562183241-b937e95585b6?w=400&q=80', stock:{XS:0,S:7,M:12,L:10,XL:5,XXL:2} },
  { id:'P015', sku:'WIN-015', name:'Chaqueta Rompevientos Neon',   cat:'hombre',     price:144990, oldPrice:179000, cost:67000, badge:'HOT',     badgeType:'hot',  img:'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=400&q=80', stock:{XS:0,S:3,M:6,L:5,XL:4,XXL:1} },
  { id:'P016', sku:'WIN-016', name:'Pantalon Cargo Multicorreas',  cat:'hombre',     price:124990, oldPrice:null,   cost:57000, badge:'NUEVO',   badgeType:'new',  img:'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80', stock:{XS:0,S:5,M:9,L:8,XL:4,XXL:2} },
  /* ══ ACCESORIOS ══════════════════════════════════════════ */
  { id:'P017', sku:'WIN-017', name:'Bucket Hat Logo W',            cat:'accesorios', price:39990,  oldPrice:52000,  cost:15000, badge:'OFERTA',  badgeType:'sale', img:'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&q=80', stock:{U:35} },
  { id:'P018', sku:'WIN-018', name:'Gorra Snapback Premium',       cat:'accesorios', price:44990,  oldPrice:null,   cost:18000, badge:null,      badgeType:null,   img:'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&q=80', stock:{U:28} },
  { id:'P019', sku:'WIN-019', name:'Mochila Tactica Urbana',       cat:'accesorios', price:89990,  oldPrice:109000, cost:40000, badge:'OFERTA',  badgeType:'sale', img:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80', stock:{U:18} },
  { id:'P020', sku:'WIN-020', name:'Bolso Crossbody Cuero PU',     cat:'accesorios', price:79990,  oldPrice:95000,  cost:35000, badge:'OFERTA',  badgeType:'sale', img:'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&q=80', stock:{U:12} },
  { id:'P021', sku:'WIN-021', name:'Cadena Cubana Acero',          cat:'accesorios', price:59990,  oldPrice:75000,  cost:24000, badge:'NUEVO',   badgeType:'new',  img:'https://images.unsplash.com/photo-1599643478524-fb66f7f6f5b9?w=400&q=80', stock:{U:22} },
  { id:'P022', sku:'WIN-022', name:'Gafas Espejadas Y2K',          cat:'accesorios', price:34990,  oldPrice:44000,  cost:13000, badge:'HOT',     badgeType:'hot',  img:'https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&q=80', stock:{U:40} },
  { id:'P023', sku:'WIN-023', name:'Rinonera Neon Reflectiva',     cat:'accesorios', price:49990,  oldPrice:null,   cost:20000, badge:'NUEVO',   badgeType:'new',  img:'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80', stock:{U:16} },
  { id:'P024', sku:'WIN-024', name:'Set Medias Deportivas x3',     cat:'accesorios', price:24990,  oldPrice:35000,  cost:9000,  badge:'OFERTA',  badgeType:'sale', img:'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&q=80', stock:{U:50} },
  { id:'P025', sku:'WIN-025', name:'Bufanda Tubular Streetwear',   cat:'accesorios', price:29990,  oldPrice:null,   cost:11000, badge:null,      badgeType:null,   img:'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&q=80', stock:{U:20} },
];

/* ── Ventas de muestra ──────────────────────────────────── */
const METHODS = ['Efectivo','Nequi','Daviplata','PSE','Tarjeta Debito','Tarjeta Credito'];
const VENDORS = ['Carlos W.','Valentina R.','Miguel A.','Laura S.'];

function daysAgo(n, h) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + (h|0), Math.floor(Math.random()*60), 0, 0);
  return d.toISOString();
}
function rnd(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
function pick(arr){ return arr[rnd(0,arr.length-1)]; }

const SALES = [];
let idx = 1;
const DAILY = [5,6,3,4,4,7,8,4,5,3,4,5,7,8];

for (let day = 0; day < 14; day++) {
  for (let s = 0; s < DAILY[day]; s++) {
    const channel = (day % 4 === 0 && s === 0) ? 'online' : 'fisica';
    const vendor  = channel === 'online' ? 'Tienda Online' : pick(VENDORS);
    const client  = channel === 'online' ? 'Cliente Web' : '-';
    const method  = pick(METHODS);
    const nItems  = rnd(1,3);
    const items   = [];
    for (let i = 0; i < nItems; i++) {
      const p = pick(PRODUCTS);
      items.push({ name:p.name, qty:rnd(1,2), price:p.price, size:pick(['XS','S','M','L','XL','XXL','U']) });
    }
    const subtotal = items.reduce((sum,i)=>sum+i.price*i.qty, 0);
    const discount = Math.random() > 0.85 ? 10 : 0;
    const total    = Math.round(subtotal*(1-discount/100));
    const id       = channel==='online'
      ? `ON${Date.now().toString(36).toUpperCase()}${idx}`
      : `POS${String(idx).padStart(4,'0')}`;
    SALES.push({ id, timestamp:daysAgo(day, s*1.2), vendor, client, method, channel, subtotal, discount, total, items });
    idx++;
  }
}

/* ── Ejecutar ───────────────────────────────────────────── */
db.serialize(() => {
  console.log('\n Iniciando seed WINNER STORE v2.0...\n');

  db.run('PRAGMA foreign_keys = OFF');

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL,
    oldPrice REAL, cost REAL DEFAULT 0, category TEXT,
    image TEXT, badge TEXT, badgeType TEXT, sku TEXT, description TEXT)`);

  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    product_id TEXT NOT NULL, size TEXT NOT NULL, qty INTEGER DEFAULT 0,
    PRIMARY KEY(product_id, size))`);

  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY, timestamp TEXT NOT NULL,
    vendor TEXT DEFAULT 'Vendedor', client TEXT DEFAULT '-',
    method TEXT, channel TEXT DEFAULT 'fisica',
    subtotal REAL DEFAULT 0, discount REAL DEFAULT 0, total REAL NOT NULL)`);

  db.run(`CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id TEXT NOT NULL,
    product_name TEXT, qty INTEGER DEFAULT 1, price REAL DEFAULT 0, size TEXT DEFAULT 'U')`);

  db.run('DELETE FROM sale_items');
  db.run('DELETE FROM sales');
  db.run('DELETE FROM inventory');
  db.run('DELETE FROM products');

  const stmtP = db.prepare('INSERT INTO products (id,name,price,oldPrice,cost,category,image,badge,badgeType,sku) VALUES (?,?,?,?,?,?,?,?,?,?)');
  const stmtI = db.prepare('INSERT INTO inventory (product_id,size,qty) VALUES (?,?,?)');

  PRODUCTS.forEach(p => {
    stmtP.run(p.id, p.name, p.price, p.oldPrice||null, p.cost, p.cat, p.img, p.badge||null, p.badgeType||null, p.sku);
    Object.entries(p.stock).forEach(([sz,qty]) => stmtI.run(p.id, sz, qty));
  });
  stmtP.finalize();
  stmtI.finalize();

  const stmtS  = db.prepare('INSERT INTO sales (id,timestamp,vendor,client,method,channel,subtotal,discount,total) VALUES (?,?,?,?,?,?,?,?,?)');
  const stmtSI = db.prepare('INSERT INTO sale_items (sale_id,product_name,qty,price,size) VALUES (?,?,?,?,?)');

  SALES.forEach(s => {
    stmtS.run(s.id, s.timestamp, s.vendor, s.client, s.method, s.channel, s.subtotal, s.discount, s.total);
    s.items.forEach(i => stmtSI.run(s.id, i.name, i.qty, i.price, i.size));
  });
  stmtS.finalize();
  stmtSI.finalize((err) => {
    if (err) { console.error('Error en seed:', err.message); db.close(); return; }
    const rev = SALES.reduce((s,x)=>s+x.total,0);
    console.log('Productos cargados : ' + PRODUCTS.length);
    console.log('  Mujer      : 8 (P001-P008)');
    console.log('  Hombre     : 8 (P009-P016)');
    console.log('  Accesorios : 9 (P017-P025)');
    console.log('Ventas muestra: ' + SALES.length + ' (14 dias)');
    console.log('Revenue total : $' + rev.toLocaleString('es-CO'));
    console.log('\n npm start  ->  http://localhost:3000');
    console.log('Panel admin ->  admin / winner2026\n');
    db.close();
  });
});
