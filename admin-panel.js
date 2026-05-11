/* ═══════════════════════════════════════════════════════
   WINNER — admin-panel.js
   Login · Dashboard · Inventario+QR · POS · Pagos · Ventas
   ═══════════════════════════════════════════════════════ */

"use strict";

/* ══════════════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════════════ */
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

// Función centralizada para obtener tallas según categoría
function getSizesForCategory(category) {
  const cat = (category || "").toLowerCase().trim();

  // Accesorios: sin tallas
  if (
    cat === "accesorios" ||
    cat === "accessories" ||
    cat.includes("accesorio")
  ) {
    return [];
  }

  // Calzado: números 34-43
  if (
    cat === "calzado" ||
    cat === "shoes" ||
    cat === "zapatos" ||
    cat.includes("calzado") ||
    cat.includes("shoe") ||
    cat.includes("zapato")
  ) {
    return ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43"];
  }

  // Todo lo demás (ropa): tallas estándar
  return SIZES; // ['XS','S','M','L','XL','XXL']
}

// Función para verificar si una categoría tiene tallas
function hasSizes(category) {
  return getSizesForCategory(category).length > 0;
}
let AUTH_TOKEN = null; // Global auth token

/* ══════════════════════════════════════════════════════════
   STATE (localStorage)
══════════════════════════════════════════════════════════ */
const LS = {
  get: (k, d) => {
    try {
      const v = localStorage.getItem("w_" + k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem("w_" + k, JSON.stringify(v));
    } catch {}
  },
};

let session = LS.get("session", null);
let inventory = [];
let salesLog = [];
let payLog = LS.get("payLog", []);

// NOTE: defaultPayMethods must be defined before this line — see below
let payMethods = null; // initialized after function definitions

if (typeof API_URL === "undefined") {
  const origin =
    typeof window !== "undefined" && window.location && window.location.origin
      ? window.location.origin
      : "http://localhost:3000";

  const apiOrigin = origin.startsWith("file:")
    ? "http://localhost:3000"
    : origin;

  if (typeof window !== "undefined") {
    window.API_URL = `${apiOrigin.replace(/\/$/, "")}/api`;
  }
}
const API_KEY =
  (typeof window !== "undefined" && window.API_KEY
    ? window.API_KEY
    : undefined) ||
  (typeof localStorage !== "undefined"
    ? localStorage.getItem("w_api_key")
    : undefined) ||
  "prod-api-key-winner-2026";
const apiFetch = (url, options = {}) => {
  const headers = { ...(options.headers || {}), "x-api-key": API_KEY };
  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }
  return fetch(url, { ...options, headers });
};
async function fetchInventory() {
  try {
    console.log("📦 Cargando inventario desde API:", API_URL + "/products");
    const res = await apiFetch(`${API_URL}/products`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    console.log(
      "✅ Inventario cargado:",
      data.length || data?.value?.length || 0,
      "productos",
    );

    // Manejar diferentes formatos de respuesta
    if (Array.isArray(data)) {
      inventory = data;
    } else if (data.value && Array.isArray(data.value)) {
      inventory = data.value;
    } else {
      throw new Error("Formato de respuesta inválido");
    }

    console.log("📊 Productos totales:", inventory.length);
    renderInventory();
    renderPOSProducts();
    updateInventoryInsightBadge(); // Conectar con Smart Insights
    renderSmartInsights(); // Actualizar dashboard si aplica
  } catch (e) {
    console.error("❌ Error cargando inventario:", e.message);
    inventory = [];
    toast("⚠️ Error cargando productos");
  }
}

async function fetchSalesLog() {
  try {
    const res = await apiFetch(`${API_URL}/sales`);
    const data = await res.json();

    // Asegurar que data es un array
    if (!Array.isArray(data)) {
      console.error("⚠️ Respuesta de sales no es un array:", data);
      salesLog = [];
      return;
    }

    salesLog = data.map((s) => ({
      ...s,
      ts: s.timestamp,
      channel: "fisica", // SOLO POS FÍSICO
    })); // [FUTURO] Restaurar lógica canal online externo
    renderSalesStats();
    renderSalesTable();
    updateInventoryInsightBadge(); // Ventas afectan rotación -> Smart Insights
    renderSmartInsights();
  } catch (e) {
    console.error("Error fetching sales:", e);
  }
}

/* ── POS in-memory ── */
let posCart = [];
let posSelectedMethod = "Efectivo";

/* ── Scanner state ── */
let scanMode = "inventory";
let scanStream = null;
let posScanStream = null;
let scanInterval = null;

/* ── Current QR product (modal) ── */
let qrCurrentProduct = null;

/* ══════════════════════════════════════════════════════════
   DEFAULT DATA
══════════════════════════════════════════════════════════ */
function defaultInventory() {
  return [
    {
      id: 1,
      name: "Crop Hoodie Urbana",
      cat: "mujer",
      price: 89990,
      cost: 42000,
      sku: "WIN-001",
      img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=75",
      stock: { XS: 4, S: 8, M: 12, L: 6, XL: 3, XXL: 0 },
    },
    {
      id: 2,
      name: "Jogger Cargo Pro",
      cat: "hombre",
      price: 79990,
      cost: 35000,
      sku: "WIN-002",
      img: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=300&q=75",
      stock: { XS: 0, S: 5, M: 9, L: 7, XL: 4, XXL: 1 },
    },
    {
      id: 3,
      name: "Bomber Reflex",
      cat: "hombre",
      price: 189990,
      cost: 90000,
      sku: "WIN-003",
      img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&q=75",
      stock: { XS: 1, S: 3, M: 5, L: 3, XL: 2, XXL: 0 },
    },
    {
      id: 4,
      name: "Mini Dress Urban",
      cat: "mujer",
      price: 99990,
      cost: 48000,
      sku: "WIN-004",
      img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&q=75",
      stock: { XS: 6, S: 10, M: 8, L: 4, XL: 2, XXL: 0 },
    },
    {
      id: 5,
      name: "Bucket Hat Logo",
      cat: "accesorios",
      price: 39990,
      cost: 15000,
      sku: "WIN-005",
      img: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=300&q=75",
      stock: { U: 50 },
    },
    {
      id: 6,
      name: 'Oversize Tee "W"',
      cat: "hombre",
      price: 59990,
      cost: 22000,
      sku: "WIN-006",
      img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=75",
      stock: { XS: 2, S: 14, M: 18, L: 12, XL: 6, XXL: 3 },
    },
    {
      id: 7,
      name: "Set Legging + Top",
      cat: "mujer",
      price: 119990,
      cost: 55000,
      sku: "WIN-007",
      img: "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=300&q=75",
      stock: { XS: 5, S: 7, M: 9, L: 5, XL: 2, XXL: 0 },
    },
    {
      id: 8,
      name: "Mochila Táctica",
      cat: "accesorios",
      price: 69990,
      cost: 28000,
      sku: "WIN-008",
      img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&q=75",
      stock: { U: 30 },
    },
    {
      id: 9,
      name: "Chaqueta Cuero Rider",
      cat: "hombre",
      price: 249990,
      cost: 120000,
      sku: "WIN-009",
      img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&q=75",
      stock: { S: 4, M: 6, L: 4, XL: 2 },
    },
    {
      id: 10,
      name: "Vestido Gala Night",
      cat: "mujer",
      price: 199990,
      cost: 85000,
      sku: "WIN-010",
      img: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=300&q=75",
      stock: { XS: 2, S: 4, M: 4, L: 2 },
    },
    {
      id: 11,
      name: "Sneakers Futuristas",
      cat: "calzado",
      price: 159990,
      cost: 70000,
      sku: "WIN-011",
      img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=75",
      stock: { 36: 5, 37: 8, 38: 12, 39: 10, 40: 6, 41: 4 },
    },
    {
      id: 12,
      name: "Gafas de Sol Retro",
      cat: "accesorios",
      price: 54990,
      cost: 20000,
      sku: "WIN-012",
      img: "https://images.unsplash.com/photo-1511499767390-a73359580ca4?w=300&q=75",
      stock: { U: 40 },
    },
    {
      id: 13,
      name: "Pantalón Wide Leg",
      cat: "mujer",
      price: 129990,
      cost: 55000,
      sku: "WIN-013",
      img: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&q=75",
      stock: { XS: 4, S: 10, M: 12, L: 6 },
    },
    {
      id: 14,
      name: "Camisa Lino Oversize",
      cat: "hombre",
      price: 89990,
      cost: 38000,
      sku: "WIN-014",
      img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&q=75",
      stock: { S: 6, M: 12, L: 8, XL: 4 },
    },
    {
      id: 15,
      name: "Falda Plisada Midi",
      cat: "mujer",
      price: 79990,
      cost: 32000,
      sku: "WIN-015",
      img: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300&q=75",
      stock: { XS: 3, S: 8, M: 10, L: 5 },
    },
    {
      id: 16,
      name: "Hoodie Minimalista",
      cat: "hombre",
      price: 109990,
      cost: 45000,
      sku: "WIN-016",
      img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300&q=75",
      stock: { S: 8, M: 15, L: 10, XL: 5 },
    },
    {
      id: 17,
      name: "Botas Cuero Urban",
      cat: "calzado",
      price: 219990,
      cost: 95000,
      sku: "WIN-017",
      img: "https://images.unsplash.com/photo-1520639889313-7272a74b1c73?w=300&q=75",
      stock: { 38: 4, 39: 6, 40: 10, 41: 8, 42: 5 },
    },
    {
      id: 18,
      name: "Bolso Mano Chic",
      cat: "accesorios",
      price: 149990,
      cost: 60000,
      sku: "WIN-018",
      img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&q=75",
      stock: { U: 15 },
    },
    {
      id: 19,
      name: "Reloj Tech Digital",
      cat: "accesorios",
      price: 189990,
      cost: 80000,
      sku: "WIN-019",
      img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=75",
      stock: { U: 25 },
    },
    {
      id: 20,
      name: "Cinturón Piel Slim",
      cat: "accesorios",
      price: 49990,
      cost: 18000,
      sku: "WIN-020",
      img: "https://images.unsplash.com/photo-1624222247344-550fbad04543?w=300&q=75",
      stock: { U: 30 },
    },
    {
      id: 21,
      name: "Abrigo Lana Largo",
      cat: "mujer",
      price: 289990,
      cost: 130000,
      sku: "WIN-021",
      img: "https://images.unsplash.com/photo-1539533377285-33dfdf39ef6e?w=300&q=75",
      stock: { S: 3, M: 5, L: 4, XL: 2 },
    },
    {
      id: 22,
      name: "Top Corto Ribbed",
      cat: "mujer",
      price: 34990,
      cost: 12000,
      sku: "WIN-022",
      img: "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=300&q=75",
      stock: { XS: 8, S: 15, M: 20, L: 10 },
    },
    {
      id: 23,
      name: "Bermudas Cargo",
      cat: "hombre",
      price: 74990,
      cost: 30000,
      sku: "WIN-023",
      img: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=300&q=75",
      stock: { S: 5, M: 10, L: 8, XL: 4 },
    },
    {
      id: 24,
      name: "Sandalias Slide",
      cat: "calzado",
      price: 45990,
      cost: 15000,
      sku: "WIN-024",
      img: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=300&q=75",
      stock: { 36: 10, 37: 15, 38: 15, 39: 10 },
    },
    {
      id: 25,
      name: "Gorra Snapback",
      cat: "accesorios",
      price: 49990,
      cost: 18000,
      sku: "WIN-025",
      img: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&q=75",
      stock: { U: 60 },
    },
    {
      id: 26,
      name: "Pack Medias Diseño",
      cat: "accesorios",
      price: 24990,
      cost: 8000,
      sku: "WIN-026",
      img: "https://images.unsplash.com/photo-1582966239102-15994e77aa51?w=300&q=75",
      stock: { U: 100 },
    },
    {
      id: 27,
      name: "Blazer Slim Fit",
      cat: "hombre",
      price: 189990,
      cost: 75000,
      sku: "WIN-027",
      img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&q=75",
      stock: { S: 4, M: 8, L: 6, XL: 2 },
    },
    {
      id: 28,
      name: "Tenis Running Pro",
      cat: "calzado",
      price: 179990,
      cost: 80000,
      sku: "WIN-028",
      img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=75",
      stock: { 38: 5, 39: 10, 40: 15, 41: 12, 42: 8, 43: 5 },
    },
  ];
}

function defaultPayMethods() {
  return {
    national: [
      { id: "pse", name: "PSE", icon: "🏦", type: "Nacional", enabled: true },
      {
        id: "debit",
        name: "Tarjeta Débito",
        icon: "💳",
        type: "Nacional",
        enabled: true,
      },
      {
        id: "credit",
        name: "Tarjeta Crédito",
        icon: "💳",
        type: "Nacional",
        enabled: true,
      },
      {
        id: "cash",
        name: "Efectivo",
        icon: "💵",
        type: "Nacional",
        enabled: true,
      },
    ],
    wallets: [
      {
        id: "nequi",
        name: "Nequi",
        icon: "🟣",
        type: "Billetera",
        enabled: true,
      },
      {
        id: "daviplata",
        name: "Daviplata",
        icon: "🔴",
        type: "Billetera",
        enabled: true,
      },
      {
        id: "dale",
        name: "Dale!",
        icon: "🟡",
        type: "Billetera",
        enabled: true,
      },
      {
        id: "rappipay",
        name: "Rappipay",
        icon: "🟠",
        type: "Billetera",
        enabled: true,
      },
      {
        id: "movii",
        name: "Movii",
        icon: "🔵",
        type: "Billetera",
        enabled: false,
      },
      {
        id: "tpaga",
        name: "Tpaga",
        icon: "🟢",
        type: "Billetera",
        enabled: false,
      },
    ],
    delivery: [
      {
        id: "efecty",
        name: "Efecty",
        icon: "🏪",
        type: "Contra entrega",
        enabled: true,
      },
      {
        id: "baloto",
        name: "Baloto",
        icon: "🎰",
        type: "Contra entrega",
        enabled: true,
      },
      {
        id: "sured",
        name: "SuRed",
        icon: "🏬",
        type: "Contra entrega",
        enabled: false,
      },
    ],
    intl: [
      {
        id: "visa",
        name: "Visa",
        icon: "💙",
        type: "Internacional",
        enabled: true,
      },
      {
        id: "mc",
        name: "Mastercard",
        icon: "🔴",
        type: "Internacional",
        enabled: true,
      },
      {
        id: "paypal",
        name: "PayPal",
        icon: "🅿️",
        type: "Internacional",
        enabled: true,
      },
      {
        id: "stripe",
        name: "Stripe",
        icon: "⚡",
        type: "Internacional",
        enabled: true,
      },
      {
        id: "amex",
        name: "AMEX",
        icon: "🟦",
        type: "Internacional",
        enabled: false,
      },
    ],
  };
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);
const fmt = (n) => "$" + Number(n).toLocaleString("es-CO");
const nowStr = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().split("T")[0];
const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function fmtDate(iso) {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function stockStatus(t) {
  if (t === 0) return { label: "Sin stock", cls: "badge-out", tbcls: "s-out" };
  if (t <= 100)
    return { label: "Stock bajo", cls: "badge-low", tbcls: "s-low" };
  return { label: "Disponible", cls: "badge-ok", tbcls: "s-ok" };
}

let toastTimer;
function toast(msg, duration = 2800) {
  $("adminToastMsg").textContent = msg;
  $("adminToast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => $("adminToast").classList.remove("show"),
    duration,
  );
}

/* ── Total stock helper ── */
function totalStock(product) {
  if (!product || !product.stock) return 0;
  return Object.values(product.stock).reduce(
    (sum, qty) => sum + (Number(qty) || 0),
    0,
  );
}

/* ══════════════════════════════════════════════════════════
   CLOCK
══════════════════════════════════════════════════════════ */
function updateClock() {
  const el = $("topbarClock");
  if (el)
    el.textContent = new Date().toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
}
if (typeof document !== "undefined") {
  setInterval(updateClock, 1000);
  updateClock();
}

/* ══════════════════════════════════════════════════════════
   AUTH / LOGIN
══════════════════════════════════════════════════════════ */
function verifySession() {
  if (!session) return false;
  return !!session.user && !!session.token;
}

function doLogin() {
  const u = $("loginUser").value.trim() || "admin";
  const p = $("loginPass").value;

  if (!p) {
    const err = $("loginError");
    err.textContent = "Ingresa la contraseña para acceder al panel";
    err.style.display = "block";
    setTimeout(() => (err.style.display = "none"), 3000);
    return;
  }

  fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: u, pass: p }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = $("loginError");
        err.textContent = "❌ Credenciales incorrectas o sin Internet";
        err.style.display = "block";
        setTimeout(() => (err.style.display = "none"), 3000);
        return;
      }
      const data = await res.json();
      session = {
        user: data.user,
        role: data.role || "Administrador",
        avatar: (data.user || "")[0]?.toUpperCase() || "A",
        token: data.token,
      };
      LS.set("session", session);
      showApp();
    })
    .catch((e) => {
      const err = $("loginError");
      err.textContent = "No se pudo conectar con el servidor local";
      err.style.display = "block";
      console.error("Login error:", e);
      setTimeout(() => (err.style.display = "none"), 3000);
    });
}

