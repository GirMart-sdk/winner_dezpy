/* ═══════════════════════════════════════════════════════════
   WINNER STORE — server.js  v2.0
   Backend completo: Productos · Inventario · Ventas · Auth
   Merchant Feed CSV · Estadísticas · Seguridad JWT + API Key
   ═══════════════════════════════════════════════════════════ */
'use strict';

const express    = require('express');
const path       = require('path');
const cors       = require('cors');
const bodyParser = require('body-parser');
const jwt        = require('jsonwebtoken');
const { scryptSync, timingSafeEqual, randomUUID } = require('crypto');
const { URL }    = require('url');
require('dotenv').config();

const db = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Configuración de seguridad ──────────────────────────── */
const API_KEY     = process.env.API_KEY     || 'dev-api-key';
const JWT_SECRET  = process.env.JWT_SECRET  || 'dev-jwt-secret-winner-2026';
const ADMIN_USER  = process.env.ADMIN_USER  || 'admin';
const ADMIN_PLAIN = process.env.ADMIN_PASSWORD;
const ADMIN_SALT  = process.env.ADMIN_SALT  || 'winner_salt_2026';
const ADMIN_HASH  = process.env.ADMIN_PASSWORD_HASH
  || scryptSync('winner2026', ADMIN_SALT, 64).toString('hex');

function passwordMatches(pass) {
  if (!pass) return false;
  if (ADMIN_PLAIN && pass === ADMIN_PLAIN) return true;
  try {
    const hash = scryptSync(pass, ADMIN_SALT, 64).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(ADMIN_HASH, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch { return false; }
}

/* ── CORS ───────────────────────────────────────────────── */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ limit: '15mb', extended: true }));

/* ── Seguridad de archivos sensibles ────────────────────── */
const CLIENT_ROOT = path.join(__dirname, '..');
const BLOCKED_EXTENSIONS = ['.db', '.sqlite', '.env', '.log'];
const BLOCKED_FILES      = ['seed.js', 'database.js', '.env', 'server.js'];

app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    BLOCKED_EXTENSIONS.some(ext => p.endsWith(ext)) ||
    BLOCKED_FILES.some(f => p === '/' + f || p.endsWith('/' + f))
  ) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('X-Frame-Options',        'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy',        'no-referrer-when-downgrade');
  next();
});

app.use(express.static(CLIENT_ROOT));

/* ── Middleware de autenticación ────────────────────────── */
function requireApiKey(req, res, next) {
  const key = req.header('x-api-key');
  if (key === API_KEY) return next();
  return res.status(401).json({ error: 'API key requerida' });
}

function requireAuth(req, res, next) {
  const auth = req.header('authorization') || '';
  if (auth.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(auth.slice(7), JWT_SECRET);
      return next();
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  }
  return requireApiKey(req, res, next);
}

/* ── Query base para productos con stock ─────────────────── */
const PRODUCTS_QUERY = `
  SELECT
    p.id, p.name, p.price, p.oldPrice, p.cost,
    p.category AS cat, p.image AS img,
    p.badge, p.badgeType, p.sku, p.description,
    (SELECT json_group_object(size, qty)
     FROM inventory WHERE product_id = p.id) AS stock
  FROM products p
`;

function normalizeProduct(row) {
  let stock = {};
  try { stock = JSON.parse(row.stock || '{}'); } catch {}
  return {
    ...row,
    stock,
    metadata: PRODUCT_METADATA[row.id] || {},
  };
}

/* ═══════════════════════════════════════════════════════════
   METADATA GOOGLE MERCHANT (25 productos)
   ═══════════════════════════════════════════════════════════ */
