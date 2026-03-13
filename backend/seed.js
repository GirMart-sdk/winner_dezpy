const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'winner_store.db');
const db = new sqlite3.Database(dbPath);

const initialProducts = [
  { id: 'P001', name: 'Crop Hoodie Urbana', cat: 'mujer', price: 89990, oldPrice: 129990, img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80', stock: { XS: 3, S: 8, M: 12, L: 10, XL: 5, XXL: 2 } },
  { id: 'P002', name: 'Jogger Cargo Pro', cat: 'hombre', price: 79990, oldPrice: 109990, img: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=300&q=80', stock: { XS: 0, S: 4, M: 15, L: 12, XL: 8, XXL: 3 } },
  { id: 'P003', name: 'Bomber Reflex', cat: 'hombre', price: 189990, badge: 'NUEVO', badgeType: 'new', img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&q=80', stock: { XS: 0, S: 2, M: 5, L: 4, XL: 1, XXL: 0 } },
  { id: 'P004', name: 'Mini Dress Urban', cat: 'mujer', price: 99990, oldPrice: 149990, img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&q=80', stock: { XS: 5, S: 10, M: 8, L: 6, XL: 3, XXL: 0 } },
  { id: 'P005', name: 'Bucket Hat Logo', cat: 'accesorios', price: 39990, img: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=300&q=80', stock: { XS: 0, S: 0, M: 20, L: 15, XL: 10, XXL: 0 } },
  { id: 'P006', name: 'Oversize Tee "W"', cat: 'hombre', price: 59990, badge: 'HOT', badgeType: 'hot', img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80', stock: { XS: 2, S: 6, M: 14, L: 10, XL: 5, XXL: 2 } },
  { id: 'P007', name: 'Set Deportivo W', cat: 'mujer', price: 119990, oldPrice: 159990, img: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=300&q=80', stock: { XS: 5, S: 7, M: 9, L: 5, XL: 2, XXL: 0 } },
  { id: 'P008', name: 'Mochila Táctica', cat: 'accesorios', price: 69990, oldPrice: 89990, img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&q=80', stock: { XS: 0, S: 0, M: 11, L: 0, XL: 0, XXL: 0 } },
];

db.serialize(() => {
  console.log('Recreating tables to match new schema...');
  
  // We drop and recreate for clean seed in this demo
  db.run(`DROP TABLE IF EXISTS products`);
  db.run(`DROP TABLE IF EXISTS inventory`);
  
  db.run(`CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT,
    image TEXT,
    badge TEXT,
    badgeType TEXT,
    oldPrice REAL
  )`);

  db.run(`CREATE TABLE inventory (
    product_id TEXT,
    size TEXT,
    qty INTEGER DEFAULT 0,
    PRIMARY KEY (product_id, size),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);

  console.log('Seeding initial data...');
  const stmtProd = db.prepare(`INSERT INTO products (id, name, price, category, image, badge, badgeType, oldPrice) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const stmtInv = db.prepare(`INSERT INTO inventory (product_id, size, qty) VALUES (?, ?, ?)`);

  initialProducts.forEach(p => {
    stmtProd.run(p.id, p.name, p.price, p.cat, p.img, p.badge || null, p.badgeType || null, p.oldPrice || null);
    Object.keys(p.stock).forEach(size => {
      stmtInv.run(p.id, size, p.stock[size]);
    });
  });

  stmtProd.finalize();
  stmtInv.finalize();
  
  console.log('Seeding complete.');
  db.close();
});