function doLogout() {
  session = null;
  AUTH_TOKEN = null;
  LS.set("session", null);
  stopScanner();
  $("mainApp").style.display = "none";
  $("loginScreen").style.display = "flex";
  $("loginUser").value = "";
  $("loginPass").value = "";
}

function togglePass() {
  const inp = $("loginPass");
  inp.type = inp.type === "password" ? "text" : "password";
}

function showApp() {
  $("loginScreen").style.display = "none";
  $("mainApp").style.display = "flex";
  // Set user info
  if (session) {
    AUTH_TOKEN = session.token;
    $("sidebarUser").querySelector(".su-name").textContent = session.role;
  }
  bindSidebarNavigation();
  refreshAll();
  navigateTo("dashboard");
}

// Check session on load
if (typeof window !== "undefined")
  window.addEventListener("DOMContentLoaded", () => {
    if (verifySession()) {
      showApp();
    } else {
      session = null;
      LS.set("session", null);
      $("mainApp").style.display = "none";
      $("loginScreen").style.display = "flex";
    }
    // Enter key on login
    ["loginUser", "loginPass"].forEach((id) => {
      $(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") doLogin();
      });
    });
  });

function renderSalesStats() {
  const totalRevenue = salesLog.reduce(
    (sum, sale) => sum + Number(sale.total || 0),
    0,
  );
  const totalOrders = salesLog.length;
  const avgTicket = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };

  setText("kpiTotalRevenue", fmt(totalRevenue));
  setText("kpiOrders", totalOrders);
  setText("kpiAvgTicket", fmt(avgTicket));
  setText("sv1", fmt(totalRevenue));
  setText("sv2", totalOrders);
  setText("sv3", fmt(avgTicket));

  renderPayDistCards();
}

/* ══════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════ */
const PAGE_TITLES = {
  dashboard: "Dashboard",
  inventory: "Inventario & QR",
  pos: "Punto de Venta",
  payments: "Métodos de Pago",
  sales: "Registro de Ventas",
  qrscan: "Escáner QR",
  vip: "Clientes VIP",
  reorder: "Reorden Automático",
  forecast: "Predicción de Demanda",
};

function navigateTo(page) {
  // guard for non-browser environments
  if (typeof document === "undefined") return;
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".snav-item")
    .forEach((b) => b.classList.remove("active"));
  const pg = $("page-" + page);
  if (pg) pg.classList.add("active");
  const btn = document.querySelector(`[data-page="${page}"]`);
  if (btn) btn.classList.add("active");
  $("pageTitle").textContent = PAGE_TITLES[page] || page;
  // Close sidebar on mobile
  $("sidebar").classList.remove("mobile-open");

  // Load page-specific data
  if (page === "dashboard") {
    renderDashboard();
    loadAnalyticsData();
    // enableRealTimeSales(30000); // [DESACTIVADO] No ventas online
  }

  // Ejecutar siempre inventario / alertas de stock (típico en este panel)
  renderInventory();
  loadLowStockAlerts();

  if (page === "payments") {
    renderPayMethods();
    renderPaymentsTable();
  } else if (page === "vip") {
    loadVIPCustomersData();
  } else if (page === "reorder") {
    loadReorderData();
  } else if (page === "forecast") {
    loadForecastData();
  }
}

function bindSidebarNavigation() {
  if (document.body.dataset.sidebarDelegated !== "true") {
    document.body.dataset.sidebarDelegated = "true";
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".snav-item");
      if (!btn || !btn.dataset.page) return;
      e.preventDefault();
      navigateTo(btn.dataset.page);
    });
  }

  document.querySelectorAll(".snav-item").forEach((btn) => {
    if (btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";
    btn.addEventListener("click", () => navigateTo(btn.dataset.page));
  });
}

function toggleSidebar() {
  $("sidebar").classList.toggle("mobile-open");
}

/* ══════════════════════════════════════════════════════════
   REFRESH ALL
══════════════════════════════════════════════════════════ */
function refreshAll() {
  renderDashboard();
  fetchInventory();
  renderPOSPayGrid();
  renderPayMethods();
  renderPaymentsTable();
  fetchSalesLog();
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */
function renderDashboard() {
  const totalRevenue = salesLog.reduce((s, x) => s + x.total, 0);
  const totalOrders = salesLog.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  $("kpiTotalRevenue").textContent = fmt(totalRevenue);
  $("kpiOrders").textContent = totalOrders;
  $("kpiAvgTicket").textContent = fmt(avgTicket);

  // Resumen Total
  $("stVolTotal").textContent = fmt(totalRevenue);
  $("stTransTotal").textContent = totalOrders;

  // Recent sales
  const rl = $("dashRecentSales");
  if (!salesLog.length) {
    rl.innerHTML =
      '<p style="color:var(--gray-text);font-size:13px;text-align:center;padding:20px">Sin ventas aún</p>';
  } else {
    rl.innerHTML = salesLog
      .slice(0, 5)
      .map(
        (s) => `
      <div class="recent-item">
        <div>
          <div>${s.items
            .map((i) => i.name)
            .join(", ")
            .slice(0, 40)}…</div>
          <div class="recent-meta">${fmtDate(s.timestamp)} · Tienda Física</div>
        </div>
        <div class="recent-amount">${fmt(s.total)}</div>
      </div>`,
      )
      .join("");
  }

  renderPayDistCards();
  renderSmartInsights();
  // Los gráficos se cargan vía loadAnalyticsData() que llama a los renders específicos
}

function renderPayDistCards() {
  const container = $("payDistributionContainer");
  if (!container) return;

  const totalRevenue = salesLog.reduce((s, x) => s + x.total, 0);
  const methodStats = {};

  salesLog.forEach((s) => {
    if (!methodStats[s.method]) {
      methodStats[s.method] = { count: 0, total: 0 };
    }
    methodStats[s.method].count++;
    methodStats[s.method].total += s.total;
  });

  const methods = Object.keys(methodStats);
  if (!methods.length) {
    container.innerHTML =
      '<p style="color:var(--gray-text);grid-column:1/-1;text-align:center">No hay datos de transacciones</p>';
    return;
  }

  const iconMap = {
    efectivo: "💵",
    nequi: "📱",
    daviplata: "📱",
    tarjeta: "💳",
    pse: "🏦",
    visa: "💳",
    mastercard: "💳",
    paypal: "🌎",
    stripe: "🌎",
  };

  container.innerHTML = methods
    .map((m) => {
      const stats = methodStats[m];
      const percent = totalRevenue > 0 ? (stats.total / totalRevenue) * 100 : 0;
      const icon = iconMap[m.toLowerCase()] || "💰";

      return `
      <div class="pay-dist-card">
        <div class="pdc-header">
          <div class="pdc-icon">${icon}</div>
          <div>
            <div class="pdc-name">${m}</div>
            <div class="pdc-meta">${stats.count} transacciones</div>
          </div>
        </div>
        <div class="pdc-progress-wrap">
          <div class="pdc-bar-bg">
            <div class="pdc-bar-fill" style="width: ${percent}%"></div>
          </div>
        </div>
        <div class="pdc-footer">
          <div class="pdc-amount">${fmt(stats.total)}</div>
          <div class="pdc-percent">${percent.toFixed(1)}%</div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderSmartInsights() {
  const container = $("smartInsightsList");
  if (!container) return;

  const insights = [];

  // 1. Exceso de Stock (> 60 unidades totales)
  const overstocked = inventory.filter((p) => totalStock(p) > 60).slice(0, 2);
  overstocked.forEach((p) => {
    insights.push({
      type: "orange",
      icon: "📦",
      title: "Exceso de Stock",
      desc: `${p.name} tiene ${totalStock(p)} uds. Sugerencia: 20% OFF para rotar inventario.`,
      tag: "Liquidación",
    });
  });

  // 2. Baja Rotación (No aparece en salesLog reciente)
  const soldNames = new Set(
    salesLog.flatMap((s) => s.items.map((i) => i.name)),
  );
  const slowMovers = inventory
    .filter((p) => !soldNames.has(p.name))
    .slice(0, 2);
  slowMovers.forEach((p) => {
    insights.push({
      type: "blue",
      icon: "📉",
      title: "Baja Rotación",
      desc: `${p.name} no registra ventas recientes. Impulsar con oferta Black Friday.`,
      tag: "Impulsar",
    });
  });

  // 3. Alta Rentabilidad (Precio > 2.8 * Costo)
  const highMargin = inventory
    .filter((p) => p.price > p.cost * 2.8)
    .slice(0, 1);
  highMargin.forEach((p) => {
    insights.push({
      type: "green",
      icon: "💰",
      title: "Margen Alto",
      desc: `${p.name} permite un descuento del 40% manteniendo rentabilidad.`,
      tag: "Rentable",
    });
  });

  if (insights.length === 0) {
    container.innerHTML =
      '<p style="color:var(--gray-text);font-size:11px;text-align:center;padding:20px">Analizando datos para generar sugerencias...</p>';
    return;
  }

  container.innerHTML = insights
    .map(
      (i) => `
    <div class="insight-item" onclick="navigateTo('inventory'); setTimeout(() => { _insightFilterActive = true; renderInventory(); }, 100);" style="cursor:pointer">
      <div class="insight-icon ${i.type}">${i.icon}</div>
      <div class="insight-info">
        <div class="insight-title">${i.title}</div>
        <div class="insight-desc">${i.desc}</div>
      </div>
      <div class="insight-tag ${i.type}">${i.tag}</div>
    </div>
  `,
    )
    .join("");
}

let payChartInstance = null;
function renderPayChart() {
  const ctx = $("chartPayMethods");
  if (!ctx) return;

  const methodTotals = {};
  salesLog.forEach((s) => {
    methodTotals[s.method] = (methodTotals[s.method] || 0) + s.total;
  });

  const labels = Object.keys(methodTotals);
  const data = Object.values(methodTotals);
  const colors = [
    "#ffffff", // accent
    "#34c759", // green
    "#007aff", // blue
    "#ff9500", // orange
    "#ff3b30", // red
    "#af52de", // purple
    "#5856d6", // indigo
    "#ffcc00", // yellow
  ];

  if (payChartInstance) {
    payChartInstance.destroy();
  }

  if (!labels.length) {
    ctx.getContext("2d").clearRect(0, 0, ctx.width, ctx.height);
    return;
  }

  payChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Ventas (COP)",
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderRadius: 2,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => fmt(ctx.raw) },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#666", font: { size: 11 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#666",
            font: { size: 11 },
            callback: (v) => fmt(v),
          },
        },
      },
    },
  });
}

/* ══════════════════════════════════════════════════════════
 INVENTORY
══════════════════════════════════════════════════════════ */
let _insightFilterActive = false;
function filterByInsights() {
  _insightFilterActive = !_insightFilterActive;
  const btn = document.querySelector('button[onclick="filterByInsights()"]');
  if (btn) {
    btn.style.background = _insightFilterActive
      ? "gold"
      : "rgba(255, 215, 0, 0.1)";
    btn.style.color = _insightFilterActive ? "#000" : "gold";
  }
  renderInventory();
}

// ═══════════════════════════════════════════════════════════
// SISTEMA DE DESCUENTOS AUTOMÁTICOS CON SMS Y ALERTAS
// ═══════════════════════════════════════════════════════════

async function autoApplyDiscounts() {
  // Identificar productos con baja rotación (sin ventas)
  const slowMovers = inventory.filter((p) => {
    const hasSales = salesLog.some((s) =>
      s.items.some((it) => String(it.id) === String(p.id)),
    );
    return !hasSales && !p.on_sale;
  });

  // Identificar productos con sobrestock (>60 unidades)
  const overstocked = inventory.filter((p) => {
    const tStock = totalStock(p);
    return tStock > 60 && !p.on_sale;
  });

  // Combinar sin duplicados
  const targets = [...new Set([...slowMovers, ...overstocked])];

  if (targets.length === 0) {
    toast("✨ Sin productos para descuentos automáticos");
    return;
  }

  if (
    !confirm(
      `🔄 Aplicar descuentos automáticos a ${targets.length} productos?\\n\\n📉 Baja rotación: -30%\\n📦 Sobrestock: -20%`,
    )
  ) {
    toast("❌ Cancelado");
    return;
  }

  toast(`⏳ Aplicando descuentos a ${targets.length} productos...`);
  let slowCount = 0,
    overCount = 0;

  for (const p of targets) {
    let discount = 0.8; // 20% default
    let reason = "📦 Sobrestock";
    let descuento_porcentaje = "20%";

    if (slowMovers.includes(p)) {
      discount = 0.7; // 30% para baja rotación
      reason = "📉 Baja Rotación";
      descuento_porcentaje = "30%";
      slowCount++;
    } else if (overstocked.includes(p)) {
      overCount++;
    }

    const precioOriginal = p.price;
    const precioNuevo = Math.round(p.price * discount);
    const ahorros = precioOriginal - precioNuevo;

    const updatedProduct = {
      ...p,
      category: p.cat,
      image: p.img,
      promo_price: precioNuevo,
      on_sale: true,
    };

    try {
      await apiFetch(`${API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProduct),
      });

      // Enviar SMS con alerta en tiempo real
      await sendSMSAlert({
        type: "discount_applied",
        product: p.name,
        reason: reason,
        discount: descuento_porcentaje,
        original: precioOriginal,
        promo: precioNuevo,
        savings: ahorros,
        timestamp: new Date().toLocaleString(),
      });
    } catch (e) {
      console.error(`Error: ${p.name}`, e);
    }
  }

  fetchInventory();
  toast(
    `✅ Descuentos aplicados:\\n📉 ${slowCount} baja rotación (-30%)\\n📦 ${overCount} sobrestock (-20%)`,
  );
}

// Sistema de notificaciones SMS y alertas
async function sendSMSAlert(alertData) {
  const smsMessages = {
    discount_applied: `🏷️ DESCUENTO APLICADO\\n${alertData.product}\\n💰 ${alertData.original} → ${alertData.promo} (${alertData.discount})\\n💾 Ahorras: $${alertData.savings}\\n${alertData.reason}`,

    stock_low: `⚠️ STOCK BAJO\\n${alertData.product}\\n📦 Quedan: ${alertData.stock} unidades\\n🔴 Nivel: ${alertData.level}`,

    stock_critical: `🚨 STOCK CRÍTICO\\n${alertData.product}\\n⛔ AGOTADO!\\n🆘 ¡REABASTECER URGENTE!`,

    stock_alert: `📦 ALERTA DE INVENTARIO\\n${alertData.product}\\n${alertData.level} | Stock: ${alertData.stock} unidades\\n⏰ ${alertData.timestamp}`,
  };

  const message = smsMessages[alertData.type] || "🔔 Alerta del sistema";

  try {
    // Guardar en historial de alertas (localStorage)
    const alerts = JSON.parse(localStorage.getItem("sms_alerts") || "[]");
    const newAlert = {
      id: Date.now(),
      timestamp: alertData.timestamp || new Date().toLocaleString(),
      message: message,
      type: alertData.type,
      product: alertData.product || "General",
      read: false,
      priority:
        alertData.type === "stock_critical"
          ? "high"
          : alertData.type.includes("applied")
            ? "normal"
            : "medium",
    };

    alerts.push(newAlert);
    localStorage.setItem("sms_alerts", JSON.stringify(alerts.slice(-100))); // Guardar últimas 100

    // INTEGRACIÓN SMS EN PRODUCCIÓN (descomentar cuando esté configurado)
    // Opciones: Twilio, AWS SNS, Firebase Cloud Messaging, etc.
    /*
    if (window.SMS_ENABLED) {
      await apiFetch(`${API_URL}/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: getStorePhoneNumber(),
          message: message,
          priority: newAlert.priority,
          type: alertData.type
        }),
      });
    }
    */

    // Mostrar notificación en el dashboard
    displayRealTimeAlert(newAlert);

    console.log(`📱 SMS Alert [${alertData.type}]:`, message);
  } catch (e) {
    console.error("SMS Error:", e);
  }
}

// Mostrar alertas en tiempo real en el dashboard
function displayRealTimeAlert(alertData) {
  const alertsContainer = document.createElement("div");
  alertsContainer.className = "real-time-alert";
  alertsContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, rgba(51, 51, 51, 0.95) 0%, rgba(35, 35, 35, 0.95) 100%);
    border-left: 4px solid ${alertData.priority === "high" ? "#ff3b30" : alertData.priority === "medium" ? "#ff9500" : "#34c759"};
    color: #ffffff;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 99999;
    max-width: 350px;
    animation: slideIn 0.3s ease-out;
    backdrop-filter: blur(10px);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
  `;

  const icon =
    alertData.priority === "high"
      ? "🚨"
      : alertData.priority === "medium"
        ? "⚠️"
        : "✅";

  alertsContainer.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
      <div style="font-size: 20px; line-height: 1;">${icon}</div>
      <div style="flex: 1; font-size: 13px; line-height: 1.4;">
        <strong style="display: block; margin-bottom: 4px; font-size: 14px;">${alertData.product}</strong>
        <div style="color: rgba(255,255,255,0.8); white-space: pre-wrap; word-break: break-word;">${alertData.message.split("\\n").slice(1).join("\\n")}</div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 8px;">${alertData.timestamp}</div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 18px; padding: 0; line-height: 1;">✕</button>
    </div>
  `;

  document.body.appendChild(alertsContainer);

  // Auto-remover después de 8 segundos
  setTimeout(() => {
    alertsContainer.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => alertsContainer.remove(), 300);
  }, 8000);
}

