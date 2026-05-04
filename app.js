/* ═══════════════════════════════════════════════════════
   WINNER STORE — app.js
   ═══════════════════════════════════════════════════════ */

/* ── API CONFIG ─────────────────────────────────────────── */
const API_URL = (() => {
  // Dev: localhost:3000 | Prod: mismo origen
  const isLocalFile = window.location.origin.startsWith("file:");
  window.API_URL = isLocalFile
    ? "http://localhost:3000/api"
    : `${window.location.origin.replace(/\/$/, "")}/api`;
  console.log("🔗 API_URL detectada:", window.API_URL);
  return window.API_URL;
})();

window.API_URL = API_URL;

// Mensaje en consola
console.log("🔗 API URL:", API_URL);
if (API_URL.includes("http://")) {
  console.warn(
    "⚠️  WARNING: Usando HTTP. En producción usar HTTPS con certificado SSL/TLS",
  );
}

// API key puede venir inyectada o caer al valor de desarrollo.
const API_KEY =
  window.API_KEY ||
  localStorage.getItem("w_api_key") ||
  "prod-api-key-winner-2026";
const API_HEADERS = { "x-api-key": API_KEY };

const apiFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), ...API_HEADERS },
  });

/* ── HELPERS ─────────────────────────────────────────── */
const esc = (str) => {
  if (!str) return "";
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m],
  );
};

const formatPrice = (val) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(val);
};

/* ── STATE ──────────────────────────────────────────────── */
let PRODUCTS = [];
let cart = loadCart();
let activeFilter = "all";

// Payment flow state
let paymentData = {
  customer: {
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  },
  shipping: {
    method: "",
    carrier: "",
    cost: 0,
  },
  payment: {
    method: "",
  },
};

// ═══════════════════════════════════════════════════════
// TRANSPORTADORAS COLOMBIANAS
// ═══════════════════════════════════════════════════════
const SHIPPING_OPTIONS = [
  {
    id: "servientrega_express",
    name: "Servientrega Express",
    carrier: "Servientrega",
    cost: 18990,
    days: "1-2 días",
    icon: "🚀",
    description: "Express a ciudades principales. Trazabilidad en tiempo real.",
  },
  {
    id: "servientrega_standard",
    name: "Servientrega Estándar",
    carrier: "Servientrega",
    cost: 12990,
    days: "3-5 días",
    icon: "🚚",
    description: "Cobertura nacional. Entrega segura y confiable.",
  },
  {
    id: "4_72",
    name: "4-72 Express",
    carrier: "4-72",
    cost: 21990,
    days: "1-2 días",
    icon: "⚡",
    description: "Cobertura nacional. Entregas rápidas a todo el país.",
  },
  {
    id: "coordinadora",
    name: "Coordinadora",
    carrier: "Coordinadora",
    cost: 14990,
    days: "2-4 días",
    icon: "📦",
    description: "Red nacional. Cobertura en ciudades principales.",
  },
  {
    id: "dhl_colombia",
    name: "DHL Colombia",
    carrier: "DHL Colombia",
    cost: 24990,
    days: "1 día",
    icon: "🌍",
    description: "Envíos internacionales y nacionales express.",
  },
  {
    id: "pickup_bogota",
    name: "Recogida en Bogotá",
    carrier: "Winner Store (Bogotá)",
    cost: 0,
    days: "2-4 horas",
    icon: "🏪",
    description: "Recoge tu pedido en nuestro local de Bogotá.",
  },
  {
    id: "pickup_medellin",
    name: "Recogida en Medellín",
    carrier: "Winner Store (Medellín)",
    cost: 0,
    days: "2-4 horas",
    icon: "🏪",
    description: "Recoge tu pedido en nuestro local de Medellín.",
  },
];

// ═══════════════════════════════════════════════════════
// CONFIGURACIÓN DE PASARELAS DE PAGO
// ═══════════════════════════════════════════════════════
const PAYMENT_GATEWAYS = {
  NEQUI: {
    name: "Nequi",
    icon: "📱",
    color: "#e91e8b",
    url: "https://www.equifax.com.co/nequi",
    instructions: "Te enviaremos un link de pago seguro via WhatsApp",
  },
  DAVIPLATA: {
    name: "Daviplata",
    icon: "📱",
    color: "#ff6b00",
    url: "https://www.davivienda.com/daviplata",
    instructions: "Recibirás instrucciones de pago por WhatsApp",
  },
  PSE: {
    name: "PSE / Transferencia",
    icon: "🏦",
    color: "#1e90ff",
    url: "https://www.pagofacil.com.co",
    instructions: "Serás redirigido a PSE para confirmar tu pago",
  },
  CARD: {
    name: "Tarjeta de Crédito/Débito",
    icon: "💳",
    color: "#3498db",
    url: "https://checkout.wompi.co",
    instructions: "Ingresa los datos de tu tarjeta de forma encriptada",
  },
  CASH: {
    name: "Efectivo",
    icon: "💵",
    color: "#2ecc71",
    url: null,
    instructions: "Pagarás contra entrega o en recogida en tienda",
  },
};

