/* ═══════════════════════════════════════════════════════
   WINNER STORE — admin.js
   Panel administrativo embebido: Pagos · Inventario · Ventas
   ═══════════════════════════════════════════════════════ */

/* ── LOCAL STORAGE HELPER ─────────────────────────────── */
if (typeof API_URL === "undefined" || !API_URL) {
  const origin = window.location.origin.startsWith("file:")
    ? "http://localhost:3000"
    : window.location.origin;
  window.API_URL = `${origin.replace(/\/$/, "")}/api`;
} else {
  window.API_URL = API_URL.replace(/\/$/, "");
}
// API_KEY ya está definida globalmente en admin-panel.js
if (typeof window.API_KEY === 'undefined') {
  window.API_KEY = localStorage.getItem("w_api_key") || "dev-api-key";
}
// Reutilizar apiFetch del contexto global si existe, sino crear uno local
if (typeof window.apiFetch === 'undefined') {
  window.apiFetch = (url, options = {}) => {
    const headers = { ...(options.headers || {}), 'x-api-key': window.API_KEY };
    return fetch(url, { ...options, headers });
  };
}

/* ── CURRENCY FORMAT ──────────────────────────────────── */
function admFmt(n) {
  return "$" + Number(n).toLocaleString("es-CO");
}
function admNow() {
  return new Date().toISOString();
}
function admToday() {
  return new Date().toISOString().split("T")[0];
}
function admId() {
  return "W" + Date.now().toString(36).toUpperCase();
}

function admFmtDate(isoStr) {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoStr));
  } catch (e) {
    return isoStr;
  }
}

/* ── STATE ────────────────────────────────────────────── */
if (typeof SIZES === "undefined") {
  window.SIZES = ["XS", "S", "M", "L", "XL", "XXL", "U"];
}
let admInventory = [];
let admSales = [];

async function fetchInventory() {
  try {
    const res = await apiFetch(`${API_URL}/products`);
    admInventory = await res.json();
    renderAdminInventory();
  } catch (e) {
    console.error("Error loading inventory:", e);
  }
}

async function fetchSales() {
  try {
    const res = await apiFetch(`${API_URL}/sales`);
    admSales = await res.json();
    renderSalesStats();
    renderAdminSalesTable();
  } catch (e) {
    console.error("Error loading sales:", e);
  }
}

const PAY_METHODS_CONFIG = [
  {
    id: "efectivo",
    name: "Efectivo",
    icon: "💵",
    color: "#2ecc71",
    bg: "rgba(46,204,113,0.12)",
    enabled: true,
  },
  {
    id: "nequi",
    name: "Nequi",
    icon: "📱",
    color: "#e91e8b",
    bg: "rgba(233,30,139,0.12)",
    enabled: true,
  },
  {
    id: "daviplata",
    name: "Daviplata",
    icon: "📱",
    color: "#ff6b00",
    bg: "rgba(255,107,0,0.12)",
    enabled: true,
  },
  {
    id: "pse",
    name: "PSE",
    icon: "🏦",
    color: "#1e90ff",
    bg: "rgba(30,144,255,0.12)",
    enabled: true,
  },
  {
    id: "debito",
    name: "Tarjeta Débito",
    icon: "💳",
    color: "#9b59b6",
    bg: "rgba(155,89,182,0.12)",
    enabled: true,
  },
  {
    id: "credito",
    name: "Tarjeta Crédito",
    icon: "💳",
    color: "#e74c3c",
    bg: "rgba(231,76,60,0.12)",
    enabled: true,
  },
  {
    id: "transferencia",
    name: "Transferencia",
    icon: "🔁",
    color: "#3498db",
    bg: "rgba(52,152,219,0.12)",
    enabled: true,
  },
];

let admPayments = [];
let admPayMethods = [...PAY_METHODS_CONFIG];
let admInventory = [];

try {
  const pData = localStorage.getItem("winner_payments");
  if (pData) {
    const parsed = JSON.parse(pData);
    admPayments = Array.isArray(parsed) ? parsed : [];
  }

  const mData = localStorage.getItem("winner_payMethods");
  if (mData) {
    const parsed = JSON.parse(mData);
    admPayMethods = Array.isArray(parsed) ? parsed : [...PAY_METHODS_CONFIG];
  }
} catch (e) {
  console.warn("⚠️  Error loading admin data:", e);
  admPayments = [];
  admPayMethods = [...PAY_METHODS_CONFIG];
}

