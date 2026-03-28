/* ═══════════════════════════════════════════════════════
   WINNER — admin-panel.js
   Login · Dashboard · Inventario+QR · POS · Pagos · Ventas
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════════════ */
const SIZES = ['XS','S','M','L','XL','XXL'];

/* ══════════════════════════════════════════════════════════
   STATE (localStorage)
══════════════════════════════════════════════════════════ */
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem('w_'+k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('w_'+k, JSON.stringify(v)); } catch {} },
};

let session   = LS.get('session', null);
let inventory = [];
let salesLog  = [];
let payLog    = LS.get('payLog', []);

// NOTE: defaultPayMethods must be defined before this line — see below
let payMethods= null; // initialized after function definitions

if (typeof API_URL === 'undefined') {
  const origin =
    window.location.origin.startsWith('file:')
      ? 'http://localhost:3000'
      : window.location.origin;
  window.API_URL = `${origin.replace(/\/$/, '')}/api`;
}
const API_KEY =
  window.API_KEY ||
  localStorage.getItem('w_api_key') ||
  'dev-api-key';
const apiFetch = (url, options = {}) => {
  const headers = { ...(options.headers || {}), 'x-api-key': API_KEY };
  // Ya no necesitamos token JWT - usamos API_KEY
  return fetch(url, { ...options, headers });
};
async function fetchInventory() {
  try {
    const res = await apiFetch(`${API_URL}/products`);
    inventory = await res.json();
    renderInventory();
    renderPOSProducts();
  } catch(e) { console.error('Error fetching inventory:', e); }
}

async function fetchSalesLog() {
  try {
    const res = await apiFetch(`${API_URL}/sales`);
    const data = await res.json();
    
    // Asegurar que data es un array
    if (!Array.isArray(data)) {
      console.error('⚠️ Respuesta de sales no es un array:', data);
      salesLog = [];
      return;
    }
    
    salesLog = data.map(s => ({
      ...s,
      ts: s.timestamp,
      channel: (s.vendor === 'Tienda Online' || (s.id && String(s.id).startsWith('ON'))) ? 'online' : 'fisica'
    }));
    renderSalesStats();
    renderSalesTable();
    renderDashboard();
  } catch(e) { console.error('Error fetching sales:', e); }
}

/* ── POS in-memory ── */
let posCart = [];
let posSelectedMethod = 'Efectivo';

/* ── Scanner state ── */
let scanMode    = 'inventory';
let scanStream  = null;
let posScanStream = null;
let scanInterval = null;

/* ── Current QR product (modal) ── */
let qrCurrentProduct = null;