async function fetchProducts() {
  try {
    const res = await apiFetch(`${API_URL}/products`);
    PRODUCTS = await res.json();
    renderProducts(activeFilter);
  } catch (err) {
    console.error("Error fetching products:", err);
    showToast("❌ Error al conectar con el servidor");
  }
}

async function registerOnlineSale(methodName) {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCost = paymentData.shipping.cost || 0;
  const total = subtotal + shippingCost;

  const saleData = {
    id: "POS" + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    vendor: "Tienda Física", // [FUTURO] Restaurar "Tienda Online" externa
    client: paymentData.customer.name || "Cliente Web",
    email: paymentData.customer.email,
    phone: paymentData.customer.phone,
    address: paymentData.customer.address,
    city: paymentData.customer.city,
    method: methodName,
    channel: "fisica", // [FUTURO] Restaurar canal "online" externo
    subtotal: subtotal,
    shippingCost: shippingCost,
    shippingMethod: paymentData.shipping.method,
    shippingCarrier: paymentData.shipping.carrier,
    discount: 0,
    total: total,
    items: cart.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
      size: i.size || "M",
    })),
  };

  try {
    console.log("📤 Guardando venta online:", saleData);
    const res = await apiFetch(`${API_URL}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleData),
    });

    const responseText = await res.text();
    console.log(`📥 Respuesta (${res.status}):`, responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("❌ Error parsing response:", responseText);
      return false;
    }

    if (result.success) {
      console.log("✅ Venta registrada en admin:", result.id);
      return true;
    } else {
      console.error("⚠️ Server returned error:", result.error);
      return false;
    }
  } catch (err) {
    console.error("❌ Error saving sale:", err);
    return false;
  }
}

/* ── DOM REFS ───────────────────────────────────────────── */
const DOM = {
  // cursor: document.getElementById('cursor'),
  // cursorRing: document.getElementById('cursor-ring'),
  toast: document.getElementById("toast"),
  toastMsg: document.getElementById("toastMsg"),
  navbar: document.getElementById("navbar"),
  cartToggle: document.getElementById("cartToggle"),
  cartOverlay: document.getElementById("cartOverlay"),
  cartDrawer: document.getElementById("cartDrawer"),
  cartClose: document.getElementById("cartClose"),
  cartItems: document.getElementById("cartItems"),
  cartCount: document.getElementById("cartCount"),
  cartTotal: document.getElementById("cartTotal"),
  productsGrid: document.getElementById("productsGrid"),
  filterBar: document.getElementById("filterBar"),
  newsletterForm: document.getElementById("newsletterForm"),
  promoCode: document.getElementById("promoCode"),
  menuBtn: document.getElementById("menuBtn"),
  navLinks: document.querySelector(".nav-links"),
};

/* ══════════════════════════════════════════════════════════
   CART PERSISTENCE (localStorage)
══════════════════════════════════════════════════════════ */
function saveCart() {
  try {
    localStorage.setItem("winner_cart", JSON.stringify(cart));
  } catch {}
}

function loadCart() {
  try {
    const data = localStorage.getItem("winner_cart");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/* ══════════════════════════════════════════════════════════
   CURSOR — hides automatically on touch devices via CSS
══════════════════════════════════════════════════════════ */
// (function initCursor() {
//   // Skip cursor setup on touch devices
//   const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
//   if (isTouchDevice) return;

//   let mx = -100, my = -100;
//   let rx = -100, ry = -100;

//   document.addEventListener('mousemove', (e) => {
//     mx = e.clientX;
//     my = e.clientY;
//     DOM.cursor.style.left = mx + 'px';
//     DOM.cursor.style.top = my + 'px';
//   });

//   // Ring follows with slight lag via rAF
//   function animateRing() {
//     rx += (mx - rx) * 0.15;
//     ry += (my - ry) * 0.15;
//     DOM.cursorRing.style.left = rx + 'px';
//     DOM.cursorRing.style.top = ry + 'px';
//     requestAnimationFrame(animateRing);
//   }
//   animateRing();

//   // Hover effect on interactive elements
//   const hoverTargets = 'a, button, .cat-card, .product-card, .featured-item, .filter-btn, .social-link';
//   document.addEventListener('mouseover', (e) => {
//     if (e.target.closest(hoverTargets)) {
//       document.body.classList.add('cursor-hover');
//     }
//   });
//   document.addEventListener('mouseout', (e) => {
//     if (e.target.closest(hoverTargets)) {
//       document.body.classList.remove('cursor-hover');
//     }
//   });
// })();

/* ══════════════════════════════════════════════════════════
   MOBILE MENU
══════════════════════════════════════════════════════════ */
function toggleMobileMenu() {
  DOM.navLinks.classList.toggle("mobile-open");
  DOM.menuBtn.classList.toggle("active");
  document.body.style.overflow = DOM.navLinks.classList.contains("mobile-open")
    ? "hidden"
    : "";
}

// Close mobile menu on navigation
DOM.navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    DOM.navLinks.classList.remove("mobile-open");
    DOM.menuBtn.classList.remove("active");
    document.body.style.overflow = "";
  });
});

/* ══════════════════════════════════════════════════════════
   NAVBAR — scroll effect
══════════════════════════════════════════════════════════ */
window.addEventListener(
  "scroll",
  () => {
    DOM.navbar.classList.toggle("scrolled", window.scrollY > 60);
  },
  { passive: true },
);

/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
let toastTimer = null;

function showToast(msg) {
  DOM.toastMsg.textContent = msg;
  DOM.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => DOM.toast.classList.remove("show"), 2800);
}

/* ══════════════════════════════════════════════════════════
   CART
══════════════════════════════════════════════════════════ */
function openCart() {
  DOM.cartOverlay.classList.add("open");
  DOM.cartDrawer.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  DOM.cartOverlay.classList.remove("open");
  DOM.cartDrawer.classList.remove("open");
  document.body.style.overflow = "";
}

DOM.cartToggle.addEventListener("click", openCart);
DOM.cartClose.addEventListener("click", closeCart);
DOM.cartOverlay.addEventListener("click", closeCart);

// Close with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCart();
    // Also close mobile menu
    DOM.navLinks.classList.remove("mobile-open");
    DOM.menuBtn.classList.remove("active");
    document.body.style.overflow = "";
  }
});

function addToCart(productId, sizeId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  // Encontrar qué talla seleccionó el usuario si no se pasó por argumento.
  let selectedSize = sizeId;
  if (!selectedSize) {
    const selector = document.querySelector(
      `.size-selector[data-product="${productId}"] .size-btn.active`,
    );
    if (selector) selectedSize = selector.dataset.size;
  }

  // Si aún no hay talla seleccionada, mostramos un error UI o seleccionamos la primera con stock
  if (!selectedSize) {
    const availableSizes = Object.keys(product.stock).filter(
      (s) => product.stock[s] > 0,
    );
    if (availableSizes.length > 0) {
      selectedSize = availableSizes[0];
    } else {
      showToast(`❌ ${product.name} está agotado`);
      return;
    }
  }

  // Buscar si ya existe EN ESA MISMA TALLA
  const existing = cart.find(
    (i) => i.id === productId && i.size === selectedSize,
  );
  if (existing) {
    // Validar stock
    if (existing.qty + 1 > product.stock[selectedSize]) {
      showToast(`❌ Máximo stock alcanzado para talla ${selectedSize}`);
      return;
    }
    existing.qty++;
  } else {
    cart.push({
      ...product,
      qty: 1,
      size: selectedSize,
      cartId: productId + "_" + selectedSize,
    });
  }

  saveCart();
  renderCart();
  bumpCartCount();
  showToast(`✓ ${product.name} agregado al carrito`);
}

function removeFromCart(cartId) {
  cart = cart.filter((i) => i.cartId !== cartId);
  saveCart();
  renderCart();
}

function bumpCartCount() {
  DOM.cartCount.classList.add("bump");
  setTimeout(() => DOM.cartCount.classList.remove("bump"), 300);
}

function renderCart() {
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = cart.reduce((sum, i) => sum + i.qty, 0);

  DOM.cartCount.textContent = count;
  DOM.cartTotal.textContent = formatPrice(total);

  if (cart.length === 0) {
    DOM.cartItems.innerHTML = `
      <div class="cart-empty">
        <div class="empty-icon">🛒</div>
        <p>Tu carrito está vacío</p>
      </div>`;
    return;
  }

  DOM.cartItems.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item">
      <img
        src="${esc(item.img)}"
        alt="${esc(item.alt)}"
        class="cart-item-img"
        onerror="this.style.background='#252525'"
      />
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(item.name)}${item.qty > 1 ? ` <span style="color:var(--accent)">×${item.qty}</span>` : ""}</div>
        <div class="cart-item-size">Talla: ${item.size}</div>
        <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
      </div>
      <button
        class="cart-item-remove"
        onclick="removeFromCart('${item.cartId}')"
        aria-label="Eliminar ${esc(item.name)}"
      >×</button>
    </div>
  `,
    )
    .join("");
}

