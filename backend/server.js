const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const { URL } = require("url");
require("dotenv").config();
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

const CLIENT_ROOT = path.join(__dirname, "..");
app.use(express.static(CLIENT_ROOT));

const PRODUCT_METADATA = {
  P001: {
    googleCategory: "Apparel & Accessories > Clothing > Outerwear > Hoodies & Sweatshirts",
    productType: "Streetwear > Hoodie Crop Urbana",
    mpn: "WIN-P001",
    gtin: "7700000000012",
    gender: "female",
    ageGroup: "adult",
    color: "Negro grafito",
    size: "XS,S,M,L,XL,XXL",
    material: "Algodón peinado",
    pattern: "Liso",
    shippingWeight: "0.65 kg",
    additionalImages: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=80",
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900&q=80",
    ],
    customLabel0: "Oferta",
    customLabel1: "Hoodies",
  },
  P002: {
    googleCategory: "Apparel & Accessories > Clothing > Pants",
    productType: "Streetwear > Jogger Cargo Pro",
    mpn: "WIN-P002",
    gtin: "7700000000013",
    gender: "male",
    ageGroup: "adult",
    color: "Caqui militar",
    size: "XS,S,M,L,XL,XXL",
    material: "Gabardina stretch",
    pattern: "Liso",
    shippingWeight: "0.58 kg",
    additionalImages: [
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=900&q=80",
    ],
    customLabel0: "Oferta",
    customLabel1: "Joggers",
  },
  P003: {
    googleCategory: "Apparel & Accessories > Clothing > Outerwear > Jackets",
    productType: "Streetwear > Bomber Reflex",
    mpn: "WIN-P003",
    gtin: "7700000000014",
    gender: "male",
    ageGroup: "adult",
    color: "Negro metálico",
    size: "S,M,L,XL",
    material: "Nylon técnico",
    pattern: "Reflectivo",
    shippingWeight: "0.72 kg",
    additionalImages: [
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80",
    ],
    customLabel0: "Novedad",
    customLabel1: "Bomber",
  },
  P004: {
    googleCategory: "Apparel & Accessories > Clothing > Dresses",
    productType: "Streetwear > Mini Dress Urban",
    mpn: "WIN-P004",
    gtin: "7700000000015",
    gender: "female",
    ageGroup: "adult",
    color: "Blanco hueso",
    size: "XS,S,M,L,XL",
    material: "Satín stretch",
    pattern: "Texturizado",
    shippingWeight: "0.52 kg",
    additionalImages: [
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=900&q=80",
      "https://images.unsplash.com/photo-1503342452485-86c63da3ad42?w=900&q=80",
    ],
    customLabel0: "Oferta",
    customLabel1: "Vestidos",
  },
  P005: {
    googleCategory: "Apparel & Accessories > Clothing Accessories > Hats",
    productType: "Streetwear > Bucket Hat Logo",
    mpn: "WIN-P005",
    gtin: "7700000000016",
    gender: "unisex",
    ageGroup: "adult",
    color: "Beige arena",
    size: "U",
    material: "Lona liviana",
    pattern: "Liso",
    shippingWeight: "0.20 kg",
    additionalImages: [
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=900&q=80",
    ],
    customLabel0: "Accesorios",
    customLabel1: "Sombreros",
  },
  P006: {
    googleCategory:
      "Apparel & Accessories > Clothing > Shirts & Tops > T-shirts",
    productType: "Streetwear > Oversize Tee W",
    mpn: "WIN-P006",
    gtin: "7700000000017",
    gender: "male",
    ageGroup: "adult",
    color: "Blanco puro",
    size: "XS,S,M,L,XL,XXL",
    material: "Algodón orgánico",
    pattern: "Grafiti",
    shippingWeight: "0.35 kg",
    additionalImages: [
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=80",
    ],
    customLabel0: "Básicos",
    customLabel1: "Camisetas",
  },
  P007: {
    googleCategory: "Apparel & Accessories > Clothing > Activewear",
    productType: "Streetwear > Set Deportivo W",
    mpn: "WIN-P007",
    gtin: "7700000000018",
    gender: "female",
    ageGroup: "adult",
    color: "Negro/rojo",
    size: "XS,S,M,L,XL",
    material: "Licra compresiva",
    pattern: "Bicolor",
    shippingWeight: "0.70 kg",
    additionalImages: [
      "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=900&q=80",
    ],
    customLabel0: "Oferta",
    customLabel1: "Conjuntos",
  },
  P008: {
    googleCategory: "Apparel & Accessories > Bags > Backpacks",
    productType: "Streetwear > Mochila Táctica",
    mpn: "WIN-P008",
    gtin: "7700000000019",
    gender: "unisex",
    ageGroup: "adult",
    color: "Negro carbón",
    size: "U",
    material: "Poliéster técnico",
    pattern: "Geométrico",
    shippingWeight: "0.95 kg",
    additionalImages: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80",
    ],
    customLabel0: "Gear",
    customLabel1: "Mochilas",
  },
};

