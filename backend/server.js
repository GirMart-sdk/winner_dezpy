const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

const CLIENT_ROOT = path.join(__dirname, "..");
app.use(express.static(CLIENT_ROOT));

// ─── PRODUCTS & INVENTORY ───────────────────────────────────────────

// Get all products with their stock
app.get("/api/products", (req, res) => {
  const sql = `
    SELECT p.id, p.name, p.price, p.category as cat, p.image as img, 
           p.badge, p.badgeType, p.oldPrice,
    (SELECT json_group_object(size, qty) FROM inventory WHERE product_id = p.id) as stock
    FROM products p
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Parse the JSON stock string back to object
    const products = rows.map((row) => ({
      ...row,
      stock: JSON.parse(row.stock || "{}"),
    }));
    res.json(products);
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