/* ══════════════════════════════════════════════════════════
   PAYMENT & CHECKOUT FLOW
══════════════════════════════════════════════════════════ */
const WHATSAPP_PHONE = "573166019030";

function openPaymentModal() {
  if (cart.length === 0) {
    showToast("🛒 El carrito está vacío");
    return;
  }

  // Reset payment data
  paymentData = {
    customer: { name: "", email: "", phone: "", address: "", city: "" },
    shipping: { method: "", carrier: "", cost: 0 },
    payment: { method: "" },
  };

  // Reset modal steps
  showPaymentStep(1);

  const overlay = document.getElementById("paymentModalOverlay");
  const modal = document.getElementById("paymentModal");

  overlay.classList.add("open");
  modal.classList.add("open");
}

function closePaymentModal() {
  document.getElementById("paymentModalOverlay").classList.remove("open");
  document.getElementById("paymentModal").classList.remove("open");
}

function showPaymentStep(stepId) {
  document
    .querySelectorAll(".payment-step")
    .forEach((s) => (s.style.display = "none"));
  const element = document.getElementById("paymentStep" + stepId);
  if (element) {
    element.style.display = "block";
  }
}

function continueToPaymentMethod() {
  // Validate customer form
  const name = document.getElementById("customerName").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const address = document.getElementById("customerAddress").value.trim();
  const city = document.getElementById("customerCity").value.trim();

  if (!name || !email || !phone || !address || !city) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("⚠️ Email inválido");
    return;
  }

  // Store customer data
  paymentData.customer = { name, email, phone, address, city };

  // Show shipping options (step 2)
  showPaymentStep("2");
  renderShippingOptions();
}

