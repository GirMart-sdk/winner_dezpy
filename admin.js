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

/* ══════════════════════════════════════════════════════════
   POS PAYMENT MODAL — SISTEMA DE PAGOS
══════════════════════════════════════════════════════════ */

// Estado del pago actual
let posPendingPayment = {
  total: 0,
  method: null,
  methodData: {},
  items: [],
  vendor: "",
  client: ""
};

function openPOSPaymentModal() {
  // Validar que hay items en la venta
  const posItems = document.getElementById("posItems");
  const posEmptyMsg = posItems?.querySelector(".pos-empty");
  
  if (posEmptyMsg && posEmptyMsg.style.display !== "none") {
    showAdminToast("⚠️ Agrega productos a la venta primero");
    return;
  }

  // Obtener total
  const posTotal = document.getElementById("posTotal")?.textContent || "$0";
  const totalAmount = parseFloat(posTotal.replace(/[^\d.-]/g, ""));
  
  if (!totalAmount || totalAmount <= 0) {
    showAdminToast("⚠️ Total inválido");
    return;
  }

  // Obtener datos del vendedor y cliente
  const posVendor = document.getElementById("posVendor")?.value || "Vendedor";
  const posClient = document.getElementById("posClient")?.value || "Cliente";

  // Guardar estado actual
  posPendingPayment = {
    total: totalAmount,
    method: null,
    methodData: {},
    items: [],
    vendor: posVendor,
    client: posClient
  };

  // Extraer items de la venta
  const itemRows = posItems?.querySelectorAll(".pos-item-row") || [];
  itemRows.forEach(row => {
    const nameEl = row.querySelector("[data-item-name]");
    const qtyEl = row.querySelector("[data-item-qty]");
    const priceEl = row.querySelector("[data-item-price]");
    
    if (nameEl && qtyEl && priceEl) {
      posPendingPayment.items.push({
        name: nameEl.textContent,
        qty: parseInt(qtyEl.textContent) || 1,
        price: parseFloat(priceEl.textContent.replace(/[^\d.-]/g, "")) || 0
      });
    }
  });

  // Mostrar modal
  document.getElementById("posPayOverlay").classList.add("open");
  document.getElementById("posPayModal").classList.add("open");
  
  // Mostrar Step 1 - Seleccionar método
  showPOSPayStep(1);
  renderPOSPaymentMethods();
}

function closePOSPaymentModal() {
  document.getElementById("posPayOverlay").classList.remove("open");
  document.getElementById("posPayModal").classList.remove("open");
}

function showPOSPayStep(step) {
  const step1 = document.getElementById("posPayStep1");
  const step2 = document.getElementById("posPayStep2");
  const backBtn = document.getElementById("posPayBackBtn");
  const confirmBtn = document.getElementById("posPayConfirmBtn");
  
  if (step === 1) {
    step1.style.display = "block";
    step2.style.display = "none";
    backBtn.style.display = "none";
    confirmBtn.textContent = "CONFIRMAR PAGO";
  } else if (step === 2) {
    step1.style.display = "none";
    step2.style.display = "block";
    backBtn.style.display = "block";
    confirmBtn.textContent = "✓ COMPLETAR PAGO";
  }
}

function renderPOSPaymentMethods() {
  const grid = document.getElementById("posPayMethodsGrid");
  if (!grid) return;

  // Filtrar métodos habilitados
  const enabledMethods = PAY_METHODS_CONFIG.filter(m => m.enabled);
  
  grid.innerHTML = enabledMethods.map(method => `
    <div class="pay-method-card" onclick="selectPOSPaymentMethod('${method.id}')" 
         style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;border:2px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.3s;background:var(--gray2)">
      <span style="font-size:32px;margin-bottom:8px">${method.icon}</span>
      <span style="font-size:13px;font-weight:600;color:var(--white);text-align:center">${method.name}</span>
    </div>
  `).join("");
}

function selectPOSPaymentMethod(methodId) {
  const method = PAY_METHODS_CONFIG.find(m => m.id === methodId);
  if (!method) return;

  posPendingPayment.method = method;
  
  // Mostrar step 2
  showPOSPayStep(2);
  renderPOSPaymentForm();
  
  // Actualizar total visible
  document.getElementById("posPayTotal").textContent = admFmt(posPendingPayment.total);
}