// Obtener número de teléfono de la tienda (configurar en .env)
function getStorePhoneNumber() {
  return localStorage.getItem("store_phone") || "+573001234567";
}

// Configurar número de teléfono para alertas
function setStorePhoneNumber(phone) {
  localStorage.setItem("store_phone", phone);
  toast(`📱 Teléfono configurado: ${phone}`);
}

// Ver historial de alertas
function showAlertsHistory() {
  const alerts = JSON.parse(localStorage.getItem("sms_alerts") || "[]");
  if (alerts.length === 0) {
    toast("Sin alertas registradas");
    return;
  }

  console.log("📊 Historial de Alertas:", alerts);
  toast(`📋 ${alerts.length} alertas en historial (ver consola)`);
}

// Mantener compatibilidad con función antigua
async function applyAllInsights() {
  toast("💡 Usa '🔄 AUTO-DESCUENTOS' para aplicar cambios automáticamente");
}

function updateInventoryInsightBadge() {
  let count = 0;
  inventory.forEach((p) => {
    const tStock = totalStock(p);
    const hasSales = salesLog.some((s) =>
      s.items.some((it) => String(it.id) === String(p.id)),
    );
    const highMargin = p.cost > 0 && p.price > p.cost * 2.8;
    if ((tStock > 60 || !hasSales || highMargin) && !p.on_sale) {
      count++;
    }
  });
  const el = $("inventoryInsightBadge");
  if (el) {
    el.textContent = count;
    el.style.display = count > 0 ? "inline-block" : "none";
  }
}

function renderInventory() {
  const search = ($("invSearch") || { value: "" }).value.toLowerCase();
  const cat = ($("invCatFilter") || { value: "" }).value;

  let filtered = inventory.filter((p) => {
    return p.name.toLowerCase().includes(search) && (!cat || p.cat === cat);
  });

  if (_insightFilterActive) {
    filtered = filtered.filter((p) => {
      const tStock = totalStock(p);
      const hasSales = salesLog.some((s) =>
        s.items.some((it) => String(it.id) === String(p.id)),
      );
      const highMargin = p.cost > 0 && p.price > p.cost * 2.8;
      return (tStock > 60 || !hasSales || highMargin) && !p.on_sale;
    });
  }

  // Stats
  const low = inventory.filter((p) => {
    const t = totalStock(p);
    return t > 0 && t <= 100;
  }).length;
  const out = inventory.filter((p) => totalStock(p) === 0).length;
  const val = inventory.reduce((s, p) => s + p.price * totalStock(p), 0);
  $("is1").textContent = inventory.length;
  $("is2").textContent = low;
  $("is3").textContent = out;
  $("is4").textContent = fmt(val);

  updateInventoryInsightBadge();

  const container = $("invCards");
  if (!filtered.length) {
    container.innerHTML =
      '<p style="color:var(--gray-text);font-size:13px;grid-column:1/-1;text-align:center;padding:40px">Sin productos encontrados</p>';
    return;
  }

  container.innerHTML = filtered
    .map((p) => {
      const ts = totalStock(p);
      const stat = stockStatus(ts);
      const sizes = getSizesForCategory(p.cat);
      const sizesBadges =
        sizes.length > 0
          ? sizes
              .map((s) => {
                const qty = p.stock[s] || 0;
                const cls = qty === 0 ? "out" : qty <= 3 ? "low" : "ok";
                return `<span class="inv-size-badge ${cls}">${s}:${qty}</span>`;
              })
              .join("")
          : '<span style="color:var(--gray-text);font-size:12px">Sin talla</span>';

      const isOnSale = p.on_sale && p.promo_price > 0;
      const displayPrice = isOnSale
        ? `<span class="price-original">${fmt(p.price)}</span><span class="price-promo">${fmt(p.promo_price)}</span>`
        : fmt(p.price);
      const promoBadge = isOnSale
        ? `<span class="promo-badge">SALE %</span>`
        : "";

      return `
      <div class="inv-card" data-product-id="${p.id}">
        <span class="inv-stock-badge ${stat.cls}">${stat.label}</span>
        <img src="${p.img}" alt="${p.name}" class="inv-card-img"
          onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&q=75'"/>
        <div class="inv-card-body">
          <div class="inv-card-cat">${p.cat} ${promoBadge}</div>
          <div class="inv-card-name">${p.name}</div>
          <div class="inv-card-sku">${p.sku}</div>
          <div class="inv-card-price">${displayPrice}</div>
          <div class="inv-sizes">${sizesBadges}</div>
          <div class="inv-card-footer">
            <button class="btn-ghost btn-inv-qr" data-product-id="${p.id}">🔲 QR</button>
            <button class="btn-ghost btn-inv-edit" data-product-id="${p.id}">✎ Editar</button>
            <button class="btn-ghost btn-inv-delete" data-product-id="${p.id}" style="color:var(--red);border-color:rgba(255,71,87,0.3)">✕</button>
          </div>
        </div>
      </div>`;
    })
    .join("");

  // Agregar event listeners para botones
  setTimeout(() => {
    container.querySelectorAll(".btn-inv-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.dataset.productId;
        editProduct(id);
      });
    });

    container.querySelectorAll(".btn-inv-qr").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.dataset.productId;
        showProductQR(id);
      });
    });

    container.querySelectorAll(".btn-inv-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.dataset.productId;
        deleteProduct(id);
      });
    });
  }, 0);
}

async function deleteProduct(id) {
  if (!confirm("¿Eliminar este producto?")) return;
  try {
    const res = await apiFetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchInventory();
      toast("Producto eliminado");
    } else {
      toast("❌ Sin autorización");
    }
  } catch (e) {
    console.error("Error deleting product:", e);
  }
}

/* ══════════════════════════════════════════════════════════
 PRODUCT MODAL
══════════════════════════════════════════════════════════ */
function applyRecommendedPrice() {
  const id = $("editProductId").value;
  const p = inventory.find((x) => String(x.id) === String(id));
  if (!p) return;

  const tStock = totalStock(p);
  const hasSales = salesLog.some((s) =>
    s.items.some((it) => String(it.id) === String(p.id)),
  );

  let recPrice = p.price;
  if (tStock > 60) recPrice = Math.round(p.price * 0.8);
  else if (!hasSales) recPrice = Math.round(p.price * 0.7);
  else if (p.price > p.cost * 2.8) recPrice = Math.round(p.price * 0.6);

  $("pPromoPrice").value = recPrice;
  $("pOnSale").checked = true;
  toast(`✓ Precio sugerido: ${fmt(recPrice)} aplicado`);
}

function openProductModal(id = null) {
  $("editProductId").value = id || "";
  $("productModalTitle").textContent = id
    ? "Editar Producto"
    : "Nuevo Producto";

  const promoSection = document.querySelector(".promo-section");

  if (id) {
    const p = inventory.find((x) => String(x.id) === String(id));
    if (!p) return;
    $("pName").value = p.name;
    $("pCat").value = p.cat;
    $("pPrice").value = p.price;
    $("pCost").value = p.cost || "";
    $("pSku").value = p.sku || "";
    $("pImg").value = p.img || "";
    $("pPromoPrice").value = p.promo_price || "";
    $("pOnSale").checked = !!p.on_sale;

    // Lógica alineada con SMART INSIGHTS
    const tStock = totalStock(p);
    const hasSales = salesLog.some((s) =>
      s.items.some((it) => String(it.id) === String(p.id)),
    );
    const highMargin = p.cost > 0 && p.price > p.cost * 2.8;

    const isOverstocked = tStock > 60;
    const isSlowMover = !hasSales;

    // Decidir si mostrar sección de oferta
    if (isOverstocked || isSlowMover || highMargin || p.on_sale) {
      if (promoSection) {
        promoSection.style.display = "flex";
        const noteId = "promo-note";
        let note = $(noteId);
        if (!note) {
          note = document.createElement("div");
          note.id = noteId;
          note.style =
            "font-size:10px; color:var(--accent); margin-bottom:10px; font-weight:600; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:5px;";
          promoSection.parentNode.insertBefore(note, promoSection);
        }

        let reason = "🔥 Oferta Activa";
        if (isOverstocked)
          reason =
            "📦 Smart Insight: Sugerencia de Liquidación (Exceso de Stock)";
        else if (isSlowMover)
          reason = "📉 Smart Insight: Sugerencia de Impulso (Baja Rotación)";
        else if (highMargin)
          reason = "💰 Smart Insight: Oferta Rentable (Margen Alto)";

        note.innerHTML = `<span>💡</span> ${reason} <button onclick="applyRecommendedPrice()" class="btn-ghost" style="font-size:9px; padding:2px 5px; margin-left:10px; border-color:var(--accent); color:var(--accent)">Aplicar Sugerencia</button>`;
      }
    } else {
      if (promoSection) promoSection.style.display = "none";
      const note = $("promo-note");
      if (note) note.remove();
    }

    // Tab Rendimiento
    let unitsSold = 0;
    let revenue = 0;
    salesLog.forEach((s) => {
      s.items.forEach((it) => {
        if (String(it.id) === String(p.id)) {
          unitsSold += it.qty;
          revenue += it.price * it.qty;
        }
      });
    });
    $("perfUnits").textContent = unitsSold;
    $("perfRevenue").textContent = fmt(revenue);

    renderStockGrid(p.cat, p.stock);
    updateStockTotal();
    setTimeout(() => renderQRPreview(p), 100);
  } else {
    if (promoSection) promoSection.style.display = "flex";
    const note = $("promo-note");
    if (note) note.remove();

    ["pName", "pPrice", "pCost", "pSku", "pImg"].forEach(
      (f) => ($(f).value = ""),
    );
    $("pOnSale").checked = false;
    $("pPromoPrice").value = "";
    $("pCat").value = "mujer";

    renderStockGrid("mujer", {});
    $("qrPreviewBox").innerHTML =
      '<div style="color:var(--gray-text);font-size:13px">Guarda el producto para generar el QR</div>';
    updateStockTotal();
  }

  switchFormTab("info");
  $("productModalOverlay").classList.add("open");
  $("productModal").classList.add("open");
}

function renderStockGrid(category, stock = {}) {
  const sizes = getSizesForCategory(category);
  const gridEl = $("sizeGridForm");

  if (sizes.length === 0) {
    // Sin tallas - mostrar campo de cantidad general
    gridEl.innerHTML = `
      <div class="size-cell" style="grid-column:1/-1">
        <label>Cantidad total</label>
        <input type="number" id="ps-qty" min="0" value="${stock.qty || 0}" oninput="updateStockTotal()"/>
      </div>`;
  } else {
    // Mostrar tallas según categoría
    gridEl.innerHTML = sizes
      .map(
        (s) => `
      <div class="size-cell">
        <label>${s}</label>
        <input type="number" id="ps-${s}" min="0" value="${stock[s] || 0}" oninput="updateStockTotal()"/>
      </div>
    `,
      )
      .join("");
  }
}

function handleCategoryChange() {
  const category = $("pCat").value;
  renderStockGrid(category, {});
  updateStockTotal();
}

function editProduct(id) {
  openProductModal(id);
}

function closeProductModal() {
  $("productModalOverlay").classList.remove("open");
  $("productModal").classList.remove("open");
}

function switchFormTab(tab) {
  document
    .querySelectorAll(".ftab")
    .forEach((b) => b.classList.toggle("active", b.dataset.ftab === tab));
  document
    .querySelectorAll(".ftab-content")
    .forEach((c) => c.classList.toggle("active", c.id === "ftab-" + tab));
}

function updateStockTotal() {
  const el = $("stockTotalPreview");
  if (!el) return;

  const cat = $("pCat").value;
  const sizes = getSizesForCategory(cat);

  let total = 0;
  if (sizes.length === 0) {
    // Accesorios sin tallas
    total = parseInt($("ps-qty").value) || 0;
  } else {
    // Productos con tallas
    total = sizes.reduce(
      (s, sz) => s + (parseInt($("ps-" + sz).value) || 0),
      0,
    );
  }

  el.textContent = total;
}

SIZES.forEach((s) => {
  const el = $("ps-" + s);
  if (el) el.addEventListener("input", updateStockTotal);
});