const PRODUCT_METADATA = {
  P001: { googleCategory:'Apparel & Accessories > Clothing > Outerwear > Hoodies & Sweatshirts', productType:'Streetwear > Crop Hoodie Oversize', mpn:'WIN-P001', gtin:'7700000000012', gender:'female', ageGroup:'adult', color:'Negro grafito', size:'XS,S,M,L,XL,XXL', material:'Algodón peinado 320g', pattern:'Liso', shippingWeight:'0.65 kg', customLabel0:'Oferta', customLabel1:'Hoodies', additionalImages:['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=80'] },
  P002: { googleCategory:'Apparel & Accessories > Clothing > Dresses', productType:'Streetwear > Mini Dress Urbana', mpn:'WIN-P002', gtin:'7700000000013', gender:'female', ageGroup:'adult', color:'Blanco hueso', size:'XS,S,M,L,XL,XXL', material:'Satín stretch', pattern:'Texturizado', shippingWeight:'0.52 kg', customLabel0:'Novedad', customLabel1:'Vestidos', additionalImages:['https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=900&q=80'] },
  P003: { googleCategory:'Apparel & Accessories > Clothing > Activewear', productType:'Streetwear > Set Legging + Top', mpn:'WIN-P003', gtin:'7700000000014', gender:'female', ageGroup:'adult', color:'Negro/lima', size:'XS,S,M,L,XL', material:'Licra compresiva 4-way', pattern:'Bicolor', shippingWeight:'0.70 kg', customLabel0:'Oferta', customLabel1:'Conjuntos', additionalImages:[] },
  P004: { googleCategory:'Apparel & Accessories > Clothing > Outerwear > Blazers', productType:'Streetwear > Blazer Crop', mpn:'WIN-P004', gtin:'7700000000015', gender:'female', ageGroup:'adult', color:'Beige arena', size:'XS,S,M,L,XL', material:'Lino stretch', pattern:'Liso', shippingWeight:'0.60 kg', customLabel0:'Premium', customLabel1:'Blazers', additionalImages:[] },
  P005: { googleCategory:'Apparel & Accessories > Clothing > Pants', productType:'Streetwear > Jogger Mom Fit', mpn:'WIN-P005', gtin:'7700000000016', gender:'female', ageGroup:'adult', color:'Gris jaspeado', size:'XS,S,M,L,XL,XXL', material:'French terry', pattern:'Liso', shippingWeight:'0.55 kg', customLabel0:'Básicos', customLabel1:'Joggers', additionalImages:[] },
  P006: { googleCategory:'Apparel & Accessories > Clothing > Shirts & Tops > T-shirts', productType:'Streetwear > Camiseta Ribbed', mpn:'WIN-P006', gtin:'7700000000017', gender:'female', ageGroup:'adult', color:'Crema', size:'XS,S,M,L,XL,XXL', material:'Algodón acanalado', pattern:'Acanalado', shippingWeight:'0.35 kg', customLabel0:'Oferta', customLabel1:'Tops', additionalImages:[] },
  P007: { googleCategory:'Apparel & Accessories > Clothing > Pants', productType:'Streetwear > Shorts Cargo Y2K', mpn:'WIN-P007', gtin:'7700000000018', gender:'female', ageGroup:'adult', color:'Caqui', size:'XS,S,M,L,XL', material:'Gabardina', pattern:'Cargo', shippingWeight:'0.42 kg', customLabel0:'Oferta', customLabel1:'Shorts', additionalImages:[] },
  P008: { googleCategory:'Apparel & Accessories > Clothing > Dresses', productType:'Streetwear > Vestido Asimétrico', mpn:'WIN-P008', gtin:'7700000000019', gender:'female', ageGroup:'adult', color:'Negro', size:'XS,S,M,L,XL', material:'Satín mate', pattern:'Liso', shippingWeight:'0.50 kg', customLabel0:'Premium', customLabel1:'Vestidos', additionalImages:[] },
  P009: { googleCategory:'Apparel & Accessories > Clothing > Shirts & Tops > T-shirts', productType:'Streetwear > Oversize Tee W Logo', mpn:'WIN-P009', gtin:'7700000000020', gender:'male', ageGroup:'adult', color:'Blanco puro', size:'XS,S,M,L,XL,XXL', material:'Algodón orgánico 200g', pattern:'Grafiti', shippingWeight:'0.35 kg', customLabel0:'Básicos', customLabel1:'Camisetas', additionalImages:['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80'] },
  P010: { googleCategory:'Apparel & Accessories > Clothing > Pants', productType:'Streetwear > Jogger Cargo Premium', mpn:'WIN-P010', gtin:'7700000000021', gender:'male', ageGroup:'adult', color:'Caqui militar', size:'S,M,L,XL,XXL', material:'Gabardina stretch', pattern:'Cargo', shippingWeight:'0.58 kg', customLabel0:'Oferta', customLabel1:'Joggers', additionalImages:[] },
  P011: { googleCategory:'Apparel & Accessories > Clothing > Outerwear > Jackets', productType:'Streetwear > Bomber Reflex Táctico', mpn:'WIN-P011', gtin:'7700000000022', gender:'male', ageGroup:'adult', color:'Negro metálico', size:'S,M,L,XL', material:'Nylon técnico reflectivo', pattern:'Reflectivo', shippingWeight:'0.72 kg', customLabel0:'Novedad', customLabel1:'Bomber', additionalImages:[] },
  P012: { googleCategory:'Apparel & Accessories > Clothing > Outerwear > Hoodies & Sweatshirts', productType:'Streetwear > Hoodie Canguro', mpn:'WIN-P012', gtin:'7700000000023', gender:'male', ageGroup:'adult', color:'Gris carbón', size:'XS,S,M,L,XL,XXL', material:'Fleece pesado 380g', pattern:'Liso', shippingWeight:'0.68 kg', customLabel0:'Básicos', customLabel1:'Hoodies', additionalImages:[] },
  P013: { googleCategory:'Apparel & Accessories > Clothing > Activewear', productType:'Streetwear > Camiseta Dry-Fit', mpn:'WIN-P013', gtin:'7700000000024', gender:'male', ageGroup:'adult', color:'Negro', size:'S,M,L,XL,XXL', material:'Poliéster técnico', pattern:'Liso', shippingWeight:'0.28 kg', customLabel0:'Sport', customLabel1:'Camisetas', additionalImages:[] },
  P014: { googleCategory:'Apparel & Accessories > Clothing > Pants', productType:'Streetwear > Short Deportivo 5"', mpn:'WIN-P014', gtin:'7700000000025', gender:'male', ageGroup:'adult', color:'Negro', size:'S,M,L,XL,XXL', material:'Poliéster stretch', pattern:'Liso', shippingWeight:'0.30 kg', customLabel0:'Oferta', customLabel1:'Shorts', additionalImages:[] },
  P015: { googleCategory:'Apparel & Accessories > Clothing > Outerwear > Jackets', productType:'Streetwear > Chaqueta Rompevientos Neon', mpn:'WIN-P015', gtin:'7700000000026', gender:'male', ageGroup:'adult', color:'Lima neon', size:'S,M,L,XL,XXL', material:'Nylon ligero', pattern:'Liso', shippingWeight:'0.55 kg', customLabel0:'Oferta', customLabel1:'Chaquetas', additionalImages:[] },
  P016: { googleCategory:'Apparel & Accessories > Clothing > Pants', productType:'Streetwear > Pantalón Cargo Multicorreas', mpn:'WIN-P016', gtin:'7700000000027', gender:'male', ageGroup:'adult', color:'Negro', size:'S,M,L,XL,XXL', material:'Gabardina técnica', pattern:'Multicorreas', shippingWeight:'0.70 kg', customLabel0:'Premium', customLabel1:'Cargo', additionalImages:[] },
  P017: { googleCategory:'Apparel & Accessories > Clothing Accessories > Hats', productType:'Streetwear > Bucket Hat Logo W', mpn:'WIN-P017', gtin:'7700000000028', gender:'unisex', ageGroup:'adult', color:'Beige arena', size:'U', material:'Lona liviana', pattern:'Liso', shippingWeight:'0.20 kg', customLabel0:'Accesorios', customLabel1:'Sombreros', additionalImages:[] },
  P018: { googleCategory:'Apparel & Accessories > Clothing Accessories > Hats', productType:'Streetwear > Gorra Snapback Premium', mpn:'WIN-P018', gtin:'7700000000029', gender:'unisex', ageGroup:'adult', color:'Negro', size:'U', material:'Lona rígida', pattern:'Liso', shippingWeight:'0.22 kg', customLabel0:'Básicos', customLabel1:'Gorras', additionalImages:[] },
  P019: { googleCategory:'Apparel & Accessories > Bags > Backpacks', productType:'Streetwear > Mochila Táctica Urbana', mpn:'WIN-P019', gtin:'7700000000030', gender:'unisex', ageGroup:'adult', color:'Negro carbón', size:'U', material:'Poliéster 600D', pattern:'Geométrico', shippingWeight:'0.95 kg', customLabel0:'Oferta', customLabel1:'Mochilas', additionalImages:[] },
  P020: { googleCategory:'Apparel & Accessories > Handbags > Crossbody Bags', productType:'Streetwear > Bolso Crossbody Cuero PU', mpn:'WIN-P020', gtin:'7700000000031', gender:'female', ageGroup:'adult', color:'Marrón', size:'U', material:'Cuero sintético PU', pattern:'Liso', shippingWeight:'0.65 kg', customLabel0:'Oferta', customLabel1:'Bolsos', additionalImages:[] },
  P021: { googleCategory:'Apparel & Accessories > Jewelry > Necklaces', productType:'Streetwear > Cadena Cubana Acero', mpn:'WIN-P021', gtin:'7700000000032', gender:'unisex', ageGroup:'adult', color:'Plateado', size:'U', material:'Acero inoxidable 316L', pattern:'Cubano', shippingWeight:'0.15 kg', customLabel0:'Oferta', customLabel1:'Joyería', additionalImages:[] },
  P022: { googleCategory:'Apparel & Accessories > Clothing Accessories > Sunglasses & Eyewear', productType:'Streetwear > Gafas Espejadas Y2K', mpn:'WIN-P022', gtin:'7700000000033', gender:'unisex', ageGroup:'adult', color:'Espejado multicolor', size:'U', material:'TR90 + policarbonato', pattern:'Espejado', shippingWeight:'0.08 kg', customLabel0:'Oferta', customLabel1:'Gafas', additionalImages:[] },
  P023: { googleCategory:'Apparel & Accessories > Bags > Waist Packs', productType:'Streetwear > Riñonera Neon Reflectiva', mpn:'WIN-P023', gtin:'7700000000034', gender:'unisex', ageGroup:'adult', color:'Lima reflectivo', size:'U', material:'Nylon técnico', pattern:'Reflectivo', shippingWeight:'0.25 kg', customLabel0:'Novedad', customLabel1:'Riñoneras', additionalImages:[] },
  P024: { googleCategory:'Apparel & Accessories > Clothing > Socks', productType:'Streetwear > Set Medias Deportivas x3', mpn:'WIN-P024', gtin:'7700000000035', gender:'unisex', ageGroup:'adult', color:'Blanco/negro/gris', size:'U', material:'Algodón + elastano', pattern:'Logos', shippingWeight:'0.12 kg', customLabel0:'Básicos', customLabel1:'Medias', additionalImages:[] },
  P025: { googleCategory:'Apparel & Accessories > Clothing Accessories > Scarves & Wraps', productType:'Streetwear > Bufanda Tubular Streetwear', mpn:'WIN-P025', gtin:'7700000000036', gender:'unisex', ageGroup:'adult', color:'Negro', size:'U', material:'Microfibra técnica', pattern:'Liso', shippingWeight:'0.10 kg', customLabel0:'Básicos', customLabel1:'Accesorios', additionalImages:[] },
};

