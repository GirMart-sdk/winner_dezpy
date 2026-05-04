/* ═══════════════════════════════════════════════════════════
   WINNER STORE — server.js  v2.0
   Backend completo: Productos · Inventario · Ventas · Auth
   Merchant Feed CSV · Estadísticas · Seguridad JWT + API Key
   ═══════════════════════════════════════════════════════════ */
"use strict";

const express = require("express");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { scryptSync, timingSafeEqual, randomUUID } = require("crypto");
const { URL } = require("url");
require("dotenv").config();

const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/* ── Configuración de seguridad ──────────────────────────── */
const API_KEY = process.env.API_KEY || "prod-api-key-winner-2026";
const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-winner-2026";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PLAIN = process.env.ADMIN_PASSWORD;
const ADMIN_SALT = process.env.ADMIN_SALT || "winner_salt_2026";
const ADMIN_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  scryptSync("winner2026", ADMIN_SALT, 64).toString("hex");

function passwordMatches(pass) {
  if (!pass) return false;
  if (ADMIN_PLAIN && pass === ADMIN_PLAIN) return true;
  try {
    const hash = scryptSync(pass, ADMIN_SALT, 64).toString("hex");
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(ADMIN_HASH, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/* ── CORS ───────────────────────────────────────────────── */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin))
        return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  }),
);

/* ── Forzar HTTPS en producción ────────────────────────── */
if (IS_PRODUCTION) {
  app.use((req, res, next) => {
    // Verificar si viene de proxy (CloudFlare, Heroku, etc) con encriptación
    if (
      req.headers["x-forwarded-proto"] !== "https" &&
      req.protocol !== "https"
    ) {
      return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
    }
    next();
  });

  // Agregar headers de seguridad
  app.use((req, res, next) => {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.wompi.co https://www.pagofacil.com.co; style-src 'self' 'unsafe-inline'",
    );
    next();
  });
}

app.use(bodyParser.json({ limit: "15mb" }));
app.use(bodyParser.urlencoded({ limit: "15mb", extended: true }));

/* ── Error handler para bodyParser ──────────────────────– */
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    console.warn("⚠️ JSON Parse Error:", err.message);
    return res.status(400).json({
      error: "JSON inválido en el body",
      message: err.message,
    });
  }
  next(err);
});

/* ── Seguridad de archivos sensibles ────────────────────── */
const CLIENT_ROOT = path.join(__dirname, "..");
const BLOCKED_EXTENSIONS = [".db", ".sqlite", ".env", ".log"];
const BLOCKED_FILES = ["seed.js", "database.js", ".env", "server.js"];

app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    BLOCKED_EXTENSIONS.some((ext) => p.endsWith(ext)) ||
    BLOCKED_FILES.some((f) => p === "/" + f || p.endsWith("/" + f))
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  next();
});

app.use(express.static(CLIENT_ROOT));

/* ── Middleware de autenticación ────────────────────────── */
function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (key === API_KEY) {
    req.authenticated = "api-key";
    return next();
  }
  return res.status(401).json({ error: "API key inválida" });
}