/* ══════════════════════════════════════════════════════════
   ADMIN PANEL TOGGLE
══════════════════════════════════════════════════════════ */
function toggleAdminPanel() {
  const panel = document.getElementById("adminPanel");
  const overlay = document.getElementById("adminOverlay");
  const isOpen = panel.classList.contains("open");
  if (isOpen) {
    panel.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  } else {
    panel.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    updateAdmDate();
    renderAll();
  }
}

function updateAdmDate() {
  const el = document.getElementById("admDate");
  if (el)
    el.textContent = new Date().toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
}

/* ── TAB SWITCHING ────────────────────────────────────── */
function switchAdminTab(tabName) {
  document
    .querySelectorAll(".adm-tab")
    .forEach((t) => t.classList.toggle("active", t.dataset.tab === tabName));
  document
    .querySelectorAll(".adm-content")
    .forEach((c) => c.classList.remove("active"));
  const target = document.getElementById("tab-" + tabName);
  if (target) target.classList.add("active");
  if (tabName === "analytics") renderCharts();
}

/* ══════════════════════════════════════════════════════════
   PAYMENT METHODS — COLORFUL
══════════════════════════════════════════════════════════ */
function renderPayMethods() {
  const grid = document.getElementById("payMethodsGrid");
  if (!grid) return;
  grid.innerHTML = admPayMethods
    .map(
      (m) => `
    <div class="pm-card ${m.enabled ? "enabled" : ""}" style="border-color:${m.enabled ? m.color + "55" : "var(--border)"};background:${m.enabled ? m.bg : "transparent"}">
      <span class="pm-icon" style="background:${m.bg};color:${m.color}">${m.icon}</span>
      <div class="pm-info">
        <div class="pm-name" style="color:${m.enabled ? m.color : "var(--gray-text)"}">${m.name}</div>
        <div class="pm-status">${m.enabled ? "✓ Activo" : "Inactivo"}</div>
      </div>
      <button class="pm-toggle ${m.enabled ? "on" : ""}" style="${m.enabled ? "background:" + m.color : ""}" onclick="togglePayMethodAdmin('${m.id}')" aria-label="${m.enabled ? "Desactivar" : "Activar"} ${m.name}"></button>
    </div>
  `,
    )
    .join("");
}

function togglePayMethodAdmin(id) {
  const m = admPayMethods.find((x) => x.id === id);
  if (m) {
    m.enabled = !m.enabled;
    try {
      localStorage.setItem("winner_payMethods", JSON.stringify(admPayMethods));
    } catch (e) {}
    renderPayMethods();
  }
}

/* ── PAYMENT STATS ────────────────────────────────────── */
function renderPayStats() {
  const el = (id) => document.getElementById(id);
  const total = admPayments.reduce((s, p) => s + p.amount, 0);
  const topMethod =
    admPayments.length > 0
      ? Object.entries(
          admPayments.reduce((acc, p) => {
            acc[p.method] = (acc[p.method] || 0) + 1;
            return acc;
          }, {}),
        ).sort((a, b) => b[1] - a[1])[0][0]
      : "—";
  el("statTotalCollected").textContent = admFmt(total);
  el("statTxCount").textContent = admPayments.length;
  el("statTopMethod").textContent = topMethod;
}

/* ── REGISTER PAYMENT ─────────────────────────────────── */
function registerPaymentAdmin() {
  const method = document.getElementById("payMethod").value;
  const amount = parseFloat(document.getElementById("payAmount").value);
  const ref = document.getElementById("payRef").value.trim();
  if (!method || !amount || amount <= 0) {
    showAdminToast("⚠ Completa método y monto");
    return;
  }
  admPayments.unshift({
    id: admId(),
    ts: admNow(),
    method,
    ref: ref || "—",
    amount,
  });
  try {
    localStorage.setItem("winner_payments", JSON.stringify(admPayments));
  } catch (e) {}
  document.getElementById("payMethod").value = "";
  document.getElementById("payAmount").value = "";
  document.getElementById("payRef").value = "";
  renderAdminPayTable();
  renderPayStats();
  showAdminToast(`✓ Pago de ${admFmt(amount)} registrado`);
}