async function saveProduct() {
  // Verificar autenticación
  if (!session) {
    toast("⚠ Debes estar autenticado para guardar productos");
    return;
  }

  const id = $("editProductId").value;
  const name = $("pName").value.trim();
  const price = parseFloat($("pPrice").value);
  const cost = parseFloat($("pCost").value) || 0;
  const sku = $("pSku").value.trim();
  const img = $("pImg").value.trim();
  const cat = $("pCat").value;
  const promo_price = parseFloat($("pPromoPrice").value) || 0;
  const on_sale = $("pOnSale").checked;

  // Validaciones
  if (!name || name.length === 0) {
    toast("⚠ El nombre del producto es obligatorio");
    return;
  }
  if (!price || isNaN(price) || price <= 0) {
    toast("⚠ El precio debe ser un número mayor a 0");
    return;
  }

  const stock = {};
  const sizes = getSizesForCategory(cat);

  if (sizes.length === 0) {
    // Accesorios sin tallas
    stock.qty = parseInt($("ps-qty").value) || 0;
  } else {
    // Productos con tallas
    sizes.forEach((s) => {
      stock[s] = parseInt($("ps-" + s).value) || 0;
    });
  }

  const productData = {
    id: id || genId(),
    name,
    price,
    cost,
    sku: sku || `WIN-${Date.now().toString().slice(-4)}`,
    image: img,
    category: cat,
    stock,
    promo_price,
    on_sale,
  };

  try {
    toast("💾 Guardando producto...");
    console.log("📤 Enviando datos:", productData);

    const res = await apiFetch(`${API_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });

    const responseText = await res.text();
    console.log(`📥 Respuesta (${res.status}):`, responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error(
        "❌ JSON Parsing Error. Text:",
        responseText.substring(0, 200),
      );
      toast(
        `⚠ Respuesta inválida del servidor: ${responseText.substring(0, 100)}`,
      );
      return;
    }

    if (res.ok && result.success) {
      fetchInventory();
      toast(id ? "✓ Producto actualizado" : "✓ Producto creado");
      closeProductModal();
    } else if (res.status === 401) {
      toast("⚠ Sesión expirada. Por favor, inicia sesión nuevamente");
      doLogout();
    } else {
      toast(`⚠ Error: ${result.error || "No se pudo guardar el producto"}`);
      console.error("Server error response:", result);
    }
  } catch (e) {
    console.error("❌ Error saving product:", e);
    toast(`⚠ Error de conexión: ${e.message}`);
  }
}

/* ══════════════════════════════════════════════════════════
 CARGA DE IMÁGENES — Image Upload
══════════════════════════════════════════════════════════ */
function triggerImageUpload() {
  $("pImgFile").click();
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validar tamaño de la imagen (máximo 5 MB)
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) {
    toast("⚠ La imagen es muy grande (máximo 5 MB)");
    return;
  }

  // Validar tipo de archivo
  if (!file.type.startsWith("image/")) {
    toast("⚠ Por favor selecciona un archivo de imagen válido");
    return;
  }

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const previewSrc = e.target.result;
    $("pImg").value = previewSrc;

    const preview = $("pImgPreview");
    const img = $("pImgPreviewImg");
    img.src = previewSrc;
    preview.style.display = "block";

    toast("✓ Imagen cargada (" + (file.size / 1024).toFixed(1) + " KB)");
  };
  reader.readAsDataURL(file);
}

/* ══════════════════════════════════════════════════════════
 ESCÁNER QR PARA PRODUCTOS — Product QR Scanner
══════════════════════════════════════════════════════════ */
let productScannerActive = false;

async function startProductQRScanner() {
  if (productScannerActive) return;
  productScannerActive = true;

  $("productScanBtn").style.display = "none";
  $("productScanStopBtn").style.display = "";
  $("productScanPlaceholder").style.display = "none";

  const video = $("productQRVideo");
  video.style.display = "block";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = stream;

    // Esperar a que el video esté listo
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    // Iniciar lectura de QR
    const html5QrCode = new Html5Qrcode("productQRVideo");

    html5QrCode
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onProductQRScanned(decodedText);
          html5QrCode.stop();
          stopProductQRScanner();
        },
        (err) => {
          // Ignore errors during scanning
        },
      )
      .catch((err) => {
        console.error("Error starting QR scanner:", err);
        toast("⚠ Error al iniciar el escáner");
        stopProductQRScanner();
      });
  } catch (err) {
    toast("⚠ No se puede acceder a la cámara: " + err.message);
    productScannerActive = false;
    $("productScanBtn").style.display = "";
    $("productScanStopBtn").style.display = "none";
    $("productScanPlaceholder").style.display = "block";
    $("productQRVideo").style.display = "none";
  }
}

function stopProductQRScanner() {
  productScannerActive = false;

  const video = $("productQRVideo");
  if (video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }

  $("productScanBtn").style.display = "";
  $("productScanStopBtn").style.display = "none";
  $("productScanPlaceholder").style.display = "block";
  video.style.display = "none";
}

function onProductQRScanned(text) {
  toast("✓ Código escaneado");

  // Intentar parsear como JSON (nuestro formato estándar)
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // Si no es JSON, tratar como SKU directo
    data = { sku: text };
  }

  // Buscar producto existente por ID o SKU
  let foundProduct = null;
  if (data.id) {
    foundProduct = inventory.find((p) => String(p.id) === String(data.id));
  }
  if (!foundProduct && data.sku) {
    foundProduct = inventory.find((p) => p.sku === data.sku);
  }

  if (foundProduct) {
    // Cargar datos del producto encontrado
    $("pName").value = foundProduct.name;
    $("pCat").value = foundProduct.cat || "mujer";
    $("pPrice").value = foundProduct.price;
    $("pCost").value = foundProduct.cost || "";
    $("pSku").value = foundProduct.sku || "";
    $("pImg").value = foundProduct.img || "";

    // Cargar stock
    SIZES.forEach((s) => {
      $("ps-" + s).value = foundProduct.stock[s] || 0;
    });
    updateStockTotal();

    // Mostrar preview de imagen
    if (foundProduct.img) {
      const preview = $("pImgPreview");
      const img = $("pImgPreviewImg");
      img.src = foundProduct.img;
      preview.style.display = "block";
    }

    const resultEl = $("productScanResult");
    resultEl.innerHTML = `
      <div style="color:var(--accent);font-weight:600;margin-bottom:8px">✓ Producto encontrado</div>
      <div style="font-size:13px">
        <strong>${foundProduct.name}</strong><br>
        SKU: ${foundProduct.sku} | Precio: $${foundProduct.price.toLocaleString("es-CO")}<br>
        Categoría: ${foundProduct.cat}
      </div>
    `;
    resultEl.style.display = "block";

    // Cambiar a tab de información
    switchFormTab("info");
  } else {
    // Producto no encontrado, mostrar opción para crear
    const data_text = typeof data === "object" ? JSON.stringify(data) : text;
    const resultEl = $("productScanResult");
    resultEl.innerHTML = `
      <div style="color:var(--red);font-weight:600;margin-bottom:8px">✕ Producto no encontrado</div>
      <div style="font-size:13px;margin-bottom:12px;font-family:monospace;word-break:break-all">
        ${data_text}
      </div>
      <button class="btn-accent" onclick='autoFillFromQRData(${JSON.stringify(data)})' style="width:100%">
        📦 Auto-rellenar con datos del QR
      </button>
    `;
    resultEl.style.display = "block";
  }
}

function autoFillFromQRData(data) {
  if (data.name) $("pName").value = data.name;
  if (data.sku) $("pSku").value = data.sku;
  if (data.price) $("pPrice").value = data.price;
  if (data.cat) $("pCat").value = data.cat;

  toast("✓ Datos auto-rellenados desde QR");
  switchFormTab("info");
}

/* ══════════════════════════════════════════════════════════
 QR CODE GENERATION
══════════════════════════════════════════════════════════ */
function buildQRPayload(product) {
  return JSON.stringify({
    id: product.id,
    sku: product.sku,
    name: product.name,
    price: product.price,
    cat: product.cat,
    v: "WINNER-QR-1.0",
  });
}

function renderQRPreview(product) {
  qrCurrentProduct = product;
  const box = $("qrPreviewBox");
  box.innerHTML = "";
  try {
    new QRCode(box, {
      text: buildQRPayload(product),
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });
    // Add product label under QR
    const label = document.createElement("div");
    label.style.cssText =
      "text-align:center;margin-top:10px;font-size:12px;font-weight:700;color:var(--white);letter-spacing:1px";

    if (product.on_sale && product.promo_price > 0) {
      const banner = document.createElement("div");
      banner.className = "qr-promo-banner";
      banner.textContent = "¡OFERTA!";
      box.prepend(banner);
      label.innerHTML = `${product.sku}<br><span style="text-decoration:line-through; font-size:10px; color:var(--gray-text)">${fmt(product.price)}</span> <span style="color:#ff4757">${fmt(product.promo_price)}</span>`;
    } else {
      label.textContent = `${product.sku} · ${product.name}`;
    }
    box.appendChild(label);
  } catch (e) {
    box.innerHTML =
      '<div style="color:var(--red);font-size:12px">Error generando QR</div>';
  }
}

function showProductQR(id) {
  const p = inventory.find((x) => String(x.id) === String(id));
  if (!p) return;
  qrCurrentProduct = p;

  $("qrModalTitle").textContent = p.name;
  $("qrModalInfo").innerHTML =
    `<strong>${p.sku}</strong> · ${fmt(p.price)} · ${p.cat}`;

  const canvas = $("qrModalCanvas");
  canvas.innerHTML = "";
  new QRCode(canvas, {
    text: buildQRPayload(p),
    width: 220,
    height: 220,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });

  $("qrModalOverlay").classList.add("open");
  $("qrModal").classList.add("open");
}

function closeQRModal() {
  $("qrModalOverlay").classList.remove("open");
  $("qrModal").classList.remove("open");
}

function printSingleQR() {
  if (!qrCurrentProduct) return;
  const img = $("qrModalCanvas").querySelector("img, canvas");
  if (!img) return;
  const win = window.open("", "_blank");
  win.document
    .write(`<html><body style="text-align:center;padding:40px;font-family:sans-serif">
    <h2 style="font-size:24px;letter-spacing:4px">WINNER</h2>
    ${qrCurrentProduct.on_sale ? `<div style="background:#ff4757; color:white; padding:5px; font-weight:800; border-radius:4px; margin-bottom:10px;">¡OFERTA!</div>` : ""}
    <div style="margin:20px auto;display:inline-block">${img.outerHTML}</div>
    <p style="font-size:14px;font-weight:700">${qrCurrentProduct.sku}</p>
    <p style="font-size:18px">${qrCurrentProduct.name}</p>
    ${
      qrCurrentProduct.on_sale
        ? `<p style="font-size:14px; text-decoration:line-through; color:#999; margin:0">$${qrCurrentProduct.price.toLocaleString("es-CO")}</p>
       <p style="font-size:26px; font-weight:900; color:#ff4757; margin:5px 0">$${qrCurrentProduct.promo_price.toLocaleString("es-CO")}</p>`
        : `<p style="font-size:22px; font-weight:900">$${qrCurrentProduct.price.toLocaleString("es-CO")}</p>`
    }
  </body></html>`);
  win.document.close();
  win.print();
}

function downloadSingleQR() {
  if (!qrCurrentProduct) return;
  const canvas = $("qrModalCanvas").querySelector("canvas");
  if (!canvas) {
    toast("⚠ Sin canvas QR disponible");
    return;
  }
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `QR_${qrCurrentProduct.sku}.png`;
  a.click();
}

function printProductQR() {
  if (!qrCurrentProduct) return;
  printSingleQR();
}

function downloadProductQR() {
  if (!qrCurrentProduct) return;
  downloadSingleQR();
}

function printAllQRs() {
  if (!inventory.length) {
    toast("Sin productos");
    return;
  }
  const win = window.open("", "_blank");
  let items = inventory
    .map(
      (p) => `
    <div style="display:inline-block;margin:16px;text-align:center;vertical-align:top">
      <div id="qr_${p.id}" style="background:#fff;padding:8px;display:inline-block"></div>
      <p style="font-size:12px;font-weight:700;margin:4px 0">${p.sku}</p>
      <p style="font-size:14px">${p.name}</p>
      <p style="font-size:16px;font-weight:900">$${p.price.toLocaleString("es-CO")}</p>
    </div>`,
    )
    .join("");
  win.document.write(`<!DOCTYPE html><html><head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
    <title>QRs Winner</title></head>
    <body style="font-family:sans-serif;padding:20px">
    <h2 style="text-align:center;letter-spacing:4px">WINNER — CÓDIGOS QR</h2>
    ${items}
    <script>
      ${inventory
        .map(
          (p) => `
        new QRCode(document.getElementById("qr_${p.id}"),{
          text:${JSON.stringify(buildQRPayload(p))},
          width:150,height:150,
          colorDark:"#000",colorLight:"#fff"
        });
      `,
        )
        .join("")}
      setTimeout(()=>window.print(),1200);
    <\/script></body></html>`);
  win.document.close();
  toast("🖨 Imprimiendo todos los QR...");
}

/* ══════════════════════════════════════════════════════════
 QR SCANNER (page)
══════════════════════════════════════════════════════════ */
function setScanMode(mode) {
  scanMode = mode;
  $("scanModeInventory").classList.toggle("active", mode === "inventory");
  $("scanModePOS").classList.toggle("active", mode === "pos");
}

async function startScanner() {
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    $("scanVideo").srcObject = scanStream;
    $("startScanBtn").style.display = "none";
    $("stopScanBtn").style.display = "";
    // Poll for QR (using manual decode simulation — real impl needs jsQR)
    toast('📷 Cámara activa. Use "Ingresar código" para procesar.');
  } catch (e) {
    toast("⚠ No se pudo acceder a la cámara: " + e.message);
  }
}

function stopScanner() {
  if (scanStream) {
    scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null;
  }
  const v = $("scanVideo");
  if (v) v.srcObject = null;
  $("startScanBtn").style.display = "";
  $("stopScanBtn").style.display = "none";
  clearInterval(scanInterval);
}

function processManualQR() {
  const code = $("manualQRInput").value.trim();
  if (!code) {
    toast("⚠ Ingresa un código");
    return;
  }

  // Try to parse JSON payload
  let product = null;
  try {
    const data = JSON.parse(code);
    product = inventory.find(
      (p) => String(p.id) === String(data.id) || p.sku === data.sku,
    );
  } catch {
    // Try SKU direct
    product = inventory.find(
      (p) => p.sku === code || p.name.toLowerCase() === code.toLowerCase(),
    );
  }

  if (!product) {
    $("scanResult").style.display = "block";
    $("scanResult").innerHTML =
      `<strong style="color:var(--red)">✕ Producto no encontrado:</strong> "${code}"
      <br><button class="btn-accent" style="margin-top:10px" onclick="openProductModal()">+ Registrar nuevo producto</button>`;
    return;
  }

  processScannedProduct(product);
  $("manualQRInput").value = "";
}

function processScannedProduct(product) {
  const ts = totalStock(product);
  const resultEl = $("scanResult");
  resultEl.style.display = "block";

  if (scanMode === "pos") {
    addToPOSCart(product, "M");
    resultEl.innerHTML = `<strong style="color:var(--green)">✓ Agregado a venta:</strong> ${product.name} — ${fmt(product.price)}`;
    toast(`✓ ${product.name} → Carrito POS`);
  } else {
    resultEl.innerHTML = `<strong style="color:var(--accent)">📦 Producto encontrado:</strong> ${product.name}<br>
      SKU: ${product.sku} · Stock: ${ts} unidades · Precio: ${fmt(product.price)}<br>
      <button class="btn-accent" style="margin-top:10px" onclick="editProduct(${product.id})">✎ Editar / Actualizar stock</button>`;
    toast(`📦 ${product.name} identificado`);
  }

  // Show in last scan panel
  $("lastScanInfo").innerHTML = `
    <div class="ls-card">
      <img src="${product.img}" class="ls-img" onerror="this.style.display='none'"/>
      <div>
        <div class="ls-name">${product.name}</div>
        <div class="ls-sku">${product.sku}</div>
        <div class="ls-price">${fmt(product.price)}</div>
        <div style="font-size:11px;color:var(--gray-text);margin-top:4px">Stock: ${ts} uds · ${product.cat}</div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════
 POS
══════════════════════════════════════════════════════════ */
function renderPOSProducts(filter = "") {
  try {
    const list = $("posProductList");
    if (!list) {
      console.error("❌ Contenedor posProductList no encontrado");
      return;
    }

    if (!inventory || inventory.length === 0) {
      list.innerHTML =
        '<div style="padding:20px;text-align:center;color:var(--gray-text)">Cargando productos...</div>';
      return;
    }

    const q = filter.toLowerCase();
    const items = inventory.filter(
      (p) =>
        totalStock(p) > 0 &&
        (p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          !q),
    );

    if (items.length === 0) {
      list.innerHTML =
        '<div style="padding:20px;text-align:center;color:var(--gray-text)">Sin productos disponibles</div>';
      return;
    }

    list.innerHTML = items
      .map(
        (p) => `
          <div class="pos-product-card" data-product-id="${p.id}" style="cursor:pointer">
            <img src="${p.img}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200&q=60'"/>
            <div class="pos-product-card-info">
              <div class="ppc-cat">${p.cat}</div>
              <div class="ppc-name">${p.name}</div>
              <div class="ppc-price">${fmt(p.price)}</div>
            </div>
          </div>`,
      )
      .join("");

    // Agregar event listeners
    list.querySelectorAll(".pos-product-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const productId = card.dataset.productId;
        const product = inventory.find(
          (p) => String(p.id) === String(productId),
        );
        if (product) {
          openPOSSizeSelector(product);
        }
      });
    });
  } catch (e) {
    console.error("❌ Error en renderPOSProducts:", e);
    const list = $("posProductList");
    if (list)
      list.innerHTML = `<div style="color:red;padding:10px">Error: ${e.message}</div>`;
  }
}

function openPOSSizeSelector(product) {
  // Debug: ver qué categoría tiene el producto
  console.log(
    "📦 Producto seleccionado:",
    product.name,
    "| Categoría:",
    product.cat,
  );

  // Verificar si este producto tiene tallas
  if (!hasSizes(product.cat)) {
    // Sin tallas (accesorios) - agregar directamente al carrito
    addToPOSCart(product.id, "N/A");
    return;
  }

  const modal = $("posSizeModal") || createPOSSizeModal();
  const overlay = $("posSizeOverlay");
  const sizeGrid = modal.querySelector("#posSizeGrid");

  const sizes = getSizesForCategory(product.cat);
  console.log("👕 Tallas para", product.cat, ":", sizes);

  sizeGrid.innerHTML = sizes
    .map((size) => {
      const stock = product.stock ? product.stock[size] || 0 : 0;
      const disabled = stock <= 0;
      return `
      <button class="pos-size-btn ${disabled ? "disabled" : ""}" 
        data-product-id="${product.id}" data-size="${size}"
        ${disabled ? "disabled" : ""}>
        ${size} ${stock <= 0 ? "(✕)" : ""}
      </button>
    `;
    })
    .join("");

  setTimeout(() => {
    sizeGrid.querySelectorAll(".pos-size-btn:not(:disabled)").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pId = btn.dataset.productId;
        const sz = btn.dataset.size;
        addToPOSCart(pId, sz);
        closePOSSizeModal();
      });
    });
  }, 0);

  // Mostrar overlay/modal
  if (overlay) overlay.classList.add("open");
  modal.classList.add("open");
}

function createPOSSizeModal() {
  // Agregar estilos si no existen
  if (!document.getElementById("posSizeBtnStyles")) {
    const style = document.createElement("style");
    style.id = "posSizeBtnStyles";
    style.textContent = `
      .pos-size-btn {
        background: rgba(14, 232, 11, 0.15);
        border: 2px solid #0ee80b;
        color: #0ee80b;
        padding: 12px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.25s;
        font-size: 14px;
      }
      .pos-size-btn:hover:not(:disabled) {
        background: #0ee80b;
        color: #f7f8fbf7;
        transform: scale(1.05);
      }
      .pos-size-btn:active:not(:disabled) {
        transform: scale(0.98);
      }
      .pos-size-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        border-color: #666;
        color: #666;
      }
    `;
    document.head.appendChild(style);
  }

  // Crear overlay si no existe
  let overlay = $("posSizeOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "posSizeOverlay";
    overlay.className = "modal-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closePOSSizeModal();
    });
    document.body.appendChild(overlay);
  }

  const modal = document.createElement("div");
  modal.id = "posSizeModal";
  modal.className = "modal modal-sm";
  modal.innerHTML = `
    <div class="modal-header">
      <h3>Selecciona la talla</h3>
      <button class="modal-close" onclick="closePOSSizeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div id="posSizeGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px"></div>
    </div>
  `;

  // Reemplazar si ya existe
  const existing = $("posSizeModal");
  if (existing) existing.remove();
  document.body.appendChild(modal);
  return modal;
}

function closePOSSizeModal() {
  const modal = $("posSizeModal");
  const overlay = $("posSizeOverlay");
  if (modal) modal.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
}

function openPOSCart() {
  const panel = $("posRightPanel");
  const overlay = $("posCartOverlay");
  if (panel) panel.classList.add("open");
  if (overlay) overlay.classList.add("open");
}

function closePOSCart() {
  const panel = $("posRightPanel");
  const overlay = $("posCartOverlay");
  if (panel) panel.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
}