function requireAuth(req, res, next) {
  const auth = req.header("authorization") || "";
  const apiKey = req.header("x-api-key");

  // Primero intenta con Bearer token
  if (auth.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(auth.slice(7), JWT_SECRET);
      req.authenticated = "jwt";
      return next();
    } catch (e) {
      // Token inválido, continúa a verificar API_KEY
    }
  }

  // Si no hay token válido, intenta con API_KEY
  if (apiKey === API_KEY) {
    req.authenticated = "api-key";
    return next();
  }

  // Si nada funciona, rechaza
  return res.status(401).json({ error: "No autorizado" });
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
  try {
    stock = JSON.parse(row.stock || "{}");
  } catch {}
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
  P001: {
    googleCategory:
      "Apparel & Accessories > Clothing > Outerwear > Hoodies & Sweatshirts",
    productType: "Streetwear > Crop Hoodie Oversize",
    mpn: "WIN-P001",
    gtin: "7700000000012",
    gender: "female",
    ageGroup: "adult",
    color: "Negro grafito",
    size: "XS,S,M,L,XL,XXL",
    material: "Algodón peinado 320g",
    pattern: "Liso",
    shippingWeight: "0.65 kg",
    customLabel0: "Oferta",
    customLabel1: "Hoodies",
    additionalImages: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=80",
    ],
  },
  P002: {
    googleCategory: "Apparel & Accessories > Clothing > Dresses",
    productType: "Streetwear > Mini Dress Urbana",
    mpn: "WIN-P002",
    gtin: "7700000000013",
    gender: "female",
    ageGroup: "adult",
    color: "Blanco hueso",
    size: "XS,S,M,L,XL,XXL",
    material: "Satín stretch",
    pattern: "Texturizado",
    shippingWeight: "0.52 kg",
    customLabel0: "Novedad",
    customLabel1: "Vestidos",
    additionalImages: [
      "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=900&q=80",
    ],
  },
  P003: {
    googleCategory: "Apparel & Accessories > Clothing > Activewear",
    productType: "Streetwear > Set Legging + Top",
    mpn: "WIN-P003",
    gtin: "7700000000014",
    gender: "female",
    ageGroup: "adult",
    color: "Negro/lima",
    size: "XS,S,M,L,XL",
    material: "Licra compresiva 4-way",
    pattern: "Bicolor",
    shippingWeight: "0.70 kg",
    customLabel0: "Oferta",
    customLabel1: "Conjuntos",
    additionalImages: [],
  },
  P004: {
    googleCategory: "Apparel & Accessories > Clothing > Outerwear > Blazers",
    productType: "Streetwear > Blazer Crop",
    mpn: "WIN-P004",
    gtin: "7700000000015",
    gender: "female",
    ageGroup: "adult",
    color: "Beige arena",
    size: "XS,S,M,L,XL",
    material: "Lino stretch",
    pattern: "Liso",
    shippingWeight: "0.60 kg",
    customLabel0: "Premium",
    customLabel1: "Blazers",
    additionalImages: [],
  },
  P005: {
    googleCategory: "Apparel & Accessories > Clothing > Pants",
    productType: "Streetwear > Jogger Mom Fit",
    mpn: "WIN-P005",
    gtin: "7700000000016",
    gender: "female",
    ageGroup: "adult",
    color: "Gris jaspeado",
    size: "XS,S,M,L,XL,XXL",
    material: "French terry",
    pattern: "Liso",
    shippingWeight: "0.55 kg",
    customLabel0: "Básicos",
    customLabel1: "Joggers",
    additionalImages: [],
  },
  P006: {
    googleCategory:
      "Apparel & Accessories > Clothing > Shirts & Tops > T-shirts",
    productType: "Streetwear > Camiseta Ribbed",
    mpn: "WIN-P006",
    gtin: "7700000000017",
    gender: "female",
    ageGroup: "adult",
    color: "Crema",
    size: "XS,S,M,L,XL,XXL",
    material: "Algodón acanalado",
    pattern: "Acanalado",
    shippingWeight: "0.35 kg",
    customLabel0: "Oferta",
    customLabel1: "Tops",
    additionalImages: [],
  },
  P007: {
    googleCategory: "Apparel & Accessories > Clothing > Pants",
    productType: "Streetwear > Shorts Cargo Y2K",
    mpn: "WIN-P007",
    gtin: "7700000000018",
    gender: "female",
    ageGroup: "adult",
    color: "Caqui",
    size: "XS,S,M,L,XL",
    material: "Gabardina",
    pattern: "Cargo",
    shippingWeight: "0.42 kg",
    customLabel0: "Oferta",
    customLabel1: "Shorts",
    additionalImages: [],
  },
  P008: {
    googleCategory: "Apparel & Accessories > Clothing > Dresses",
    productType: "Streetwear > Vestido Asimétrico",
    mpn: "WIN-P008",
    gtin: "7700000000019",
    gender: "female",
    ageGroup: "adult",
    color: "Negro",
    size: "XS,S,M,L,XL",
    material: "Satín mate",
    pattern: "Liso",
    shippingWeight: "0.50 kg",
    customLabel0: "Premium",
    customLabel1: "Vestidos",
    additionalImages: [],
  },
  P009: {
    googleCategory:
      "Apparel & Accessories > Clothing > Shirts & Tops > T-shirts",
    productType: "Streetwear > Oversize Tee W Logo",
    mpn: "WIN-P009",
    gtin: "7700000000020",
    gender: "male",
    ageGroup: "adult",
    color: "Blanco puro",
    size: "XS,S,M,L,XL,XXL",
    material: "Algodón orgánico 200g",
    pattern: "Grafiti",
    shippingWeight: "0.35 kg",
    customLabel0: "Básicos",
    customLabel1: "Camisetas",
    additionalImages: [
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80",
    ],
  },
  P010: {
    googleCategory: "Apparel & Accessories > Clothing > Pants",
    productType: "Streetwear > Jogger Cargo Premium",
    mpn: "WIN-P010",
    gtin: "7700000000021",
    gender: "male",
    ageGroup: "adult",
    color: "Caqui militar",
    size: "S,M,L,XL,XXL",
    material: "Gabardina stretch",
    pattern: "Cargo",
    shippingWeight: "0.58 kg",
    customLabel0: "Oferta",
    customLabel1: "Joggers",
    additionalImages: [],
  },
  P011: {
    googleCategory: "Apparel & Accessories > Clothing > Outerwear > Jackets",
    productType: "Streetwear > Bomber Reflex Táctico",
    mpn: "WIN-P011",
    gtin: "7700000000022",
    gender: "male",
    ageGroup: "adult",
    color: "Negro metálico",
    size: "S,M,L,XL",
    material: "Nylon técnico reflectivo",
    pattern: "Reflectivo",
    shippingWeight: "0.72 kg",
    customLabel0: "Novedad",
    customLabel1: "Bomber",
    additionalImages: [],
  },
  P012: {
    googleCategory:
      "Apparel & Accessories > Clothing > Outerwear > Hoodies & Sweatshirts",
    productType: "Streetwear > Hoodie Canguro",
    mpn: "WIN-P012",
    gtin: "7700000000023",
    gender: "male",
    ageGroup: "adult",
    color: "Gris carbón",
    size: "XS,S,M,L,XL,XXL",
    material: "Fleece pesado 380g",
    pattern: "Liso",
    shippingWeight: "0.68 kg",
    customLabel0: "Básicos",
    customLabel1: "Hoodies",
    additionalImages: [],
  },
  P013: {
    googleCategory: "Apparel & Accessories > Clothing > Activewear",
    productType: "Streetwear > Camiseta Dry-Fit",
    mpn: "WIN-P013",
    gtin: "7700000000024",
    gender: "male",
    ageGroup: "adult",
    color: "Negro",
    size: "S,M,L,XL,XXL",
    material: "Poliéster técnico",
    pattern: "Liso",
    shippingWeight: "0.28 kg",
    customLabel0: "Sport",
    customLabel1: "Camisetas",
    additionalImages: [],
  },
  P014: {
    googleCategory: "Apparel & Accessories > Clothing > Pants",
    productType: 'Streetwear > Short Deportivo 5"',
    mpn: "WIN-P014",
    gtin: "7700000000025",
    gender: "male",
    ageGroup: "adult",
    color: "Negro",
    size: "S,M,L,XL,XXL",
    material: "Poliéster stretch",
    pattern: "Liso",
    shippingWeight: "0.30 kg",
    customLabel0: "Oferta",
    customLabel1: "Shorts",
    additionalImages: [],
  },
  P015: {
    googleCategory: "Apparel & Accessories > Clothing > Outerwear > Jackets",
    productType: "Streetwear > Chaqueta Rompevientos Neon",
    mpn: "WIN-P015",
    gtin: "7700000000026",
    gender: "male",
    ageGroup: "adult",
    color: "Lima neon",
    size: "S,M,L,XL,XXL",
    material: "Nylon ligero",
    pattern: "Liso",
    shippingWeight: "0.55 kg",
    customLabel0: "Oferta",
    customLabel1: "Chaquetas",
    additionalImages: [],
  },
  P016: {
    googleCategory: "Apparel & Accessories > Clothing > Pants",
    productType: "Streetwear > Pantalón Cargo Multicorreas",
    mpn: "WIN-P016",
    gtin: "7700000000027",
    gender: "male",
    ageGroup: "adult",
    color: "Negro",
    size: "S,M,L,XL,XXL",
    material: "Gabardina técnica",
    pattern: "Multicorreas",
    shippingWeight: "0.70 kg",
    customLabel0: "Premium",
    customLabel1: "Cargo",
    additionalImages: [],
  },
  P017: {
    googleCategory: "Apparel & Accessories > Clothing Accessories > Hats",
    productType: "Streetwear > Bucket Hat Logo W",
    mpn: "WIN-P017",
    gtin: "7700000000028",
    gender: "unisex",
    ageGroup: "adult",
    color: "Beige arena",
    size: "U",
    material: "Lona liviana",
    pattern: "Liso",
    shippingWeight: "0.20 kg",
    customLabel0: "Accesorios",
    customLabel1: "Sombreros",
    additionalImages: [],
  },
  P018: {
    googleCategory: "Apparel & Accessories > Clothing Accessories > Hats",
    productType: "Streetwear > Gorra Snapback Premium",
    mpn: "WIN-P018",
    gtin: "7700000000029",
    gender: "unisex",
    ageGroup: "adult",
    color: "Negro",
    size: "U",
    material: "Lona rígida",
    pattern: "Liso",
    shippingWeight: "0.22 kg",
    customLabel0: "Básicos",
    customLabel1: "Gorras",
    additionalImages: [],
  },
  P019: {
    googleCategory: "Apparel & Accessories > Bags > Backpacks",
    productType: "Streetwear > Mochila Táctica Urbana",
    mpn: "WIN-P019",
    gtin: "7700000000030",
    gender: "unisex",
    ageGroup: "adult",
    color: "Negro carbón",
    size: "U",
    material: "Poliéster 600D",
    pattern: "Geométrico",
    shippingWeight: "0.95 kg",
    customLabel0: "Oferta",
    customLabel1: "Mochilas",
    additionalImages: [],
  },
  P020: {
    googleCategory: "Apparel & Accessories > Handbags > Crossbody Bags",
    productType: "Streetwear > Bolso Crossbody Cuero PU",
    mpn: "WIN-P020",
    gtin: "7700000000031",
    gender: "female",
    ageGroup: "adult",
    color: "Marrón",
    size: "U",
    material: "Cuero sintético PU",
    pattern: "Liso",
    shippingWeight: "0.65 kg",
    customLabel0: "Oferta",
    customLabel1: "Bolsos",
    additionalImages: [],
  },
  P021: {
    googleCategory: "Apparel & Accessories > Jewelry > Necklaces",
    productType: "Streetwear > Cadena Cubana Acero",
    mpn: "WIN-P021",
    gtin: "7700000000032",
    gender: "unisex",
    ageGroup: "adult",
    color: "Plateado",
    size: "U",
    material: "Acero inoxidable 316L",
    pattern: "Cubano",
    shippingWeight: "0.15 kg",
    customLabel0: "Oferta",
    customLabel1: "Joyería",
    additionalImages: [],
  },
  P022: {
    googleCategory:
      "Apparel & Accessories > Clothing Accessories > Sunglasses & Eyewear",
    productType: "Streetwear > Gafas Espejadas Y2K",
    mpn: "WIN-P022",
    gtin: "7700000000033",
    gender: "unisex",
    ageGroup: "adult",
    color: "Espejado multicolor",
    size: "U",
    material: "TR90 + policarbonato",
    pattern: "Espejado",
    shippingWeight: "0.08 kg",
    customLabel0: "Oferta",
    customLabel1: "Gafas",
    additionalImages: [],
  },
  P023: {
    googleCategory: "Apparel & Accessories > Bags > Waist Packs",
    productType: "Streetwear > Riñonera Neon Reflectiva",
    mpn: "WIN-P023",
    gtin: "7700000000034",
    gender: "unisex",
    ageGroup: "adult",
    color: "Lima reflectivo",
    size: "U",
    material: "Nylon técnico",
    pattern: "Reflectivo",
    shippingWeight: "0.25 kg",
    customLabel0: "Novedad",
    customLabel1: "Riñoneras",
    additionalImages: [],
  },
  P024: {
    googleCategory: "Apparel & Accessories > Clothing > Socks",
    productType: "Streetwear > Set Medias Deportivas x3",
    mpn: "WIN-P024",
    gtin: "7700000000035",
    gender: "unisex",
    ageGroup: "adult",
    color: "Blanco/negro/gris",
    size: "U",
    material: "Algodón + elastano",
    pattern: "Logos",
    shippingWeight: "0.12 kg",
    customLabel0: "Básicos",
    customLabel1: "Medias",
    additionalImages: [],
  },
  P025: {
    googleCategory:
      "Apparel & Accessories > Clothing Accessories > Scarves & Wraps",
    productType: "Streetwear > Bufanda Tubular Streetwear",
    mpn: "WIN-P025",
    gtin: "7700000000036",
    gender: "unisex",
    ageGroup: "adult",
    color: "Negro",
    size: "U",
    material: "Microfibra técnica",
    pattern: "Liso",
    shippingWeight: "0.10 kg",
    customLabel0: "Básicos",
    customLabel1: "Accesorios",
    additionalImages: [],
  },
};