/* ── PAYMENTS TABLE ───────────────────────────────────── */
function renderAdminPayTable() {
  const tbody = document.getElementById("admPaymentsBody");
  if (!admPayments.length) {
    tbody.innerHTML =
      '<tr class="empty-row"><td colspan="6">Sin pagos registrados</td></tr>';
    return;
  }
  tbody.innerHTML = admPayments
    .map((p) => {
      const cfg = admPayMethods.find((m) => m.name === p.method) || {
        color: "#e8ff47",
      };
      return `<tr>
      <td style="font-size:12px">${admFmtDate(p.ts)}</td>
      <td><span class="pm-tag" style="background:${cfg.bg || "rgba(232,255,71,0.1)"};color:${cfg.color}">${p.method}</span></td>
      <td style="color:var(--gray-text);font-family:monospace;font-size:12px">${p.ref}</td>
      <td style="font-weight:700;color:${cfg.color}">${admFmt(p.amount)}</td>
      <td><span class="adm-badge-ok">Completado</span></td>
      <td><button class="adm-action-btn del" onclick="deletePayAdmin('${p.id}')">✕</button></td>
    </tr>`;
    })
    .join("");
}

function deletePayAdmin(id) {
  if (!confirm("¿Eliminar este registro?")) return;
  admPayments = admPayments.filter((p) => p.id !== id);
  try {
    localStorage.setItem("winner_payments", JSON.stringify(admPayments));
  } catch (e) {}
  renderPayStats();
  renderAdminPayTable();
}

/* ══════════════════════════════════════════════════════════
   INVENTORY
══════════════════════════════════════════════════════════ */
function totalStock(p) {
  return SIZES.reduce((s, sz) => s + (p.stock[sz] || 0), 0);
}