function getProductMetadata(productId) {
  return PRODUCT_METADATA[productId] || {};
}

const MERCHANT_SALE_EFFECTIVE_DATE =
  "2026-03-01T00:00:00-05:00/2026-04-30T23:59:59-05:00";
const DEFAULT_SHIPPING = "CO::0.00 COP";
const DEFAULT_TAX = "CO::0.00 COP";

const PRODUCTS_WITH_STOCK_QUERY = `
  SELECT p.id, p.name, p.price, p.category as cat, p.image as img, 
         p.badge, p.badgeType, p.oldPrice,
  (SELECT json_group_object(size, qty) FROM inventory WHERE product_id = p.id) as stock
  FROM products p
`;

function normalizeProductRow(row) {
  const stock = JSON.parse(row.stock || "{}");
  return {
    ...row,
    stock,
    metadata: getProductMetadata(row.id),
  };
}

// ─── PRODUCTS & INVENTORY ───────────────────────────────────────────

// Get all products with their stock
app.get("/api/products", (req, res) => {
  db.all(PRODUCTS_WITH_STOCK_QUERY, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Parse the JSON stock string back to object
    const products = rows.map(normalizeProductRow);
    res.json(products);
  });
});

function formatProductAvailability(stock) {
  const quantities = Object.values(stock || {});
  return quantities.some((qty) => qty > 0) ? "in stock" : "out of stock";
}

function buildProductLink(req, productId) {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const url = new URL(baseUrl);
  url.pathname = "/";
  url.searchParams.set("product", productId);
  url.hash = "productos";
  return url.href;
}