const MERCHANT_SALE_DATE = '2026-01-01T00:00:00-05:00/2026-12-31T23:59:59-05:00';
const DEFAULT_SHIPPING   = 'CO::0.00 COP';
const DEFAULT_TAX        = 'CO::0.00 COP';

/* ═══════════════════════════════════════════════════════════
   RUTAS — PRODUCTOS
   ═══════════════════════════════════════════════════════════ */

// GET /api/products  — todos los productos con stock
app.get('/api/products', requireApiKey, (req, res) => {
  const { category, search } = req.query;
  let sql    = PRODUCTS_QUERY;
  const args = [];

  const filters = [];
  if (category && category !== 'all') {
    filters.push('LOWER(p.category) = LOWER(?)');
    args.push(category);
  }
  if (search) {
    filters.push('(LOWER(p.name) LIKE LOWER(?) OR LOWER(p.sku) LIKE LOWER(?))');
    args.push(`%${search}%`, `%${search}%`);
  }
  if (filters.length) sql += ' WHERE ' + filters.join(' AND ');
  sql += ' ORDER BY p.rowid ASC';

  db.all(sql, args, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(normalizeProduct));
  });
});

// GET /api/products/:id — un producto
app.get('/api/products/:id', requireApiKey, (req, res) => {
  db.get(PRODUCTS_QUERY + ' WHERE p.id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(normalizeProduct(row));
  });
});