function renderShippingOptions() {
  const container = document.getElementById("shippingOptionsContainer");
  if (!container) {
    // Create container if doesn't exist
    const step2 = document.getElementById("paymentStep2");
    const html = `<div id="shippingOptionsContainer" style="display: flex; flex-direction: column; gap: 12px;"></div>`;
    step2.insertAdjacentHTML("beforeend", html);
  }

  const shippingContainer = document.getElementById("shippingOptionsContainer");

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  shippingContainer.innerHTML = SHIPPING_OPTIONS.map(
    (option) => `
    <div class="shipping-card" onclick="selectShippingMethod('${option.id}', ${option.cost})" 
         style="padding: 16px; border: 2px solid var(--border); border-radius: 6px; cursor: pointer; transition: all 0.3s; background: var(--dark); hover: opacity 0.9;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
        <div style="font-size: 32px; min-width: 40px;">${option.icon}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: white; font-size: 14px;">${option.name}</div>
          <div style="color: var(--gray-text); font-size: 12px; margin-top: 4px;">${option.carrier} • ${option.days}</div>
          <div style="color: var(--gray-text); font-size: 12px; margin-top: 6px;">${option.description}</div>
        </div>
        <div style="text-align: right; min-width: 120px;">
          <div style="font-weight: bold; color: var(--accent); font-size: 16px;">${option.cost === 0 ? "GRATIS" : formatPrice(option.cost)}</div>
          ${option.cost > 0 ? `<div style="color: var(--gray-text); font-size: 11px;">+ ${formatPrice(option.cost)}</div>` : '<div style="color: var(--accent); font-size: 11px;">Sin costo</div>'}
        </div>
      </div>
    </div>
  `,
  ).join("");
}

function selectShippingMethod(methodId, cost) {
  const option = SHIPPING_OPTIONS.find((o) => o.id === methodId);
  if (!option) return;

  // Store shipping data
  paymentData.shipping = {
    method: option.name,
    carrier: option.carrier,
    cost: cost,
  };

  // Update summary and move to payment methods
  updatePaymentSummary();
  showPaymentStep("2Payment");
  renderPaymentMethods();
}