function renderPOSPaymentForm() {
  const formCash = document.getElementById("posPayFormCash");
  const formCard = document.getElementById("posPayFormCard");
  const formMobile = document.getElementById("posPayFormMobile");
  
  // Ocultar todos
  formCash.style.display = "none";
  formCard.style.display = "none";
  formMobile.style.display = "none";
  
  const method = posPendingPayment.method;

  if (method.id === "efectivo") {
    formCash.style.display = "block";
    document.getElementById("posPayCashReceived").value = "";
    document.getElementById("posPayCashReceived").addEventListener("input", updatePOSCashChange);
  } else if (method.id === "nequi" || method.id === "daviplata") {
    formMobile.style.display = "block";
    document.getElementById("posPayMobilePhone").value = "";
    document.getElementById("posPayMobileRef").value = "";
  } else {
    formCard.style.display = "block";
    document.getElementById("posPayCardRef").value = "";
    document.getElementById("posPayCardName").value = "";
  }
}

function updatePOSCashChange() {
  const received = parseFloat(document.getElementById("posPayCashReceived").value) || 0;
  const total = posPendingPayment.total;
  const change = received - total;
  
  document.getElementById("posPayCashChange").textContent = admFmt(change >= 0 ? change : 0);
}

function posPayBackToMethods() {
  posPendingPayment.method = null;
  showPOSPayStep(1);
}

async function confirmPOSPayment() {
  const method = posPendingPayment.method;
  
  if (!method) {
    showAdminToast("⚠️ Selecciona un método de pago");
    return;
  }

  // Validar según el método
  if (method.id === "efectivo") {
    const received = parseFloat(document.getElementById("posPayCashReceived").value);
    if (!received || received < posPendingPayment.total) {
      showAdminToast("⚠️ Monto insuficiente");
      return;
    }
    posPendingPayment.methodData = {
      type: "cash",
      received: received,
      change: received - posPendingPayment.total
    };
  } else if (method.id === "nequi" || method.id === "daviplata") {
    const phone = document.getElementById("posPayMobilePhone").value.trim();
    const ref = document.getElementById("posPayMobileRef").value.trim();
    
    if (!phone || !ref) {
      showAdminToast("⚠️ Completa teléfono y referencia");
      return;
    }
    posPendingPayment.methodData = {
      type: "mobile",
      phone: phone,
      reference: ref
    };
  } else {
    const ref = document.getElementById("posPayCardRef").value.trim();
    const name = document.getElementById("posPayCardName").value.trim();
    
    if (!ref) {
      showAdminToast("⚠️ Ingresa la referencia de la transacción");
      return;
    }
    posPendingPayment.methodData = {
      type: "transfer",
      reference: ref,
      name: name || "Cliente"
    };
  }

  // Guardar la venta
  await savePOSSale();
}