function renderAdminInventory() {
  const search = (
    document.getElementById("admInvSearch")?.value || ""
  ).toLowerCase();
  const catFilter = document.getElementById("admInvCatFilter")?.value || "";
  let list = [...admInventory];
  if (search) list = list.filter((p) => p.name.toLowerCase().includes(search));
  if (catFilter) list = list.filter((p) => p.cat === catFilter);

  // Stats
  const totalProds = admInventory.length;
  const lowStock = admInventory.filter((p) => {
    const t = totalStock(p);
    return t > 0 && t <= 5;
  }).length;
  const outStock = admInventory.filter((p) => totalStock(p) === 0).length;
  const totalValue = admInventory.reduce(
    (s, p) => s + p.price * totalStock(p),
    0,
  );
  document.getElementById("invTotalItems").textContent = totalProds;
  document.getElementById("invLowStock").textContent = lowStock;
  document.getElementById("invOutStock").textContent = outStock;
  document.getElementById("invTotalValue").textContent = admFmt(totalValue);

  const tbody = document.getElementById("admInventoryBody");
  if (!list.length) {
    tbody.innerHTML =
      '<tr class="empty-row"><td colspan="7">No se encontraron productos</td></tr>';
    return;
  }
  tbody.innerHTML = list
    .map((p) => {
      const ts = totalStock(p);
      const statusCls =
        ts === 0
          ? "adm-badge-danger"
          : ts <= 5
            ? "adm-badge-warn"
            : "adm-badge-ok";
      const statusTxt =
        ts === 0 ? "Sin stock" : ts <= 5 ? "Stock bajo" : "Disponible";
      const sizes = SIZES.map(
        (s) =>
          `<span class="size-chip ${(p.stock[s] || 0) > 0 ? "" : "empty"}">${s}:${p.stock[s] || 0}</span>`,
      ).join(" ");
      return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px">
        <img src="${p.img}" style="width:40px;height:48px;object-fit:cover;background:#1a1a1a" onerror="this.style.background='#1a1a1a'" />
        <div><div style="font-weight:600">${p.name}</div><div style="font-size:11px;color:var(--gray-text);font-family:monospace">${p.id}</div></div>
      </div></td>
      <td><span class="cat-chip">${p.cat}</span></td>
      <td style="font-weight:700;color:var(--accent)">${admFmt(p.price)}</td>
      <td style="font-size:11px">${sizes}</td>
      <td style="font-weight:700">${ts}</td>
      <td><span class="${statusCls}">${statusTxt}</span></td>
      <td>
        <button class="adm-action-btn" onclick="editProduct('${p.id}')" title="Editar">✎</button>
        <button class="adm-action-btn del" onclick="deleteProduct('${p.id}')" title="Eliminar">✕</button>
      </td>
    </tr>`;
    })
    .join("");
}

/* ── PRODUCT MODAL ────────────────────────────────────── */
function openAddProduct() {
  document.getElementById("modalProductId").value = "";
  document.getElementById("modalTitle").textContent = "Nuevo Producto";
  document.getElementById("modalName").value = "";
  document.getElementById("modalCat").value = "mujer";
  document.getElementById("modalPrice").value = "";
  if (document.getElementById("modalOldPrice"))
    document.getElementById("modalOldPrice").value = "";
  document.getElementById("modalImg").value = "";
  if (document.getElementById("modalImgFile"))
    document.getElementById("modalImgFile").value = "";
  if (document.getElementById("modalImgBase64"))
    document.getElementById("modalImgBase64").value = "";
  SIZES.forEach((s) => {
    const el = document.getElementById("stock-" + s);
    if (el) el.value = 0;
  });
  document.getElementById("productModal").classList.add("open");
  document.getElementById("modalOverlay").classList.add("open");
}

function editProduct(id) {
  const p = admInventory.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("modalProductId").value = p.id;
  document.getElementById("modalTitle").textContent = "Editar Producto";
  document.getElementById("modalName").value = p.name;
  document.getElementById("modalCat").value = p.cat;
  document.getElementById("modalPrice").value = p.price;
  if (document.getElementById("modalOldPrice"))
    document.getElementById("modalOldPrice").value = p.oldPrice || "";
  document.getElementById("modalImg").value = p.img || "";
  if (document.getElementById("modalImgFile"))
    document.getElementById("modalImgFile").value = "";
  if (document.getElementById("modalImgBase64"))
    document.getElementById("modalImgBase64").value = "";
  SIZES.forEach((s) => {
    const el = document.getElementById("stock-" + s);
    if (el) el.value = p.stock[s] || 0;
  });
  document.getElementById("productModal").classList.add("open");
  document.getElementById("modalOverlay").classList.add("open");
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("open");
  document.getElementById("modalOverlay").classList.remove("open");
}

async function saveProduct() {
  const idInput = document.getElementById("modalProductId").value;
  const name = document.getElementById("modalName").value.trim();
  const cat = document.getElementById("modalCat").value;
  const price = parseFloat(document.getElementById("modalPrice").value);
  let img = document.getElementById("modalImg").value.trim();
  const base64Img = document.getElementById("modalImgBase64")?.value;
  if (base64Img) img = base64Img;
  const oldPriceEl = document.getElementById("modalOldPrice");
  const oldPrice =
    oldPriceEl && oldPriceEl.value ? parseFloat(oldPriceEl.value) : null;
  if (!name || !price) {
    showAdminToast("⚠ Nombre y precio son obligatorios");
    return;
  }

  const id = idInput || admId();
  const stock = {};
  SIZES.forEach((s) => {
    stock[s] = parseInt(document.getElementById("stock-" + s)?.value || 0) || 0;
  });

  const productData = {
    id,
    name,
    price,
    oldPrice,
    category: cat,
    image: img,
    stock,
  };

  try {
    const res = await apiFetch(`${API_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    if (res.ok) {
      closeProductModal();
      fetchInventory();
      showAdminToast(`✓ Producto "${name}" guardado`);
    } else {
      const errRes = await res.json();
      showAdminToast(`❌ Error: ${errRes.error || "No se pudo guardar"}`);
    }
  } catch (e) {
    console.error("Error saving product:", e);
    showAdminToast("❌ Error de conexión al guardar el producto");
  }
}

async function deleteProduct(id) {
  if (!confirm("¿Eliminar este producto del inventario?")) return;
  try {
    const res = await apiFetch(`${API_URL}/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchInventory();
      showAdminToast("Producto eliminado");
    }
  } catch (e) {
    console.error("Error deleting product:", e);
  }
}

/* ══════════════════════════════════════════════════════════
   SALES
══════════════════════════════════════════════════════════ */
let saleItems = [];

function addSaleItem() {
  saleItems.push({ name: "", qty: 1, price: 0 });
  renderSaleItems();
}

function renderSaleItems() {
  const container = document.getElementById("saleItemsList");
  if (!container) return;
  container.innerHTML = saleItems
    .map(
      (item, i) => `
    <div class="sale-item-row">
      <select onchange="saleItems[${i}].name=this.value;saleItems[${i}].price=admInventory.find(p=>p.name===this.value)?.price||0;updateSaleTotal()">
        <option value="">Seleccionar producto...</option>
        ${admInventory.map((p) => `<option value="${p.name}" ${item.name === p.name ? "selected" : ""}>${p.name} — ${admFmt(p.price)}</option>`).join("")}
      </select>
      <input type="number" value="${item.qty}" min="1" style="width:60px" onchange="saleItems[${i}].qty=parseInt(this.value)||1;updateSaleTotal()" />
      <span style="font-weight:700;color:var(--accent);min-width:90px;text-align:right">${admFmt(item.price * item.qty)}</span>
      <button class="adm-action-btn del" onclick="saleItems.splice(${i},1);renderSaleItems();updateSaleTotal()">✕</button>
    </div>
  `,
    )
    .join("");
  updateSaleTotal();
}

function updateSaleTotal() {
  const total = saleItems.reduce((s, i) => s + i.price * i.qty, 0);
  const el = document.getElementById("saleTotalPreview");
  if (el) el.textContent = admFmt(total);
}

function clearSaleForm() {
  saleItems = [];
  renderSaleItems();
  document.getElementById("saleVendor").value = "";
  document.getElementById("saleClient").value = "";
}

async function registerSaleAdmin() {
  const validItems = saleItems.filter((i) => i.name && i.price > 0);
  if (!validItems.length) {
    showAdminToast("⚠ Agrega al menos un producto");
    return;
  }
  const vendor =
    document.getElementById("saleVendor").value.trim() || "Vendedor";
  const client = document.getElementById("saleClient").value.trim() || "—";
  const method = document.getElementById("salePayMethod").value;
  const total = validItems.reduce((s, i) => s + i.price * i.qty, 0);

  const sale = {
    id: admId(),
    timestamp: admNow(),
    vendor,
    client,
    method,
    total,
    items: validItems.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
    })),
  };

  try {
    const res = await apiFetch(`${API_URL}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sale),
    });
    if (res.ok) {
      clearSaleForm();
      fetchSales();
      showAdminToast(`✓ Venta registrada: ${admFmt(total)}`);
    }
  } catch (e) {
    console.error("Error saving sale:", e);
  }
}