// POST /api/products — crear o actualizar producto
app.post('/api/products', requireAuth, (req, res) => {
  const {
    id, name, price, oldPrice, cost,
    category, image, badge, badgeType, sku, description, stock
  } = req.body;

  if (!name || !price) return res.status(400).json({ error: 'name y price son requeridos' });

  const productId = id || ('P' + Date.now().toString(36).toUpperCase());

  db.serialize(() => {
    db.run(`
      INSERT INTO products (id, name, price, oldPrice, cost, category, image, badge, badgeType, sku, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name        = excluded.name,
        price       = excluded.price,
        oldPrice    = excluded.oldPrice,
        cost        = excluded.cost,
        category    = excluded.category,
        image       = excluded.image,
        badge       = excluded.badge,
        badgeType   = excluded.badgeType,
        sku         = excluded.sku,
        description = excluded.description
    `, [
      productId, name, price,
      oldPrice  || null,
      cost      || 0,
      category  || null,
      image     || null,
      badge     || null,
      badgeType || null,
      sku       || null,
      description || null,
    ], function(err) {
      if (err) return res.status(500).json({ error: err.message });

      if (stock && typeof stock === 'object') {
        const stmt = db.prepare(`
          INSERT INTO inventory (product_id, size, qty) VALUES (?, ?, ?)
          ON CONFLICT(product_id, size) DO UPDATE SET qty = excluded.qty
        `);
        Object.entries(stock).forEach(([size, qty]) => stmt.run(productId, size, Number(qty) || 0));
        stmt.finalize();
      }

      res.json({ success: true, id: productId });
    });
  });
});