const MERCHANT_SALE_DATE =
  "2026-01-01T00:00:00-05:00/2026-12-31T23:59:59-05:00";
const DEFAULT_SHIPPING = "CO::0.00 COP";
const DEFAULT_TAX = "CO::0.00 COP";

/* ═══════════════════════════════════════════════════════════
   RUTAS — PRODUCTOS
   ═══════════════════════════════════════════════════════════ */

// GET /api/products  — todos los productos con stock
app.get("/api/products", requireApiKey, (req, res) => {
  const { category, search } = req.query;
  let sql = PRODUCTS_QUERY;
  const args = [];

  const filters = [];
  if (category && category !== "all") {
    filters.push("LOWER(p.category) = LOWER(?)");
    args.push(category);
  }
  if (search) {
    filters.push("(LOWER(p.name) LIKE LOWER(?) OR LOWER(p.sku) LIKE LOWER(?))");
    args.push(`%${search}%`, `%${search}%`);
  }
  if (filters.length) sql += " WHERE " + filters.join(" AND ");
  sql += " ORDER BY p.rowid ASC";

  db.all(sql, args, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(normalizeProduct));
  });
});

// GET /api/products/:id — un producto
app.get("/api/products/:id", requireApiKey, (req, res) => {
  db.get(PRODUCTS_QUERY + " WHERE p.id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(normalizeProduct(row));
  });
});

// POST /api/products — crear o actualizar producto (FIXED SKU UNIQUE)
app.post("/api/products", requireAuth, (req, res) => {
  const {
    id,
    name,
    price,
    oldPrice,
    cost,
    category,
    image,
    badge,
    badgeType,
    sku: providedSku,
    description,
    stock,
  } = req.body;

  // Validar datos requeridos
  if (!name || !price || isNaN(price) || price <= 0) {
    return res.status(400).json({
      error: "name y price válido (>0) son requeridos",
      success: false,
    });
  }

  const productId = id || "P" + Date.now().toString(36).toUpperCase();
  let safeSku =
    providedSku || `WIN-${Date.now().toString(36).slice(-6).toUpperCase()}`;

  // Verificar SKU único si es nuevo producto O SKU cambió
  db.get(
    "SELECT id FROM products WHERE sku = ? AND id != ?",
    [safeSku, productId],
    (err, existing) => {
      if (err) {
        console.error("❌ Error checking SKU:", err);
        return res.status(500).json({ error: err.message, success: false });
      }
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `SKU "${safeSku}" ya existe (ID: ${existing.id})`,
          suggestion: "Cambia SKU o edita el producto existente",
        });
      }

      // Proceder con INSERT/UPDATE — preservar SKU original en UPDATE
      const updateSet = `
      name = excluded.name,
      price = excluded.price,
      oldPrice = excluded.oldPrice,
      cost = excluded.cost,
      category = excluded.category,
      image = excluded.image,
      badge = excluded.badge,
      badgeType = excluded.badgeType,
      description = excluded.description,
      sku = COALESCE((SELECT sku FROM products WHERE id = excluded.id), excluded.sku),
      updated_at = CURRENT_TIMESTAMP
    `;

      db.run(
        `
      INSERT INTO products (id, name, price, oldPrice, cost, category, image, badge, badgeType, sku, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET ${updateSet}
    `,
        [
          productId,
          name,
          price,
          oldPrice || null,
          cost || 0,
          category || null,
          image || null,
          badge || null,
          badgeType || null,
          safeSku,
          description || null,
        ],
        function (sqliteErr) {
          if (sqliteErr) {
            console.error("❌ Error saving product:", sqliteErr);
            return res.status(500).json({
              error: sqliteErr.message,
              success: false,
              details: "SQLite error — contacta administrador",
            });
          }

          console.log(
            `✅ Producto ${this.changes > 0 ? "actualizado" : "creado"}: ${productId} (${safeSku})`,
          );

          // Actualizar stock si existe
          if (stock && typeof stock === "object") {
            const stockEntries = Object.entries(stock);
            let stocksUpdated = 0;
            const stmt = db.prepare(`
            INSERT INTO inventory (product_id, size, qty) VALUES (?, ?, ?)
            ON CONFLICT(product_id, size) DO UPDATE SET qty = excluded.qty, updated_at = CURRENT_TIMESTAMP
          `);

            stockEntries.forEach(([size, qty]) => {
              stmt.run(productId, size, Number(qty) || 0, (err) => {
                if (err) console.error(`❌ Stock error ${size}:`, err);
                stocksUpdated++;

                if (stocksUpdated === stockEntries.length) {
                  stmt.finalize((finalErr) => {
                    if (finalErr) {
                      console.error("❌ Finalize error:", finalErr);
                      return res
                        .status(500)
                        .json({ error: finalErr.message, success: false });
                    }
                    res.json({
                      success: true,
                      id: productId,
                      sku: safeSku,
                      message: `Producto ${this.changes > 0 ? "actualizado" : "creado"} ✓`,
                      changes: this.changes,
                    });
                  });
                }
              });
            });

            if (stockEntries.length === 0) {
              stmt.finalize();
              res.json({
                success: true,
                id: productId,
                sku: safeSku,
                message: "Producto guardado ✓",
              });
            }
          } else {
            res.json({
              success: true,
              id: productId,
              sku: safeSku,
              message: "Producto guardado ✓",
            });
          }
        },
      );
    },
  );
});