/* ══════════════════════════════════════════════════════════
   DEFAULT DATA
══════════════════════════════════════════════════════════ */
function defaultInventory() {
  return [
    { id:1, name:'Crop Hoodie Urbana', cat:'mujer',     price:89990,  cost:42000, sku:'WIN-001', img:'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=75', stock:{XS:4,S:8,M:12,L:6,XL:3,XXL:0} },
    { id:2, name:'Jogger Cargo Pro',   cat:'hombre',    price:79990,  cost:35000, sku:'WIN-002', img:'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=300&q=75',    stock:{XS:0,S:5,M:9,L:7,XL:4,XXL:1} },
    { id:3, name:'Bomber Reflex',      cat:'hombre',    price:189990, cost:90000, sku:'WIN-003', img:'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&q=75',    stock:{XS:1,S:3,M:5,L:3,XL:2,XXL:0} },
    { id:4, name:'Mini Dress Urban',   cat:'mujer',     price:99990,  cost:48000, sku:'WIN-004', img:'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&q=75', stock:{XS:6,S:10,M:8,L:4,XL:2,XXL:0} },
    { id:5, name:'Bucket Hat Logo',    cat:'accesorios',price:39990,  cost:15000, sku:'WIN-005', img:'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=300&q=75', stock:{XS:0,S:0,M:20,L:15,XL:10,XXL:0} },
    { id:6, name:'Oversize Tee "W"',   cat:'hombre',    price:59990,  cost:22000, sku:'WIN-006', img:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=75', stock:{XS:2,S:14,M:18,L:12,XL:6,XXL:3} },
    { id:7, name:'Set Legging + Top',  cat:'mujer',     price:119990, cost:55000, sku:'WIN-007', img:'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=300&q=75',   stock:{XS:5,S:7,M:9,L:5,XL:2,XXL:0} },
    { id:8, name:'Mochila Táctica',    cat:'accesorios',price:69990,  cost:28000, sku:'WIN-008', img:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&q=75',   stock:{XS:0,S:0,M:11,L:0,XL:0,XXL:0} },
  ];
}

function defaultPayMethods() {
  return {
    national:  [
      {id:'pse',    name:'PSE',            icon:'🏦',  type:'Nacional',       enabled:true},
      {id:'debit',  name:'Tarjeta Débito', icon:'💳',  type:'Nacional',       enabled:true},
      {id:'credit', name:'Tarjeta Crédito',icon:'💳',  type:'Nacional',       enabled:true},
      {id:'cash',   name:'Efectivo',       icon:'💵',  type:'Nacional',       enabled:true},
    ],
    wallets: [
      {id:'nequi',    name:'Nequi',     icon:'🟣', type:'Billetera', enabled:true},
      {id:'daviplata',name:'Daviplata', icon:'🔴', type:'Billetera', enabled:true},
      {id:'dale',     name:'Dale!',     icon:'🟡', type:'Billetera', enabled:true},
      {id:'rappipay', name:'Rappipay',  icon:'🟠', type:'Billetera', enabled:true},
      {id:'movii',    name:'Movii',     icon:'🔵', type:'Billetera', enabled:false},
      {id:'tpaga',    name:'Tpaga',     icon:'🟢', type:'Billetera', enabled:false},
    ],
    delivery: [
      {id:'efecty',  name:'Efecty',   icon:'🏪', type:'Contra entrega', enabled:true},
      {id:'baloto',  name:'Baloto',   icon:'🎰', type:'Contra entrega', enabled:true},
      {id:'sured',   name:'SuRed',    icon:'🏬', type:'Contra entrega', enabled:false},
    ],
    intl: [
      {id:'visa',   name:'Visa',       icon:'💙', type:'Internacional', enabled:true},
      {id:'mc',     name:'Mastercard', icon:'🔴', type:'Internacional', enabled:true},
      {id:'paypal', name:'PayPal',     icon:'🅿️', type:'Internacional', enabled:true},
      {id:'stripe', name:'Stripe',     icon:'⚡', type:'Internacional', enabled:true},
      {id:'amex',   name:'AMEX',       icon:'🟦', type:'Internacional', enabled:false},
    ],
  };
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);
const fmt = (n) => '$' + Number(n).toLocaleString('es-CO');
const nowStr = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().split('T')[0];
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5);
const totalStock = (p) => Object.values(p.stock).reduce((a,b)=>a+Number(b),0);

function fmtDate(iso) {
  try { return new Intl.DateTimeFormat('es-CO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(iso)); }
  catch { return iso; }
}

function stockStatus(t) {
  if (t===0) return {label:'Sin stock',cls:'badge-out',tbcls:'s-out'};
  if (t<=5)  return {label:'Stock bajo',cls:'badge-low',tbcls:'s-low'};
  return           {label:'Disponible',cls:'badge-ok',tbcls:'s-ok'};
}

let toastTimer;
function toast(msg, duration=2800) {
  $('adminToastMsg').textContent = msg;
  $('adminToast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>$('adminToast').classList.remove('show'), duration);
}

/* ══════════════════════════════════════════════════════════
   CLOCK
══════════════════════════════════════════════════════════ */
function updateClock() {
  const el = $('topbarClock');
  if (el) el.textContent = new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
setInterval(updateClock, 1000);
updateClock();

/* ══════════════════════════════════════════════════════════
   AUTH / LOGIN
══════════════════════════════════════════════════════════ */
function verifySession() {
  if (!session) return false;
  return !!session.user;
}

function doLogin() {
  const u = $('loginUser').value.trim() || 'Administrador';
  const p = $('loginPass').value;
  
  // Si no ingresa contraseña, usar API_KEY directo
  if (!p) {
    session = { user: u, role: 'Admin', avatar: (u||'')[0]?.toUpperCase() || 'A' };
    LS.set('session', session);
    showApp();
    return;
  }
  
  // Si pone contraseña, validar en servidor
  fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: u, pass: p })
  }).then(async res => {
    if (!res.ok) {
      const err = $('loginError');
      err.textContent = '❌ Credenciales incorrectas o sin Internet';
      err.style.display = 'block';
      setTimeout(()=>err.style.display='none', 3000);
      return;
    }
    const data = await res.json();
    session = { user: data.user, role: data.role || 'Administrador', avatar: (data.user||'')[0]?.toUpperCase() || 'A' };
    LS.set('session', session);
    showApp();
  }).catch(() => {
    // Si falla conexión, permitir acceso con API_KEY
    session = { user: u, role: 'Admin', avatar: (u||'')[0]?.toUpperCase() || 'A' };
    LS.set('session', session);
    showApp();
  });
}

function doLogout() {
  session = null;
  LS.set('session', null);
  stopScanner();
  $('mainApp').style.display = 'none';
  $('loginScreen').style.display = 'flex';
  $('loginUser').value = '';
  $('loginPass').value = '';
}

function togglePass() {
  const inp = $('loginPass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function showApp() {
  $('loginScreen').style.display = 'none';
  $('mainApp').style.display    = 'flex';
  // Set user info
  if (session) {
    AUTH_TOKEN = session.token;
    $('sidebarUser').querySelector('.su-name').textContent = session.role;
    
  refreshAll();
  navigateTo('dashboard');
}

// Check session on load
window.addEventListener('DOMContentLoaded', () => {
  if (verifySession()) {
    showApp();
  } else {
    // Auto-login sin credenciales usando solo API_KEY
    session = { user: 'Administrador', role: 'Admin', avatar: 'A' };
    LS.set('session', session);
    showApp();
  }
  // Enter key on login
  ['loginUser','loginPass'].forEach(id => {
    $(id).addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  });
});

/* ══════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════ */
const PAGE_TITLES = {
  dashboard:'Dashboard', inventory:'Inventario & QR',
  pos:'Punto de Venta', payments:'Métodos de Pago',
  sales:'Registro de Ventas', qrscan:'Escáner QR'
};

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.snav-item').forEach(b=>b.classList.remove('active'));
  const pg = $('page-'+page);
  if (pg) pg.classList.add('active');
  const btn = document.querySelector(`[data-page="${page}"]`);
  if (btn) btn.classList.add('active');
  $('pageTitle').textContent = PAGE_TITLES[page] || page;
  // Close sidebar on mobile
  $('sidebar').classList.remove('mobile-open');
}

document.querySelectorAll('.snav-item').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

function toggleSidebar() {
  $('sidebar').classList.toggle('mobile-open');
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
  const today = todayStr();
  const todaySales = salesLog.filter(s => s.timestamp.startsWith(today));
  const todayTotal = todaySales.reduce((s,x)=>s+x.total,0);
  const totalAll   = salesLog.reduce((s,x)=>s+x.total,0);
  const lowStock   = inventory.filter(p=>{ const t=totalStock(p); return t>0&&t<=5; }).length
                   + inventory.filter(p=>totalStock(p)===0).length;

  $('kpiVentasHoy').textContent  = fmt(todayTotal);
  $('kpiProducts').textContent   = inventory.length;
  $('kpiLowStock').textContent   = lowStock;
  $('kpiTotalSales').textContent = fmt(totalAll);

  // Recent sales
  const rl = $('dashRecentSales');
  if (!salesLog.length) { rl.innerHTML='<p style="color:var(--gray-text);font-size:13px;text-align:center;padding:20px">Sin ventas aún</p>'; }
  else {
    rl.innerHTML = salesLog.slice(0,5).map(s=>`
      <div class="recent-item">
        <div>
          <div>${s.items.map(i=>i.name).join(', ').slice(0,40)}…</div>
          <div class="recent-meta">${fmtDate(s.timestamp)} · ${s.channel==='fisica'?'Tienda':'Online'}</div>
        </div>
        <div class="recent-amount">${fmt(s.total)}</div>
      </div>`).join('');
  }

  // Critical stock
  const cl = $('dashCriticalStock');
  const critical = inventory.filter(p=>totalStock(p)<=5).slice(0,5);
  if (!critical.length) { cl.innerHTML='<p style="color:var(--green);font-size:13px;text-align:center;padding:20px">✓ Todo el stock está bien</p>'; }
  else {
    cl.innerHTML = critical.map(p=>`
      <div class="critical-item">
        <img src="${p.img}" style="width:36px;height:44px;object-fit:cover;background:var(--gray2)" onerror="this.style.display='none'"/>
        <div style="flex:1"><div>${p.name}</div><div style="font-size:11px;color:var(--gray-text)">${p.sku}</div></div>
        <div class="crit-stock">${totalStock(p)}</div>
      </div>`).join('');
  }

  // Chart: sales by payment method
  renderPayChart();
}

let payChartInstance = null;
function renderPayChart() {
  const ctx = $('chartPayMethods');
  if (!ctx) return;

  const methodTotals = {};
  salesLog.forEach(s => {
    methodTotals[s.method] = (methodTotals[s.method]||0) + s.total;
  });

  const labels = Object.keys(methodTotals);
  const data   = Object.values(methodTotals);
  const colors = ['#e8ff47','#2ed573','#1e90ff','#ffa502','#ff4757','#9f7aea','#ff6b81','#eccc68'];

  if (payChartInstance) { payChartInstance.destroy(); }

  if (!labels.length) {
    ctx.getContext('2d').clearRect(0,0,ctx.width,ctx.height);
    return;
  }

  payChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets:[{
        label:'Ventas (COP)',
        data,
        backgroundColor: colors.slice(0,labels.length),
        borderRadius: 2,
        borderWidth: 0,
      }]
    },
    options: {
      responsive:true,
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{ label: ctx => fmt(ctx.raw) }
        }
      },
      scales:{
        x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#666',font:{size:11}} },
        y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#666',font:{size:11}, callback:v=>fmt(v)} }
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════
   INVENTORY
══════════════════════════════════════════════════════════ */
function renderInventory() {
  const search = ($('invSearch')||{value:''}).value.toLowerCase();
  const cat    = ($('invCatFilter')||{value:''}).value;

  const filtered = inventory.filter(p => {
    return p.name.toLowerCase().includes(search) && (!cat || p.cat===cat);
  });

  // Stats
  const low  = inventory.filter(p=>{const t=totalStock(p);return t>0&&t<=5}).length;
  const out  = inventory.filter(p=>totalStock(p)===0).length;
  const val  = inventory.reduce((s,p)=>s+p.price*totalStock(p),0);
  $('is1').textContent = inventory.length;
  $('is2').textContent = low;
  $('is3').textContent = out;
  $('is4').textContent = fmt(val);

  const container = $('invCards');
  if (!filtered.length) {
    container.innerHTML='<p style="color:var(--gray-text);font-size:13px;grid-column:1/-1;text-align:center;padding:40px">Sin productos encontrados</p>';
    return;
  }

  container.innerHTML = filtered.map(p => {
    const ts   = totalStock(p);
    const stat = stockStatus(ts);
    const sizesBadges = SIZES.map(s => {
      const qty = p.stock[s]||0;
      const cls = qty===0?'out':qty<=3?'low':'ok';
      return `<span class="inv-size-badge ${cls}">${s}:${qty}</span>`;
    }).join('');

    return `
      <div class="inv-card" data-product-id="${p.id}">
        <span class="inv-stock-badge ${stat.cls}">${stat.label}</span>
        <img src="${p.img}" alt="${p.name}" class="inv-card-img"
          onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&q=75'"/>
        <div class="inv-card-body">
          <div class="inv-card-cat">${p.cat}</div>
          <div class="inv-card-name">${p.name}</div>
          <div class="inv-card-sku">${p.sku}</div>
          <div class="inv-card-price">${fmt(p.price)}</div>
          <div class="inv-sizes">${sizesBadges}</div>
          <div class="inv-card-footer">
            <button class="btn-ghost btn-inv-qr" data-product-id="${p.id}">🔲 QR</button>
            <button class="btn-ghost btn-inv-edit" data-product-id="${p.id}">✎ Editar</button>
            <button class="btn-ghost btn-inv-delete" data-product-id="${p.id}" style="color:var(--red);border-color:rgba(255,71,87,0.3)">✕</button>
          </div>
        </div>
      </div>`;
  }).join('');
  
  // Agregar event listeners para botones
  setTimeout(() => {
    container.querySelectorAll('.btn-inv-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.productId;
        editProduct(id);
      });
    });
    
    container.querySelectorAll('.btn-inv-qr').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.productId;
        showProductQR(id);
      });
    });
    
    container.querySelectorAll('.btn-inv-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.dataset.productId;
        deleteProduct(id);
      });
    });
  }, 0);
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  try {
    const res = await apiFetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchInventory();
      toast('Producto eliminado');
    } else {
      toast('❌ Sin autorización');
    }
  } catch(e) { console.error('Error deleting product:', e); }
}