function addToPOSCart(productOrId, size = "M") {
  try {
    const p =
      typeof productOrId === "object"
        ? productOrId
        : inventory.find((x) => String(x.id) === String(productOrId));

    if (!p) {
      toast("⚠ Producto no encontrado");
      return;
    }

    const hasTallas = hasSizes(p.cat);

    if (!hasTallas) {
      // Es un accesorio sin talla
      size = "N/A";

      // Validar stock general - buscar en qty o U
      let stock = 0;
      if (p.stock?.qty !== undefined) {
        stock = p.stock.qty || 0;
      } else if (p.stock?.U !== undefined) {
        stock = p.stock.U || 0;
      } else {
        stock =
          Object.values(p.stock || {}).reduce((s, v) => s + (v || 0), 0) || 0;
      }

      if (stock <= 0) {
        toast(`⚠ Sin stock de ${p.name}`);
        return;
      }
    } else {
      // Producto con talla
      if (!size) {
        toast("⚠ Selecciona una talla");
        return;
      }

      const stock = p.stock ? p.stock[size] || 0 : 0;
      if (stock <= 0) {
        toast(`⚠ Sin stock en talla ${size}`);
        return;
      }
    }

    const existing = posCart.find(
      (i) => String(i.id) === String(p.id) && i.size === size,
    );
    if (existing) {
      existing.qty++;
    } else {
      posCart.push({
        id: p.id,
        name: p.name,
        price: p.on_sale && p.promo_price > 0 ? p.promo_price : p.price,
        img: p.img || "",
        size: size,
        qty: 1,
      });
    }

    renderPOSCart();
    openPOSCart(); // Open drawer automatically
    const sizeText = size === "N/A" ? "" : ` (${size})`;
    toast(`✓ ${p.name}${sizeText} agregado al carrito`);
    console.log(`Producto agregado: ${p.name} - Talla: ${size}`);
  } catch (e) {
    console.error("Error en addToPOSCart:", e);
    toast("❌ Error al agregar producto");
  }
}

function posSearchProducts() {
  try {
    const searchInput = $("posSearch");
    if (!searchInput) {
      console.warn("⚠️ Input de búsqueda no encontrado");
      return;
    }
    const searchTerm = searchInput.value || "";
    renderPOSProducts(searchTerm);
  } catch (e) {
    console.error("❌ Error en búsqueda POS:", e);
    toast("⚠️ Error en búsqueda");
  }
}

function removePOSItem(id, size) {
  posCart = posCart.filter(
    (i) => !(String(i.id) === String(id) && i.size === size),
  );
  renderPOSCart();
}

function updatePOSQty(id, size, delta) {
  const item = posCart.find(
    (i) => String(i.id) === String(id) && i.size === size,
  );
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  renderPOSCart();
}

function renderPOSCart() {
  try {
    const el = $("posItems");
    if (!el) {
      console.warn("⚠️ Contenedor posItems no encontrado");
      return;
    }

    const totalItems = posCart.reduce((s, i) => s + i.qty, 0);
    const badge = $("posCartBadge");
    if (badge) badge.textContent = totalItems;

    if (!posCart.length) {
      el.innerHTML = '<div class="pos-empty">Sin productos agregados</div>';
    } else {
      el.innerHTML = posCart
        .map(
          (item, idx) => `
        <div class="pos-item-row">
          <img src="${item.img}" class="pos-item-img" onerror="this.style.display='none'"/>
          <div style="flex:1">
            <div class="pos-item-name">${item.name}</div>
            <div class="pos-item-size">Talla: ${item.size}</div>
          </div>
          <div class="pos-qty-ctrl">
            <button onclick="updatePOSQty('${String(item.id).replace(/'/g, "\\'")}','${item.size}',-1)">−</button>
            <span>${item.qty}</span>
            <button onclick="updatePOSQty('${String(item.id).replace(/'/g, "\\'")}','${item.size}',+1)">+</button>
          </div>
          <div class="pos-item-total">${fmt(item.price * item.qty)}</div>
          <button class="pos-item-remove" onclick="removePOSItem('${String(item.id).replace(/'/g, "\\'")}','${item.size}')">✕</button>
        </div>`,
        )
        .join("");
    }
    updatePOSTotals();
  } catch (e) {
    console.error("❌ Error renderizando carrito:", e);
    toast("⚠️ Error mostrando carrito");
  }
}

function updatePOSTotals() {
  try {
    const sub = posCart.reduce(
      (s, i) => s + Number(i.price || 0) * Number(i.qty || 0),
      0,
    );
    const discEl = $("posDiscount");
    const disc = discEl ? parseFloat(discEl.value) || 0 : 0;
    const total = sub * (1 - disc / 100);

    const subEl = $("posSubtotal");
    const totEl = $("posTotal");
    if (subEl) subEl.textContent = fmt(sub);
    if (totEl) totEl.textContent = fmt(Math.round(total));
  } catch (e) {
    console.error("❌ Error actualizando totales:", e);
  }
}

const posDiscountEl = $("posDiscount");
if (posDiscountEl) posDiscountEl.addEventListener("input", updatePOSTotals);

function renderPOSPayGrid() {
  const grid = $("posPayGrid");
  if (!grid) return;
  const allMethods = [
    ...payMethods.national.filter((m) => m.enabled),
    ...payMethods.wallets.filter((m) => m.enabled),
    ...payMethods.delivery.filter((m) => m.enabled),
  ];
  grid.innerHTML = allMethods
    .slice(0, 8)
    .map(
      (m) => `
    <button class="pos-pay-btn ${posSelectedMethod === m.name ? "selected" : ""}"
      onclick="selectPOSMethod('${m.name}')">
      ${m.icon} ${m.name}
    </button>`,
    )
    .join("");
}

function selectPOSMethod(method) {
  posSelectedMethod = method;
  renderPOSPayGrid();
}

function clearPOS() {
  try {
    posCart = [];
    posCurrentClient = null;

    const vendor = $("posVendor");
    const discount = $("posDiscount");
    const displayEl = $("posClientName");
    const clearBtn = $("posClientClear");

    if (vendor) vendor.value = "";
    if (discount) discount.value = 0;
    if (displayEl) {
      displayEl.textContent = "Agregar cliente...";
      displayEl.style.color = "var(--gray-text)";
    }
    if (clearBtn) clearBtn.style.display = "none";

    renderPOSCart();
  } catch (e) {
    console.error("❌ Error en clearPOS:", e);
  }
}

async function confirmPOSSale() {
  try {
    if (!posCart.length) {
      toast("⚠ Agrega productos a la venta");
      return;
    }

    const vendorEl = $("posVendor");
    const discEl = $("posDiscount");

    if (!vendorEl || !discEl) {
      console.error("❌ Faltan campos de formulario POS");
      toast("❌ Error: formulario incompleto");
      return;
    }

    const vendor = vendorEl.value.trim() || "Vendedor";
    const client = posCurrentClient?.name || "—";
    const disc = parseFloat(discEl.value) || 0;
    const sub = posCart.reduce((s, i) => s + i.price * i.qty, 0);
    const total = Math.round(sub * (1 - disc / 100));

    const items = posCart.map((i) => ({
      id: i.id,
      name: i.name,
      qty: i.qty,
      price: i.price,
      size: i.size,
    }));

    const sale = {
      id: genId(),
      timestamp: nowStr(),
      channel: "fisica",
      vendor,
      client,
      method: posSelectedMethod,
      subtotal: sub,
      discount: disc,
      total,
      items,
      customerData: posCurrentClient || null,
    };

    try {
      const res = await apiFetch(`${API_URL}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sale),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${res.status}`);
      }
      await fetchSalesLog();
    } catch (e) {
      console.error("Error saving POS sale:", e);
      toast(`❌ No se pudo guardar la venta: ${e.message}`);
      return;
    }

    toast(`✓ Venta confirmada: ${fmt(total)} — ${posSelectedMethod}`);
    clearPOS();
    fetchInventory();
    renderDashboard();

    // Print receipt option
    if (confirm(`✓ Venta registrada: ${fmt(total)}\n\n¿Imprimir recibo?`)) {
      printReceipt(sale);
    }
  } catch (e) {
    console.error("❌ Error en confirmPOSSale:", e);
    toast("❌ Error procesando venta");
  }
}

function openQRScannerPOS() {
  try {
    const overlay = $("posScanOverlay");
    const modal = $("posScanModal");
    const video = $("posScanVideo");

    if (!overlay || !modal || !video) {
      console.error("❌ Elementos del escáner no encontrados");
      toast("❌ Error abriendo escáner");
      return;
    }

    overlay.classList.add("open");
    modal.classList.add("open");

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        posScanStream = stream;
        video.srcObject = stream;
      })
      .catch((e) => {
        toast("⚠ Cámara no disponible: " + e.message);
        console.error("❌ Error de cámara:", e);
      });
  } catch (e) {
    console.error("❌ Error en openQRScannerPOS:", e);
    toast("❌ Error abriendo escáner");
  }
}

function closePOSScanner() {
  try {
    if (posScanStream) {
      posScanStream.getTracks().forEach((t) => t.stop());
      posScanStream = null;
    }
    const overlay = $("posScanOverlay");
    const modal = $("posScanModal");
    if (overlay) overlay.classList.remove("open");
    if (modal) modal.classList.remove("open");
  } catch (e) {
    console.error("❌ Error en closePOSScanner:", e);
  }
}