function updatePaymentSummary() {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = paymentData.shipping.cost || 0;
  const total = subtotal + shipping;

  const summaryHtml = `
    <div style="background: var(--gray); padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span>Subtotal:</span>
        <span>${formatPrice(subtotal)}</span>
      </div>
      ${
        shipping > 0
          ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span>Envío (${paymentData.shipping.method}):</span>
          <span>${formatPrice(shipping)}</span>
        </div>
      `
          : ""
      }
      <div style="border-top: 1px solid var(--border); padding-top: 6px; display: flex; justify-content: space-between; font-weight: bold;">
        <span>Total:</span>
        <span style="color: var(--accent);">${formatPrice(total)}</span>
      </div>
    </div>
  `;

  const placeholder = document.getElementById("paymentSummary");
  if (placeholder) {
    placeholder.innerHTML = summaryHtml;
  }
}

function renderPaymentMethods() {
  const container = document.getElementById("checkoutPayMethods");
  const methods = [
    {
      name: "Tarjeta de Crédito",
      icon: "💳",
      color: "#3498db",
      bg: "rgba(52,152,219,0.12)",
      info: "Visa, Mastercard, Amex",
    },
    {
      name: "Nequi",
      icon: "📱",
      color: "#e91e8b",
      bg: "rgba(233,30,139,0.12)",
      info: "App bancaria móvil",
    },
    {
      name: "Daviplata",
      icon: "📱",
      color: "#ff6b00",
      bg: "rgba(255,107,0,0.12)",
      info: "Billetera W Davivienda",
    },
    {
      name: "Efectivo",
      icon: "💵",
      color: "#2ecc71",
      bg: "rgba(46,204,113,0.12)",
      info: "Contra entrega o en tienda",
    },
    {
      name: "PSE / Transferencia",
      icon: "🏦",
      color: "#1e90ff",
      bg: "rgba(30,144,255,0.12)",
      info: "Transferencia bancaria",
    },
  ];

  let html = "";

  // Add info banner
  html += `
    <div style="background: rgba(52,152,219,0.1); border-left: 3px solid #3498db; padding: 12px; border-radius: 4px; margin-bottom: 16px; font-size: 12px; color: var(--gray-text);">
      🔒 <strong>Pago Seguro:</strong> Tu información está protegida y encriptada. Serás redirigido a la plataforma de pago de tu banco.
    </div>
  `;

  // Add payment methods
  html += methods
    .map(
      (m) => `
    <div class="pm-card enabled" style="border: 2px solid ${m.color}33; background: ${m.bg}; padding: 16px; border-radius: 6px; cursor: pointer; transition: all 0.3s;" 
         onmouseover="this.style.borderColor='${m.color}'; this.style.opacity='0.9';"
         onmouseout="this.style.borderColor='${m.color}33'; this.style.opacity='1';"
         onclick="selectPaymentMethod('${m.name}')">
      <div style="display: flex; gap: 12px; align-items: center;">
        <span style="font-size: 32px;">${m.icon}</span>
        <div style="flex: 1;">
          <div class="pm-name" style="color: ${m.color}; font-weight: 600; font-size: 14px;">${m.name}</div>
          <div class="pm-status" style="color: var(--gray-text); font-size: 12px;">${m.info}</div>
        </div>
        <div style="color: ${m.color}; font-size: 20px;">→</div>
      </div>
    </div>
  `,
    )
    .join("");

  container.innerHTML = html;
}

async function selectPaymentMethod(methodName) {
  paymentData.payment.method = methodName;

  // Show loading
  showToast("⌛ Procesando pedido...");

  // Register the sale
  const success = await registerOnlineSale(methodName);

  if (success) {
    // Save sale ID for reference
    const saleId = "ON" + Date.now().toString(36).toUpperCase();
    localStorage.setItem("lastSaleId", saleId);

    // Store payment data for post-confirmation
    localStorage.setItem(
      "paymentData",
      JSON.stringify({
        method: methodName,
        customer: paymentData.customer,
        shipping: paymentData.shipping,
        timestamp: new Date().toISOString(),
      }),
    );

    // Redirect to payment gateway
    redirectToPaymentGateway(methodName);

    // Clear UI
    setTimeout(() => {
      cart = [];
      saveCart();
      renderCart();
      closePaymentModal();
      closeCart();
    }, 1000);
  } else {
    showToast("❌ Error al procesar el pedido. Intenta de nuevo.");
  }
}

function redirectToPaymentGateway(methodName) {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const total = subtotal + paymentData.shipping.cost;

  // Map display names to gateway keys
  const methodMap = {
    "Tarjeta de Crédito": "CARD",
    Nequi: "NEQUI",
    Daviplata: "DAVIPLATA",
    Efectivo: "CASH",
    "PSE / Transferencia": "PSE",
  };

  const gatewayKey = methodMap[methodName];
  const gateway = PAYMENT_GATEWAYS[gatewayKey];

  if (!gateway) {
    showToast("❌ Método de pago no reconocido");
    return;
  }

  // Build payment parameters
  const paymentParams = {
    amount: total,
    currency: "COP",
    customer: {
      name: paymentData.customer.name,
      email: paymentData.customer.email,
      phone: paymentData.customer.phone,
    },
    reference: "ON" + Date.now().toString(36).toUpperCase(),
    description: `Compra Winner - ${paymentData.customer.name}`,
    returnUrl: `${window.location.origin}?payment=success`,
    cancelUrl: `${window.location.origin}?payment=cancel`,
  };

  // Handle different payment methods
  switch (gatewayKey) {
    case "NEQUI":
      handleNequiPayment(paymentParams);
      break;
    case "DAVIPLATA":
      handleDaviplataPayment(paymentParams);
      break;
    case "PSE":
      handlePSEPayment(paymentParams);
      break;
    case "CARD":
      handleCardPayment(paymentParams);
      break;
    case "CASH":
      handleCashPayment(paymentParams);
      break;
    default:
      showToast("⚠️ Método no disponible");
  }
}

function handleNequiPayment(params) {
  // Enviar por WhatsApp con link de pago
  const message = `Hola, para confirmar tu compra de $${formatPrice(params.amount)}, por favor accede a: ${window.location.origin}/pagar?ref=${params.reference}`;
  const whatsappUrl = `https://wa.me/+573166019030?text=${encodeURIComponent(message)}`;

  showToast("📱 Abriendo WhatsApp para confirmar pago...");
  setTimeout(() => {
    window.open(whatsappUrl, "_blank");
  }, 500);
}