/* ══════════════════════════════════════════════════════════
   PRODUCT MODAL
══════════════════════════════════════════════════════════ */
function openProductModal(id=null) {
  $('editProductId').value = id||'';
  $('productModalTitle').textContent = id ? 'Editar Producto' : 'Nuevo Producto';

  if (id) {
    const p = inventory.find(x=>String(x.id)===String(id));
    if (!p) return;
    $('pName').value = p.name;
    $('pCat').value  = p.cat;
    $('pPrice').value= p.price;
    $('pCost').value = p.cost||'';
    $('pSku').value  = p.sku||'';
    $('pImg').value  = p.img||'';
    SIZES.forEach(s=>{ $('ps-'+s).value = p.stock[s]||0; });
    updateStockTotal();
    // Show QR
    setTimeout(()=>renderQRPreview(p), 100);
  } else {
    ['pName','pPrice','pCost','pSku','pImg'].forEach(f=>$(f).value='');
    $('pCat').value='mujer';
    SIZES.forEach(s=>{ $('ps-'+s).value=0; });
    $('qrPreviewBox').innerHTML='<div style="color:var(--gray-text);font-size:13px">Guarda el producto para generar el QR</div>';
    updateStockTotal();
  }

  switchFormTab('info');
  $('productModalOverlay').classList.add('open');
  $('productModal').classList.add('open');
}

function editProduct(id) { openProductModal(id); }

function closeProductModal() {
  $('productModalOverlay').classList.remove('open');
  $('productModal').classList.remove('open');
}

function switchFormTab(tab) {
  document.querySelectorAll('.ftab').forEach(b=>b.classList.toggle('active', b.dataset.ftab===tab));
  document.querySelectorAll('.ftab-content').forEach(c=>c.classList.toggle('active', c.id==='ftab-'+tab));
}

function updateStockTotal() {
  const total = SIZES.reduce((s,sz)=>s+(parseInt($('ps-'+sz).value)||0),0);
  const el = $('stockTotalPreview');
  if (el) el.textContent = total;
}

SIZES.forEach(s => {
  const el = $('ps-'+s);
  if (el) el.addEventListener('input', updateStockTotal);
});

async function saveProduct() {
  // Verificar autenticación
  if (!session) {
    toast('⚠ Debes estar autenticado para guardar productos');
    return;
  }

  const id    = $('editProductId').value;
  const name  = $('pName').value.trim();
  const price = parseFloat($('pPrice').value);
  const cost  = parseFloat($('pCost').value)||0;
  const sku   = $('pSku').value.trim();
  const img   = $('pImg').value.trim();
  const cat   = $('pCat').value;

  // Validaciones
  if (!name || name.length === 0) { 
    toast('⚠ El nombre del producto es obligatorio'); 
    return; 
  }
  if (!price || isNaN(price) || price <= 0) { 
    toast('⚠ El precio debe ser un número mayor a 0'); 
    return; 
  }

  const stock = {};
  SIZES.forEach(s=>{ stock[s]=parseInt($('ps-'+s).value)||0; });

  const productData = { 
    id: id || genId(), 
    name, 
    price, 
    cost, 
    sku: sku || `WIN-${Date.now().toString().slice(-4)}`, 
    image: img, 
    category: cat, 
    stock 
  };

  try {
    toast('💾 Guardando producto...');
    console.log('📤 Enviando datos:', productData);
    
    const res = await apiFetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    
    const responseText = await res.text();
    console.log(`📥 Respuesta (${res.status}):`, responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('❌ JSON Parsing Error. Text:', responseText.substring(0, 200));
      toast(`⚠ Respuesta inválida del servidor: ${responseText.substring(0, 100)}`);
      return;
    }

    if (res.ok && result.success) {
      fetchInventory();
      toast(id ? '✓ Producto actualizado' : '✓ Producto creado');
      closeProductModal();
    } else if (res.status === 401) {
      toast('⚠ Sesión expirada. Por favor, inicia sesión nuevamente');
      doLogout();
    } else {
      toast(`⚠ Error: ${result.error || 'No se pudo guardar el producto'}`);
      console.error('Server error response:', result);
    }
  } catch(e) { 
    console.error('❌ Error saving product:', e); 
    toast(`⚠ Error de conexión: ${e.message}`);
  }
}