// PUT /api/products/:id/stock — actualizar solo el stock
app.put("/api/products/:id/stock", requireAuth, (req, res) => {
  const { stock } = req.body;
  if (!stock) return res.status(400).json({ error: "stock requerido" });

  const stmt = db.prepare(`
    INSERT INTO inventory (product_id, size, qty) VALUES (?, ?, ?)
    ON CONFLICT(product_id, size) DO UPDATE SET qty = excluded.qty
  `);
  Object.entries(stock).forEach(([size, qty]) =>
    stmt.run(req.params.id, size, Number(qty) || 0),
  );
  stmt.finalize((err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// DELETE /api/products/:id
app.delete("/api/products/:id", requireAuth, (req, res) => {
  db.run("DELETE FROM products WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — VENTAS
   ═══════════════════════════════════════════════════════════ */

// GET /api/sales — todas las ventas con items
app.get("/api/sales", requireAuth, (req, res) => {
  const { from, to, method, channel, limit = 500 } = req.query;

  let sql = `
    SELECT s.*,
      (SELECT json_group_array(
        json_object('name', product_name, 'qty', qty, 'price', price, 'size', size)
       ) FROM sale_items WHERE sale_id = s.id) AS items
    FROM sales s
  `;
  const args = [];
  const filters = [];

  if (from) {
    filters.push("s.timestamp >= ?");
    args.push(from);
  }
  if (to) {
    filters.push("s.timestamp <= ?");
    args.push(to);
  }
  if (method) {
    filters.push("s.method = ?");
    args.push(method);
  }
  if (channel) {
    filters.push("s.channel = ?");
    args.push(channel);
  }

  if (filters.length) sql += " WHERE " + filters.join(" AND ");
  sql += " ORDER BY s.timestamp DESC LIMIT ?";
  args.push(Number(limit));

  db.all(sql, args, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map((r) => ({ ...r, items: JSON.parse(r.items || "[]") })));
  });
});

// POST /api/sales — registrar venta (desde admin o tienda online)
app.post("/api/sales", (req, res, next) => {
  // Permitir tanto autenticación Bearer como API Key
  const auth = req.header("authorization") || "";
  const apiKey = req.header("x-api-key");

  // Verificar autenticación
  if (auth.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(auth.slice(7), JWT_SECRET);
      return handlePostSales(req, res);
    } catch {
      return res.status(401).json({ error: "Token inválido", success: false });
    }
  } else if (apiKey === API_KEY) {
    return handlePostSales(req, res);
  } else {
    return res
      .status(401)
      .json({ error: "Autenticación requerida", success: false });
  }
});

function handlePostSales(req, res) {
  const {
    id,
    timestamp,
    vendor,
    client,
    method,
    channel,
    subtotal,
    discount,
    total,
    items,
  } = req.body;

  if (!total)
    return res
      .status(400)
      .json({ error: "total es requerido", success: false });

  const saleId =
    id ||
    "S" +
      Date.now().toString(36).toUpperCase() +
      Math.random().toString(36).slice(2, 5).toUpperCase();
  const saleTimestamp = timestamp || new Date().toISOString();

  db.run(
    `
    INSERT INTO sales (id, timestamp, vendor, client, method, channel, subtotal, discount, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      saleId,
      saleTimestamp,
      vendor || "Vendedor",
      client || "—",
      method || "Efectivo",
      channel || "fisica",
      subtotal || 0,
      discount || 0,
      total,
    ],
    function (sqlErr) {
      if (sqlErr) {
        console.error("❌ Error inserting sale:", sqlErr);
        return res.status(500).json({ error: sqlErr.message, success: false });
      }

      if (Array.isArray(items) && items.length > 0) {
        const stmt = db.prepare(`
        INSERT INTO sale_items (sale_id, product_name, qty, price, size)
        VALUES (?, ?, ?, ?, ?)
      `);

        let itemsProcessed = 0;
        items.forEach((item) => {
          stmt.run(
            saleId,
            item.name || item.product_name || "—",
            item.qty || 1,
            item.price || 0,
            item.size || "U",
            (err) => {
              if (err) console.error("❌ Error inserting item:", err);
              itemsProcessed++;

              if (itemsProcessed === items.length) {
                stmt.finalize((err) => {
                  if (err) console.error("❌ Error finalizing:", err);
                  console.log("✅ Venta guardada:", saleId);
                  res.json({
                    success: true,
                    id: saleId,
                    message: "Venta registrada exitosamente",
                  });
                });
              }
            },
          );
        });
      } else {
        console.log("✅ Venta guardada:", saleId);
        res.json({
          success: true,
          id: saleId,
          message: "Venta registrada exitosamente",
        });
      }
    },
  );
}

// DELETE /api/sales/:id
app.delete("/api/sales/:id", requireAuth, (req, res) => {
  db.run("DELETE FROM sales WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/* ═══════════════════════════════════════════════════════════
   RUTA — ESTADÍSTICAS (dashboard rápido)
   ═══════════════════════════════════════════════════════════ */
app.get("/api/stats", requireAuth, (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  db.get(
    `
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
  `,
    [`${today}%`, `${today}%`],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    },
  );
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — ANALYTICS AVANZADO (Seguimiento de Ventas)
   ═══════════════════════════════════════════════════════════ */

// GET /api/analytics/sales-by-channel — Ventas por canal (online/fisica)
app.get("/api/analytics/sales-by-channel", requireAuth, (req, res) => {
  db.all(
    `
    SELECT 
      COALESCE(channel, 'fisica') AS channel,
      COUNT(*) AS total_sales,
      SUM(total) AS total_revenue,
      AVG(total) AS avg_sale,
      MIN(total) AS min_sale,
      MAX(total) AS max_sale
    FROM sales
    GROUP BY channel
    ORDER BY total_revenue DESC
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// GET /api/analytics/sales-by-product — Ventas por producto
app.get("/api/analytics/sales-by-product", requireAuth, (req, res) => {
  db.all(
    `
    SELECT 
      si.product_name AS name,
      SUM(si.qty) AS qty_sold,
      COUNT(DISTINCT si.sale_id) AS times_sold,
      SUM(si.qty * si.price) AS total_revenue,
      AVG(si.price) AS avg_price,
      MAX(si.price) AS max_price,
      MIN(si.price) AS min_price
    FROM sale_items si
    GROUP BY si.product_name
    ORDER BY total_revenue DESC
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// GET /api/analytics/sales-timeline — Ventas agrupadas por día/mes
app.get("/api/analytics/sales-timeline", requireAuth, (req, res) => {
  const { period = "day" } = req.query; // day, week, month

  let dateFormat = "%Y-%m-%d"; // por defecto día
  if (period === "week") dateFormat = "%Y-W%W";
  if (period === "month") dateFormat = "%Y-%m";

  db.all(
    `
    SELECT 
      strftime('${dateFormat}', timestamp) AS period,
      COUNT(*) AS sales_count,
      SUM(total) AS total_revenue,
      AVG(total) AS avg_sale,
      MIN(total) AS min_sale,
      MAX(total) AS max_sale,
      COUNT(DISTINCT channel) AS channels
    FROM sales
    GROUP BY period
    ORDER BY period DESC
    LIMIT 30
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// GET /api/analytics/inventory-status — Estado del inventario
app.get("/api/analytics/inventory-status", requireAuth, (req, res) => {
  db.all(
    `
    SELECT 
      p.id,
      p.name,
      p.price,
      p.cost,
      ROUND((p.price - p.cost) / p.price * 100) AS margin_percent,
      SUM(i.qty) AS total_stock,
      COUNT(DISTINCT i.size) AS size_variants,
      (SELECT COUNT(*) FROM sale_items WHERE product_name = p.name) AS times_sold,
      COALESCE((SELECT SUM(qty) FROM sale_items WHERE product_name = p.name), 0) AS units_sold
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    GROUP BY p.id
    ORDER BY total_stock ASC
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// GET /api/analytics/top-products — Top 10 productos más vendidos
app.get("/api/analytics/top-products", requireAuth, (req, res) => {
  db.all(
    `
    SELECT 
      si.product_name AS name,
      SUM(si.qty) AS qty_sold,
      COUNT(DISTINCT si.sale_id) AS sale_count,
      ROUND(SUM(si.qty * si.price)) AS revenue,
      ROUND(SUM(si.qty * si.price) / COUNT(DISTINCT si.sale_id)) AS revenue_per_sale
    FROM sale_items si
    GROUP BY si.product_name
    ORDER BY qty_sold DESC
    LIMIT 10
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// GET /api/analytics/low-stock — Productos con bajo stock
app.get("/api/analytics/low-stock", requireAuth, (req, res) => {
  const threshold = req.query.threshold || 5;

  db.all(
    `
    SELECT 
      p.id,
      p.name,
      p.sku,
      SUM(i.qty) AS total_stock,
      GROUP_CONCAT(i.size || ':' || i.qty, ' | ') AS stock_by_size
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    GROUP BY p.id
    HAVING total_stock <= ? AND total_stock > 0
    ORDER BY total_stock ASC
  `,
    [threshold],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// GET /api/analytics/summary — Resumen general de analytics
app.get("/api/analytics/summary", requireAuth, (req, res) => {
  const from = req.query.from || "2024-01-01";
  const to = req.query.to || new Date().toISOString().split("T")[0];

  db.get(
    `
    SELECT 
      (SELECT COUNT(*) FROM sales WHERE timestamp >= ? AND timestamp <= ?) AS total_sales,
      (SELECT SUM(total) FROM sales WHERE timestamp >= ? AND timestamp <= ?) AS total_revenue,
      (SELECT COUNT(DISTINCT channel) FROM sales WHERE timestamp >= ? AND timestamp <= ?) AS channels_active,
      (SELECT COUNT(DISTINCT product_name) FROM sale_items 
       WHERE sale_id IN (SELECT id FROM sales WHERE timestamp >= ? AND timestamp <= ?)) AS unique_products_sold,
      (SELECT SUM(qty) FROM sale_items 
       WHERE sale_id IN (SELECT id FROM sales WHERE timestamp >= ? AND timestamp <= ?)) AS total_units_sold,
      (SELECT COALESCE(AVG(total), 0) FROM sales WHERE timestamp >= ? AND timestamp <= ?) AS avg_sale_value,
      (SELECT COUNT(*) FROM products) AS total_products_catalog,
      (SELECT COUNT(DISTINCT size) FROM inventory) AS total_size_variants
  `,
    [from, to, from, to, from, to, from, to, from, to, from, to],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || {});
    },
  );
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — LOGÍSTICA (Shipping Options)
   ═══════════════════════════════════════════════════════════ */

// GET /api/shipping-options — Opciones de envío disponibles
app.get("/api/shipping-options", requireApiKey, (req, res) => {
  db.all(
    `SELECT * FROM shipping_options WHERE enabled = 1 ORDER BY priority DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// GET /api/orders/:id — Obtener detalles de un pedido
app.get("/api/orders/:id", requireApiKey, (req, res) => {
  db.get(`SELECT * FROM orders WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Pedido no encontrado" });
    res.json(row);
  });
});

// POST /api/orders — Crear nuevo pedido con logística
app.post("/api/orders", (req, res) => {
  const {
    sale_id,
    customer_email,
    customer_phone,
    shipping_address,
    shipping_method,
    shipping_cost,
  } = req.body;

  if (!sale_id || !shipping_method) {
    return res
      .status(400)
      .json({ error: "sale_id y shipping_method requeridos" });
  }

  const orderId = "ORD-" + Date.now().toString(36).toUpperCase();

  db.run(
    `
    INSERT INTO orders (id, sale_id, customer_email, customer_phone, shipping_address, shipping_method, shipping_cost, order_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `,
    [
      orderId,
      sale_id,
      customer_email,
      customer_phone,
      shipping_address,
      shipping_method,
      shipping_cost || 0,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        success: true,
        orderId,
        message: "Pedido creado exitosamente",
      });
    },
  );
});

// PUT /api/orders/:id/tracking — Actualizar número de seguimiento
app.put("/api/orders/:id/tracking", requireAuth, (req, res) => {
  const { tracking_number, order_status } = req.body;

  db.run(
    `
    UPDATE orders SET tracking_number = ?, order_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
    [tracking_number, order_status || "shipped", req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: "Pedido actualizado" });
    },
  );
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — PAGOS (Payment Processing)
   ═══════════════════════════════════════════════════════════ */

// POST /api/payments — Registrar pago de cliente
app.post("/api/payments", (req, res) => {
  try {
    const paymentData = req.body || {};
    const {
      id,
      timestamp,
      customer = {},
      method,
      methodName,
      total,
      items = [],
      status = "pending_verification",
      reference,
      shipping_address,
    } = paymentData;

    if (!customer.name || !customer.email || !customer.phone) {
      return res.status(400).json({ error: "Datos de cliente incompletos" });
    }

    if (!method || !total) {
      return res
        .status(400)
        .json({ error: "Método de pago y total requeridos" });
    }

    // Crear o actualizar perfil de clientsociale
    const customerId =
      "CUST-" +
      customer.email
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .slice(0, 20);

    db.run(
      `
      INSERT OR IGNORE INTO customer_profiles 
      (id, name, email, phone, country, vip_status, total_spent, purchase_count)
      VALUES (?, ?, ?, ?, 'CO', 'regular', 0, 0)
    `,
      [customerId, customer.name, customer.email, customer.phone],
    );

    // Registrar la venta
    const saleId = id || "SALE-" + Date.now().toString(36).toUpperCase();
    const saleData = {
      id: saleId,
      timestamp: timestamp || new Date().toISOString(),
      vendor: "Tienda Online",
      client: customer.name,
      method: method,
      channel: "online",
      subtotal: paymentData.subtotal || 0,
      discount: 0,
      total: total,
      payment_method: method,
      payment_status: status,
      customer_email: customer.email,
      customer_phone: customer.phone,
      shipping_address: shipping_address || customer.address,
      reference_number: reference,
    };

    db.run(
      `
      INSERT INTO sales 
      (id, timestamp, vendor, client, method, channel, subtotal, discount, total, 
       payment_method, payment_status, customer_email, customer_phone, shipping_address, reference_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        saleData.id,
        saleData.timestamp,
        saleData.vendor,
        saleData.client,
        saleData.method,
        saleData.channel,
        saleData.subtotal,
        saleData.discount,
        saleData.total,
        saleData.payment_method,
        saleData.payment_status,
        saleData.customer_email,
        saleData.customer_phone,
        saleData.shipping_address,
        saleData.reference_number,
      ],
      function (err) {
        if (err) {
          console.error("Error inserting sale:", err);
          return res
            .status(500)
            .json({ error: "Error al procesar pago: " + err.message });
        }

        // Registrar items de venta
        if (items && items.length > 0) {
          items.forEach((item) => {
            db.run(
              `
            INSERT INTO sale_items (sale_id, product_name, qty, price)
            VALUES (?, ?, ?, ?)
          `,
              [saleData.id, item.name, item.qty, item.price],
            );
          });
        }

        // Actualizar inventario
        if (items && items.length > 0) {
          items.forEach((item) => {
            db.run(
              `
            UPDATE inventory SET qty_sold = qty_sold + ? 
            WHERE product_name = ?
          `,
              [item.qty, item.name],
            );
          });
        }

        // Respuesta del pago
        const response = {
          success: true,
          payment: {
            id: saleData.id,
            reference: reference,
            status: status,
            method: method,
            methodName: methodName || method,
            amount: total,
            currency: "COP",
            customer: {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
            },
            timestamp: saleData.timestamp,
            items: items.length,
            message:
              method === "card"
                ? "Pago con tarjeta procesado. Recibirás confirmación por email."
                : "Pedido registrado. Te enviaremos instrucciones de pago por WhatsApp.",
          },
        };

        res.status(201).json(response);
      },
    );
  } catch (err) {
    console.error("Payment processing error:", err);
    res.status(500).json({ error: "Error al procesar pago: " + err.message });
  }
});

// GET /api/payments/:reference — Obtener detalles de pago
app.get("/api/payments/:reference", (req, res) => {
  db.get(
    `
    SELECT * FROM sales WHERE reference_number = ?
  `,
    [req.params.reference],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Pago no encontrado" });
      res.json(row);
    },
  );
});

// GET /api/payments/customer/:email — Obtener pagos de un cliente
app.get("/api/payments/customer/:email", (req, res) => {
  db.all(
    `
    SELECT * FROM sales WHERE customer_email = ? ORDER BY timestamp DESC
  `,
    [req.params.email],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — VIP CUSTOMERS (Análisis de clientes)
   ═══════════════════════════════════════════════════════════ */

// GET /api/customers/vip — Listar clientes VIP
app.get("/api/customers/vip", requireAuth, (req, res) => {
  db.all(
    `
    SELECT * FROM customer_profiles 
    WHERE vip_status = 'vip' 
    ORDER BY total_spent DESC
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// GET /api/customers/segment — Segmentación de clientes
app.get("/api/customers/segment", requireAuth, (req, res) => {
  db.all(
    `
    SELECT 
      vip_status,
      COUNT(*) AS count,
      AVG(total_spent) AS avg_spent,
      SUM(total_spent) AS total_spent,
      AVG(total_orders) AS avg_orders
    FROM customer_profiles
    GROUP BY vip_status
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// POST /api/customers/sync — Sincronizar clientes desde ventas
app.post("/api/customers/sync", requireAuth, (req, res) => {
  // Crear/actualizar perfiles desde tabla de ventas
  db.run(
    `
    INSERT OR REPLACE INTO customer_profiles (
      id, email, name, phone, total_spent, total_orders, last_purchase
    )
    SELECT 
      LOWER(REPLACE(client, ' ', '_')) || '_' || random(),
      client,
      client,
      NULL,
      (SELECT COALESCE(SUM(total), 0) FROM sales WHERE client = cp.email),
      (SELECT COUNT(*) FROM sales WHERE client = cp.email),
      (SELECT MAX(timestamp) FROM sales WHERE client = cp.email)
    FROM (SELECT DISTINCT client as email FROM sales) cp
  `,
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // Actualizar VIP status (gasto > $500.000)
      db.run(
        `
      UPDATE customer_profiles SET vip_status = 'vip' WHERE total_spent > 500000
    `,
        (err) => {
          if (err) console.error("Error updating VIP status:", err);
          res.json({ success: true, message: "Clientes sincronizados" });
        },
      );
    },
  );
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — REORDEN AUTOMÁTICO
   ═══════════════════════════════════════════════════════════ */

// GET /api/reorder-rules — Obtener reglas de reorden
app.get("/api/reorder-rules", requireAuth, (req, res) => {
  db.all(
    `
    SELECT rr.*, p.name, p.sku, SUM(i.qty) as current_stock
    FROM reorder_rules rr
    JOIN products p ON rr.product_id = p.id
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE rr.enabled = 1
    GROUP BY rr.id
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// POST /api/reorder-rules — Crear regla de reorden
app.post("/api/reorder-rules", requireAuth, (req, res) => {
  try {
    const { product_id, min_stock, qty_to_order, reorder_cost } =
      req.body || {};

    if (!product_id || !min_stock || !qty_to_order) {
      return res
        .status(400)
        .json({ error: "product_id, min_stock y qty_to_order requeridos" });
    }

    const ruleId = "REOR-" + Date.now().toString(36).toUpperCase();

    db.run(
      `
      INSERT INTO reorder_rules (id, product_id, min_stock, qty_to_order, reorder_cost, enabled)
      VALUES (?, ?, ?, ?, ?, 1)
    `,
      [ruleId, product_id, min_stock, qty_to_order, reorder_cost || 0],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, ruleId, message: "Regla de reorden creada" });
      },
    );
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/reorder-check — Verificar y ejecutar reorden automático
app.post("/api/reorder-check", requireAuth, (req, res) => {
  db.all(
    `
    SELECT rr.*, SUM(i.qty) as current_stock
    FROM reorder_rules rr
    JOIN inventory i ON rr.product_id = i.product_id
    WHERE rr.enabled = 1
    GROUP BY rr.product_id
    HAVING current_stock <= rr.min_stock
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const reorders = rows || [];
      res.json({
        needs_reorder: reorders.length > 0,
        reorders: reorders,
        message: `${reorders.length} producto(s) necesitan reorden`,
      });
    },
  );
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — PREDICCIÓN DE DEMANDA (ML Simple)
   ═══════════════════════════════════════════════════════════ */

// GET /api/demand-forecast — Predicción de demanda
app.get("/api/demand-forecast", requireAuth, (req, res) => {
  db.all(
    `
    SELECT 
      df.*,
      p.name,
      p.sku,
      (SELECT AVG(qty) FROM sale_items WHERE product_name = p.name) as avg_monthly
    FROM demand_forecast df
    JOIN products p ON df.product_id = p.id
    ORDER BY df.last_updated DESC
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// POST /api/demand-forecast/calculate — Calcular predicción para todos o un producto
app.post("/api/demand-forecast/calculate", requireAuth, (req, res) => {
  try {
    const { product_id, period = "month" } = req.body || {};

    if (product_id) {
      // Calcular para un producto específico
      db.get(
        `
        SELECT 
          COUNT(*) as sales_count,
          AVG(qty) as avg_qty,
          SUM(qty) as total_qty
        FROM sale_items 
        WHERE product_name IN (SELECT name FROM products WHERE id = ?)
      `,
        [product_id],
        (err, stats) => {
          if (err) return res.status(500).json({ error: err.message });

          const avgQty = stats?.avg_qty || 5;
          const confidence = Math.min(100, (stats?.sales_count || 1) * 10);
          const predictedQty = Math.round(avgQty * 1.1);
          const trend = avgQty > 5 ? "up" : "stable";

          const forecastId = "FORE-" + Date.now().toString(36).toUpperCase();
          db.run(
            `
          INSERT OR REPLACE INTO demand_forecast (id, product_id, predicted_qty, confidence_score, trend, last_updated)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `,
            [forecastId, product_id, predictedQty, confidence, trend],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({
                success: true,
                forecast: {
                  product_id,
                  predicted_qty: predictedQty,
                  confidence_score: confidence,
                  trend,
                },
              });
            },
          );
        },
      );
    } else {
      // Calcular para todos los productos
      db.all(
        `
        SELECT DISTINCT si.product_name, p.id
        FROM sale_items si
        LEFT JOIN products p ON p.name = si.product_name
      `,
        [],
        (err, products) => {
          if (err) return res.status(500).json({ error: err.message });
          let processed = 0;

          products.forEach((prod) => {
            db.get(
              `
            SELECT COUNT(*) as cnt, AVG(qty) as avg_qty
            FROM sale_items WHERE product_name = ?
          `,
              [prod.product_name],
              (err, stats) => {
                if (!err && prod.id) {
                  const avgQty = stats?.avg_qty || 5;
                  const confidence = Math.min(100, (stats?.cnt || 1) * 10);
                  const predictedQty = Math.round(avgQty * 1.1);
                  const trend = avgQty > 5 ? "up" : "stable";

                  db.run(
                    `
                INSERT OR REPLACE INTO demand_forecast (id, product_id, predicted_qty, confidence_score, trend, last_updated)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
              `,
                    [
                      "FORE-" +
                        Date.now().toString(36).toUpperCase() +
                        "-" +
                        prod.id,
                      prod.id,
                      predictedQty,
                      confidence,
                      trend,
                    ],
                    () => {
                      processed++;
                      if (processed === products.length) {
                        res.json({
                          success: true,
                          message: `Predicciones calculadas para ${processed} productos`,
                        });
                      }
                    },
                  );
                }
              },
            );
          });

          if (products.length === 0) {
            res.json({
              success: true,
              message: "No hay productos para calcular",
            });
          }
        },
      );
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   RUTAS — EXPORTACIÓN (Reports)
   ═══════════════════════════════════════════════════════════ */

// GET /api/reports/sales-csv — Exportar ventas a CSV
app.get("/api/reports/sales-csv", requireAuth, (req, res) => {
  const { from, to } = req.query;

  let sql = `SELECT 
    s.id, s.timestamp, s.channel, s.vendor, s.client, s.method, 
    s.subtotal, s.discount, s.total
  FROM sales s`;
  const args = [];

  const filters = [];
  if (from) {
    filters.push("s.timestamp >= ?");
    args.push(from);
  }
  if (to) {
    filters.push("s.timestamp <= ?");
    args.push(to);
  }

  if (filters.length) sql += " WHERE " + filters.join(" AND ");
  sql += " ORDER BY s.timestamp DESC";

  db.all(sql, args, (err, rows) => {
    if (err) return res.status(500).send("Error al generar reporte");

    const csv = [
      [
        "ID",
        "Fecha",
        "Canal",
        "Vendedor",
        "Cliente",
        "Método",
        "Subtotal",
        "Descuento",
        "Total",
      ].join(","),
      ...(rows || []).map((r) =>
        [
          r.id,
          r.timestamp,
          r.channel,
          r.vendor,
          r.client,
          r.method,
          r.subtotal,
          r.discount,
          r.total,
        ].join(","),
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=reporte-ventas.csv",
    );
    res.send(csv);
  });
});

// GET /api/reports/inventory-csv — Exportar inventario a CSV
app.get("/api/reports/inventory-csv", requireAuth, (req, res) => {
  db.all(
    `
    SELECT p.id, p.name, p.sku, p.price, p.cost, 
           GROUP_CONCAT(i.size || ':' || i.qty, '|') as stock_by_size
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    GROUP BY p.id
    ORDER BY p.name
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).send("Error al generar reporte");

      const csv = [
        ["ID", "Nombre", "SKU", "Precio", "Costo", "Stock por Talla"].join(","),
        ...(rows || []).map((r) =>
          [r.id, r.name, r.sku, r.price, r.cost, r.stock_by_size || "-"].join(
            ",",
          ),
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=reporte-inventario.csv",
      );
      res.send(csv);
    },
  );
});

/* ── RUTA — AUTH
   ═══════════════════════════════════════════════════════════ */
app.post("/api/login", (req, res) => {
  console.log("📨 /api/login body:", req.body);
  console.log("📨 /api/login body type:", typeof req.body);
  const { user, pass } = req.body || {};
  console.log("📨 user:", user, "pass:", pass);
  if (user === ADMIN_USER && passwordMatches(pass)) {
    const token = jwt.sign({ sub: user, role: "admin" }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ token, user, role: "admin" });
  }
  // Pequeño delay anti-brute-force
  setTimeout(
    () => res.status(401).json({ error: "Credenciales inválidas" }),
    400,
  );
});

/* ═══════════════════════════════════════════════════════════
   RUTA — REFRESH TOKEN
   ═══════════════════════════════════════════════════════════ */
app.post("/api/refresh-token", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token no proporcionado" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    if (!decoded.sub || decoded.role !== "admin") {
      return res.status(401).json({ error: "Token inválido" });
    }
    const newToken = jwt.sign({ sub: decoded.sub, role: "admin" }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ token: newToken });
  } catch (e) {
    return res.status(401).json({ error: "Token inválido: " + e.message });
  }
});

/* ═══════════════════════════════════════════════════════════
   RUTA — GOOGLE MERCHANT FEED CSV
   ═══════════════════════════════════════════════════════════ */
function esc(v) {
  if (v == null) return "";
  const s = String(v);
  return s.includes('"') || s.includes(",") || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

app.get("/merchant-feed.csv", (req, res) => {
  db.all(PRODUCTS_QUERY + " ORDER BY p.rowid ASC", [], (err, rows) => {
    if (err) return res.status(500).send("Error al generar el feed");

    const products = rows.map(normalizeProduct);
    const base = `${req.protocol}://${req.get("host")}`;

    const header = [
      "id",
      "title",
      "description",
      "link",
      "image_link",
      "additional_image_link",
      "availability",
      "price",
      "sale_price",
      "sale_price_effective_date",
      "brand",
      "gtin",
      "mpn",
      "condition",
      "google_product_category",
      "product_type",
      "gender",
      "age_group",
      "color",
      "size",
      "material",
      "pattern",
      "shipping_weight",
      "item_group_id",
      "identifier_exists",
      "tax",
      "shipping",
      "custom_label_0",
      "custom_label_1",
    ];

    const lines = products.map((p) => {
      const m = p.metadata || {};
      const hasStock = Object.values(p.stock || {}).some((q) => q > 0);
      const isOnSale = p.oldPrice && Number(p.oldPrice) > Number(p.price);
      const basePrice = Number(p.price || 0).toFixed(2);
      const productUrl = `${base}/?product=${p.id}#productos`;
      const description = m.productType
        ? `${p.name} · ${m.productType} by Winner.`
        : `Ropa urbana Winner. ${p.name} — Streetwear colombiano.`;

      return [
        p.id,
        p.name,
        description,
        productUrl,
        p.img || "",
        (m.additionalImages || []).join(","),
        hasStock ? "in stock" : "out of stock",
        `${basePrice} COP`,
        isOnSale ? `${basePrice} COP` : "",
        isOnSale ? MERCHANT_SALE_DATE : "",
        "Winner",
        m.gtin || "",
        m.mpn || "",
        "new",
        m.googleCategory || "Apparel & Accessories > Clothing",
        m.productType || p.cat || "",
        m.gender || "unisex",
        m.ageGroup || "adult",
        m.color || "",
        m.size || "",
        m.material || "",
        m.pattern || "",
        m.shippingWeight || "0.60 kg",
        p.id,
        m.gtin ? "TRUE" : "FALSE",
        DEFAULT_TAX,
        DEFAULT_SHIPPING,
        m.customLabel0 || (isOnSale ? "Oferta" : "Catalogo"),
        m.customLabel1 || (p.cat ? p.cat.toUpperCase() : "GENERAL"),
      ]
        .map(esc)
        .join(",");
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=winner-merchant-feed.csv",
    );
    res.send([header.join(","), ...lines].join("\n"));
  });
});

/* ═══════════════════════════════════════════════════════════
   FALLBACK — servir index.html para rutas de SPA
   ═══════════════════════════════════════════════════════════ */
app.get(/(.*)/, (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/merchant"))
    return next();
  res.sendFile(path.join(CLIENT_ROOT, "index.html"));
});

/* ── Manejo de errores global ────────────────────────────── */
app.use((err, req, res, _next) => {
  console.error("❌ Error:", err.message);
  console.error("   Path:", req.path);
  console.error("   Method:", req.method);
  res
    .status(err.status || 500)
    .json({ error: "Error interno del servidor", message: err.message });
});

/* ── Arrancar servidor ───────────────────────────────────── */
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const HTTP_PORT = process.env.HTTP_PORT || 80;

function startServer() {
  if (IS_PRODUCTION && process.env.CERT_PATH && process.env.KEY_PATH) {
    // PRODUCCIÓN: Usar HTTPS con redirección HTTP → HTTPS
    try {
      const options = {
        key: fs.readFileSync(process.env.KEY_PATH),
        cert: fs.readFileSync(process.env.CERT_PATH),
      };

      // Crear aplicación para redireccionar HTTP → HTTPS
      const redirectApp = express();
      redirectApp.use((req, res) => {
        res.redirect(`https://${req.hostname}${req.originalUrl}`);
      });

      // Iniciar servidor HTTPS
      https.createServer(options, app).listen(HTTPS_PORT, () => {
        console.log(`
╔══════════════════════════════════════════════╗
║   WINNER STORE  —  Servidor v2.0 (HTTPS)    ║
╠══════════════════════════════════════════════╣
║   🔒  https://winner.com                     ║
║   🔑  Admin: admin / winner2026              ║
║   📦  API:   /api/products                  ║
║   📊  Stats: /api/stats                     ║
║   🛒  Feed:  /merchant-feed.csv             ║
║   🌐  HTTP:  puerto ${HTTP_PORT} → HTTPS     ║
╚══════════════════════════════════════════════╝`);
      });

      // Iniciar servidor HTTP (redirige a HTTPS)
      http.createServer(redirectApp).listen(HTTP_PORT, () => {
        console.log(`   ↳ HTTP redirect activo en puerto ${HTTP_PORT}`);
      });
    } catch (err) {
      console.error("❌ Error cargando certificados SSL/TLS:", err.message);
      console.log("ℹ️  Usando HTTP como alternativa");
      fallbackToHttp();
    }
  } else {
    // DESARROLLO: Usar HTTP simple
    fallbackToHttp();
  }
}

function fallbackToHttp() {
  http.createServer(app).listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   WINNER POS  —  POS Físico v4.0             ║
╠══════════════════════════════════════════════╣
║   🌐  http://localhost:${PORT}/admin-panel.html ║
║   🔑  Admin: admin / winner2026              ║
║   📦  API:   /api/products                  ║
║   📊  Stats: /api/stats                     ║
║   🛒  Feed:  /merchant-feed.csv             ║
║   💰  $21.8MM ventas físicas demo           ║
║                                              ║
║   ⚠️  POS FÍSICO PURO (online eliminado)     ║
╚══════════════════════════════════════════════╝`);
  });
}

startServer();