function renderSalesStats() {
  const today = admToday();
  const todaySales = admSales.filter((s) => s.timestamp.startsWith(today));
  const todayTotal = todaySales.reduce((s, x) => s + x.total, 0);
  const avg = todaySales.length ? todayTotal / todaySales.length : 0;
  const monthTotal = admSales.reduce((s, x) => s + x.total, 0);
  const el = (id) => document.getElementById(id);
  el("saleToday").textContent = admFmt(todayTotal);
  el("saleTodayCount").textContent = todaySales.length;
  el("saleAvgTicket").textContent = admFmt(Math.round(avg));
  el("saleMonthTotal").textContent = admFmt(monthTotal);
}

function renderAdminSalesTable() {
  const fDate = document.getElementById("saleFilterDate")?.value || "";
  const fMethod = document.getElementById("saleFilterMethod")?.value || "";
  let list = [...admSales];
  if (fMethod) list = list.filter((s) => s.method === fMethod);
  if (fDate) {
    list = list.filter((s) => {
      const sDate = new Date(s.timestamp);
      const year = sDate.getFullYear();
      const month = String(sDate.getMonth() + 1).padStart(2, "0");
      const day = String(sDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}` === fDate;
    });
  }
  const tbody = document.getElementById("admSalesBody");
  if (!list.length) {
    tbody.innerHTML =
      '<tr class="empty-row"><td colspan="7">Sin ventas registradas</td></tr>';
    return;
  }
  tbody.innerHTML = list
    .map((s) => {
      const cfg = admPayMethods.find((m) => m.name === s.method) || {
        color: "#e8ff47",
        bg: "rgba(232,255,71,0.1)",
      };
      const isOnline =
        s.vendor === "Tienda Online" || (s.id && String(s.id).startsWith("ON"));
      return `<tr>
      <td style="font-size:12px">${admFmtDate(s.timestamp)}</td>
      <td>${s.vendor}</td>
      <td style="color:var(--gray-text)">${s.client}</td>
      <td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
      <td><span class="pm-tag" style="background:${cfg.bg};color:${cfg.color};border:1px solid ${isOnline ? "var(--accent)" : "transparent"}">${s.method}</span></td>
      <td style="font-weight:700;color:var(--accent)">${admFmt(s.total)}</td>
      <td><button class="adm-action-btn del" onclick="deleteSaleAdmin('${s.id}')">✕</button></td>
    </tr>`;
    })
    .join("");
}

async function deleteSaleAdmin(id) {
  if (!confirm("¿Eliminar esta venta del registro?")) return;
  try {
    const res = await apiFetch(`${API_URL}/sales/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchSales();
      showAdminToast("Venta eliminada");
    }
  } catch (e) {
    console.error("Error deleting sale:", e);
  }
}

function exportAdminSalesCSV() {
  if (!admSales.length) {
    showAdminToast("⚠ Sin ventas");
    return;
  }
  const rows = [
    ["#", "Fecha/Hora", "Vendedor", "Cliente", "Productos", "Método", "Total"],
    ...admSales.map((s, i) => [
      i + 1,
      s.timestamp,
      s.vendor,
      s.client,
      s.items.map((x) => x.name + " x" + x.qty).join(" | "),
      s.method,
      s.total,
    ]),
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `winner_ventas_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast("⬇ Ventas exportadas");
}

/* ══════════════════════════════════════════════════════════
   ANALYTICS & CHARTS
   ══════════════════════════════════════════════════════════ */
let salesLineChart, channelPieChart, methodBarChart;

function renderCharts() {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js not loaded yet");
    return;
  }

  // Group sales by date for the last 7 days
  const labels = [];
  const data = [];

  // Helper to get local date string YYYY-MM-DD
  const getLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = getLocalDate(d);

    // Convert sale timestamp to local date string for comparison
    const total = admSales
      .filter((s) => {
        const sDate = new Date(s.timestamp);
        return getLocalDate(sDate) === dayStr;
      })
      .reduce((sum, s) => sum + s.total, 0);

    labels.push(
      d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric" }),
    );
    data.push(total);
  }

  // Sales Line Chart
  const ctxSales = document.getElementById("salesChart")?.getContext("2d");
  if (ctxSales) {
    if (salesLineChart) salesLineChart.destroy();
    salesLineChart = new Chart(ctxSales, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Ventas ($)",
            data,
            borderColor: "#e8ff47",
            backgroundColor: "rgba(232,255,11,0.1)",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#e8ff47",
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#666" },
          },
          x: { grid: { display: false }, ticks: { color: "#666" } },
        },
      },
    });
  }

  // Channel Distribution (Online vs Physical)
  const onlineCount = admSales.filter(
    (s) =>
      s.vendor === "Tienda Online" || (s.id && String(s.id).startsWith("ON")),
  ).length;
  const physicalCount = admSales.length - onlineCount;

  const ctxChannel = document.getElementById("channelChart")?.getContext("2d");
  if (ctxChannel) {
    if (channelPieChart) channelPieChart.destroy();
    channelPieChart = new Chart(ctxChannel, {
      type: "doughnut",
      data: {
        labels: ["Online", "Física"],
        datasets: [
          {
            data: [onlineCount, physicalCount],
            backgroundColor: ["#e8ff47", "#3498db"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        cutout: "70%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#f0f0eb", padding: 20, font: { size: 10 } },
          },
        },
      },
    });
  }

  // Top Payment Methods
  const methods = {};
  admSales.forEach((s) => {
    methods[s.method] = (methods[s.method] || 0) + 1;
  });
  const sortedMethods = Object.entries(methods)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const ctxMethod = document.getElementById("methodChart")?.getContext("2d");
  if (ctxMethod) {
    if (methodBarChart) methodBarChart.destroy();
    methodBarChart = new Chart(ctxMethod, {
      type: "bar",
      data: {
        labels: sortedMethods.map((m) => m[0]),
        datasets: [
          {
            data: sortedMethods.map((m) => m[1]),
            backgroundColor: "#e8ff47",
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#666" },
          },
          y: { grid: { display: false }, ticks: { color: "#f0f0eb" } },
        },
      },
    });
  }
}

/* ══════════════════════════════════════════════════════════
   TOAST (Admin)
══════════════════════════════════════════════════════════ */
function showAdminToast(msg) {
  // Reuse storefront toast if available
  if (typeof showToast === "function") {
    showToast(msg);
    return;
  }
  alert(msg);
}

/* ══════════════════════════════════════════════════════════
   QR SCANNER LOGIC
══════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  const imgFile = document.getElementById("modalImgFile");
  if (imgFile) {
    imgFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById("modalImgBase64").value = ev.target.result;
        document.getElementById("modalImg").value = ""; // Clean URL if uploaded file
      };
      reader.readAsDataURL(file);
    });
  }

  const fileInput = document.getElementById("modalQrFile");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const html5QrCode = new Html5Qrcode("qr-reader-dummy"); // Dummy element not needed for file scan but required by lib

      showAdminToast("⌛ Escaneando imagen...");

      html5QrCode
        .scanFile(file, true)
        .then((decodedText) => {
          document.getElementById("modalQrValue").value = decodedText;
          showAdminToast("✓ QR detectado: " + decodedText);
          // Auto-fill logic: if it's a known product or just a name
          const p = admInventory.find(
            (x) => x.id === decodedText || x.name === decodedText,
          );
          if (p) {
            editProduct(p.id);
            showAdminToast("📦 Producto encontrado");
          } else {
            document.getElementById("modalName").value = decodedText;
          }
        })
        .catch((err) => {
          showAdminToast("❌ No se encontró un QR válido");
          console.error(err);
        });
    });
  }
});

function clearQrResult() {
  const el = document.getElementById("modalQrValue");
  const file = document.getElementById("modalQrFile");
  if (el) el.value = "";
  if (file) file.value = "";
}

// Add a dummy hidden element for the library if not present
if (!document.getElementById("qr-reader-dummy")) {
  const dummy = document.createElement("div");
  dummy.id = "qr-reader-dummy";
  dummy.style.display = "none";
  document.body.appendChild(dummy);
}

/* ══════════════════════════════════════════════════════════
   RENDER ALL
══════════════════════════════════════════════════════════ */
function renderAll() {
  renderPayMethods();
  fetchInventory(); // Carga desde API
  fetchSales(); // Carga desde API
}

let html5QrCodeScannerInstance = null;
function toggleCameraScan() {
  const readerDiv = document.getElementById("qr-reader");
  if (!readerDiv) return;

  if (readerDiv.style.display === "block") {
    if (html5QrCodeScannerInstance) {
      html5QrCodeScannerInstance
        .stop()
        .then(() => {
          html5QrCodeScannerInstance.clear();
          html5QrCodeScannerInstance = null;
        })
        .catch(console.error);
    }
    readerDiv.style.display = "none";
    document.getElementById("startCameraScan").textContent = "Escanear Cámara";
  } else {
    readerDiv.style.display = "block";
    document.getElementById("startCameraScan").textContent = "Detener Cámara";
    html5QrCodeScannerInstance = new Html5Qrcode("qr-reader");
    html5QrCodeScannerInstance
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          document.getElementById("modalQrValue").value = decodedText;
          showAdminToast("✓ QR detectado: " + decodedText);
          html5QrCodeScannerInstance
            .stop()
            .then(() => {
              html5QrCodeScannerInstance.clear();
              html5QrCodeScannerInstance = null;
            })
            .catch(console.error);
          readerDiv.style.display = "none";
          document.getElementById("startCameraScan").textContent =
            "Escanear Cámara";

          const p = admInventory.find(
            (x) => x.id === decodedText || x.name === decodedText,
          );
          if (p) {
            editProduct(p.id);
            showAdminToast("📦 Producto encontrado");
          } else {
            document.getElementById("modalName").value = decodedText;
          }
        },
        (err) => {},
      )
      .catch((err) => {
        showAdminToast("❌ Error al acceder a la cámara");
        console.error(err);
        readerDiv.style.display = "none";
        document.getElementById("startCameraScan").textContent =
          "Escanear Cámara";
      });
  }
}