/* ══════════════════════════════════════════════════════════
   CARGA DE IMÁGENES — Image Upload
══════════════════════════════════════════════════════════ */
function triggerImageUpload() {
  $('pImgFile').click();
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validar tamaño de la imagen (máximo 5 MB)
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) {
    toast('⚠ La imagen es muy grande (máximo 5 MB)');
    return;
  }

  // Validar tipo de archivo
  if (!file.type.startsWith('image/')) {
    toast('⚠ Por favor selecciona un archivo de imagen válido');
    return;
  }

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const previewSrc = e.target.result;
    $('pImg').value = previewSrc;
    
    const preview = $('pImgPreview');
    const img = $('pImgPreviewImg');
    img.src = previewSrc;
    preview.style.display = 'block';
    
    toast('✓ Imagen cargada (' + (file.size / 1024).toFixed(1) + ' KB)');
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

  $('productScanBtn').style.display = 'none';
  $('productScanStopBtn').style.display = '';
  $('productScanPlaceholder').style.display = 'none';
  
  const video = $('productQRVideo');
  video.style.display = 'block';
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    video.srcObject = stream;
    
    // Esperar a que el video esté listo
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });
    
    // Iniciar lectura de QR
    const html5QrCode = new Html5Qrcode('productQRVideo');
    
    html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        onProductQRScanned(decodedText);
        html5QrCode.stop();
        stopProductQRScanner();
      },
      (err) => {
        // Ignore errors during scanning
      }
    ).catch(err => {
      console.error('Error starting QR scanner:', err);
      toast('⚠ Error al iniciar el escáner');
      stopProductQRScanner();
    });
  } catch (err) {
    toast('⚠ No se puede acceder a la cámara: ' + err.message);
    productScannerActive = false;
    $('productScanBtn').style.display = '';
    $('productScanStopBtn').style.display = 'none';
    $('productScanPlaceholder').style.display = 'block';
    $('productQRVideo').style.display = 'none';
  }
}

function stopProductQRScanner() {
  productScannerActive = false;
  
  const video = $('productQRVideo');
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
  
  $('productScanBtn').style.display = '';
  $('productScanStopBtn').style.display = 'none';
  $('productScanPlaceholder').style.display = 'block';
  video.style.display = 'none';
}

function onProductQRScanned(text) {
  toast('✓ Código escaneado');
  
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
    foundProduct = inventory.find(p => String(p.id) === String(data.id));
  }
  if (!foundProduct && data.sku) {
    foundProduct = inventory.find(p => p.sku === data.sku);
  }

  if (foundProduct) {
    // Cargar datos del producto encontrado
    $('pName').value = foundProduct.name;
    $('pCat').value = foundProduct.cat || 'mujer';
    $('pPrice').value = foundProduct.price;
    $('pCost').value = foundProduct.cost || '';
    $('pSku').value = foundProduct.sku || '';
    $('pImg').value = foundProduct.img || '';
    
    // Cargar stock
    SIZES.forEach(s => {
      $('ps-' + s).value = foundProduct.stock[s] || 0;
    });
    updateStockTotal();
    
    // Mostrar preview de imagen
    if (foundProduct.img) {
      const preview = $('pImgPreview');
      const img = $('pImgPreviewImg');
      img.src = foundProduct.img;
      preview.style.display = 'block';
    }
    
    const resultEl = $('productScanResult');
    resultEl.innerHTML = `
      <div style="color:var(--accent);font-weight:600;margin-bottom:8px">✓ Producto encontrado</div>
      <div style="font-size:13px">
        <strong>${foundProduct.name}</strong><br>
        SKU: ${foundProduct.sku} | Precio: $${foundProduct.price.toLocaleString('es-CO')}<br>
        Categoría: ${foundProduct.cat}
      </div>
    `;
    resultEl.style.display = 'block';
    
    // Cambiar a tab de información
    switchFormTab('info');
  } else {
    // Producto no encontrado, mostrar opción para crear
    const data_text = typeof data === 'object' ? JSON.stringify(data) : text;
    const resultEl = $('productScanResult');
    resultEl.innerHTML = `
      <div style="color:var(--red);font-weight:600;margin-bottom:8px">✕ Producto no encontrado</div>
      <div style="font-size:13px;margin-bottom:12px;font-family:monospace;word-break:break-all">
        ${data_text}
      </div>
      <button class="btn-accent" onclick='autoFillFromQRData(${JSON.stringify(data)})' style="width:100%">
        📦 Auto-rellenar con datos del QR
      </button>
    `;
    resultEl.style.display = 'block';
  }
}

function autoFillFromQRData(data) {
  if (data.name) $('pName').value = data.name;
  if (data.sku) $('pSku').value = data.sku;
  if (data.price) $('pPrice').value = data.price;
  if (data.cat) $('pCat').value = data.cat;
  
  toast('✓ Datos auto-rellenados desde QR');
  switchFormTab('info');
}

/* ══════════════════════════════════════════════════════════
   QR CODE GENERATION
══════════════════════════════════════════════════════════ */
function buildQRPayload(product) {
  return JSON.stringify({
    id:    product.id,
    sku:   product.sku,
    name:  product.name,
    price: product.price,
    cat:   product.cat,
    v:     'WINNER-QR-1.0'
  });
}