function handleDaviplataPayment(params) {
  // Enviar por WhatsApp con instrucciones
  const message = `Hola, para pagar tu compra de $${formatPrice(params.amount)} con Daviplata, por favor responde este mensaje. Te enviaremos las instrucciones.`;
  const whatsappUrl = `https://wa.me/+573166019030?text=${encodeURIComponent(message)}`;

  showToast("📱 Abriendo WhatsApp para instrucciones...");
  setTimeout(() => {
    window.open(whatsappUrl, "_blank");
  }, 500);
}

function handlePSEPayment(params) {
  // Redirigir a PSE
  const pseUrl = buildPSEUrl(params);

  showToast("🏦 Redirigiendo a PSE...");
  setTimeout(() => {
    window.location.href = pseUrl;
  }, 800);
}

function handleCardPayment(params) {
  // Redirigir a Wompi o similar
  const wompiUrl = buildWompiUrl(params);

  showToast("💳 Redirigiendo a plataforma de pago...");
  setTimeout(() => {
    window.location.href = wompiUrl;
  }, 800);
}

function handleCashPayment(params) {
  // Mostrar instrucciones y contacto
  const instructions = `
    ✅ Tu pedido ha sido registrado.
    
    💵 PAGO EN EFECTIVO
    
    📦 Envío seleccionado: ${paymentData.shipping.method}
    💸 Total: ${formatPrice(params.amount)}
    
    📱 Te contactaremos al: ${paymentData.customer.phone}
    📧 Confirmación enviada a: ${paymentData.customer.email}
    
    Options:
    ▪ Pagar contra entrega
    ▪ Pagar en tienda al recoger
    
    WhatsApp de soporte: https://wa.me/+573166019030
  `;

  showToast("💵 Instrucciones enviadas a tu email y WhatsApp");

  // Enviar por WhatsApp
  const whatsappUrl = `https://wa.me/+573166019030?text=${encodeURIComponent(`Hola, realizé una compra de $${formatPrice(params.amount)} para pagar en efectivo. Mi referencia es ${params.reference}`)}`;
  setTimeout(() => {
    window.open(whatsappUrl, "_blank");
  }, 500);
}

function buildPSEUrl(params) {
  // URL base de PSE (requiere integración real con tu proveedor)
  const pseBaseUrl = "https://www.pagofacil.com.co/checkout";
  const pseParams = new URLSearchParams({
    amount: params.amount,
    currency: params.currency,
    reference: params.reference,
    description: params.description,
    name: params.customer.name,
    email: params.customer.email,
    phone: params.customer.phone,
    returnUrl: params.returnUrl,
    cancelUrl: params.cancelUrl,
  });

  return `${pseBaseUrl}?${pseParams.toString()}`;
}

function buildWompiUrl(params) {
  // URL de Wompi para checkout (requiere integración real)
  const wompiBaseUrl = "https://checkout.wompi.co";
  const wompiParams = new URLSearchParams({
    "public-key": "YOUR_WOMPI_PUBLIC_KEY", // Reemplazar con tu key real
    reference: params.reference,
    currency: params.currency,
    amount_in_cents: params.amount * 100,
    customer_email: params.customer.email,
    customer_data: JSON.stringify({
      name: params.customer.name,
      phone_number: params.customer.phone,
      email: params.customer.email,
    }),
  });

  return `${wompiBaseUrl}?${wompiParams.toString()}`;
}

function formatCardNumber(input) {
  let value = input.value.replace(/\s/g, "");
  let formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ");
  input.value = formatted;
}

function formatExpiry(input) {
  let value = input.value.replace(/\D/g, "");
  if (value.length >= 2) {
    value = value.slice(0, 2) + "/" + value.slice(2, 4);
  }
  input.value = value;
}

function formatCVV(input) {
  input.value = input.value.replace(/\D/g, "").slice(0, 4);
}

function formatPhone(input) {
  let value = input.value.replace(/\D/g, "");
  if (value.length > 0) {
    value =
      "+57 " + value.slice(-10).replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  }
  input.value = value;
}

function backToPaymentMethod() {
  showPaymentStep("2Payment");
}

function processPayment() {
  const form = document.getElementById("cardForm");
  if (!form.checkValidity()) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }
  selectPaymentMethod(paymentData.payment.method);
}

function processPaymentPSE() {
  const form = document.getElementById("pseForm");
  if (!form.checkValidity()) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }
  selectPaymentMethod(paymentData.payment.method);
}

function processPaymentNequi() {
  const form = document.getElementById("nequiForm");
  if (!form.checkValidity()) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }
  selectPaymentMethod(paymentData.payment.method);
}

function processPaymentDaviplata() {
  const form = document.getElementById("daviplataForm");
  if (!form.checkValidity()) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }
  selectPaymentMethod(paymentData.payment.method);
}