/* ── RECEIPT ── */
function printReceipt(sale) {
  const win = window.open("", "_blank", "width=380,height=600");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>body{font-family:monospace;padding:20px;font-size:13px;max-width:320px;margin:0 auto}
    h2{text-align:center;letter-spacing:4px;font-size:20px}
    .line{border-top:1px dashed #000;margin:8px 0}
    .row{display:flex;justify-content:space-between}
    .total{font-size:18px;font-weight:900}</style>
  </head><body>
    <h2>WINNER</h2><p style="text-align:center;font-size:11px">Estilo Ganador para Todos</p>
    <div class="line"></div>
    <p>Fecha: ${fmtDate(sale.timestamp)}</p>
    <p>Vendedor: ${sale.vendor}</p>
    <p>Cliente: ${sale.client}</p>
    <p>Método: ${sale.method}</p>
    <div class="line"></div>
    ${sale.items.map((i) => `<div class="row"><span>${i.name} ×${i.qty}</span><span>$${(i.price * i.qty).toLocaleString("es-CO")}</span></div>`).join("")}
    <div class="line"></div>
    ${sale.discount > 0 ? `<div class="row"><span>Descuento ${sale.discount}%</span><span>-$${(sale.subtotal - sale.total).toLocaleString("es-CO")}</span></div>` : ""}
    <div class="row total"><span>TOTAL</span><span>$${sale.total.toLocaleString("es-CO")}</span></div>
    <div class="line"></div>
    <p style="text-align:center;font-size:11px">¡Gracias por tu compra!</p>
    <script>window.print();<\/script>
  </body></html>`);
  win.document.close();
}

/* ══════════════════════════════════════════════════════════
 PAYMENT METHODS
══════════════════════════════════════════════════════════ */
function renderPayMethods() {
  renderPaySection("payNational", payMethods.national);
  renderPaySection("payWallets", payMethods.wallets);
  renderPaySection("payDelivery", payMethods.delivery);
  renderPaySection("payIntl", payMethods.intl);
}

function renderPaySection(containerId, methods) {
  const el = $(containerId);
  if (!el) return;
  el.innerHTML = methods
    .map(
      (m) => `
    <div class="pay-method-card ${m.enabled ? "enabled" : ""}" onclick="togglePayMethod('${containerId}','${m.id}')">
      <div class="pmc-main">
        <span class="pmc-icon">${m.icon}</span>
        <div class="pmc-info">
          <div class="pmc-name">${m.name}</div>
          <div class="pmc-type">${m.type}</div>
        </div>
      </div>
      <button class="toggle-switch ${m.enabled ? "on" : ""}"
        aria-label="${m.enabled ? "Desactivar" : "Activar"} ${m.name}">
      </button>
    </div>`,
    )
    .join("");
}

const PAY_SECTION_MAP = {
  payNational: "national",
  payWallets: "wallets",
  payDelivery: "delivery",
  payIntl: "intl",
};

function togglePayMethod(sectionId, methodId) {
  const key = PAY_SECTION_MAP[sectionId];
  if (!key) return;
  const m = payMethods[key].find((x) => x.id === methodId);
  if (m) {
    m.enabled = !m.enabled;
    LS.set("payMethods", payMethods);
    renderPayMethods();
    renderPOSPayGrid();
  }
}

function registerPayment() {
  const method = $("payRegMethod").value;
  const amount = parseFloat($("payRegAmount").value);
  const ref = $("payRegRef").value.trim();
  if (!method || !amount || amount <= 0) {
    toast("⚠ Completa método y monto");
    return;
  }
  const entry = {
    id: genId(),
    ts: nowStr(),
    method,
    ref: ref || "—",
    amount,
  };
  payLog.unshift(entry);
  LS.set("payLog", payLog);
  $("payRegMethod").value = "";
  $("payRegAmount").value = "";
  $("payRegRef").value = "";
  renderPaymentsTable();
  toast(`✓ Pago de ${fmt(amount)} registrado`);
}

let _payTimeRange = "today";

function setPayTimeFilter(range) {
  _payTimeRange = range;
  document.querySelectorAll(".ph-tab").forEach((btn) => {
    btn.classList.remove("active");
    const label = btn.textContent.toLowerCase();
    if (range === "today" && label === "hoy") btn.classList.add("active");
    if (range === "yesterday" && label === "ayer") btn.classList.add("active");
    if (range === "week" && label === "semana") btn.classList.add("active");
    if (range === "month" && label === "mes") btn.classList.add("active");
    if (range === "all" && label === "todo") btn.classList.add("active");
  });
  if (range !== "custom") $("payFilterDate").value = "";
  renderPaymentsTable();
}

function resetPayFilters() {
  $("payFilterDate").value = "";
  $("payFilterMethod").value = "";
  setPayTimeFilter("today");
}

function renderPaymentsTable() {
  const tbody = $("paymentsBody");
  if (!tbody) return;
  const dateFilter = $("payFilterDate")?.value || "";
  const methodFilter = $("payFilterMethod")?.value || "";

  if (!salesLog || !salesLog.length) {
    tbody.innerHTML =
      '<tr class="empty-row"><td colspan="7">Sin pagos registrados</td></tr>';
    $("phSummaryTotal").textContent = "$0";
    $("phSummaryCount").textContent = "0";
    return;
  }

  let payList = [...salesLog];

  // Filtro por fecha (Manual o Rápido)
  if (dateFilter) {
    payList = payList.filter((s) => s.timestamp.startsWith(dateFilter));
    _payTimeRange = "custom";
    document
      .querySelectorAll(".ph-tab")
      .forEach((btn) => btn.classList.remove("active"));
  } else if (_payTimeRange !== "all") {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (_payTimeRange === "today") {
      payList = payList.filter((s) => s.timestamp.startsWith(todayStr));
    } else if (_payTimeRange === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const yestStr = yesterday.toISOString().split("T")[0];
      payList = payList.filter((s) => s.timestamp.startsWith(yestStr));
    } else if (_payTimeRange === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      payList = payList.filter((s) => new Date(s.timestamp) >= weekAgo);
    } else if (_payTimeRange === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      payList = payList.filter((s) => new Date(s.timestamp) >= monthAgo);
    }
  }

  // Filtrar por método
  if (methodFilter) {
    const methodMap = {
      tarjeta: [
        "card",
        "tarjeta",
        "tarjeta debito",
        "tarjeta credito",
        "visa",
        "mastercard",
      ],
      pse: ["pse", "pse/transferencia"],
      nequi: ["nequi"],
      daviplata: ["daviplata"],
      cash: ["cash", "efectivo"],
    };
    const filterMethods = methodMap[methodFilter] || [];
    payList = payList.filter((s) => {
      const method = (s.method || s.payment_method || "").toLowerCase();
      return filterMethods.some((m) => method.includes(m));
    });
  }

  let totalAmount = 0;
  if (!payList.length) {
    tbody.innerHTML =
      '<tr class="empty-row"><td colspan="7">No hay pagos con los filtros seleccionados</td></tr>';
  } else {
    tbody.innerHTML = payList
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .map((p) => {
        totalAmount += p.total;
        const method = (p.method || p.payment_method || "N/A").toLowerCase();
        const methodIcon = getPaymentIcon(method);
        const paymentStatus = normalizePaymentStatus(p);
        const statusLabel = getStatusBadge(paymentStatus).label.toUpperCase();

        const statusClass =
          paymentStatus === "completed"
            ? "s-ok"
            : [
                  "pending",
                  "pending_verification",
                  "waiting_confirmation",
                  "in_process",
                ].includes(paymentStatus)
              ? "s-pending"
              : "s-fail";

        return `
          <tr>
            <td>${new Date(p.timestamp).toLocaleString()}</td>
            <td>${p.client_name || "---"}</td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:16px;">${methodIcon}</span>
                <span style="font-weight:600; font-size:13px; text-transform:capitalize;">${method}</span>
              </div>
            </td>
            <td style="font-size:11px; color:var(--gray-text);">${p.ref || p.id.slice(0, 8)}</td>
            <td style="font-weight:700; color:var(--accent);">${fmt(p.total)}</td>
            <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
            <td><button class="btn-ghost-sm" onclick="viewSaleDetails('${p.id}')">👁</button></td>
          </tr>
        `;
      })
      .join("");
  }

  $("phSummaryTotal").textContent = fmt(totalAmount);
  $("phSummaryCount").textContent = payList.length;
}

function getPaymentIcon(method) {
  const m = method.toLowerCase();
  if (m.includes("nequi")) return "🟣";
  if (m.includes("daviplata")) return "🔴";
  if (m.includes("efectivo") || m.includes("cash")) return "💵";
  if (m.includes("tarjeta") || m.includes("visa") || m.includes("mastercard"))
    return "💳";
  if (m.includes("pse") || m.includes("transferencia")) return "🏦";
  if (m.includes("paypal")) return "🅿️";
  return "💰";
}

function getPaymentMethodDisplay(method) {
  const displays = {
    card: { name: "Tarjeta", icon: "💳", type: "Crédito/Débito" },
    tarjeta: { name: "Tarjeta", icon: "💳", type: "Crédito/Débito" },
    "tarjeta debito": { name: "Tarjeta Débito", icon: "💳", type: "Débito" },
    "tarjeta credito": {
      name: "Tarjeta Crédito",
      icon: "💳",
      type: "Crédito",
    },
    pse: { name: "PSE", icon: "🏦", type: "Transferencia" },
    "pse/transferencia": {
      name: "PSE/Transferencia",
      icon: "🏦",
      type: "Transferencia",
    },
    nequi: { name: "Nequi", icon: "📱", type: "Billetera" },
    daviplata: { name: "Daviplata", icon: "📱", type: "Billetera" },
    cash: { name: "Efectivo", icon: "💵", type: "Contra Entrega" },
    efectivo: { name: "Efectivo", icon: "💵", type: "Contra Entrega" },
  };

  for (const [key, val] of Object.entries(displays)) {
    if (method.includes(key)) return val;
  }

  return { name: method || "Desconocido", icon: "❓", type: "N/A" };
}

function getPaymentDetails(payment) {
  const method = (payment.method || payment.payment_method || "").toLowerCase();
  const details = payment.methodDetails || {};

  if (method.includes("card") || method.includes("tarjeta")) {
    const cardBrand = details.cardBrand || "CARD";
    const cardLast4 = details.cardNumber?.slice(-4) || "****";
    return `${cardBrand} •••• ${cardLast4}`;
  } else if (method.includes("pse")) {
    const bank = details.bank || "Banco";
    return `${bank}`;
  } else if (method.includes("nequi")) {
    const phone = details.nequiPhone || details.phone || "***";
    return `${phone}`;
  } else if (method.includes("daviplata")) {
    const phone = details.daviplataPhone || details.phone || "***";
    return `${phone}`;
  } else if (method.includes("cash") || method.includes("efectivo")) {
    const type = details.deliveryType || "Contra Entrega";
    return `${type}`;
  }

  return details.reference || payment.reference_number || "—";
}

function deletePayment(id) {
  if (!confirm("¿Eliminar este pago del historial?")) return;

  // Eliminar de salesLog
  salesLog = salesLog.filter((p) => p.id !== id);

  // Eliminar de payLog si existe
  payLog = payLog.filter((p) => p.id !== id);
  LS.set("payLog", payLog);

  renderPaymentsTable();
  toast("✓ Pago eliminado");
}

function viewPaymentDetails(id) {
  const payment = salesLog.find((p) => p.id === id);
  if (!payment) {
    toast("❌ Pago no encontrado");
    return;
  }

  const method = (
    payment.method ||
    payment.payment_method ||
    "Desconocido"
  ).toLowerCase();
  const methodDisplay = getPaymentMethodDisplay(method);
  const details = payment.methodDetails || {};

  let detailsHtml = `
    <strong>ID:</strong> ${payment.id}<br/>
    <strong>Cliente:</strong> ${payment.client || payment.customer?.name || "N/A"}<br/>
    <strong>Email:</strong> ${payment.customer_email || payment.customer?.email || "N/A"}<br/>
    <strong>Teléfono:</strong> ${payment.customer_phone || payment.customer?.phone || "N/A"}<br/>
    <strong>Dirección:</strong> ${payment.shipping_address || payment.customer?.address || "N/A"}<br/>
    <strong>Método:</strong> ${methodDisplay.icon} ${methodDisplay.name}<br/>
    <strong>Monto:</strong> ${fmt(payment.total)}<br/>
    <strong>Estado:</strong> ${payment.payment_status || "Pendiente"}<br/>
  `;

  if (details.cardBrand) {
    detailsHtml += `<strong>Tarjeta:</strong> ${details.cardBrand} •••• ${details.cardNumber?.slice(-4)}<br/>`;
    detailsHtml += `<strong>Documento:</strong> ${details.documentNumber || "N/A"}<br/>`;
  }
  if (details.bank) {
    detailsHtml += `<strong>Banco:</strong> ${details.bank}<br/>`;
    detailsHtml += `<strong>Documento:</strong> ${details.documentNumber || "N/A"}<br/>`;
  }
  if (details.nequiPhone) {
    detailsHtml += `<strong>Celular Nequi:</strong> ${details.nequiPhone}<br/>`;
    detailsHtml += `<strong>Nombre:</strong> ${details.nequiName || "N/A"}<br/>`;
  }
  if (details.daviplataPhone) {
    detailsHtml += `<strong>Celular Daviplata:</strong> ${details.daviplataPhone}<br/>`;
    detailsHtml += `<strong>Nombre:</strong> ${details.daviplataName || "N/A"}<br/>`;
  }
  if (details.deliveryType) {
    detailsHtml += `<strong>Tipo Entrega:</strong> ${details.deliveryType}<br/>`;
  }

  // Items
  if (payment.items && Array.isArray(payment.items) && payment.items.length) {
    detailsHtml += `<strong>Items:</strong><br/>`;
    payment.items.forEach((item) => {
      detailsHtml += `&nbsp;&nbsp;• ${item.name} x${item.qty} @ ${fmt(item.price)}<br/>`;
    });
  }

  alert(detailsHtml.replace(/<br\/>/g, "\n"));
}

function exportPaymentsCSV() {
  if (!salesLog || !salesLog.length) {
    toast("⚠️ Sin pagos para exportar");
    return;
  }

  const dateFilter = $("payFilterDate")?.value || "";
  const methodFilter = $("payFilterMethod")?.value || "";

  let payList = [...salesLog];

  if (dateFilter) {
    payList = payList.filter((s) => s.timestamp.startsWith(dateFilter));
  }

  if (methodFilter) {
    const methodMap = {
      tarjeta: ["card", "tarjeta", "tarjeta debito", "tarjeta credito"],
      pse: ["pse", "pse/transferencia"],
      nequi: ["nequi"],
      daviplata: ["daviplata"],
      cash: ["cash", "efectivo"],
    };
    const filterMethods = methodMap[methodFilter] || [];
    payList = payList.filter((s) => {
      const method = (s.method || "").toLowerCase();
      const paymentMethod = (s.payment_method || "").toLowerCase();
      return filterMethods.some(
        (m) => method.includes(m) || paymentMethod.includes(m),
      );
    });
  }

  const rows = [
    [
      "Fecha/Hora",
      "Cliente",
      "Email",
      "Teléfono",
      "Método",
      "Monto",
      "Estado",
      "Referencia",
    ],
    ...payList.map((p) => [
      fmtDate(p.timestamp),
      p.client || p.customer?.name || "—",
      p.customer_email || p.customer?.email || "—",
      p.customer_phone || p.customer?.phone || "—",
      (p.method || p.payment_method || "—").toUpperCase(),
      p.total,
      p.payment_status || "Pendiente",
      p.reference_number || p.id || "—",
    ]),
  ];

  downloadCSV(
    rows,
    `winner_pagos_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  toast("⬇️ Pagos exportados");
}

/* ══════════════════════════════════════════════════════════════════
 REAL-TIME SALES MONITORING - VENTAS EN LÍNEA
 Actualización en tiempo real con polling + WebSocket
══════════════════════════════════════════════════════════ */
let realTimePolling = null;
let lastSaleCount = 0;
/* ════════════════════════════════════════════════════════════════
 [FUTURO] HOOKS PARA TIENDA EXTERNA (WooCommerce/Shopify)
 - API endpoint: /api/online-sync  
 - Webhook listener para ventas externas
 - Dashboard canal "online" restaurable
═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
 SALES STATUS TRACKING - ESTADO DE PAGOS
══════════════════════════════════════════════════════════ */
const SALE_STATUS = {
  PENDING: "pending",
  IN_PROCESS: "in_process",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
};

function normalizePaymentStatus(sale) {
  const method = String(
    sale?.payment_method || sale?.method || "",
  ).toLowerCase();
  const status = sale?.payment_status || "";
  if (method.includes("efectivo") && (!status || status === "pending")) {
    return SALE_STATUS.COMPLETED;
  }
  return status || SALE_STATUS.COMPLETED;
}

function getStatusBadge(status) {
  const badges = {
    pending: { label: "⏳ Pendiente", class: "s-pending", color: "#f39c12" },
    in_process: {
      label: "🔄 Procesando",
      class: "s-pending",
      color: "#3498db",
    },
    completed: { label: "✅ Completado", class: "s-ok", color: "#2ecc71" },
    cancelled: { label: "❌ Cancelado", class: "s-out", color: "#e74c3c" },
    refunded: { label: "↩️ Reembolsado", class: "s-out", color: "#9b59b6" },
  };
  return badges[status] || badges.pending;
}

function updateSaleStatus(id, newStatus) {
  if (!confirm(`¿Cambiar estado a "${getStatusBadge(newStatus).label}"?`))
    return;

  const sale = salesLog.find((s) => s.id === id);
  if (!sale) return;

  sale.payment_status = newStatus;

  // Sincronizar con backend
  apiFetch(`${API_URL}/sales/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_status: newStatus }),
  }).then(() => {
    renderSalesTable();
    toast(`📋 Estado actualizado: ${getStatusBadge(newStatus).label}`);
  });
}

/* ══════════════════════════════════════════════════════════
 SALES KPIs BY CHANNEL - MÉTRICAS ESPECÍFICAS
══════════════════════════════════════════════════════════ */
/* [ELIMINADO] renderSalesKPIs() - SOLO POS FÍSICO */

/* ══════════════════════════════════════════════════════════
 SALES EXPORT - EXPORTACIÓN AVANZADA
══════════════════════════════════════════════════════════ */
function exportAdvancedSales(filters = {}) {
  const { channel, method, status, dateFrom, dateTo, minAmount, maxAmount } =
    filters;

  let filtered = [...salesLog];

  if (channel) filtered = filtered.filter((s) => s.channel === channel);
  if (method) filtered = filtered.filter((s) => s.method === method);
  if (status) filtered = filtered.filter((s) => s.payment_status === status);

  if (dateFrom) {
    filtered = filtered.filter(
      (s) => new Date(s.timestamp) >= new Date(dateFrom),
    );
  }
  if (dateTo) {
    filtered = filtered.filter(
      (s) => new Date(s.timestamp) <= new Date(dateTo),
    );
  }
  if (minAmount) {
    filtered = filtered.filter((s) => s.total >= minAmount);
  }
  if (maxAmount) {
    filtered = filtered.filter((s) => s.total <= maxAmount);
  }

  const rows = [
    [
      "#",
      "Fecha",
      "Hora",
      "Canal",
      "Estado",
      "Vendedor",
      "Cliente",
      "Email",
      "Teléfono",
      "Productos",
      "Método",
      "Subtotal",
      "Descuento",
      "Total",
    ],
  ];

  filtered.forEach((s, i) => {
    rows.push([
      i + 1,
      new Date(s.timestamp).toLocaleDateString("es-CO"),
      new Date(s.timestamp).toLocaleTimeString("es-CO"),
      s.channel,
      s.payment_status || "pending",
      s.vendor,
      s.client || "",
      s.customer_email || "",
      s.customer_phone || "",
      s.items?.map((x) => `${x.name} x${x.qty}`).join(" | "),
      s.method,
      s.subtotal || s.total,
      s.discount || 0,
      s.total,
    ]);
  });

  const filename = `winner_ventas_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(rows, filename);

  toast(`⬇️ ${filtered.length} ventas exportadas`);
}

/* ══════════════════════════════════════════════════════════
 SALES
══════════════════════════════════════════════════════════ */
let _salesTimeRange = "today";

function setSalesTimeFilter(range) {
  _salesTimeRange = range;
  const container = document.querySelector("#page-sales .phc-quick-filters");
  if (container) {
    container.querySelectorAll(".ph-tab").forEach((btn) => {
      btn.classList.remove("active");
      const label = btn.textContent.toLowerCase();
      if (range === "today" && label === "hoy") btn.classList.add("active");
      if (range === "yesterday" && label === "ayer")
        btn.classList.add("active");
      if (range === "week" && label === "semana") btn.classList.add("active");
      if (range === "month" && label === "mes") btn.classList.add("active");
      if (range === "all" && label === "todo") btn.classList.add("active");
    });
  }
  if (range !== "custom") $("sfDate").value = "";
  renderSalesTable();
}

function resetSalesFilters() {
  $("sfDate").value = "";
  $("sfMethod").value = "";
  $("sfChannel").value = "";
  setSalesTimeFilter("today");
}

function renderSalesTable() {
  const tbody = $("salesBody");
  if (!tbody) return;
  const dateFilter = $("sfDate").value;
  const methodFilter = $("sfMethod").value;
  const channelFilter = $("sfChannel").value;

  let filtered = [...salesLog];

  // Filtro por fecha (Manual o Rápido)
  if (dateFilter) {
    filtered = filtered.filter((s) => s.timestamp.startsWith(dateFilter));
    _salesTimeRange = "custom";
    const container = document.querySelector("#page-sales .phc-quick-filters");
    if (container)
      container
        .querySelectorAll(".ph-tab")
        .forEach((btn) => btn.classList.remove("active"));
  } else if (_salesTimeRange !== "all") {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (_salesTimeRange === "today") {
      filtered = filtered.filter((s) => s.timestamp.startsWith(todayStr));
    } else if (_salesTimeRange === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const yestStr = yesterday.toISOString().split("T")[0];
      filtered = filtered.filter((s) => s.timestamp.startsWith(yestStr));
    } else if (_salesTimeRange === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      filtered = filtered.filter((s) => new Date(s.timestamp) >= weekAgo);
    } else if (_salesTimeRange === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      filtered = filtered.filter((s) => new Date(s.timestamp) >= monthAgo);
    }
  }

  // Filtros adicionales
  if (methodFilter) {
    filtered = filtered.filter((s) =>
      (s.payment_method || s.method || "")
        .toLowerCase()
        .includes(methodFilter.toLowerCase()),
    );
  }
  if (channelFilter) {
    filtered = filtered.filter(
      (s) =>
        (s.channel || "fisica").toLowerCase() === channelFilter.toLowerCase(),
    );
  }

  let totalRevenue = 0;
  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr class="empty-row"><td colspan="9">Sin ventas en este periodo</td></tr>';
  } else {
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    filtered.forEach((s, idx) => {
      totalRevenue += s.total;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="color:var(--gray-text);font-size:11px">#${filtered.length - idx}</td>
        <td style="font-size:12px">${new Date(s.timestamp).toLocaleString()}</td>
        <td><span class="status-badge s-fisica">${s.channel || "Física"}</span></td>
        <td>${s.vendor || "---"}</td>
        <td style="color:var(--gray-text)">${s.client_name || s.client || "Mostrador"}</td>
        <td style="font-size:11px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${s.items.map((i) => `${i.name} x${i.qty}`).join(", ")}">
          ${s.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
        </td>
        <td><span class="status-badge s-ok">${s.payment_method || s.method || "Efectivo"}</span></td>
        <td style="font-weight:700; color:var(--accent)">${fmt(s.total)}</td>
        <td>
          <div style="display:flex; gap:5px; justify-content:center;">
            <button class="action-btn" onclick="viewSaleDetails('${s.id}')" title="Ver detalles">👁</button>
            <button class="action-btn" onclick="printReceipt(salesLog.find(x=>x.id==='${s.id}'))" title="Imprimir">🖨</button>
            <button class="action-btn del" onclick="deleteSale('${s.id}')" title="Eliminar">✕</button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // Actualizar Dashboard Dinámico
  $("sv1").textContent = fmt(totalRevenue);
  $("sv2").textContent = filtered.length;
  const avg = filtered.length > 0 ? totalRevenue / filtered.length : 0;
  $("sv3").textContent = fmt(Math.round(avg));
}

function viewSaleDetails(id) {
  const sale = salesLog.find((s) => String(s.id) === String(id));
  if (!sale) {
    toast("⚠ Venta no encontrada");
    return;
  }

  let overlay = $("saleDetailsOverlay");
  let modal = $("saleDetailsModal");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "saleDetailsOverlay";
    overlay.className = "modal-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeSaleDetails();
    });
    document.body.appendChild(overlay);
  }
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "saleDetailsModal";
    modal.className = "modal";
    modal.style.maxWidth = "680px";
    document.body.appendChild(modal);
  }

  const items = Array.isArray(sale.items) ? sale.items : [];
  modal.innerHTML = `
    <div class="modal-header">
      <h3>Detalle de venta</h3>
      <button class="modal-close" onclick="closeSaleDetails()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:18px">
        <div><strong>ID:</strong><br>${esc(sale.id)}</div>
        <div><strong>Fecha:</strong><br>${fmtDate(sale.timestamp)}</div>
        <div><strong>Vendedor:</strong><br>${esc(sale.vendor || "Vendedor")}</div>
        <div><strong>Cliente:</strong><br>${esc(sale.client || "Mostrador")}</div>
        <div><strong>Método:</strong><br>${esc(sale.payment_method || sale.method || "Efectivo")}</div>
        <div><strong>Estado:</strong><br>${esc(sale.payment_status || "completed")}</div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Talla</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
                  <tr>
                    <td>${esc(item.name || item.product_name || "Producto")}</td>
                    <td>${esc(item.size || "U")}</td>
                    <td>${Number(item.qty || 1)}</td>
                    <td>${fmt(item.price || 0)}</td>
                    <td>${fmt(Number(item.price || 0) * Number(item.qty || 1))}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:18px;margin-top:18px;font-size:16px">
        <span>Subtotal: <strong>${fmt(sale.subtotal || 0)}</strong></span>
        <span>Descuento: <strong>${Number(sale.discount || 0)}%</strong></span>
        <span>Total: <strong style="color:var(--accent)">${fmt(sale.total || 0)}</strong></span>
      </div>
    </div>
  `;

  overlay.classList.add("open");
  modal.classList.add("open");
}

function closeSaleDetails() {
  const overlay = $("saleDetailsOverlay");
  const modal = $("saleDetailsModal");
  if (overlay) overlay.classList.remove("open");
  if (modal) modal.classList.remove("open");
}

async function deleteSale(id) {
  if (!confirm("¿Eliminar esta venta del registro?")) return;
  try {
    const res = await apiFetch(`${API_URL}/sales/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchSalesLog();
      toast("Venta eliminada");
    } else {
      toast("❌ Sin autorización");
    }
  } catch (e) {
    console.error("Error deleting sale:", e);
  }
}

function exportSalesCSV() {
  if (!salesLog.length) {
    toast("⚠ Sin ventas");
    return;
  }
  const rows = [
    [
      "#",
      "Fecha/Hora",
      "Canal",
      "Vendedor",
      "Cliente",
      "Productos",
      "Método",
      "Total",
    ],
    ...salesLog.map((s, i) => [
      i + 1,
      fmtDate(s.timestamp),
      s.channel,
      s.vendor,
      s.client,
      s.items.map((x) => `${x.name} x${x.qty}`).join(" | "),
      s.method,
      s.total,
    ]),
  ];
  downloadCSV(
    rows,
    `winner_ventas_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  toast("⬇ Ventas exportadas");
}

/* ══════════════════════════════════════════════════════════
 CSV EXPORT UTILITY
══════════════════════════════════════════════════════════ */
function downloadCSV(rows, filename) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════════════
 INIT (después de funciones de datos)
══════════════════════════════════════════════════════════ */
// Inicializar payMethods AHORA que defaultPayMethods() ya está definida
payMethods = LS.get("payMethods", defaultPayMethods());

/* ══════════════════════════════════════════════════════════
 MOBILE SCANNER LINK (QR para abrir escáner en celular)
══════════════════════════════════════════════════════════ */
function openMobileScannerLink() {
  const url = `${window.location.origin}${window.location.pathname}#qrscan`;
  const el = $("mobileScanQR");
  if (!el) return;
  el.innerHTML = "";
  try {
    new QRCode(el, {
      text: url,
      width: 180,
      height: 180,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (e) {
    el.innerHTML = `<p style="word-break:break-all;font-size:12px">${url}</p>`;
  }
  $("mobileScanOverlay").classList.add("open");
  $("mobileScanModal").classList.add("open");
}

function closeMobileScannerLink() {
  $("mobileScanOverlay").classList.remove("open");
  $("mobileScanModal").classList.remove("open");
}

/* ══════════════════════════════════════════════════════════
 QR SCANNER DESDE FORMULARIO DE PRODUCTO
══════════════════════════════════════════════════════════ */
function openProductQRScanner() {
  toast(
    "📷 Use el campo SKU para ingresar el código manualmente, o use el Escáner QR del menú.",
  );
}

/* ══════════════════════════════════════════════════════════
 ANALYTICS DASHBOARD — Cargar datos avanzados del backend
══════════════════════════════════════════════════════════ */

async function loadAnalyticsData() {
  try {
    // Cargar datos en paralelo con mejor manejo de errores
    const [channelRes, productsRes, inventoryRes, summaryRes] =
      await Promise.all([
        apiFetch(`${API_URL}/analytics/sales-by-channel`).catch((e) => ({
          ok: false,
        })),
        apiFetch(`${API_URL}/analytics/top-products`).catch((e) => ({
          ok: false,
        })),
        apiFetch(`${API_URL}/analytics/inventory-status`).catch((e) => ({
          ok: false,
        })),
        apiFetch(`${API_URL}/analytics/summary`).catch((e) => ({
          ok: false,
        })),
      ]);

    let channelData = [];
    let productsData = [];
    let timelineData = [];
    let inventoryData = [];
    let summaryData = {};

    if (channelRes.ok) channelData = await channelRes.json().catch(() => []);
    if (productsRes.ok) productsData = await productsRes.json().catch(() => []);
    if (inventoryRes.ok)
      inventoryData = await inventoryRes.json().catch(() => []);
    if (summaryRes.ok) summaryData = await summaryRes.json().catch(() => ({}));

    // Guardar en variables globales para usar en gráficos
    window.analyticsCache = {
      channels: channelData,
      products: productsData,
      inventory: inventoryData,
      summary: summaryData,
    };

    // Renderizar gráficos solo si hay datos
    if (channelData.length > 0) renderChannelChart(channelData);
    if (productsData.length > 0) renderProductChart(productsData);

    console.log("✅ Analytics data loaded:", window.analyticsCache);
  } catch (e) {
    console.error("⚠️ Error loading analytics:", e);
  }
}

// Gráfico: Ventas por Canal (Online vs Física)
let channelChartInstance = null;
function renderChannelChart(data) {
  const el = document.getElementById("chartChannels");
  if (!el) return;

  const labels = data.map((d) => {
    const label = d.channel || "Física";
    return label.charAt(0).toUpperCase() + label.slice(1);
  });
  const sales = data.map((d) => d.total_sales || 0);
  const revenue = data.map((d) => d.total_revenue || 0);

  if (channelChartInstance) channelChartInstance.destroy();

  const ctx = el.getContext("2d");
  channelChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: revenue,
          backgroundColor: ["#ffffff", "#34c759", "#007aff"],
          borderColor: "#0a0a0a",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#999", font: { size: 11 } },
        },
      },
    },
  });
}

// Gráfico: Top 10 Productos más vendidos
let productsChartInstance = null;
function renderProductChart(data) {
  const el = document.getElementById("chartTopProducts");
  if (!el) return;

  const top5 = data.slice(0, 5);
  const labels = top5.map((p) => p.name.slice(0, 20));
  const quantities = top5.map((p) => p.qty_sold || 0);

  if (productsChartInstance) productsChartInstance.destroy();

  const ctx = el.getContext("2d");
  productsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Unidades vendidas",
          data: quantities,
          backgroundColor: "#ffffff",
          borderRadius: 3,
          borderWidth: 0,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#666", font: { size: 10 } },
        },
        y: {
          grid: { display: false },
          ticks: { color: "#666", font: { size: 10 } },
        },
      },
    },
  });
}