async function savePOSSale() {
  try {
    const now = new Date();
    const saleData = {
      id: "POS" + Date.now().toString(36).toUpperCase(),
      timestamp: now.toISOString(),
      vendor: posPendingPayment.vendor || "Vendedor",
      client: posPendingPayment.client || "Cliente",
      method: posPendingPayment.method.name,
      channel: "fisica",
      subtotal: posPendingPayment.total,
      shippingCost: 0,
      shippingMethod: "Entrega física",
      shippingCarrier: "Local",
      discount: 0,
      total: posPendingPayment.total,
      items: posPendingPayment.items,
      paymentMethod: posPendingPayment.method.id,
      paymentDetails: posPendingPayment.methodData
    };

    // Intentar guardar en servidor
    const res = await apiFetch(`${API_URL}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleData)
    });

    if (!res.ok) {
      console.warn("Server save failed, using localStorage");
    }

    // Guardar también en localStorage
    try {
      let savedSales = [];
      const saved = localStorage.getItem("winner_sales");
      if (saved) savedSales = JSON.parse(saved);
      savedSales.unshift(saleData);
      localStorage.setItem("winner_sales", JSON.stringify(savedSales));
    } catch (e) {}

    // Generar factura
    generatePOSInvoice(saleData);
    
    // Limpiar y cerrar
    closePOSPaymentModal();
    clearPOS();
    
    showAdminToast(`✓ Venta registrada: ${admFmt(posPendingPayment.total)}`);

  } catch (e) {
    console.error("Error saving sale:", e);
    showAdminToast("❌ Error al guardar venta");
  }
}

function generatePOSInvoice(saleData) {
  const invoiceHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${saleData.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; background: #f5f5f5; padding: 20px; }
    .invoice { width: 100%; max-width: 600px; margin: 0 auto; background: white; padding: 30px; border: 2px solid #000; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .logo { font-size: 32px; font-weight: bold; letter-spacing: 2px; margin-bottom: 5px; }
    .logo-dot { color: #e8ff47; }
    .slogan { font-size: 11px; color: #666; letter-spacing: 1px; }
    .invoice-title { font-size: 14px; font-weight: bold; margin-top: 10px; text-transform: uppercase; }
    .invoice-number { font-size: 12px; color: #666; margin: 8px 0; }
    .section { margin: 20px 0; }
    .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; }
    .label { color: #666; }
    .value { font-weight: bold; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 15px 0; }
    .items-table th { background: #f0f0f0; padding: 8px; text-align: left; font-weight: bold; border-bottom: 1px solid #000; }
    .items-table td { padding: 8px; border-bottom: 1px solid #ddd; }
    .items-table .qty { text-align: center; }
    .items-table .price { text-align: right; }
    .items-table .total { text-align: right; }
    .totals { margin: 20px 0; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; }
    .total-row { display: flex; justify-content: space-between; font-size: 13px; margin: 8px 0; font-weight: bold; }
    .final-total { font-size: 18px; text-align: right; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000; }
    .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #666; }
    .footer-line { margin: 15px 0; }
    @media print {
      body { margin: 0; padding: 0; background: white; }
      .invoice { box-shadow: none; border: 1px solid #ccc; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="logo">W<span class="logo-dot">●</span>NNER</div>
      <div class="slogan">ESTILO GANADOR PARA TODOS</div>
      <div class="invoice-title">FACTURA DE VENTA</div>
      <div class="invoice-number">${saleData.id}</div>
    </div>

    <div class="section">
      <div class="section-title">INFORMACIÓN DE LA VENTA</div>
      <div class="row">
        <span class="label">Fecha/Hora:</span>
        <span class="value">${admFmtDate(saleData.timestamp)}</span>
      </div>
      <div class="row">
        <span class="label">Vendedor:</span>
        <span class="value">${saleData.vendor}</span>
      </div>
      <div class="row">
        <span class="label">Cliente:</span>
        <span class="value">${saleData.client}</span>
      </div>
      <div class="row">
        <span class="label">Método de Pago:</span>
        <span class="value">${saleData.method}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">PRODUCTOS</div>
      <table class="items-table">
        <thead>
          <tr>
            <th>DESCRIPCIÓN</th>
            <th class="qty">CANT</th>
            <th class="price">V.UNIT</th>
            <th class="total">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${saleData.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td class="qty">${item.qty}</td>
              <td class="price">$${Number(item.price).toLocaleString('es-CO')}</td>
              <td class="total">$${Number(item.price * item.qty).toLocaleString('es-CO')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>$${Number(saleData.subtotal).toLocaleString('es-CO')}</span>
      </div>
      ${saleData.discount > 0 ? `
        <div class="total-row" style="color: #28a745;">
          <span>Descuento:</span>
          <span>-$${Number(saleData.discount).toLocaleString('es-CO')}</span>
        </div>
      ` : ''}
      <div class="total-row" style="font-size: 16px; border-top: 1px solid #ddd; padding-top: 10px;">
        <span>TOTAL:</span>
        <span>$${Number(saleData.total).toLocaleString('es-CO')}</span>
      </div>
    </div>

    <div class="footer">
      <div class="footer-line">¡Gracias por su compra!</div>
      <div class="footer-line">www.winner.store • +57 316 601 9030</div>
      <div class="footer-line" style="margin-top: 20px;">
        ═══════════════════════════════════════
      </div>
      <div class="footer-line" style="margin-top: 15px; font-size: 12px;">
        Impreso: ${new Date().toLocaleString('es-CO')}
      </div>
    </div>
  </div>

  <script>
    window.onload = () => {
      setTimeout(() => { window.print(); }, 500);
    }
  </script>
</body>
</html>
  `;

  // Abrir factura en nueva ventana
  const printWindow = window.open("", "_blank");
  printWindow.document.write(invoiceHTML);
  printWindow.document.close();
}

/* ── POS HELPERS ──────────────────────────────────────── */

// Variables globales para gestionar items del POS
let posCurrentSale = [];

function addProductToPOS(productId, size = "M", qty = 1) {
  const product = admInventory.find(p => p.id === productId);
  if (!product) {
    showAdminToast("⚠️ Producto no encontrado");
    return;
  }

  // Buscar si ya existe
  const existing = posCurrentSale.find(
    item => item.id === productId && item.size === size
  );

  if (existing) {
    existing.qty += qty;
  } else {
    posCurrentSale.push({
      ...product,
      qty,
      size,
      cartId: productId + "_" + size
    });
  }

  renderPOSSaleItems();
  showAdminToast(`✓ ${product.name} añadido`);
}

function removeFromPOS(cartId) {
  posCurrentSale = posCurrentSale.filter(item => item.cartId !== cartId);
  renderPOSSaleItems();
}

function renderPOSSaleItems() {
  const container = document.getElementById("posItems");
  if (!container) return;

  const discount = parseFloat(document.getElementById("posDiscount")?.value || 0) || 0;
  const subtotal = posCurrentSale.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  document.getElementById("posSubtotal").textContent = admFmt(subtotal);
  document.getElementById("posTotal").textContent = admFmt(total);

  if (posCurrentSale.length === 0) {
    container.innerHTML = '<div class="pos-empty">Sin productos agregados</div>';
    return;
  }

  container.innerHTML = posCurrentSale.map((item, i) => `
    <div class="pos-item-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--gray2);border-radius:6px;margin-bottom:8px">
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${item.name}</div>
        <div style="font-size:11px;color:var(--gray-text)">Talla: ${item.size}</div>
      </div>
      <div style="text-align:right;min-width:90px">
        <div style="font-size:12px;color:var(--gray-text);margin-bottom:4px">
          <input type="number" value="${item.qty}" min="1" style="width:40px;padding:2px;border:1px solid var(--border);background:var(--gray);border-radius:3px;color:var(--white);font-size:11px" 
            onchange="posCurrentSale[${i}].qty=Math.max(1,parseInt(this.value)||1);renderPOSSaleItems()"/>
          × ${admFmt(item.price)}
        </div>
        <div style="font-weight:700;color:var(--accent)">${admFmt(item.price * item.qty)}</div>
      </div>
      <button class="adm-action-btn del" onclick="removeFromPOS('${item.cartId}')" style="margin-left:10px">✕</button>
    </div>
  `).join("");
}

function clearPOS() {
  posCurrentSale = [];
  document.getElementById("posVendor").value = "";
  document.getElementById("posClient").value = "";
  document.getElementById("posDiscount").value = "0";
  renderPOSSaleItems();
}

function posSearchProducts() {
  const search = document.getElementById("posSearch")?.value.toLowerCase() || "";
  const container = document.getElementById("posProductList");
  if (!container || !search) {
    container.innerHTML = "";
    return;
  }

  let results = admInventory.filter(p =>
    p.name.toLowerCase().includes(search) || p.id.toLowerCase().includes(search)
  );

  if (results.length === 0) {
    container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--gray-text)">Sin resultados</div>';
    return;
  }

  container.innerHTML = results.map(p => {
    const total = SIZES.reduce((s, sz) => s + (p.stock[sz] || 0), 0);
    return `
      <div style="padding:12px;border:1px solid var(--border);border-radius:6px;margin-bottom:8px;cursor:pointer;transition:all 0.2s" 
           onmouseover="this.style.background='var(--gray)'" onmouseout="this.style.background='transparent'">
        <div style="display:flex;gap:12px">
          <img src="${p.img}" style="width:50px;height:60px;object-fit:cover;background:var(--gray2);border-radius:4px" onerror="this.style.background='#333'"/>
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px">${p.name}</div>
            <div style="font-size:12px;color:var(--gray-text);margin:4px 0">${admFmt(p.price)}</div>
            <div style="font-size:11px;color:var(--accent)">Stock: ${total}</div>
            <select style="margin-top:6px;padding:4px;font-size:11px;background:var(--gray2);border:1px solid var(--border);color:var(--white);border-radius:3px;width:100%" onchange="if(this.value) { addProductToPOS('${p.id}', this.value); this.value=''; }">
              <option value="">Selecciona talla...</option>
              ${SIZES.map(s => p.stock[s] > 0 ? `<option value="${s}">${s} (${p.stock[s]})</option>` : "").join("")}
            </select>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function openQRScannerPOS() {
  document.getElementById("posScanOverlay").classList.add("open");
  document.getElementById("posScanModal").classList.add("open");
  
  const video = document.getElementById("posScanVideo");
  if (video && typeof Html5Qrcode !== "undefined") {
    const qrScanner = new Html5Qrcode("posScanVideo");
    qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        const product = admInventory.find(p => p.id === decodedText || p.name === decodedText);
        if (product) {
          const availableSizes = SIZES.filter(s => product.stock[s] > 0);
          if (availableSizes.length > 0) {
            addProductToPOS(product.id, availableSizes[0]);
            closePOSScanner();
          } else {
            showAdminToast("⚠️ Producto agotado");
          }
        } else {
          showAdminToast("⚠️ Producto no encontrado");
        }
      }
    );
  }
}

function closePOSScanner() {
  document.getElementById("posScanOverlay").classList.remove("open");
  document.getElementById("posScanModal").classList.remove("open");
}