// PUT /api/products/:id/stock — actualizar solo el stock
app.put('/api/products/:id/stock', requireAuth, (req, res) => {
  const { stock } = req.body;
  if (!stock) return res.status(400).json({ error: 'stock requerido' });

  const stmt = db.prepare(`
    INSERT INTO inventory (product_id, size, qty) VALUES (?, ?, ?)
    ON CONFLICT(product_id, size) DO UPDATE SET qty = excluded.qty
  `);
  Object.entries(stock).forEach(([size, qty]) => stmt.run(req.params.id, size, Number(qty) || 0));
  stmt.finalize((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// DELETE /api/products/:id
app.delete('/api/products/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — VENTAS
   ═══════════════════════════════════════════════════════════ */

// GET /api/sales — todas las ventas con items
app.get('/api/sales', requireAuth, (req, res) => {
  const { from, to, method, channel, limit = 500 } = req.query;

  let sql  = `
    SELECT s.*,
      (SELECT json_group_array(
        json_object('name', product_name, 'qty', qty, 'price', price, 'size', size)
       ) FROM sale_items WHERE sale_id = s.id) AS items
    FROM sales s
  `;
  const args    = [];
  const filters = [];

  if (from)    { filters.push('s.timestamp >= ?'); args.push(from); }
  if (to)      { filters.push('s.timestamp <= ?'); args.push(to); }
  if (method)  { filters.push('s.method = ?');     args.push(method); }
  if (channel) { filters.push('s.channel = ?');    args.push(channel); }

  if (filters.length) sql += ' WHERE ' + filters.join(' AND ');
  sql += ' ORDER BY s.timestamp DESC LIMIT ?';
  args.push(Number(limit));

  db.all(sql, args, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]') })));
  });
});

// POST /api/sales — registrar venta
app.post('/api/sales', requireAuth, (req, res) => {
  const {
    id, timestamp, vendor, client,
    method, channel, subtotal, discount, total, items
  } = req.body;

  if (!total) return res.status(400).json({ error: 'total es requerido' });

  const saleId = id || ('S' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase());

  db.serialize(() => {
    db.run(`
      INSERT INTO sales (id, timestamp, vendor, client, method, channel, subtotal, discount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `, [
      saleId,
      timestamp || new Date().toISOString(),
      vendor    || 'Vendedor',
      client    || '—',
      method    || 'Efectivo',
      channel   || 'fisica',
      subtotal  || total,
      discount  || 0,
      total,
    ], function(err) {
      if (err) return res.status(500).json({ error: err.message });

      if (Array.isArray(items) && items.length) {
        const stmt = db.prepare(`
          INSERT INTO sale_items (sale_id, product_name, qty, price, size)
          VALUES (?, ?, ?, ?, ?)
        `);
        items.forEach(item => stmt.run(saleId, item.name, item.qty || 1, item.price || 0, item.size || 'U'));
        stmt.finalize();
      }

      res.json({ success: true, id: saleId });
    });
  });
});

// DELETE /api/sales/:id
app.delete('/api/sales/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM sales WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/* ═══════════════════════════════════════════════════════════
   RUTA — ESTADÍSTICAS (dashboard rápido)
   ═══════════════════════════════════════════════════════════ */
app.get('/api/stats', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  db.get(`
    SELECT
      (SELECT COUNT(*) FROM products) AS total_products,
      (SELECT COUNT(*) FROM sales WHERE timestamp LIKE ?)  AS sales_today,
      (SELECT COALESCE(SUM(total),0) FROM sales WHERE timestamp LIKE ?) AS revenue_today,
      (SELECT COALESCE(SUM(total),0) FROM sales) AS revenue_total,
      (SELECT COUNT(*) FROM (
        SELECT product_id FROM inventory
        GROUP BY product_id HAVING SUM(qty) = 0
      )) AS out_of_stock,
      (SELECT COUNT(*) FROM (
        SELECT product_id FROM inventory
        GROUP BY product_id HAVING SUM(qty) > 0 AND SUM(qty) <= 5
      )) AS low_stock
  `, [`${today}%`, `${today}%`], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

/* ═══════════════════════════════════════════════════════════
   RUTA — AUTH
   ═══════════════════════════════════════════════════════════ */
app.post('/api/login', (req, res) => {
  const { user, pass } = req.body || {};
  if (user === ADMIN_USER && passwordMatches(pass)) {
    const token = jwt.sign({ sub: user, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, user, role: 'admin' });
  }
  // Pequeño delay anti-brute-force
  setTimeout(() => res.status(401).json({ error: 'Credenciales inválidas' }), 400);
});

/* ═══════════════════════════════════════════════════════════
   RUTA — GOOGLE MERCHANT FEED CSV
   ═══════════════════════════════════════════════════════════ */
function esc(v) {
  if (v == null) return '';
  const s = String(v);
  return (s.includes('"') || s.includes(',') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"` : s;
}

app.get('/merchant-feed.csv', (req, res) => {
  db.all(PRODUCTS_QUERY + ' ORDER BY p.rowid ASC', [], (err, rows) => {
    if (err) return res.status(500).send('Error al generar el feed');

    const products = rows.map(normalizeProduct);
    const base     = `${req.protocol}://${req.get('host')}`;

    const header = [
      'id','title','description','link','image_link','additional_image_link',
      'availability','price','sale_price','sale_price_effective_date',
      'brand','gtin','mpn','condition','google_product_category','product_type',
      'gender','age_group','color','size','material','pattern','shipping_weight',
      'item_group_id','identifier_exists','tax','shipping','custom_label_0','custom_label_1'
    ];

    const lines = products.map(p => {
      const m          = p.metadata || {};
      const hasStock   = Object.values(p.stock || {}).some(q => q > 0);
      const isOnSale   = p.oldPrice && Number(p.oldPrice) > Number(p.price);
      const basePrice  = Number(p.price || 0).toFixed(2);
      const productUrl = `${base}/?product=${p.id}#productos`;
      const description = m.productType
        ? `${p.name} · ${m.productType} by Winner.`
        : `Ropa urbana Winner. ${p.name} — Streetwear colombiano.`;

      return [
        p.id, p.name, description, productUrl, p.img || '',
        (m.additionalImages || []).join(','),
        hasStock ? 'in stock' : 'out of stock',
        `${basePrice} COP`,
        isOnSale ? `${basePrice} COP` : '',
        isOnSale ? MERCHANT_SALE_DATE : '',
        'Winner',
        m.gtin || '', m.mpn || '', 'new',
        m.googleCategory || 'Apparel & Accessories > Clothing',
        m.productType    || p.cat || '',
        m.gender         || 'unisex',
        m.ageGroup       || 'adult',
        m.color          || '',
        m.size           || '',
        m.material       || '',
        m.pattern        || '',
        m.shippingWeight || '0.60 kg',
        p.id,
        m.gtin ? 'TRUE' : 'FALSE',
        DEFAULT_TAX, DEFAULT_SHIPPING,
        m.customLabel0 || (isOnSale ? 'Oferta' : 'Catalogo'),
        m.customLabel1 || (p.cat ? p.cat.toUpperCase() : 'GENERAL'),
      ].map(esc).join(',');
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=winner-merchant-feed.csv');
    res.send([header.join(','), ...lines].join('\n'));
  });
});

/* ═══════════════════════════════════════════════════════════
   FALLBACK — servir index.html para rutas de SPA
   ═══════════════════════════════════════════════════════════ */
app.get(/(.*)/, (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/merchant')) return next();
  res.sendFile(path.join(CLIENT_ROOT, 'index.html'));
});

/* ── Manejo de errores global ────────────────────────────── */
app.use((err, req, res, _next) => {
  console.error('❌ Error no controlado:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

/* ── Arrancar servidor ───────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   WINNER STORE  —  Servidor v2.0             ║
╠══════════════════════════════════════════════╣
║   🌐  http://localhost:${PORT}                  ║
║   🔑  Admin: admin / winner2026              ║
║   📦  API:   /api/products                  ║
║   📊  Stats: /api/stats                     ║
║   🛒  Feed:  /merchant-feed.csv             ║
╚══════════════════════════════════════════════╝
  `);
});