/* ══════════════════════════════════════════════════════════
 TOGGLE PAY SECTION (colapsar/expandir secciones de pago)
══════════════════════════════════════════════════════════ */
async function loadLowStockAlerts() {
  try {
    const res = await apiFetch(`${API_URL}/analytics/low-stock?threshold=100`);
    if (!res.ok) {
      console.warn(`Low stock API returned ${res.status}`);
      return;
    }
    const lowStockProducts = await res.json().catch(() => []);
    const alertsDiv = $("lowStockAlerts");

    // Si no hay productos bajo 100, u ocultar si ninguno baja de 50 (según petición)
    const hasCritical = lowStockProducts.some(
      (p) => (p.total_stock || 0) <= 50,
    );

    if (!lowStockProducts || lowStockProducts.length === 0 || !hasCritical) {
      alertsDiv.innerHTML = "";
      return;
    }

    alertsDiv.innerHTML = `
      <div class="alert-banner" style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%), var(--gray); border: 1px solid var(--border); padding: 18px; border-radius: var(--radius); margin-bottom: 24px; box-shadow: var(--shadow); position: relative; overflow: hidden;">
        <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%); pointer-events: none;"></div>
        <div style="display:flex;align-items:center;gap:16px;color:#ffffff;position:relative;z-index:1">
          <span style="font-size:24px; filter: drop-shadow(0 0 8px rgba(255,255,255,0.3))">⚠️</span>
          <div>
            <strong style="font-family:'Bebas Neue', sans-serif; font-size:20px; letter-spacing:2px; color:#ffffff; text-shadow: 0 0 10px rgba(255,255,255,0.2)">${lowStockProducts.length} producto(s) con bajo stock</strong>
            <p style="font-size:13px;margin:4px 0 0 0;color:var(--gray-text)">Actualiza el inventario para evitar problemas de disponibilidad</p>
          </div>
        </div>
        <div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:10px;position:relative;z-index:1">
          ${lowStockProducts
            .slice(0, 8)
            .map(
              (p) => `
            <div onclick="navigateTo('inventory'); setTimeout(() => editProduct('${p.product_id || p.id}'), 100);" 
                 style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); padding: 8px 12px; border-radius: 8px; font-size: 11px; color: var(--accent); transition: all 0.3s; cursor: pointer; backdrop-filter: blur(5px);"
                 onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.borderColor='var(--accent)'"
                 onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'; this.style.borderColor='var(--border)'">
              <strong style="color:#ffffff">${p.name.slice(0, 25)}:</strong> <span style="color:var(--orange); font-weight:700">${p.total_stock} unidades</span>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  } catch (e) {
    console.error("Error loading low stock alerts:", e);
  }
}

/* ══════════════════════════════════════════════════════════
 VIP CUSTOMERS ANALYTICS
══════════════════════════════════════════════════════════ */
async function loadVIPCustomersData() {
  try {
    // Sincronizar clientes primero
    await apiFetch(`${API_URL}/customers/sync`, { method: "POST" }).catch((e) =>
      console.log("Sync error:", e),
    );

    const [vipRes, segmentRes] = await Promise.all([
      apiFetch(`${API_URL}/customers/vip?limit=100`).catch((e) => ({
        ok: false,
      })),
      apiFetch(`${API_URL}/customers/segment`).catch((e) => ({ ok: false })),
    ]);

    let vipCustomers = [];
    let segmentData = [];
    if (vipRes.ok) vipCustomers = await vipRes.json().catch(() => []);
    if (segmentRes.ok) segmentData = await segmentRes.json().catch(() => []);

    // Actualizar KPI cards
    const vipTotal =
      segmentData.find((s) => s.vip_status === "vip")?.count || 0;
    const regularTotal =
      segmentData.find((s) => s.vip_status === "standard")?.count || 0;
    const vipSpent =
      segmentData.find((s) => s.vip_status === "vip")?.total_spent || 0;

    $("vipCount").textContent = vipTotal;
    $("regularCount").textContent = regularTotal;
    $("vipSpent").textContent = fmt(vipSpent);

    // Renderizar tabla de VIP
    const tbody = $("vipCustomersBody");
    if (!vipCustomers || vipCustomers.length === 0) {
      tbody.innerHTML =
        '<tr class="empty-row"><td colspan="6">No hay clientes VIP</td></tr>';
      return;
    }

    tbody.innerHTML = vipCustomers
      .map(
        (c) => `
      <tr>
        <td>${esc(c.email || "N/A")}</td>
        <td>${esc(c.name || "N/A")}</td>
        <td>${esc(c.phone || "N/A")}</td>
        <td>${fmt(c.total_spent || 0)}</td>
        <td>${c.total_orders || 0}</td>
        <td>${c.last_purchase ? new Date(c.last_purchase).toLocaleDateString() : "N/A"}</td>
      </tr>
    `,
      )
      .join("");

    console.log("✅ VIP data loaded");
  } catch (e) {
    console.error("Error loading VIP data:", e);
  }
}

/* ══════════════════════════════════════════════════════════
 REORDER MANAGEMENT
══════════════════════════════════════════════════════════ */
async function loadReorderData() {
  try {
    const [checkRes, rulesRes] = await Promise.all([
      apiFetch(`${API_URL}/reorder-check`).catch((e) => ({ ok: false })),
      apiFetch(`${API_URL}/reorder-rules`).catch((e) => ({ ok: false })),
    ]);

    let needsReorder = [];
    let rules = [];
    if (checkRes.ok) needsReorder = await checkRes.json().catch(() => []);
    if (rulesRes.ok) rules = await rulesRes.json().catch(() => []);

    // Productos que necesitan reorden
    const needsList = $("reorderNeedsList");
    if (!needsReorder || needsReorder.length === 0) {
      needsList.innerHTML =
        '<div style="padding: 12px; background: var(--gray); border-radius: 6px; text-align: center; color: #2ecc71;">✓ Todo en orden - No hay reordenes pendientes</div>';
    } else {
      needsList.innerHTML = needsReorder
        .map(
          (item) => `
        <div style="padding: 12px; background: var(--gray); border-radius: 6px; border-left: 4px solid var(--accent);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>${esc(item.name)}</strong>
              <div style="font-size: 12px; color: var(--gray-text); margin-top: 4px;">
                Stock actual: ${item.current_stock} | Mínimo: ${item.min_stock}
              </div>
            </div>
            <button onclick="alert('Crear reorden para: ${esc(item.name)}')" style="padding: 6px 12px; background: var(--accent); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">Reordenar</button>
          </div>
        </div>
      `,
        )
        .join("");
    }

    // Tabla de reglas
    const rulesTable = $("reorderRulesBody");
    if (!rules || rules.length === 0) {
      rulesTable.innerHTML =
        '<tr class="empty-row"><td colspan="5">No hay reglas configuradas</td></tr>';
    } else {
      rulesTable.innerHTML = rules
        .map(
          (r) => `
        <tr>
          <td>${esc(r.product_name || "N/A")}</td>
          <td>${r.min_stock}</td>
          <td>${r.qty_to_order}</td>
          <td>${fmt(r.reorder_cost || 0)}</td>
          <td>${r.enabled ? "✓ Activa" : "✗ Inactiva"}</td>
        </tr>
      `,
        )
        .join("");
    }

    console.log("✅ Reorder data loaded");
  } catch (e) {
    console.error("Error loading reorder data:", e);
  }
}

/* ══════════════════════════════════════════════════════════
 DEMAND FORECASTING
══════════════════════════════════════════════════════════ */
async function loadForecastData() {
  try {
    // Primero calcular predicciones
    await apiFetch(`${API_URL}/demand-forecast/calculate`, {
      method: "POST",
    }).catch((e) => console.log("Forecast calc error:", e));

    const res = await apiFetch(`${API_URL}/demand-forecast?limit=50`).catch(
      (e) => ({ ok: false }),
    );
    if (!res.ok) {
      console.warn("Cannot fetch forecasts");
      $("forecastBody").innerHTML =
        '<tr class="empty-row"><td colspan="5">Error al cargar predicciones</td></tr>';
      return;
    }
    const forecasts = await res.json().catch(() => []);

    const tbody = $("forecastBody");
    if (!forecasts || forecasts.length === 0) {
      tbody.innerHTML =
        '<tr class="empty-row"><td colspan="5">No hay predicciones disponibles</td></tr>';
      return;
    }

    tbody.innerHTML = forecasts
      .map((f) => {
        const trendEmoji =
          f.trend === "up" ? "📈" : f.trend === "down" ? "📉" : "➡️";
        const confidence = f.confidence_score || 0;
        const confidenceColor =
          confidence > 75 ? "#2ecc71" : confidence > 50 ? "#f39c12" : "#e74c3c";

        return `
        <tr>
          <td>${esc(f.product_name || "N/A")}</td>
          <td><strong>${f.predicted_qty || 0} unidades</strong></td>
          <td title="Confianza de la predicción" style="color: ${confidenceColor}; font-weight: 600;">${Math.round(confidence)}%</td>
          <td>${trendEmoji} ${f.trend || "stable"}</td>
          <td>${f.last_updated ? new Date(f.last_updated).toLocaleDateString() : "N/A"}</td>
        </tr>
      `;
      })
      .join("");

    console.log("✅ Forecast data loaded");
  } catch (e) {
    console.error("Error loading forecast data:", e);
  }
}

function togglePaySection(sectionId) {
  const el = $(sectionId);
  if (!el) return;
  const isHidden = el.style.display === "none";
  el.style.display = isHidden ? "" : "none";
  const label = el.previousElementSibling;
  if (label) label.classList.toggle("collapsed", !isHidden);
}

/* ══════════════════════════════════════════════════════════
 EDITOR DE MÉTODO DE PAGO
══════════════════════════════════════════════════════════ */
let _editingPayMethodId = null;
let _editingPaySectionKey = null;