function processPaymentCash() {
  const form = document.getElementById("cashForm");
  if (!form.checkValidity()) {
    showToast("⚠️ Por favor completa todos los campos");
    return;
  }
  selectPaymentMethod(paymentData.payment.method);
}

function updateCashFields() {
  const option = document.getElementById("cashDeliveryOption").value;
  const info = document.getElementById("cashDeliveryInfo");

  if (option === "delivery") {
    info.innerHTML =
      "ℹ️ Pagarás contra entrega, el repartidor llegará a tu domicilio";
  } else if (option === "pickup") {
    info.innerHTML =
      "ℹ️ Retira tu pedido en nuestro local y verifica antes de pagar";
  } else {
    info.innerHTML = "ℹ️ Selecciona una opción para continuar";
  }
}

// Global hook for the button in HTML
window.checkoutWhatsApp = openPaymentModal;

/* ══════════════════════════════════════════════════════════
   PRODUCTS
══════════════════════════════════════════════════════════ */
function renderProducts(filter) {
  const list =
    filter === "all"
      ? PRODUCTS
      : filter === "sale"
        ? PRODUCTS.filter((p) => p.oldPrice)
        : PRODUCTS.filter((p) => p.cat === filter);

  if (list.length === 0) {
    DOM.productsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--gray-text);font-size:14px;letter-spacing:1px;">
        No hay productos en esta categoría.
      </div>`;
    return;
  }

  DOM.productsGrid.innerHTML = list
    .map(
      (p, i) => `
    <div class="product-card reveal" style="transition-delay:${i * 0.07}s">
      <div class="product-img-wrap">
        <img
          src="${esc(p.img)}"
          alt="${esc(p.alt)}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80'"
        />
        <div class="product-overlay" style="display:flex; flex-direction:column; justify-content:flex-end;">
          <div class="size-selector" data-product="${p.id}" style="display:flex; justify-content:center; gap:5px; margin-bottom:15px;">
            ${Object.keys(p.stock || {})
              .map((size, idx) => {
                const qty = p.stock[size];
                const isFirstAvail =
                  qty > 0 &&
                  Object.keys(p.stock)
                    .slice(0, idx)
                    .every((s) => p.stock[s] === 0);
                return `<button class="size-btn ${qty === 0 ? "disabled" : ""} ${isFirstAvail ? "active" : ""}" data-size="${size}" ${qty === 0 ? "disabled" : ""} style="width:30px; height:30px; border-radius:4px; font-weight:bold; font-size:12px; background: ${qty === 0 ? "#333" : "var(--dark)"}; color: ${qty === 0 ? "#666" : "var(--text)"}; border: 1px solid var(--border); cursor: ${qty === 0 ? "not-allowed" : "pointer"};" onclick="if(this.disabled) return; this.closest('.size-selector').querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active')); this.classList.add('active');">${size}</button>`;
              })
              .join("")}
          </div>
          <button
            class="add-to-cart-btn"
            onclick="addToCart('${p.id}')"
            aria-label="Agregar ${esc(p.name)} al carrito"
          >+ AGREGAR</button>
        </div>
        ${p.badge ? `<div class="product-badge badge-${p.badgeType}">${esc(p.badge)}</div>` : p.oldPrice ? `<div class="product-badge badge-sale">OFERTA</div>` : ""}
        <button
          class="wishlist-btn"
          onclick="showToast('💛 Guardado en favoritos')"
          aria-label="Guardar en favoritos"
        >♡</button>
      </div>
      <div class="product-cat">${esc(p.cat)}</div>
      <div class="product-name">${esc(p.name)}</div>
      <div class="product-pricing">
        <span class="product-price">${formatPrice(p.price)}</span>
        ${p.oldPrice ? `<span class="product-price-old">${formatPrice(p.oldPrice)}</span>` : ""}
      </div>
    </div>
  `,
    )
    .join("");

  // Re-observe new cards for reveal animation
  observeRevealElements();
  injectProductJsonLd(PRODUCTS);
}

function buildProductUrl(productId) {
  const url = new URL(window.location.origin);
  url.pathname = "/";
  url.searchParams.set("product", productId);
  url.hash = "productos";
  return url.href;
}

function buildProductSchema(products) {
  const listItems = products.map((product, index) => {
    const metadata = product.metadata || {};
    const hasStock = Object.values(product.stock || {}).some((qty) => qty > 0);
    const priceValue = Number(product.price || 0).toFixed(2);
    const color =
      metadata.color &&
      metadata.color
        .split(/[\/,]/)
        .map((c) => c.trim())
        .filter(Boolean)[0];
    const sizes =
      metadata.size
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [];

    return {
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        sku: product.id,
        mpn: metadata.mpn,
        gtin13: metadata.gtin,
        name: product.name,
        description:
          metadata.productType && metadata.productType !== product.cat
            ? `${product.name} · ${metadata.productType} by Winner.`
            : `Ropa urbana Winner inspirada en el streetwear colombiano con ${product.name}`,
        brand: {
          "@type": "Brand",
          name: metadata.brand || "Winner",
        },
        image: product.img,
        color,
        size: sizes.length ? sizes : undefined,
        category: metadata.productType || product.cat,
        material: metadata.material,
        pattern: metadata.pattern,
        offers: {
          "@type": "Offer",
          url: buildProductUrl(product.id),
          priceCurrency: "COP",
          price: priceValue,
          availability: hasStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          shippingWeight: metadata.shippingWeight,
        },
      },
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: listItems,
  };
}

function injectProductJsonLd(products) {
  if (!products.length) return;
  const scriptId = "product-json-ld";
  let script = document.getElementById(scriptId);
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = scriptId;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(buildProductSchema(products), null, 2);
}

/* ── FILTER BUTTONS ─────────────────────────────────────── */
DOM.filterBar.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;

  activeFilter = btn.dataset.filter;
  DOM.filterBar
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderProducts(activeFilter);
});

/* External trigger from categories section */
function filterByCategory(cat) {
  activeFilter = cat;
  DOM.filterBar.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === cat);
  });
  renderProducts(cat);
  document.getElementById("productos").scrollIntoView({ behavior: "smooth" });
}

/* ══════════════════════════════════════════════════════════
   FEATURED CTA BUTTONS
══════════════════════════════════════════════════════════ */
document.querySelectorAll(".featured-cta").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.id;
    // For featured item we'll try to get an active size or let addToCart pick the first available
    addToCart(id);
  });
});

// Event listener for size-btn active state update for custom styles
document.body.addEventListener("click", (e) => {
  if (e.target.classList.contains("size-btn") && !e.target.disabled) {
    const group = e.target.closest(".size-selector");
    if (group) {
      group.querySelectorAll(".size-btn").forEach((b) => {
        b.style.background = "var(--dark)";
        b.style.borderColor = "var(--border)";
        b.style.color = "var(--text)";
      });
      e.target.style.background = "var(--accent)";
      e.target.style.color = "#000";
    }
  }
});

/* ══════════════════════════════════════════════════════════
   PROMO CODE COPY
══════════════════════════════════════════════════════════ */
function copyCode() {
  const code = DOM.promoCode.textContent.trim();
  navigator.clipboard
    .writeText(code)
    .then(() => showToast(`📋 Código "${code}" copiado`))
    .catch(() => showToast(`Código: ${code}`));
}

DOM.promoCode && DOM.promoCode.addEventListener("click", copyCode);

/* ══════════════════════════════════════════════════════════
   NEWSLETTER
══════════════════════════════════════════════════════════ */
DOM.newsletterForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = DOM.newsletterForm.querySelector("input");
  showToast("🎉 ¡Bienvenido a la comunidad Winner!");
  input.value = "";
});

/* ══════════════════════════════════════════════════════════
   SCROLL REVEAL (IntersectionObserver)
══════════════════════════════════════════════════════════ */
let revealObserver;

function observeRevealElements() {
  if (revealObserver) revealObserver.disconnect();

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
  );

  document.querySelectorAll(".reveal").forEach((el) => {
    revealObserver.observe(el);
  });
}

/* ══════════════════════════════════════════════════════════
   ANIMATED COUNTER (hero stats)
══════════════════════════════════════════════════════════ */
function animateCounter(el, target, suffix = "", duration = 1800) {
  let start = 0;
  const increment = target / (duration / 16);
  const isFloat = String(target).includes(".");

  function step() {
    start += increment;
    if (start >= target) {
      el.textContent =
        (isFloat
          ? target.toFixed(1)
          : Math.floor(target).toLocaleString("es-CO")) + suffix;
      return;
    }
    el.textContent =
      (isFloat ? start.toFixed(1) : Math.floor(start).toLocaleString("es-CO")) +
      suffix;
    requestAnimationFrame(step);
  }
  step();
}

function initHeroCounters() {
  const statNums = document.querySelectorAll(".stat-num");

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const text = el.textContent.trim();

          if (text.includes("2K+")) {
            el.textContent = "0";
            animateCounter(el, 2, "K+");
          } else if (text.includes("150+")) {
            el.textContent = "0";
            animateCounter(el, 150, "+");
          } else if (text.includes("4.9★")) {
            el.textContent = "0★";
            animateCounter(el, 4.9, "★");
          }

          counterObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.5 },
  );

  statNums.forEach((el) => counterObserver.observe(el));
}

/* ══════════════════════════════════════════════════════════
   UTILITY
══════════════════════════════════════════════════════════ */
/* formatPrice está definido al inicio del archivo */
/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
(function init() {
  fetchProducts();
  renderCart();
  observeRevealElements();
  initHeroCounters();
})();
