/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   WINNER STORE â€” app.js
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€ API CONFIG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const API_URL = (() => {
  // Permite inyectar una URL custom (ej: deploy) antes de cargar este script.
  if (typeof window.API_URL === "string" && window.API_URL.trim()) {
    return window.API_URL.replace(/\/$/, "");
  }
  // Si se abre el HTML desde archivo local, asumimos backend local.
  const origin = window.location.origin.startsWith("file:")
    ? "http://localhost:3000"
    : window.location.origin;
  return `${origin.replace(/\/$/, "")}/api`;
})();
window.API_URL = API_URL;

// API key puede venir inyectada o caer al valor de desarrollo.
const API_KEY =
  window.API_KEY || localStorage.getItem("w_api_key") || "dev-api-key";
const API_HEADERS = { "x-api-key": API_KEY };

const apiFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), ...API_HEADERS },
  });

/* â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let PRODUCTS = [];
let cart = loadCart();
let activeFilter = "all";

async function fetchProducts() {
  try {
    console.log(`ðŸ”„ Fetching from: ${API_URL}/products`);
    console.log(`ðŸ”‘ API Key: ${API_KEY}`);
    const res = await apiFetch(`${API_URL}/products`);
    console.log(`âœ… Response status: ${res.status}`);
    
    // Validar que la respuesta fue exitosa
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: res.statusText }));
      console.error(`âŒ API Error ${res.status}:`, errorData);
      showToast(`âŒ Error del servidor: ${errorData.error || res.statusText}`);
      return;
    }
    
    PRODUCTS = await res.json();
    
    // Validar que PRODUCTS es un array
    if (!Array.isArray(PRODUCTS)) {
      console.error("âŒ API returned non-array response:", PRODUCTS);
      showToast("âŒ Respuesta invÃ¡lida del servidor");
      return;
    }
    
    console.log(`ðŸ“¦ Products loaded: ${PRODUCTS.length}`, PRODUCTS.slice(0, 2));
    renderProducts(activeFilter);
  } catch (err) {
    console.error("âŒ Error fetching products:", err);
    showToast("âŒ Error al conectar con el servidor");
  }
}

async function registerOnlineSale(method) {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCost = (window.shippingData?.cost || 0);
  const total = subtotal + shippingCost;
  
  const saleData = {
    id: "ON" + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    vendor: "Tienda Online",
    client: "Cliente Web",
    method: method,
    channel: "online",
    subtotal: subtotal,
    discount: 0,
    total: total,
    items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, size: i.size || 'M' })),
  };

  try {
    console.log('ðŸ“¤ Guardando venta online:', saleData);
    const res = await apiFetch(`${API_URL}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleData),
    });
    
    const responseText = await res.text();
    console.log(`ðŸ“¥ Respuesta (${res.status}):`, responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("âŒ Error parsing response:", responseText);
      return false;
    }
    
    if (result.success) {
      console.log('âœ… Venta registrada en admin:', result.id);
      
      // âœ¨ AHORA: Crear ORDER con datos de logÃ­stica
      if (window.shippingData) {
        try {
          const orderData = {
            sale_id: result.id,
            customer_email: window.shippingData.phone, // Use phone as identifier (could be email)
            customer_phone: window.shippingData.phone,
            shipping_address: `${window.shippingData.address}, ${window.shippingData.city}`,
            shipping_method: window.shippingData.method,
            shipping_cost: window.shippingData.cost,
            order_status: "pending",
          };
          
          const orderRes = await apiFetch(`${API_URL}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData),
          });
          
          const orderResult = await orderRes.json();
          if (orderResult.success) {
            console.log('âœ… Order logÃ­stico registrado:', orderResult.id);
          } else {
            console.warn('âš ï¸ Order logÃ­stico no registrado:', orderResult.error);
          }
        } catch (orderErr) {
          console.error("âŒ Error creating order:", orderErr);
          // No return false - la venta ya se guardÃ³
        }
      }
      
      return true;
    } else {
      console.error('âš ï¸ Server returned error:', result.error);
      return false;
    }
  } catch (err) {
    console.error("âŒ Error saving sale:", err);
    return false;
  }
}

/* â”€â”€ DOM REFS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function initDOM() {
  return {
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
}

let DOM = initDOM();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CART PERSISTENCE (localStorage)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function saveCart() {
  try {
    if (!Array.isArray(cart)) {
      console.warn("⚠️  cart is not an array");
      return;
    }
    localStorage.setItem("winner_cart", JSON.stringify(cart));
  } catch (err) {
    console.error("❌ Error saving cart:", err);
  }
}

function loadCart() {
  try {
    const data = localStorage.getItem("winner_cart");
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("⚠️  Error loading cart, resetting:", err);
    localStorage.removeItem("winner_cart");
    return [];
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CURSOR â€” hides automatically on touch devices via CSS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MOBILE MENU
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function toggleMobileMenu() {
  DOM.navLinks.classList.toggle("mobile-open");
  DOM.menuBtn.classList.toggle("active");
  document.body.style.overflow = DOM.navLinks.classList.contains("mobile-open")
    ? "hidden"
    : "";
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CART
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

// Agregar listeners de forma segura (se llamarÃ¡ desde init)
function attachEventListeners() {
  // Cart listeners
  if (DOM?.cartToggle) DOM.cartToggle.addEventListener("click", openCart);
  if (DOM?.cartClose) DOM.cartClose.addEventListener("click", closeCart);
  if (DOM?.cartOverlay) DOM.cartOverlay.addEventListener("click", closeCart);
  
  // Mobile menu listeners
  if (DOM?.navLinks) {
    DOM.navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        DOM.navLinks.classList.remove("mobile-open");
        if (DOM?.menuBtn) DOM.menuBtn.classList.remove("active");
        document.body.style.overflow = "";
      });
    });
  }
  
  // Navbar scroll effect
  if (DOM?.navbar) {
    window.addEventListener(
      "scroll",
      () => {
        DOM.navbar.classList.toggle("scrolled", window.scrollY > 60);
      },
      { passive: true },
    );
  }
  
  // Filter bar listeners
  if (DOM?.filterBar) {
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
  }
  
  // Newsletter form
  if (DOM?.newsletterForm) {
    DOM.newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = DOM.newsletterForm.querySelector("input");
      showToast("ðŸŽ‰ Â¡Bienvenido a la comunidad Winner!");
      input.value = "";
    });
  }
  
  // Promo code click
  if (DOM?.promoCode) {
    DOM.promoCode.addEventListener("click", copyCode);
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TOAST
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
let toastTimer = null;

function showToast(msg){
  if (!DOM?.toastMsg || !DOM?.toast) return;
  DOM.toastMsg.textContent = msg;
  DOM.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => DOM.toast.classList.remove("show"), 2800);
}

// Close with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCart();
    // Also close mobile menu
    if (DOM?.navLinks) DOM.navLinks.classList.remove("mobile-open");
    if (DOM?.menuBtn) DOM.menuBtn.classList.remove("active");
    document.body.style.overflow = "";
  }
});

function addToCart(productId, sizeId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  // Encontrar quÃ© talla seleccionÃ³ el usuario si no se pasÃ³ por argumento.
  let selectedSize = sizeId;
  if (!selectedSize) {
    const selector = document.querySelector(
      `.size-selector[data-product="${productId}"] .size-btn.active`,
    );
    if (selector) selectedSize = selector.dataset.size;
  }

  // Si aÃºn no hay talla seleccionada, mostramos un error UI o seleccionamos la primera con stock
  if (!selectedSize) {
    const availableSizes = Object.keys(product.stock).filter(
      (s) => product.stock[s] > 0,
    );
    if (availableSizes.length > 0) {
      selectedSize = availableSizes[0];
    } else {
      showToast(`âŒ ${product.name} estÃ¡ agotado`);
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
      showToast(`âŒ MÃ¡ximo stock alcanzado para talla ${selectedSize}`);
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
  showToast(`âœ“ ${product.name} agregado al carrito`);
}

function removeFromCart(cartId) {
  if (!cartId || !Array.isArray(cart)) {
    console.warn("⚠️  Invalid cartId or cart not initialized");
    return;
  }
  cart = cart.filter((i) => i.cartId && i.cartId !== cartId);
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
        <div class="empty-icon">ðŸ›’</div>
        <p>Tu carrito estÃ¡ vacÃ­o</p>
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
        <div class="cart-item-name">${esc(item.name)}${item.qty > 1 ? ` <span style="color:var(--accent)">Ã—${item.qty}</span>` : ""}</div>
        <div class="cart-item-size">Talla: ${item.size}</div>
        <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
      </div>
      <button
        class="cart-item-remove"
        onclick="removeFromCart('${item.cartId}')"
        aria-label="Eliminar ${esc(item.name)}"
      >Ã—</button>
    </div>
  `,
    )
    .join("");
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   WHATSAPP CHECKOUT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PAYMENT & CHECKOUT FLOW
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const WHATSAPP_PHONE = "573166019030";

function openPaymentModal() {
  if (cart.length === 0) {
    showToast("ðŸ›’ El carrito estÃ¡ vacÃ­o");
    return;
  }
  const overlay = document.getElementById("paymentModalOverlay");
  const modal = document.getElementById("paymentModal");
  
  // Reset to step 1
  showPaymentStep(1);

  overlay.classList.add("open");
  modal.classList.add("open");
}

function showPaymentStep(step) {
  // Hide all steps
  document.getElementById("paymentStep1").style.display = "none";
  document.getElementById("paymentStep2").style.display = "none";
  document.getElementById("paymentStep3").style.display = "none";
  
  // Show selected step
  document.getElementById("paymentStep" + step).style.display = "block";
  
  // Update title
  const titles = {
    1: "Tus Datos de Contacto",
    2: "Selecciona tu MÃ©todo de Pago",
    3: "Datos de tu Tarjeta"
  };
  document.getElementById("paymentTitle").textContent = titles[step];
}

function continueToPaymentMethod() {
  // Validate customer form
  const name = document.getElementById("customerName").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const address = document.getElementById("customerAddress").value.trim();
  const city = document.getElementById("customerCity").value.trim();
  
  if (!name || !email || !phone || !address || !city) {
    showToast("âš ï¸ Por favor completa todos los campos");
    return;
  }
  
  if (!email.includes("@")) {
    showToast("âš ï¸ Email invÃ¡lido");
    return;
  }
  
  if (!phone.match(/\d{10,}/)) {
    showToast("âš ï¸ TelÃ©fono debe tener al menos 10 dÃ­gitos");
    return;
  }
  
  // Store customer data
  window.customerData = { name, email, phone, address, city };
  
  // Render payment methods
  const methods = [
    {
      name: "Tarjeta CrÃ©dito/DÃ©bito",
      icon: "ðŸ’³",
      color: "#3498db",
      bg: "rgba(52,152,219,0.12)",
      id: "card"
    },
    {
      name: "Nequi",
      icon: "ðŸ“±",
      color: "#e91e8b",
      bg: "rgba(233,30,139,0.12)",
      id: "nequi"
    },
    {
      name: "Daviplata",
      icon: "ðŸ“±",
      color: "#ff6b00",
      bg: "rgba(255,107,0,0.12)",
      id: "daviplata"
    },
    {
      name: "PSE / Transferencia",
      icon: "ðŸ¦",
      color: "#1e90ff",
      bg: "rgba(30,144,255,0.12)",
      id: "pse"
    },
    {
      name: "Efectivo",
      icon: "ðŸ’µ",
      color: "#2ecc71",
      bg: "rgba(46,204,113,0.12)",
      id: "cash"
    },
  ];

  const container = document.getElementById("checkoutPayMethods");
  container.innerHTML = methods
    .map(
      (m) => `
    <div class="pm-card enabled" style="border-color:${m.color}55; background:${m.bg}" onclick="selectPaymentMethod('${m.id}')">
      <span class="pm-icon" style="background:${m.bg}; color:${m.color}">${m.icon}</span>
      <div class="pm-info">
        <div class="pm-name" style="color:${m.color}">${m.name}</div>
        <div class="pm-status">âœ“ Seleccionar</div>
      </div>
    </div>
  `,
    )
    .join("");

  showPaymentStep(2);
}

function selectPaymentMethod(methodId) {
  window.selectedPaymentMethod = methodId;
  
  // Hide all steps
  document.getElementById("paymentStep1").style.display = "none";
  document.getElementById("paymentStep2").style.display = "none";
  
  // Hide all payment forms
  document.getElementById("paymentStep3").style.display = "none";
  document.getElementById("paymentStep3PSE").style.display = "none";
  document.getElementById("paymentStep3Nequi").style.display = "none";
  document.getElementById("paymentStep3Daviplata").style.display = "none";
  document.getElementById("paymentStep3Cash").style.display = "none";
  
  // Show the appropriate form
  if (methodId === "card") {
    document.getElementById("paymentStep3").style.display = "block";
    document.getElementById("paymentTitle").textContent = "Datos de tu Tarjeta de CrÃ©dito/DÃ©bito";
  } else if (methodId === "pse") {
    document.getElementById("paymentStep3PSE").style.display = "block";
    document.getElementById("paymentTitle").textContent = "PSE / Transferencia Bancaria";
  } else if (methodId === "nequi") {
    document.getElementById("paymentStep3Nequi").style.display = "block";
    document.getElementById("paymentTitle").textContent = "Pago por Nequi";
  } else if (methodId === "daviplata") {
    document.getElementById("paymentStep3Daviplata").style.display = "block";
    document.getElementById("paymentTitle").textContent = "Pago por Daviplata";
  } else if (methodId === "cash") {
    document.getElementById("paymentStep3Cash").style.display = "block";
    document.getElementById("paymentTitle").textContent = "Pago en Efectivo";
  }
  
  // Update modal content height
  document.querySelector(".modal-body").style.maxHeight = "600px";
}

function backToPaymentMethod() {
  showPaymentStep(2);
}

function formatCardNumber(input) {
  let value = input.value.replace(/\s/g, "");
  let formatted = value.match(/.{1,4}/g)?.join(" ") || value;
  input.value = formatted;
  
  // Detect card brand
  const cardNumber = value;
  const brandInfo = document.getElementById("cardBrandInfo");
  const brand = guessCardBrand(cardNumber);
  
  if (brand !== "UNKNOWN") {
    brandInfo.textContent = `âœ“ ${brand}`;
    brandInfo.style.color = "#27ae60";
  } else if (cardNumber.length >= 4) {
    brandInfo.textContent = "â“ Marca no reconocida";
    brandInfo.style.color = "#e74c3c";
  } else {
    brandInfo.textContent = "";
  }
}

function formatExpiry(input) {
  let value = input.value.replace(/\D/g, "");
  if (value.length >= 2) {
    value = value.slice(0, 2) + "/" + value.slice(2, 4);
  }
  input.value = value;
}

function formatCVV(input) {
  input.value = input.value.replace(/\D/g, "");
}

function formatPhone(input) {
  let value = input.value.replace(/\D/g, "");
  
  // Ensure it starts with 57 (Colombia country code) or starts with 3
  if (!value.startsWith("573") && !value.startsWith("57") && value.startsWith("3")) {
    value = "57" + value;
  } else if (!value.startsWith("57") && value.startsWith("3")) {
    value = "57" + value;
  }
  
  // Format as: +57 3XX XXX XXXX
  if (value.includes("57")) {
    let cleaned = value.substring(2);
    if (cleaned.length >= 10) {
      input.value = "+57 " + cleaned.substring(0, 1) + "XX XXX XXXX";
    } else {
      input.value = "+57 " + cleaned;
    }
  } else {
    input.value = value;
  }
}

function updateCashFields() {
  const option = document.getElementById("cashDeliveryOption").value;
  const infoDiv = document.getElementById("cashDeliveryInfo");
  
  if (option === "delivery") {
    infoDiv.innerHTML = "ðŸ“¦ <strong>Pago Contra Entrega:</strong> Paga en efectivo cuando arrives el producto a tu domicilio.";
    infoDiv.style.background = "rgba(46,204,113,0.1)";
    infoDiv.style.borderLeftColor = "#2ecc71";
  } else if (option === "pickup") {
    infoDiv.innerHTML = "ðŸª <strong>Recogida en Tienda:</strong> Paga en efectivo cuando retires el producto en nuestra tienda fÃ­sica.";
    infoDiv.style.background = "rgba(241,196,15,0.1)";
    infoDiv.style.borderLeftColor = "#f39c12";
  }
}

async function processPayment() {
  // Validate card form
  const cardNumber = document.getElementById("cardNumber").value.replace(/\s/g, "");
  const cardExpiry = document.getElementById("cardExpiry").value;
  const cardCVV = document.getElementById("cardCVV").value;
  const cardName = document.getElementById("cardName").value.trim().toUpperCase();
  const cardDocNumber = document.getElementById("cardDocNumber").value.trim();
  
  // Validations
  if (!cardNumber || cardNumber.length < 13) {
    showToast("âš ï¸ NÃºmero de tarjeta invÃ¡lido");
    return;
  }
  
  if (!cardExpiry.match(/\d{2}\/\d{2}/)) {
    showToast("âš ï¸ Vencimiento invÃ¡lido (formato MM/YY)");
    return;
  }
  
  if (!cardCVV || cardCVV.length < 3) {
    showToast("âš ï¸ CVV invÃ¡lido (3-4 dÃ­gitos)");
    return;
  }
  
  if (!cardName || cardName.length < 5) {
    showToast("âš ï¸ Nombre en tarjeta invÃ¡lido");
    return;
  }
  
  if (!cardDocNumber || cardDocNumber.length < 8) {
    showToast("âš ï¸ NÃºmero de documento invÃ¡lido");
    return;
  }
  
  // Validate expiry date
  const [month, year] = cardExpiry.split("/");
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  
  if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
    showToast("âš ï¸ Tarjeta vencida");
    return;
  }
  
  // Process payment
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCost = (window.shippingData?.cost || 0);
  const total = subtotal + shippingCost;
  
  const paymentData = {
    id: "PAY" + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    customer: window.customerData,
    method: "card",
    methodName: "Tarjeta CrÃ©dito/DÃ©bito",
    methodDetails: {
      cardNumber: "**** **** **** " + cardNumber.slice(-4),
      cardName: cardName,
      cardBrand: guessCardBrand(cardNumber),
      documentNumber: cardDocNumber
    },
    subtotal: subtotal,
    shipping: shippingCost,
    total: total,
    items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, size: i.size || 'M' })),
    status: "pending_verification",
    shipping_address: window.shippingData?.neighborhood || window.customerData.address,
    reference: "WIN-ORDER-" + Date.now().toString(36).toUpperCase()
  };
  
  try {
    showToast("â³ Procesando tarjeta...");
    
    const res = await apiFetch(`${API_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData)
    });
    
    const result = await res.json();
    
    if (res.ok) {
      showToast("âœ… Â¡Tarjeta validada exitosamente!");
      
      // Clear cart
      cart = [];
      saveCart();
      renderCart();
      
      // Close modal
      closePaymentModal();
      
      // Show success message
      setTimeout(() => {
        alert(`âœ… Â¡PAGO PROCESADO CORRECTAMENTE!\n\nReferencia: ${paymentData.reference}\nMÃ©todo: Tarjeta ${paymentData.methodDetails.cardBrand}\nTotal: $${total.toLocaleString("es-CO")}\n\nâœ“ RecibirÃ¡s confirmaciÃ³n por WhatsApp a ${window.customerData.phone}\nâœ“ La entrega se coordina segÃºn tu direcciÃ³n registrada`);
      }, 500);
    } else {
      showToast("âŒ Error: " + (result.error || "Error desconocido"));
    }
  } catch (err) {
    console.error("Payment error:", err);
    showToast("âŒ Error en el procesamiento: " + err.message);
  }
}

async function processPaymentPSE() {
  // Validate PSE form
  const bank = document.getElementById("pseBank").value.trim();
  const docType = document.getElementById("pseDocType").value.trim();
  const docNumber = document.getElementById("pseDocNumber").value.trim();
  
  if (!bank) {
    showToast("âš ï¸ Selecciona un banco");
    return;
  }
  
  if (!docType) {
    showToast("âš ï¸ Selecciona tipo de documento");
    return;
  }
  
  if (!docNumber || docNumber.length < 8) {
    showToast("âš ï¸ NÃºmero de documento invÃ¡lido");
    return;
  }
  
  // Process payment
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCost = (window.shippingData?.cost || 0);
  const total = subtotal + shippingCost;
  
  const paymentData = {
    id: "PAY" + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    customer: window.customerData,
    method: "pse",
    methodName: "PSE / Transferencia Bancaria",
    methodDetails: {
      bank: bank,
      documentType: docType,
      documentNumber: docNumber
    },
    subtotal: subtotal,
    shipping: shippingCost,
    total: total,
    items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, size: i.size || 'M' })),
    status: "waiting_confirmation",
    shipping_address: window.shippingData?.neighborhood || window.customerData.address,
    reference: "WIN-ORDER-" + Date.now().toString(36).toUpperCase()
  };
  
  try {
    showToast("â³ Registrando pago PSE...");
    
    const res = await apiFetch(`${API_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData)
    });
    
    const result = await res.json();
    
    if (res.ok) {
      showToast("âœ… Solicitado enviado correctamente!");
      
      cart = [];
      saveCart();
      renderCart();
      closePaymentModal();
      
      setTimeout(() => {
        alert(`âœ… Â¡SOLICITUD DE PAGO REGISTRADA!\n\nReferencia: ${paymentData.reference}\nMÃ©todo: PSE / ${bank.charAt(0).toUpperCase() + bank.slice(1)}\nTotal: $${total.toLocaleString("es-CO")}\n\nðŸ“± Te enviaremos por WhatsApp:\nâ€¢ Enlace PSE seguro\nâ€¢ Datos de transferencia bancaria\nâ€¢ Instrucciones de pago\n\nWhatsApp: ${window.customerData.phone}`);
      }, 500);
    } else {
      showToast("âŒ Error: " + (result.error || "Error desconocido"));
    }
  } catch (err) {
    console.error("PSE Payment error:", err);
    showToast("âŒ Error: " + err.message);
  }
}

async function processPaymentNequi() {
  // Validate Nequi form
  const phone = document.getElementById("nequiPhone").value.trim();
  const name = document.getElementById("nequiName").value.trim();
  
  if (!phone || phone.length < 10) {
    showToast("âš ï¸ NÃºmero de celular invÃ¡lido");
    return;
  }
  
  if (!name || name.length < 3) {
    showToast("âš ï¸ Nombre invÃ¡lido");
    return;
  }
  
  // Process payment
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCost = (window.shippingData?.cost || 0);
  const total = subtotal + shippingCost;
  
  const paymentData = {
    id: "PAY" + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    customer: window.customerData,
    method: "nequi",
    methodName: "Nequi",
    methodDetails: {
      nequiPhone: phone,
      nequiName: name
    },
    subtotal: subtotal,
    shipping: shippingCost,
    total: total,
    items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, size: i.size || 'M' })),
    status: "waiting_confirmation",
    shipping_address: window.shippingData?.neighborhood || window.customerData.address,
    reference: "WIN-ORDER-" + Date.now().toString(36).toUpperCase()
  };
  
  try {
    showToast("â³ Registrando pago Nequi...");
    
    const res = await apiFetch(`${API_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData)
    });
    
    const result = await res.json();
    
    if (res.ok) {
      showToast("âœ… Solicitud de pago registrada!");
      
      cart = [];
      saveCart();
      renderCart();
      closePaymentModal();
      
      setTimeout(() => {
        alert(`âœ… Â¡PAGO NEQUI REGISTRADO!\n\nReferencia: ${paymentData.reference}\nTotal: $${total.toLocaleString("es-CO")}\n\nðŸ“± Te enviaremos por WhatsApp:\nâ€¢ Solicitud de pago Nequi\nâ€¢ Solo debes aprobar desde tu app\nâœ“ Celular registrado: ${phone}`);
      }, 500);
    } else {
      showToast("âŒ Error: " + (result.error || "Error desconocido"));
    }
  } catch (err) {
    console.error("Nequi payment error:", err);
    showToast("âŒ Error: " + err.message);
  }
}

async function processPaymentDaviplata() {
  // Validate Daviplata form
  const phone = document.getElementById("daviplataPhone").value.trim();
  const name = document.getElementById("daviplataName").value.trim();
  
  if (!phone || phone.length < 10) {
    showToast("âš ï¸ NÃºmero de celular invÃ¡lido");
    return;
  }
  
  if (!name || name.length < 3) {
    showToast("âš ï¸ Nombre invÃ¡lido");
    return;
  }
  
  // Process payment
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCost = (window.shippingData?.cost || 0);
  const total = subtotal + shippingCost;
  
  const paymentData = {
    id: "PAY" + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    customer: window.customerData,
    method: "daviplata",
    methodName: "Daviplata",
    methodDetails: {
      daviplataPhone: phone,
      daviplataName: name
    },
    subtotal: subtotal,
    shipping: shippingCost,
    total: total,
    items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, size: i.size || 'M' })),
    status: "waiting_confirmation",
    shipping_address: window.shippingData?.neighborhood || window.customerData.address,
    reference: "WIN-ORDER-" + Date.now().toString(36).toUpperCase()
  };
  
  try {
    showToast("â³ Registrando pago Daviplata...");
    
    const res = await apiFetch(`${API_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData)
    });
    
    const result = await res.json();
    
    if (res.ok) {
      showToast("âœ… Solicitud de pago registrada!");
      
      cart = [];
      saveCart();
      renderCart();
      closePaymentModal();
      
      setTimeout(() => {
        alert(`âœ… Â¡PAGO DAVIPLATA REGISTRADO!\n\nReferencia: ${paymentData.reference}\nTotal: $${total.toLocaleString("es-CO")}\n\nðŸ“± Te enviaremos por WhatsApp:\nâ€¢ CÃ³digo QR para pagar\nâ€¢ Instrucciones paso a paso\nâœ“ Celular registrado: ${phone}`);
      }, 500);
    } else {
      showToast("âŒ Error: " + (result.error || "Error desconocido"));
    }
  } catch (err) {
    console.error("Daviplata payment error:", err);
    showToast("âŒ Error: " + err.message);
  }
}

async function processPaymentCash() {
  // Validate Cash form
  const deliveryOption = document.getElementById("cashDeliveryOption").value;
  const deliveryRef = document.getElementById("cashDeliveryRef").value.trim();
  
  if (!deliveryOption) {
    showToast("âš ï¸ Selecciona forma de entrega");
    return;
  }
  
  // Process payment
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingCost = (window.shippingData?.cost || 0);
  const total = subtotal + shippingCost;
  
  const paymentData = {
    id: "PAY" + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    customer: window.customerData,
    method: "cash",
    methodName: "Efectivo",
    methodDetails: {
      deliveryType: deliveryOption === "delivery" ? "Pago Contra Entrega" : "Recogida en Tienda",
      additionalReference: deliveryRef
    },
    subtotal: subtotal,
    shipping: shippingCost,
    total: total,
    items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, size: i.size || 'M' })),
    status: "waiting_confirmation",
    shipping_address: window.shippingData?.neighborhood || window.customerData.address,
    reference: "WIN-ORDER-" + Date.now().toString(36).toUpperCase()
  };
  
  try {
    showToast("â³ Registrando pedido...");
    
    const res = await apiFetch(`${API_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData)
    });
    
    const result = await res.json();
    
    if (res.ok) {
      showToast("âœ… Pedido registrado correctamente!");
      
      cart = [];
      saveCart();
      renderCart();
      closePaymentModal();
      
      const type = deliveryOption === "delivery" ? "Entrega a Domicilio" : "Recogida en Tienda";
      setTimeout(() => {
        alert(`âœ… Â¡PEDIDO CONFIRMADO!\n\nReferencia: ${paymentData.reference}\nForma de Entrega: ${type}\nTotal: $${total.toLocaleString("es-CO")}\n\nðŸ‘¤ Te contactaremos por WhatsApp\nTelÃ©fono: ${window.customerData.phone}\n\nDatos de Entrega: ${window.customerData.address}\n${deliveryRef ? "Referencia: " + deliveryRef : ""}`);
      }, 500);
    } else {
      showToast("âŒ Error: " + (result.error || "Error desconocido"));
    }
  } catch (err) {
    console.error("Cash payment error:", err);
    showToast("âŒ Error: " + err.message);
  }
}

function guessCardBrand(cardNumber) {
  const patterns = {
    visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    mastercard: /^5[1-5][0-9]{14}$/,
    amex: /^3[47][0-9]{13}$/,
    discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  };
  
  for (const [brand, pattern] of Object.entries(patterns)) {
    if (pattern.test(cardNumber)) return brand.toUpperCase();
  }
  return "UNKNOWN";
}

function closePaymentModal() {
  document.getElementById("paymentModalOverlay").classList.remove("open");
  document.getElementById("paymentModal").classList.remove("open");
}

/* â”€â”€ SHIPPING LOGISTICS FLOW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
let selectedShipping = null;

async function showShippingOptions() {
  if (cart.length === 0) {
    showToast("ðŸ›’ El carrito estÃ¡ vacÃ­o");
    return;
  }
  closeCart();
  showToast("âŒ› Cargando opciones de envÃ­o...");

  try {
    const res = await apiFetch(`${API_URL}/shipping-options`);
    const shipping = await res.json();

    if (!Array.isArray(shipping) || shipping.length === 0) {
      showToast("âŒ No hay opciones de envÃ­o disponibles");
      return;
    }

    const container = document.getElementById("shippingOptions");
    container.innerHTML = shipping
      .map(
        (s) => `
      <div class="shipping-card" onclick="selectShippingOption('${s.id}', '${esc(s.name)}', ${s.price})" 
        style="padding: 15px; border: 2px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.3s; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">${esc(s.name)}</div>
          <div style="font-size: 13px; color: var(--gray-text);">${esc(s.description || '')} â€¢ ${s.days || '?'} dÃ­as</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 600; color: var(--accent);">${formatPrice(s.price)}</div>
          <div style="font-size: 12px; color: var(--gray-text);">ID: ${s.id}</div>
        </div>
      </div>
    `,
      )
      .join("");

    const overlay = document.getElementById("shippingModalOverlay");
    const modal = document.getElementById("shippingModal");
    overlay.classList.add("open");
    modal.classList.add("open");
  } catch (err) {
    console.error("âŒ Error loading shipping options:", err);
    showToast("âŒ Error al cargar opciones de envÃ­o");
  }
}

function closeShippingModal() {
  document.getElementById("shippingModalOverlay").classList.remove("open");
  document.getElementById("shippingModal").classList.remove("open");
  selectedShipping = null;
}

function selectShippingOption(id, name, price) {
  selectedShipping = { id, name, price };
  document.getElementById("confirmShippingBtn").disabled = false;
  showToast(`âœ“ "${name}" seleccionado`);

  // Highlight selected option
  document.querySelectorAll(".shipping-card").forEach((card) => {
    card.style.borderColor =
      card.querySelector("div").textContent.includes(name) ? "var(--accent)" : "var(--border)";
    card.style.backgroundColor =
      card.querySelector("div").textContent.includes(name) ? "rgba(var(--accent-rgb), 0.08)" : "transparent";
  });
}

function confirmShipping() {
  const address = document.getElementById("shippingAddress").value.trim();
  const city = document.getElementById("shippingCity").value.trim();
  const phone = document.getElementById("shippingPhone").value.trim();

  if (!selectedShipping) {
    showToast("âš  Selecciona un mÃ©todo de envÃ­o");
    return;
  }
  if (!address || !city || !phone) {
    showToast("âš  Completa todos los campos de direcciÃ³n");
    return;
  }

  closeShippingModal();
  
  // Store shipping data globally for payment processing
  window.shippingData = {
    method: selectedShipping.name,
    methodId: selectedShipping.id,
    cost: selectedShipping.price,
    address,
    city,
    phone,
  };

  // Add shipping cost to cart and update total
  const currentTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const newTotal = currentTotal + selectedShipping.price;
  
  showToast(
    `âœ“ EnvÃ­o: ${selectedShipping.name} (+${formatPrice(selectedShipping.price)})`,
  );

  // Proceed to payment
  setTimeout(() => openPaymentModal(), 500);
}


  closePaymentModal();
  showToast("âŒ› Procesando pedido...");

  // 1. Registrar la venta en el servidor
  const success = await registerOnlineSale(methodName);

  if (success) {
    // 2. Mostrar Ã©xito al usuario
    showToast("ðŸ† Â¡Pedido realizado con Ã©xito!");

    // 3. Limpiar carrito
    cart = [];
    saveCart();
    renderCart();
    closeCart();
  } else {
    showToast("âŒ Error al procesar el pedido. Intenta de nuevo.");
  }
}

// Global hook for the button in HTML - now starts with shipping selection
window.checkoutWhatsApp = showShippingOptions;

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PRODUCTS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderProducts(filter) {
  console.log(`ðŸŽ¨ renderProducts called with filter: ${filter}`);
  
  // Validar que PRODUCTS es un array
  if (!Array.isArray(PRODUCTS)) {
    console.error('âŒ PRODUCTS is not an array:', PRODUCTS);
    if (!DOM?.productsGrid) {
      DOM = initDOM();
    }
    if (DOM?.productsGrid) {
      DOM.productsGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--gray-text);">
          <p>âŒ Error al cargar productos. Por favor, actualiza la pÃ¡gina.</p>
        </div>`;
    }
    return;
  }
  
  console.log(`ðŸ“Š Available PRODUCTS: ${PRODUCTS.length}`);
  console.log(`DOM refs:`, DOM);
  console.log(`DOM.productsGrid:`, DOM?.productsGrid);
  
  // Si el DOM aÃºn no estÃ¡ listo, espera
  if (!DOM || !DOM.productsGrid) {
    console.warn('âš ï¸ DOM not ready yet, reinitializing...');
    DOM = initDOM();
    if (!DOM.productsGrid) {
      console.error('âŒ productsGrid element not found!');
      return;
    }
  }
  
  const list =
    filter === "all"
      ? PRODUCTS
      : filter === "sale"
        ? PRODUCTS.filter((p) => p.oldPrice)
        : PRODUCTS.filter((p) => p.cat === filter);

  console.log(`ðŸ” Filtered list: ${list.length} items`);
  
  if (list.length === 0) {
    console.warn(`âš ï¸ No products found for filter: ${filter}`);
    DOM.productsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--gray-text);font-size:14px;letter-spacing:1px;">
        No hay productos en esta categorÃ­a.
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
          onclick="showToast('ðŸ’› Guardado en favoritos')"
          aria-label="Guardar en favoritos"
        >â™¡</button>
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

  console.log(`âœ… Rendered ${list.length} products`);
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
            ? `${product.name} Â· ${metadata.productType} by Winner.`
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

/* â”€â”€ FILTER BUTTONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// Moved to attachEventListeners()

/* External trigger from categories section */
function filterByCategory(cat) {
  activeFilter = cat;
  if (DOM?.filterBar) {
    DOM.filterBar.querySelectorAll(".filter-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.filter === cat);
    });
  }
  renderProducts(cat);
  document.getElementById("productos").scrollIntoView({ behavior: "smooth" });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FEATURED CTA BUTTONS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PROMO CODE COPY
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function copyCode() {
  const code = DOM.promoCode.textContent.trim();
  navigator.clipboard
    .writeText(code)
    .then(() => showToast(`ðŸ“‹ CÃ³digo "${code}" copiado`))
    .catch(() => showToast(`CÃ³digo: ${code}`));
}

// Moved to attachEventListeners()

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   NEWSLETTER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
// Moved to attachEventListeners()

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SCROLL REVEAL (IntersectionObserver)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANIMATED COUNTER (hero stats)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
          } else if (text.includes("4.9â˜…")) {
            el.textContent = "0â˜…";
            animateCounter(el, 4.9, "â˜…");
          }

          counterObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.5 },
  );

  statNums.forEach((el) => counterObserver.observe(el));
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   UTILITY
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function formatPrice(num) {
  return "$" + num.toLocaleString("es-CO");
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   INIT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
(function init() {
  console.log('ðŸš€ Initializing Winner Store...');
  DOM = initDOM();
  console.log('âœ… DOM initialized:', DOM);
  attachEventListeners();
  fetchProducts();
  renderCart();
  observeRevealElements();
  initHeroCounters();
  console.log('ðŸŽ‰ Store ready!');
})();