function renderQRPreview(product) {
  qrCurrentProduct = product;
  const box = $('qrPreviewBox');
  box.innerHTML = '';
  try {
    new QRCode(box, {
      text:   buildQRPayload(product),
      width:  200, height: 200,
      colorDark:  '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    // Add product label under QR
    const label = document.createElement('div');
    label.style.cssText = 'text-align:center;margin-top:10px;font-size:12px;font-weight:700;color:var(--white);letter-spacing:1px';
    label.textContent = `${product.sku} · ${product.name}`;
    box.appendChild(label);
  } catch(e) {
    box.innerHTML = '<div style="color:var(--red);font-size:12px">Error generando QR</div>';
  }
}

function showProductQR(id) {
  const p = inventory.find(x=>String(x.id)===String(id));
  if (!p) return;
  qrCurrentProduct = p;

  $('qrModalTitle').textContent = p.name;
  $('qrModalInfo').innerHTML = `<strong>${p.sku}</strong> · ${fmt(p.price)} · ${p.cat}`;

  const canvas = $('qrModalCanvas');
  canvas.innerHTML = '';
  new QRCode(canvas, {
    text: buildQRPayload(p),
    width: 220, height: 220,
    colorDark:'#000000', colorLight:'#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });

  $('qrModalOverlay').classList.add('open');
  $('qrModal').classList.add('open');
}

function closeQRModal() {
  $('qrModalOverlay').classList.remove('open');
  $('qrModal').classList.remove('open');
}

function printSingleQR() {
  if (!qrCurrentProduct) return;
  const img = $('qrModalCanvas').querySelector('img, canvas');
  if (!img) return;
  const win = window.open('','_blank');
  win.document.write(`<html><body style="text-align:center;padding:40px;font-family:sans-serif">
    <h2 style="font-size:24px;letter-spacing:4px">WINNER</h2>
    <div style="margin:20px auto;display:inline-block">${img.outerHTML}</div>
    <p style="font-size:14px;font-weight:700">${qrCurrentProduct.sku}</p>
    <p style="font-size:18px">${qrCurrentProduct.name}</p>
    <p style="font-size:22px;font-weight:900">$${qrCurrentProduct.price.toLocaleString('es-CO')}</p>
  </body></html>`);
  win.document.close();
  win.print();
}

function downloadSingleQR() {
  if (!qrCurrentProduct) return;
  const canvas = $('qrModalCanvas').querySelector('canvas');
  if (!canvas) { toast('⚠ Sin canvas QR disponible'); return; }
  const a = document.createElement('a');
  a.href     = canvas.toDataURL('image/png');
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
  if (!inventory.length) { toast('Sin productos'); return; }
  const win = window.open('','_blank');
  let items = inventory.map(p=>`
    <div style="display:inline-block;margin:16px;text-align:center;vertical-align:top">
      <div id="qr_${p.id}" style="background:#fff;padding:8px;display:inline-block"></div>
      <p style="font-size:12px;font-weight:700;margin:4px 0">${p.sku}</p>
      <p style="font-size:14px">${p.name}</p>
      <p style="font-size:16px;font-weight:900">$${p.price.toLocaleString('es-CO')}</p>
    </div>`).join('');
  win.document.write(`<!DOCTYPE html><html><head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
    <title>QRs Winner</title></head>
    <body style="font-family:sans-serif;padding:20px">
    <h2 style="text-align:center;letter-spacing:4px">WINNER — CÓDIGOS QR</h2>
    ${items}
    <script>
      ${inventory.map(p=>`
        new QRCode(document.getElementById("qr_${p.id}"),{
          text:${JSON.stringify(buildQRPayload(p))},
          width:150,height:150,
          colorDark:"#000",colorLight:"#fff"
        });
      `).join('')}
      setTimeout(()=>window.print(),1200);
    <\/script></body></html>`);
  win.document.close();
  toast('🖨 Imprimiendo todos los QR...');
}

/* ══════════════════════════════════════════════════════════
   QR SCANNER (page)
══════════════════════════════════════════════════════════ */
function setScanMode(mode) {
  scanMode = mode;
  $('scanModeInventory').classList.toggle('active', mode==='inventory');
  $('scanModePOS').classList.toggle('active', mode==='pos');
}

async function startScanner() {
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    $('scanVideo').srcObject = scanStream;
    $('startScanBtn').style.display = 'none';
    $('stopScanBtn').style.display  = '';
    // Poll for QR (using manual decode simulation — real impl needs jsQR)
    toast('📷 Cámara activa. Use "Ingresar código" para procesar.');
  } catch(e) {
    toast('⚠ No se pudo acceder a la cámara: ' + e.message);
  }
}

function stopScanner() {
  if (scanStream) { scanStream.getTracks().forEach(t=>t.stop()); scanStream=null; }
  const v = $('scanVideo');
  if (v) v.srcObject = null;
  $('startScanBtn').style.display = '';
  $('stopScanBtn').style.display  = 'none';
  clearInterval(scanInterval);
}

function processManualQR() {
  const code = $('manualQRInput').value.trim();
  if (!code) { toast('⚠ Ingresa un código'); return; }

  // Try to parse JSON payload
  let product = null;
  try {
    const data = JSON.parse(code);
    product = inventory.find(p=>String(p.id)===String(data.id) || p.sku===data.sku);
  } catch {
    // Try SKU direct
    product = inventory.find(p=>p.sku===code || p.name.toLowerCase()===code.toLowerCase());
  }

  if (!product) {
    $('scanResult').style.display = 'block';
    $('scanResult').innerHTML = `<strong style="color:var(--red)">✕ Producto no encontrado:</strong> "${code}"
      <br><button class="btn-accent" style="margin-top:10px" onclick="openProductModal()">+ Registrar nuevo producto</button>`;
    return;
  }

  processScannedProduct(product);
  $('manualQRInput').value = '';
}

function processScannedProduct(product) {
  const ts = totalStock(product);
  const resultEl = $('scanResult');
  resultEl.style.display = 'block';

  if (scanMode === 'pos') {
    addToPOSCart(product, 'M');
    resultEl.innerHTML = `<strong style="color:var(--green)">✓ Agregado a venta:</strong> ${product.name} — ${fmt(product.price)}`;
    toast(`✓ ${product.name} → Carrito POS`);
  } else {
    resultEl.innerHTML = `<strong style="color:var(--accent)">📦 Producto encontrado:</strong> ${product.name}<br>
      SKU: ${product.sku} · Stock: ${ts} unidades · Precio: ${fmt(product.price)}<br>
      <button class="btn-accent" style="margin-top:10px" onclick="editProduct(${product.id})">✎ Editar / Actualizar stock</button>`;
    toast(`📦 ${product.name} identificado`);
  }

  // Show in last scan panel
  $('lastScanInfo').innerHTML = `
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
function renderPOSProducts(filter='') {
  const list = $('posProductList');
  const q = filter.toLowerCase();
  const items = inventory.filter(p =>
    totalStock(p)>0 && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || !q)
  );

  list.innerHTML = items.map(p=>`
    <div class="pos-product-card" data-product-id="${p.id}">
      <img src="${p.img}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200&q=60'"/>
      <div class="pos-product-card-info">
        <div class="ppc-cat">${p.cat}</div>
        <div class="ppc-name">${p.name}</div>
        <div class="ppc-price">${fmt(p.price)}</div>
      </div>
    </div>`).join('');
  
  // Agregar event listeners
  list.querySelectorAll('.pos-product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const productId = card.dataset.productId;
      const product = inventory.find(p => String(p.id) === String(productId));
      if (product) {
        openPOSSizeSelector(product);
      }
    });
  });
}

function openPOSSizeSelector(product) {
  const modal = $('posSizeModal') || createPOSSizeModal();
  const overlay = $('posSizeOverlay');
  const sizeGrid = modal.querySelector('#posSizeGrid');
  
  sizeGrid.innerHTML = SIZES.map(size => {
    const stock = product.stock ? (product.stock[size] || 0) : 0;
    const disabled = stock <= 0;
    return `
      <button class="pos-size-btn ${disabled ? 'disabled' : ''}" 
        data-product-id="${product.id}" data-size="${size}"
        ${disabled ? 'disabled' : ''}>
        ${size} ${stock <= 0 ? '(✕)' : ''}
      </button>
    `;
  }).join('');
  
  setTimeout(() => {
    sizeGrid.querySelectorAll('.pos-size-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.dataset.productId;
        const sz = btn.dataset.size;
        addToPOSCart(pId, sz);
        closePOSSizeModal();
      });
    });
  }, 0);
  
  if (overlay) overlay.classList.add('open');
  modal.classList.add('open');
}

function createPOSSizeModal() {
  // Agregar estilos si no existen
  if (!document.getElementById('posSizeBtnStyles')) {
    const style = document.createElement('style');
    style.id = 'posSizeBtnStyles';
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
  let overlay = $('posSizeOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'posSizeOverlay';
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePOSSizeModal();
    });
    document.body.appendChild(overlay);
  }
  
  const modal = document.createElement('div');
  modal.id = 'posSizeModal';
  modal.className = 'modal modal-sm';
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
  const existing = $('posSizeModal');
  if (existing) existing.remove();
  document.body.appendChild(modal);
  return modal;
}

function closePOSSizeModal() {
  const modal = $('posSizeModal');
  const overlay = $('posSizeOverlay');
  if (modal) modal.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

function addToPOSCart(productOrId, size='M') {
  try {
    const p = typeof productOrId === 'object' ? productOrId : inventory.find(x => String(x.id) === String(productOrId));
    
    if (!p) {
      toast('⚠ Producto no encontrado');
      return;
    }
    
    if (!size) {
      toast('⚠ Selecciona una talla');
      return;
    }
    
    const stock = p.stock ? (p.stock[size] || 0) : 0;
    if (stock <= 0) {
      toast(`⚠ Sin stock en talla ${size}`);
      return;
    }
    
    const existing = posCart.find(i => String(i.id) === String(p.id) && i.size === size);
    if (existing) {
      existing.qty++;
    } else {
      posCart.push({
        id: p.id,
        name: p.name,
        price: p.price,
        img: p.img || '',
        size: size,
        qty: 1
      });
    }
    
    renderPOSCart();
    toast(`✓ ${p.name} (${size}) agregado al carrito`);
    console.log(`Producto agregado: ${p.name} - Talla: ${size}`);
  } catch(e) {
    console.error('Error en addToPOSCart:', e);
    toast('❌ Error al agregar producto');
  }
}

function posSearchProducts() {
  renderPOSProducts($('posSearch').value);
}

function removePOSItem(id, size) {
  posCart = posCart.filter(i=>!(String(i.id)===String(id)&&i.size===size));
  renderPOSCart();
}

function updatePOSQty(id, size, delta) {
  const item = posCart.find(i=>String(i.id)===String(id)&&i.size===size);
  if (!item) return;
  item.qty = Math.max(1, item.qty+delta);
  renderPOSCart();
}

function renderPOSCart() {
  const el = $('posItems');
  if (!posCart.length) {
    el.innerHTML='<div class="pos-empty">Sin productos agregados</div>';
  } else {
    el.innerHTML = posCart.map(item=>`
      <div class="pos-item-row">
        <img src="${item.img}" class="pos-item-img" onerror="this.style.display='none'"/>
        <div style="flex:1">
          <div class="pos-item-name">${item.name}</div>
          <div class="pos-item-size">Talla: ${item.size}</div>
        </div>
        <div class="pos-qty-ctrl">
          <button onclick="updatePOSQty(${item.id},'${item.size}',-1)">−</button>
          <span>${item.qty}</span>
          <button onclick="updatePOSQty(${item.id},'${item.size}',+1)">+</button>
        </div>
        <div class="pos-item-total">${fmt(item.price*item.qty)}</div>
        <button class="pos-item-remove" onclick="removePOSItem(${item.id},'${item.size}')">✕</button>
      </div>`).join('');
  }
  updatePOSTotals();
}

function updatePOSTotals() {
  const sub = posCart.reduce((s,i)=>s+i.price*i.qty,0);
  const disc = parseFloat($('posDiscount').value)||0;
  const total = sub * (1 - disc/100);
  $('posSubtotal').textContent = fmt(sub);
  $('posTotal').textContent    = fmt(Math.round(total));
}

const posDiscountEl = $('posDiscount');
if (posDiscountEl) posDiscountEl.addEventListener('input', updatePOSTotals);

function renderPOSPayGrid() {
  const grid = $('posPayGrid');
  if (!grid) return;
  const allMethods = [
    ...payMethods.national.filter(m=>m.enabled),
    ...payMethods.wallets.filter(m=>m.enabled),
    ...payMethods.delivery.filter(m=>m.enabled),
  ];
  grid.innerHTML = allMethods.slice(0,8).map(m=>`
    <button class="pos-pay-btn ${posSelectedMethod===m.name?'selected':''}"
      onclick="selectPOSMethod('${m.name}')">
      ${m.icon} ${m.name}
    </button>`).join('');
}

function selectPOSMethod(method) {
  posSelectedMethod = method;
  renderPOSPayGrid();
}

function clearPOS() {
  posCart = [];
  $('posVendor').value  = '';
  $('posClient').value  = '';
  $('posDiscount').value= 0;
  renderPOSCart();
}

async function confirmPOSSale() {
  if (!posCart.length) { toast('⚠ Agrega productos a la venta'); return; }
  const vendor = $('posVendor').value.trim()||'Vendedor';
  const client = $('posClient').value.trim()||'—';
  const disc   = parseFloat($('posDiscount').value)||0;
  const sub    = posCart.reduce((s,i)=>s+i.price*i.qty,0);
  const total  = Math.round(sub*(1-disc/100));

  const items = posCart.map(i=>({name:i.name,qty:i.qty,price:i.price,size:i.size}));

  const sale = {
    id: genId(), timestamp: nowStr(), channel:'fisica',
    vendor, client, method: posSelectedMethod,
    subtotal: sub, discount: disc, total, items
  };

  try {
    await apiFetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale)
    });
    fetchSalesLog();
  } catch(e) { console.error('Error saving POS sale:', e); }

  // Sync stock to backend
  for (const item of posCart) {
    const p = inventory.find(x => String(x.id) === String(item.id));
    if (p) {
      let rem = item.qty;
      for (const s of SIZES) {
        if (rem <= 0) break;
        const take = Math.min(p.stock[s] || 0, rem);
        p.stock[s] = (p.stock[s] || 0) - take;
        rem -= take;
      }
      try {
        await apiFetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...p, category: p.cat, image: p.img })
        });
      } catch (e) { console.error('Error syncing stock:', e); }
    }
  }

  toast(`✓ Venta confirmada: ${fmt(total)} — ${posSelectedMethod}`);
  clearPOS();
  fetchInventory();
  renderDashboard();

  // Print receipt option
  if (confirm(`✓ Venta registrada: ${fmt(total)}\n\n¿Imprimir recibo?`)) {
    printReceipt(sale);
  }
}

function openQRScannerPOS() {
  $('posScanOverlay').classList.add('open');
  $('posScanModal').classList.add('open');
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
    .then(stream=>{
      posScanStream = stream;
      $('posScanVideo').srcObject = stream;
    }).catch(e=>toast('⚠ Cámara no disponible: '+e.message));
}

function closePOSScanner() {
  if (posScanStream) { posScanStream.getTracks().forEach(t=>t.stop()); posScanStream=null; }
  $('posScanOverlay').classList.remove('open');
  $('posScanModal').classList.remove('open');
}

/* ── RECEIPT ── */
function printReceipt(sale) {
  const win = window.open('','_blank','width=380,height=600');
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
    ${sale.items.map(i=>`<div class="row"><span>${i.name} ×${i.qty}</span><span>$${(i.price*i.qty).toLocaleString('es-CO')}</span></div>`).join('')}
    <div class="line"></div>
    ${sale.discount>0?`<div class="row"><span>Descuento ${sale.discount}%</span><span>-$${(sale.subtotal-sale.total).toLocaleString('es-CO')}</span></div>`:''}
    <div class="row total"><span>TOTAL</span><span>$${sale.total.toLocaleString('es-CO')}</span></div>
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
  renderPaySection('payNational',  payMethods.national);
  renderPaySection('payWallets',   payMethods.wallets);
  renderPaySection('payDelivery',  payMethods.delivery);
  renderPaySection('payIntl',      payMethods.intl);
}

function renderPaySection(containerId, methods) {
  const el = $(containerId);
  if (!el) return;
  el.innerHTML = methods.map(m=>`
    <div class="pay-method-card ${m.enabled?'enabled':''}">
      <span class="pmc-icon">${m.icon}</span>
      <div class="pmc-info">
        <div class="pmc-name">${m.name}</div>
        <div class="pmc-type">${m.type}</div>
      </div>
      <button class="toggle-switch ${m.enabled?'on':''}"
        onclick="togglePayMethod('${containerId}','${m.id}')"
        aria-label="${m.enabled?'Desactivar':'Activar'} ${m.name}">
      </button>
    </div>`).join('');
}

const PAY_SECTION_MAP = {
  payNational:'national', payWallets:'wallets', payDelivery:'delivery', payIntl:'intl'
};

function togglePayMethod(sectionId, methodId) {
  const key = PAY_SECTION_MAP[sectionId];
  if (!key) return;
  const m = payMethods[key].find(x=>x.id===methodId);
  if (m) { m.enabled=!m.enabled; LS.set('payMethods',payMethods); renderPayMethods(); renderPOSPayGrid(); }
}

function registerPayment() {
  const method = $('payRegMethod').value;
  const amount = parseFloat($('payRegAmount').value);
  const ref    = $('payRegRef').value.trim();
  if (!method||!amount||amount<=0) { toast('⚠ Completa método y monto'); return; }
  const entry = {id:genId(), ts:nowStr(), method, ref:ref||'—', amount};
  payLog.unshift(entry);
  LS.set('payLog', payLog);
  $('payRegMethod').value='';
  $('payRegAmount').value='';
  $('payRegRef').value='';
  renderPaymentsTable();
  toast(`✓ Pago de ${fmt(amount)} registrado`);
}

function renderPaymentsTable() {
  const tbody = $('paymentsBody');
  if (!payLog.length) { tbody.innerHTML='<tr class="empty-row"><td colspan="6">Sin pagos registrados</td></tr>'; return; }
  tbody.innerHTML = payLog.map(p=>`
    <tr>
      <td>${fmtDate(p.ts)}</td>
      <td>${p.method}</td>
      <td style="color:var(--gray-text);font-family:monospace;font-size:12px">${p.ref}</td>
      <td style="font-weight:700;color:var(--accent)">${fmt(p.amount)}</td>
      <td><span class="status-badge s-ok">Completado</span></td>
      <td><button class="action-btn del" onclick="deletePayment('${p.id}')">✕</button></td>
    </tr>`).join('');
}

function deletePayment(id) {
  if (!confirm('¿Eliminar este pago del historial?')) return;
  payLog = payLog.filter(p=>p.id!==id);
  LS.set('payLog',payLog);
  renderPaymentsTable();
}

function exportPaymentsCSV() {
  if (!payLog.length) { toast('⚠ Sin pagos'); return; }
  const rows = [['Fecha/Hora','Método','Referencia','Monto'], ...payLog.map(p=>[p.ts,p.method,p.ref,p.amount])];
  downloadCSV(rows, `winner_pagos_${new Date().toISOString().slice(0,10)}.csv`);
  toast('⬇ Pagos exportados');
}

/* ══════════════════════════════════════════════════════════
   SALES
══════════════════════════════════════════════════════════ */
function renderSalesStats() {
  const getLocalDate = (iso) => {
    const d = new Date(iso);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const today = getLocalDate(new Date());
  const todaySales = salesLog.filter(s => getLocalDate(s.timestamp) === today);
  const todayTotal = todaySales.reduce((s,x)=>s+x.total,0);
  const todayCount = todaySales.length;
  const avg        = todayCount ? todayTotal/todayCount : 0;
  const monthTotal = salesLog.reduce((s,x)=>s+x.total,0);

  $('sv1').textContent = fmt(todayTotal);
  $('sv2').textContent = todayCount;
  $('sv3').textContent = fmt(Math.round(avg));
  $('sv4').textContent = fmt(monthTotal);
}

function renderSalesTable() {
  const fDate    = $('sfDate').value;
  const fMethod  = $('sfMethod').value;
  const fChannel = $('sfChannel').value;

  let list = [...salesLog];
  if (fMethod)  list = list.filter(s=>s.method===fMethod);
  if (fChannel) list = list.filter(s=>s.channel===fChannel);
  if (fDate) {
    list = list.filter(s => {
      const d = new Date(s.timestamp);
      const sDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      return sDate === fDate;
    });
  }

  const tbody = $('salesBody');
  if (!list.length) { tbody.innerHTML='<tr class="empty-row"><td colspan="9">Sin ventas registradas</td></tr>'; return; }

  let html = '';
  let lastDay = '';

  list.forEach((s,i) => {
    const d = new Date(s.timestamp);
    const day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (day !== lastDay) {
      const dayName = new Date(day + 'T12:00:00').toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' });
      html += `<tr class="day-divider"><td colspan="9">${dayName}</td></tr>`;
      lastDay = day;
    }
    
    html += `
      <tr>
        <td style="color:var(--gray-text);font-size:12px">#${list.length-i}</td>
        <td style="font-size:12px">${fmtDate(s.timestamp)}</td>
        <td><span class="status-badge ${s.channel==='fisica'?'s-fisica':'s-online'}">${s.channel==='fisica'?'Física':'Online'}</span></td>
        <td>${s.vendor}</td>
        <td style="color:var(--gray-text)">${s.client}</td>
        <td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${s.items.map(i=>`${i.name} ×${i.qty}`).join(', ')}
        </td>
        <td style="font-size:12px">${s.method}</td>
        <td style="font-weight:700;color:var(--accent)">${fmt(s.total)}</td>
        <td>
          <button class="action-btn" onclick="printReceipt(salesLog.find(x=>x.id==='${s.id}'))" title="Imprimir recibo">🖨</button>
          <button class="action-btn del" onclick="deleteSale('${s.id}')" title="Eliminar">✕</button>
        </td>
      </tr>`;
  });
  tbody.innerHTML = html;
}

async function deleteSale(id) {
  if (!confirm('¿Eliminar esta venta del registro?')) return;
  try {
    const res = await apiFetch(`${API_URL}/sales/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchSalesLog();
      toast('Venta eliminada');
    } else {
      toast('❌ Sin autorización');
    }
  } catch(e) { console.error('Error deleting sale:', e); }
}

function exportSalesCSV() {
  if (!salesLog.length) { toast('⚠ Sin ventas'); return; }
  const rows = [
    ['#','Fecha/Hora','Canal','Vendedor','Cliente','Productos','Método','Total'],
    ...salesLog.map((s,i)=>[
      i+1, fmtDate(s.timestamp), s.channel, s.vendor, s.client,
      s.items.map(x=>`${x.name} x${x.qty}`).join(' | '),
      s.method, s.total
    ])
  ];
  downloadCSV(rows, `winner_ventas_${new Date().toISOString().slice(0,10)}.csv`);
  toast('⬇ Ventas exportadas');
}

/* ══════════════════════════════════════════════════════════
   CSV EXPORT UTILITY
══════════════════════════════════════════════════════════ */
function downloadCSV(rows, filename) {
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════════════
   INIT (después de funciones de datos)
══════════════════════════════════════════════════════════ */
// Inicializar payMethods AHORA que defaultPayMethods() ya está definida
payMethods = LS.get('payMethods', defaultPayMethods());

/* ══════════════════════════════════════════════════════════
   MOBILE SCANNER LINK (QR para abrir escáner en celular)
══════════════════════════════════════════════════════════ */
function openMobileScannerLink() {
  const url = `${window.location.origin}${window.location.pathname}#qrscan`;
  const el  = $('mobileScanQR');
  if (!el) return;
  el.innerHTML = '';
  try {
    new QRCode(el, {
      text: url,
      width: 180, height: 180,
      colorDark: '#000000', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch(e) {
    el.innerHTML = `<p style="word-break:break-all;font-size:12px">${url}</p>`;
  }
  $('mobileScanOverlay').classList.add('open');
  $('mobileScanModal').classList.add('open');
}

function closeMobileScannerLink() {
  $('mobileScanOverlay').classList.remove('open');
  $('mobileScanModal').classList.remove('open');
}

/* ══════════════════════════════════════════════════════════
   QR SCANNER DESDE FORMULARIO DE PRODUCTO
══════════════════════════════════════════════════════════ */
function openProductQRScanner() {
  toast('📷 Use el campo SKU para ingresar el código manualmente, o use el Escáner QR del menú.');
}

/* ══════════════════════════════════════════════════════════
   TOGGLE PAY SECTION (colapsar/expandir secciones de pago)
══════════════════════════════════════════════════════════ */
function togglePaySection(sectionId) {
  const el = $(sectionId);
  if (!el) return;
  const isHidden = el.style.display === 'none';
  el.style.display = isHidden ? '' : 'none';
  const label = el.previousElementSibling;
  if (label) label.classList.toggle('collapsed', !isHidden);
}

/* ══════════════════════════════════════════════════════════
   EDITOR DE MÉTODO DE PAGO
══════════════════════════════════════════════════════════ */
let _editingPayMethodId   = null;
let _editingPaySectionKey = null;

function openPayMethodEditor(sectionId, methodId) {
  const key = PAY_SECTION_MAP[sectionId];
  if (!key) return;
  const m = payMethods[key].find(x => x.id === methodId);
  if (!m) return;
  _editingPayMethodId   = methodId;
  _editingPaySectionKey = key;
  $('payEditName').value    = m.name;
  $('payEditType').value    = m.type;
  $('payEditEnabled').checked = m.enabled;
  $('payMethodModalOverlay').classList.add('open');
  $('payMethodModal').classList.add('open');
}

function closePayMethodEditor() {
  $('payMethodModalOverlay').classList.remove('open');
  $('payMethodModal').classList.remove('open');
  _editingPayMethodId   = null;
  _editingPaySectionKey = null;
}

function savePayMethodEditor() {
  if (!_editingPaySectionKey || !_editingPayMethodId) return;
  const m = payMethods[_editingPaySectionKey].find(x => x.id === _editingPayMethodId);
  if (!m) return;
  m.name    = $('payEditName').value.trim() || m.name;
  m.enabled = $('payEditEnabled').checked;
  LS.set('payMethods', payMethods);
  renderPayMethods();
  renderPOSPayGrid();
  closePayMethodEditor();
  toast('Método de pago actualizado');
}

/* ══════════════════════════════════════════════════════════
   MODAL POS PAYMENT
══════════════════════════════════════════════════════════ */
function openPOSPaymentModal() {
  if (!posCart.length) { toast('⚠ Agrega productos a la venta'); return; }
  const allMethods = [
    ...payMethods.national.filter(m => m.enabled),
    ...payMethods.wallets.filter(m => m.enabled),
    ...payMethods.delivery.filter(m => m.enabled),
    ...payMethods.intl.filter(m => m.enabled),
  ];
  const opts = $('posPayOptions');
  opts.innerHTML = allMethods.map(m => `
    <button class="pos-pay-option-btn ${posSelectedMethod===m.name?'selected':''}"
      onclick="selectAndConfirmPOS('${m.name}')">
      <span style="font-size:20px">${m.icon}</span>
      <span>${m.name}</span>
      <span style="font-size:10px;color:var(--gray-text)">${m.type}</span>
    </button>`).join('');
  $('posPayOverlay').classList.add('open');
  $('posPayModal').classList.add('open');
}

function closePOSPaymentModal() {
  $('posPayOverlay').classList.remove('open');
  $('posPayModal').classList.remove('open');
}

function selectAndConfirmPOS(method) {
  posSelectedMethod = method;
  closePOSPaymentModal();
  confirmPOSSale();
}

/* ══════════════════════════════════════════════════════════
   STOCK CSV UPLOAD
══════════════════════════════════════════════════════════ */
function triggerStockUpload() {
  const inp = $('invCsvInput');
  if (inp) inp.click();
}

async function handleStockUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim());
  if (!lines.length) { toast('Archivo vacío'); return; }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g,''));
  const getCol  = (h) => {
    if (['id','codigo','código','sku'].includes(h)) return 'sku';
    if (['name','nombre','producto'].includes(h))   return 'name';
    if (['qty','cantidad','stock','cantidad'].includes(h)) return 'qty';
    if (['size','talla','talla/size'].includes(h))  return 'size';
    return h;
  };
  const mapped = headers.map(getCol);

  let updated = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols  = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g,''));
    const row   = {};
    mapped.forEach((k,j) => { row[k] = cols[j] || ''; });

    const skuVal  = row.sku  || row.name || '';
    const sizeVal = (row.size || 'M').toUpperCase();
    const qtyVal  = parseInt(row.qty) || 0;

    const p = inventory.find(x =>
      x.sku === skuVal ||
      x.name.toLowerCase() === skuVal.toLowerCase() ||
      String(x.id) === skuVal
    );
    if (p && SIZES.includes(sizeVal)) {
      p.stock[sizeVal] = qtyVal;
      // Sync to backend
      try {
        await apiFetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...p, category: p.cat, image: p.img })
        });
        updated++;
      } catch(e) { console.error('Stock sync error:', e); }
    }
  }

  event.target.value = '';
  fetchInventory();
  toast(`✓ Stock actualizado: ${updated} producto(s)`);
}

/* ══════════════════════════════════════════════════════════
   DOM READY — listeners finales
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // KPI cards → navegación
  const kpiSales = $('kpiCardSales');
  if (kpiSales) kpiSales.addEventListener('click', () => navigateTo('sales'));
  const kpiProds = $('kpiCardProducts');
  if (kpiProds) kpiProds.addEventListener('click', () => navigateTo('inventory'));
  const kpiLow   = $('kpiCardLowStock');
  if (kpiLow)   kpiLow.addEventListener('click', () => navigateTo('inventory'));

  // Stock inputs en modal
  SIZES.forEach(s => {
    const el = $('ps-'+s);
    if (el) el.addEventListener('input', updateStockTotal);
  });

  // POS discount live update
  const pd = $('posDiscount');
  if (pd) pd.addEventListener('input', updatePOSTotals);

  // Hash navigation (ej: #qrscan desde móvil)
  const hash = window.location.hash.replace('#', '');
  const validPages = ['dashboard','inventory','pos','payments','sales','qrscan'];
  if (hash && validPages.includes(hash) && verifySession()) {
    navigateTo(hash);
  }
});

// ═════════════════════════════════════════════════════════
// Fin del archivo admin-panel.js
// ═════════════════════════════════════════════════════════
}