function escapeCsvValue(value) {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

app.get("/merchant-feed.csv", (req, res) => {
  db.all(PRODUCTS_WITH_STOCK_QUERY, [], (err, rows) => {
    if (err) return res.status(500).send("Error al generar el feed");

    const products = rows.map(normalizeProductRow);

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

    const csvLines = products.map((product) => {
      const { metadata = {} } = product;
      const availability = formatProductAvailability(product.stock || {});
      const productLink = buildProductLink(req, product.id);
      const basePrice = Number(product.price || 0).toFixed(2);
      const isOnSale =
        product.oldPrice && Number(product.oldPrice) > Number(product.price);
      const salePrice = isOnSale ? basePrice : "";
      const saleEffectiveDate = isOnSale
        ? MERCHANT_SALE_EFFECTIVE_DATE
        : "";
      const description = metadata.productType
        ? `${product.name} · ${metadata.productType} by Winner.`
        : `Ropa urbana Winner inspirada en el streetwear colombiano con ${product.name}`;
      const additionalImageLink = (metadata.additionalImages || []).join(",");
      const customLabel0 =
        metadata.customLabel0 || (isOnSale ? "Oferta" : "Catalogo");
      const customLabel1 =
        metadata.customLabel1 ||
        (product.cat ? product.cat.toUpperCase() : "GENERAL");
      const googleCategory =
        metadata.googleCategory || "Apparel & Accessories > Clothing";
      const productType = metadata.productType || product.cat || "";
      const gtin = metadata.gtin || "";
      const mpn = metadata.mpn || "";
      const color = metadata.color || "";
      const size = metadata.size || "";
      const gender = metadata.gender || "unisex";
      const ageGroup = metadata.ageGroup || "adult";
      const material = metadata.material || "";
      const pattern = metadata.pattern || "";
      const shippingWeight = metadata.shippingWeight || "0.60 kg";
      const identifierExists = gtin ? "TRUE" : "FALSE";
      const tax = DEFAULT_TAX;
      const shipping = DEFAULT_SHIPPING;
      const itemGroupId = product.id;

      const values = [
        product.id,
        product.name,
        description,
        productLink,
        product.img || "",
        additionalImageLink,
        availability,
        `${basePrice} COP`,
        salePrice ? `${salePrice} COP` : "",
        saleEffectiveDate,
        "Winner",
        gtin,
        mpn,
        "new",
        googleCategory,
        productType,
        gender,
        ageGroup,
        color,
        size,
        material,
        pattern,
        shippingWeight,
        itemGroupId,
        identifierExists,
        tax,
        shipping,
        customLabel0,
        customLabel1,
      ];

      return values.map(escapeCsvValue).join(",");
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=winner-merchant-feed.csv",
    );
    res.send([header.join(","), ...csvLines].join("\n"));
  });
});

// Create or Update Product
app.post("/api/products", (req, res) => {
  const {
    id,
    name,
    price,
    category,
    image,
    badge,
    badgeType,
    oldPrice,
    stock,
  } = req.body;

  db.serialize(() => {
    db.run(
      `INSERT INTO products (id, name, price, category, image, badge, badgeType, oldPrice)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET 
            name=excluded.name, price=excluded.price, category=excluded.category, 
            image=excluded.image, badge=excluded.badge, badgeType=excluded.badgeType, 
            oldPrice=excluded.oldPrice`,
      [
        id,
        name,
        price,
        category || null,
        image || null,
        badge || null,
        badgeType || null,
        oldPrice || null,
      ],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Update stock
        if (stock) {
          const stmt =
            db.prepare(`INSERT INTO inventory (product_id, size, qty) VALUES (?, ?, ?)
                                  ON CONFLICT(product_id, size) DO UPDATE SET qty=excluded.qty`);
          Object.keys(stock).forEach((size) => {
            stmt.run(id, size, stock[size]);
          });
          stmt.finalize();
        }
        res.json({ success: true, id: id });
      },
    );
  });
});

// Delete product
app.delete("/api/products/:id", (req, res) => {
  db.run(`DELETE FROM products WHERE id = ?`, req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ─── SALES ─────────────────────────────────────────────────────────

// Get all sales
app.get("/api/sales", (req, res) => {
  const sql = `
    SELECT s.*, 
    (SELECT json_group_array(json_object('name', product_name, 'qty', qty, 'price', price)) 
     FROM sale_items WHERE sale_id = s.id) as items
    FROM sales s
    ORDER BY timestamp DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const sales = rows.map((row) => ({
      ...row,
      items: JSON.parse(row.items || "[]"),
    }));
    res.json(sales);
  });
});

// Register Sale
app.post("/api/sales", (req, res) => {
  const { id, timestamp, vendor, client, method, total, items } = req.body;

  db.serialize(() => {
    db.run(
      `INSERT INTO sales (id, timestamp, vendor, client, method, total) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      [id, timestamp, vendor, client, method, total],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const stmt = db.prepare(
          `INSERT INTO sale_items (sale_id, product_name, qty, price) VALUES (?, ?, ?, ?)`,
        );
        items.forEach((item) => {
          stmt.run(id, item.name, item.qty, item.price);
        });
        stmt.finalize();

        res.json({ success: true, id: id });
      },
    );
  });
});

app.delete("/api/sales/:id", (req, res) => {
  db.run(`DELETE FROM sales WHERE id = ?`, req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get(/(.*)/, (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(CLIENT_ROOT, "index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:3000`);
});