/* ══════════════════════════════════════════════════════════
 MODAL POS PAYMENT
══════════════════════════════════════════════════════════ */
function openPOSPaymentModal() {
  try {
    if (!posCart.length) {
      toast("⚠ Agrega productos a la venta");
      return;
    }

    const allMethods = [
      ...payMethods.national.filter((m) => m.enabled),
      ...payMethods.wallets.filter((m) => m.enabled),
      ...payMethods.delivery.filter((m) => m.enabled),
      ...payMethods.intl.filter((m) => m.enabled),
    ];

    const grid = $("posPayMethodsGrid");
    if (!grid) {
      console.error("❌ Contenedor posPayMethodsGrid no encontrado");
      toast("❌ Error abriendo modal de pago");
      return;
    }

    grid.innerHTML = allMethods
      .map(
        (m) => `
      <button class="pos-pay-option-btn" style="padding:12px;border:2px solid var(--border);border-radius:6px;background:transparent;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:6px"
        onmouseover="this.style.borderColor='var(--accent)'"
        onmouseout="this.style.borderColor='var(--border)'"
        onclick="selectPOSPaymentMethod('${m.id}', '${m.name}', '${m.type}')">
        <span style="font-size:24px">${m.icon}</span>
        <span style="font-size:12px;font-weight:600;color:var(--white)">${m.name}</span>
        <span style="font-size:10px;color:var(--gray-text)">${m.type}</span>
      </button>`,
      )
      .join("");

    // Mostrar step 1, ocultar step 2
    const step1 = $("posPayStep1");
    const step2 = $("posPayStep2");
    if (step1) step1.style.display = "block";
    if (step2) step2.style.display = "none";

    // Botones
    const backBtn = $("posPayBackBtn");
    const confirmBtn = $("posPayConfirmBtn");
    if (backBtn) backBtn.style.display = "none";
    if (confirmBtn) confirmBtn.style.display = "none";

    // Abrir modal
    const overlay = $("posPayOverlay");
    const modal = $("posPayModal");
    if (overlay) overlay.classList.add("open");
    if (modal) modal.classList.add("open");
  } catch (e) {
    console.error("❌ Error en openPOSPaymentModal:", e);
    toast("❌ Error abriendo modal de pago");
  }
}

function closePOSPaymentModal() {
  try {
    const overlay = $("posPayOverlay");
    const modal = $("posPayModal");
    if (overlay) overlay.classList.remove("open");
    if (modal) modal.classList.remove("open");
    // Limpiar formularios
    $("posPayCashReceived").value = "";
    $("posPayCardRef").value = "";
    $("posPayCardName").value = "";
    $("posPayCardLast4").value = "";
    $("posPayMobilePhone").value = "";
    $("posPayMobileRef").value = "";
    $("posPayTransferBank").value = "";
    $("posPayTransferRef").value = "";
    $("posPayCheckNumber").value = "";
    $("posPayCheckBank").value = "";
    $("posPayNotes").value = "";
    $("posPayEmail").value = "";
  } catch (e) {
    console.error("❌ Error en closePOSPaymentModal:", e);
  }
}

let posCurrentPaymentMethod = null;

function selectPOSPaymentMethod(methodId, methodName, methodType) {
  try {
    posCurrentPaymentMethod = {
      id: methodId,
      name: methodName,
      type: methodType,
    };

    // Mostrar Step 2
    const step1 = $("posPayStep1");
    const step2 = $("posPayStep2");
    if (step1) step1.style.display = "none";
    if (step2) step2.style.display = "block";

    // Actualizar título
    const titleEl = $("posPayMethod");
    if (titleEl) titleEl.textContent = `📱 ${methodName} (${methodType})`;

    // Calcular total
    const sub = posCart.reduce(
      (s, i) => s + Number(i.price || 0) * Number(i.qty || 0),
      0,
    );
    const discEl = $("posDiscount");
    const disc = discEl ? parseFloat(discEl.value) || 0 : 0;
    const total = Math.round(sub * (1 - disc / 100));

    const totalEl = $("posPayTotal");
    if (totalEl) totalEl.textContent = fmt(total);

    // Mostrar formulario según el método
    // Mostrar formulario según el método
    hideAllPaymentForms();

    if (methodId === "cash") {
      const cashForm = $("posPayFormCash");
      if (cashForm) cashForm.style.display = "block";
    } else if (
      ["debit", "credit", "visa", "mc", "paypal", "stripe", "amex"].includes(
        methodId,
      )
    ) {
      const cardForm = $("posPayFormCard");
      if (cardForm) cardForm.style.display = "block";
    } else if (
      ["nequi", "daviplata", "dale", "rappipay", "movii", "tpaga"].includes(
        methodId,
      )
    ) {
      const mobileForm = $("posPayFormMobile");
      if (mobileForm) mobileForm.style.display = "block";
    } else if (["pse", "efecty", "baloto", "sured"].includes(methodId)) {
      const transferForm = $("posPayFormTransfer");
      if (transferForm) transferForm.style.display = "block";
    }

    // Mostrar botones
    const backBtn = $("posPayBackBtn");
    const confirmBtn = $("posPayConfirmBtn");
    if (backBtn) backBtn.style.display = "inline-block";
    if (confirmBtn) confirmBtn.style.display = "inline-block";
  } catch (e) {
    console.error("❌ Error en selectPOSPaymentMethod:", e);
    toast("❌ Error seleccionando método de pago");
  }
}

function hideAllPaymentForms() {
  const forms = [
    "posPayFormCash",
    "posPayFormCard",
    "posPayFormMobile",
    "posPayFormTransfer",
    "posPayFormCheck",
  ];
  forms.forEach((formId) => {
    const form = $(formId);
    if (form) form.style.display = "none";
  });
}

function calcCashChange() {
  try {
    const receivedEl = $("posPayCashReceived");
    if (!receivedEl) return;

    const received = parseFloat(receivedEl.value) || 0;
    const sub = posCart.reduce(
      (s, i) => s + Number(i.price || 0) * Number(i.qty || 0),
      0,
    );
    const discEl = $("posDiscount");
    const disc = discEl ? parseFloat(discEl.value) || 0 : 0;
    const total = Math.round(sub * (1 - disc / 100));

    const change = Math.max(0, received - total);
    const changeEl = $("posPayCashChange");
    if (changeEl) changeEl.textContent = fmt(change);

    // Cambiar color si es insuficiente
    if (received < total) {
      receivedEl.style.borderColor = "#e74c3c";
    } else {
      receivedEl.style.borderColor = "var(--border)";
    }
  } catch (e) {
    console.error("❌ Error en calcCashChange:", e);
  }
}

function posPayBackToMethods() {
  try {
    const step1 = $("posPayStep1");
    const step2 = $("posPayStep2");
    if (step1) step1.style.display = "block";
    if (step2) step2.style.display = "none";

    const backBtn = $("posPayBackBtn");
    const confirmBtn = $("posPayConfirmBtn");
    if (backBtn) backBtn.style.display = "none";
    if (confirmBtn) confirmBtn.style.display = "none";

    posCurrentPaymentMethod = null;
  } catch (e) {
    console.error("❌ Error en posPayBackToMethods:", e);
  }
}

function confirmPOSPaymentWithDetails() {
  try {
    if (!posCurrentPaymentMethod) {
      toast("⚠ Selecciona un método de pago");
      return;
    }

    const methodId = posCurrentPaymentMethod.id;
    let paymentDetails = { method: posCurrentPaymentMethod.name, methodId };

    // Validar según el método
    if (methodId === "cash") {
      const received = parseFloat($("posPayCashReceived").value) || 0;
      const sub = posCart.reduce(
        (s, i) => s + Number(i.price || 0) * Number(i.qty || 0),
        0,
      );
      const discEl = $("posDiscount");
      const disc = discEl ? parseFloat(discEl.value) || 0 : 0;
      const total = Math.round(sub * (1 - disc / 100));

      if (received < total) {
        toast("⚠ Monto insuficiente");
        return;
      }
      paymentDetails.received = received;
      paymentDetails.change = received - total;
    } else if (
      ["debit", "credit", "visa", "mc", "paypal", "stripe", "amex"].includes(
        methodId,
      )
    ) {
      const ref = $("posPayCardRef").value.trim();
      const name = $("posPayCardName").value.trim();
      const last4 = $("posPayCardLast4").value.trim();

      if (!ref || !name) {
        toast("⚠ Completa los datos de la tarjeta");
        return;
      }
      paymentDetails.reference = ref;
      paymentDetails.cardholderName = name;
      paymentDetails.last4Digits = last4;
    } else if (
      ["nequi", "daviplata", "dale", "rappipay", "movii", "tpaga"].includes(
        methodId,
      )
    ) {
      const phone = $("posPayMobilePhone").value.trim();
      const ref = $("posPayMobileRef").value.trim();

      if (!phone) {
        toast("⚠ Ingresa el teléfono");
        return;
      }
      paymentDetails.phone = phone;
      paymentDetails.transactionId = ref;
    } else if (["pse", "efecty", "baloto", "sured"].includes(methodId)) {
      const bank = $("posPayTransferBank").value;
      const ref = $("posPayTransferRef").value.trim();

      if (!bank || !ref) {
        toast("⚠ Completa los datos de la transacción");
        return;
      }
      paymentDetails.bank = bank;
      paymentDetails.reference = ref;
    }

    // Notas adicionales
    const notesEl = $("posPayNotes");
    if (notesEl && notesEl.value.trim()) {
      paymentDetails.notes = notesEl.value.trim();
    }

    // Correo para factura
    const emailEl = $("posPayEmail");
    if (emailEl && emailEl.value.trim()) {
      const email = emailEl.value.trim();
      // Validar formato de email básico
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        paymentDetails.invoiceEmail = email;
      } else {
        toast("⚠️ Formato de correo inválido");
        return;
      }
    }

    // Cerrar modal y procesar venta
    closePOSPaymentModal();
    processPOSSaleWithPayment(paymentDetails);
  } catch (e) {
    console.error("❌ Error en confirmPOSPaymentWithDetails:", e);
    toast("❌ Error validando pago");
  }
}

function processPOSSaleWithPayment(paymentDetails) {
  try {
    const vendorEl = $("posVendor");
    const clientEl = $("posClient");
    const discEl = $("posDiscount");

    const vendor = vendorEl ? vendorEl.value.trim() : "Vendedor";
    const client = clientEl ? clientEl.value.trim() : "—";
    const disc = discEl ? parseFloat(discEl.value) || 0 : 0;
    const sub = posCart.reduce(
      (s, i) => s + Number(i.price || 0) * Number(i.qty || 0),
      0,
    );
    const total = Math.round(sub * (1 - disc / 100));

    const items = posCart.map((i) => ({
      id: i.id,
      name: i.name,
      qty: i.qty,
      price: i.price,
      size: i.size,
    }));

    const sale = {
      id: genId(),
      timestamp: nowStr(),
      channel: "fisica",
      vendor,
      client,
      method: paymentDetails.method,
      methodId: paymentDetails.methodId,
      payment_status: "completed",
      subtotal: sub,
      discount: disc,
      total,
      items,
      paymentDetails: paymentDetails,
    };

    // Guardar venta
    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/sales`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sale),
        });
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.error || `HTTP ${res.status}`);
        }
        await fetchSalesLog();
      } catch (e) {
        console.error("Error saving POS sale:", e);
        toast(`❌ No se pudo guardar la venta: ${e.message}`);
        return;
      }

      toast(`✅ Venta confirmada: ${fmt(total)} — ${paymentDetails.method}`);
      clearPOS();
      fetchInventory();
      renderDashboard();

      // Opción de imprimir recibo
      if (
        confirm(`✅ Venta registrada por ${fmt(total)}\n\n¿Imprimir recibo?`)
      ) {
        printReceipt(sale);
      }
    })();
  } catch (e) {
    console.error("❌ Error en processPOSSaleWithPayment:", e);
    toast("❌ Error procesando venta");
  }
}

/* ══════════════════════════════════════════════════════════
 MODAL: DATOS DEL CLIENTE (POS)
══════════════════════════════════════════════════════════ */
let posCurrentClient = null;

function openClientModal() {
  try {
    const overlay = $("clientModalOverlay");
    const modal = $("clientModal");

    // Limpiar formulario
    $("clientName").value = "";
    $("clientPhone").value = "";
    $("clientEmail").value = "";
    $("clientAddress").value = "";
    $("clientCity").value = "";
    $("clientType").value = "regular";

    // Si hay cliente guardado, llenar el formulario
    if (posCurrentClient) {
      $("clientName").value = posCurrentClient.name || "";
      $("clientPhone").value = posCurrentClient.phone || "";
      $("clientEmail").value = posCurrentClient.email || "";
      $("clientAddress").value = posCurrentClient.address || "";
      $("clientCity").value = posCurrentClient.city || "";
      $("clientType").value = posCurrentClient.type || "regular";
    }

    if (overlay) overlay.classList.add("open");
    if (modal) modal.classList.add("open");
  } catch (e) {
    console.error("❌ Error en openClientModal:", e);
  }
}

function closeClientModal() {
  try {
    const overlay = $("clientModalOverlay");
    const modal = $("clientModal");
    if (overlay) overlay.classList.remove("open");
    if (modal) modal.classList.remove("open");
  } catch (e) {
    console.error("❌ Error en closeClientModal:", e);
  }
}

function saveClientData() {
  try {
    const name = $("clientName").value.trim();
    const phone = $("clientPhone").value.trim();
    const email = $("clientEmail").value.trim();
    const address = $("clientAddress").value.trim();
    const city = $("clientCity").value.trim();
    const type = $("clientType").value || "regular";

    // Validar nombre obligatorio
    if (!name) {
      toast("⚠️ El nombre del cliente es obligatorio");
      return;
    }

    // Guardar datos del cliente
    posCurrentClient = {
      name: name,
      phone: phone,
      email: email,
      address: address,
      city: city,
      type: type,
    };

    // Actualizar display en el POS
    const displayEl = $("posClientName");
    if (displayEl) {
      displayEl.textContent = name;
      displayEl.style.color = "var(--accent)";
    }

    // Mostrar botón limpiar
    const clearBtn = $("posClientClear");
    if (clearBtn) clearBtn.style.display = "block";

    // Cerrar modal
    closeClientModal();
    toast("✅ Cliente guardado: " + name);
  } catch (e) {
    console.error("❌ Error en saveClientData:", e);
    toast("❌ Error guardando cliente");
  }
}

function clearPOSClient() {
  try {
    posCurrentClient = null;

    const displayEl = $("posClientName");
    if (displayEl) {
      displayEl.textContent = "Agregar cliente...";
      displayEl.style.color = "var(--gray-text)";
    }

    const clearBtn = $("posClientClear");
    if (clearBtn) clearBtn.style.display = "none";

    toast("✅ Cliente eliminado");
  } catch (e) {
    console.error("❌ Error en clearPOSClient:", e);
  }
}

/* ══════════════════════════════════════════════════════════
 STOCK CSV UPLOAD
══════════════════════════════════════════════════════════ */
function triggerStockUpload() {
  const inp = $("invCsvInput");
  if (inp) inp.click();
}

async function handleStockUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());
  if (!lines.length) {
    toast("Archivo vacío");
    return;
  }

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const getCol = (h) => {
    if (["id", "codigo", "código", "sku"].includes(h)) return "sku";
    if (["name", "nombre", "producto"].includes(h)) return "name";
    if (["qty", "cantidad", "stock", "cantidad"].includes(h)) return "qty";
    if (["size", "talla", "talla/size"].includes(h)) return "size";
    return h;
  };
  const mapped = headers.map(getCol);

  let updated = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]
      .split(",")
      .map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const row = {};
    mapped.forEach((k, j) => {
      row[k] = cols[j] || "";
    });

    const skuVal = row.sku || row.name || "";
    const sizeVal = (row.size || "M").toUpperCase();
    const qtyVal = parseInt(row.qty) || 0;

    const p = inventory.find(
      (x) =>
        x.sku === skuVal ||
        x.name.toLowerCase() === skuVal.toLowerCase() ||
        String(x.id) === skuVal,
    );
    if (p && SIZES.includes(sizeVal)) {
      p.stock[sizeVal] = qtyVal;
      // Sync to backend
      try {
        await apiFetch(`${API_URL}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...p, category: p.cat, image: p.img }),
        });
        updated++;
      } catch (e) {
        console.error("Stock sync error:", e);
      }
    }
  }

  event.target.value = "";
  fetchInventory();
  toast(`✓ Stock actualizado: ${updated} producto(s)`);
}

/* ══════════════════════════════════════════════════════════
 DOM READY — listeners finales
══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  bindSidebarNavigation();

  // KPI cards → navegación
  const kpiSales = $("kpiCardSales");
  if (kpiSales) kpiSales.addEventListener("click", () => navigateTo("sales"));
  const kpiProds = $("kpiCardProducts");
  if (kpiProds)
    kpiProds.addEventListener("click", () => navigateTo("inventory"));
  const kpiLow = $("kpiCardLowStock");
  if (kpiLow) kpiLow.addEventListener("click", () => navigateTo("inventory"));

  // Stock inputs en modal
  SIZES.forEach((s) => {
    const el = $("ps-" + s);
    if (el) el.addEventListener("input", updateStockTotal);
  });

  // POS discount live update
  const pd = $("posDiscount");
  if (pd) pd.addEventListener("input", updatePOSTotals);

  // Hash navigation (ej: #qrscan desde móvil)
  const hash = window.location.hash.replace("#", "");
  const validPages = [
    "dashboard",
    "inventory",
    "pos",
    "payments",
    "sales",
    "qrscan",
    "vip",
    "reorder",
    "forecast",
  ];
  if (hash && validPages.includes(hash) && verifySession()) {
    navigateTo(hash);
  }
});

// ═════════════════════════════════════════════════════════
// Fin del archivo admin-panel.js
// ═════════════════════════════════════════════════════════
