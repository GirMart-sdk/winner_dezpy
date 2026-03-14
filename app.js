/* ═══════════════════════════════════════════════════════
   WINNER STORE — app.js
   ═══════════════════════════════════════════════════════ */

/* ── API CONFIG ─────────────────────────────────────────── */
const API_URL =
  window.location.port === "3000"
    ? "http://localhost:3000/api"
    : new URL("/api", window.location.origin).href;
window.API_URL = API_URL;

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

/* ── STATE ──────────────────────────────────────────────── */
let PRODUCTS = [];
let cart = loadCart();
let activeFilter = "all";

async function fetchProducts() {
  try {
    const res = await fetch(`${API_URL}/products`);
    PRODUCTS = await res.json();
    renderProducts(activeFilter);
  } catch (err) {
    console.error("Error fetching products:", err);
    showToast("❌ Error al conectar con el servidor");
  }
}

async function registerOnlineSale(method) {
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const saleData = {
    id: "ON" + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    vendor: "Tienda Online",
    client: "Cliente Web",
    method: method,
    total: total,
    items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
  };

  try {
    const res = await fetch(`${API_URL}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleData),
    });
    const result = await res.json();
    return result.success;
  } catch (err) {
    console.error("Error saving sale:", err);
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
   WHATSAPP CHECKOUT
══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   PAYMENT & CHECKOUT FLOW
══════════════════════════════════════════════════════════ */
const WHATSAPP_PHONE = "573166019030";

function openPaymentModal() {
  if (cart.length === 0) {
    showToast("🛒 El carrito está vacío");
    return;
  }
  const overlay = document.getElementById("paymentModalOverlay");
  const modal = document.getElementById("paymentModal");
  const container = document.getElementById("checkoutPayMethods");

  // We use the methods defined here for the storefront checkout
  const methods = [
    {
      name: "Nequi",
      icon: "📱",
      color: "#e91e8b",
      bg: "rgba(233,30,139,0.12)",
    },
    {
      name: "Daviplata",
      icon: "📱",
      color: "#ff6b00",
      bg: "rgba(255,107,0,0.12)",
    },
    {
      name: "Efectivo",
      icon: "💵",
      color: "#2ecc71",
      bg: "rgba(46,204,113,0.12)",
    },
    {
      name: "PSE / Transferencia",
      icon: "🏦",
      color: "#1e90ff",
      bg: "rgba(30,144,255,0.12)",
    },
  ];

  container.innerHTML = methods
    .map(
      (m) => `
    <div class="pm-card enabled" style="border-color:${m.color}55; background:${m.bg}" onclick="selectPaymentMethod('${m.name}')">
      <span class="pm-icon" style="background:${m.bg}; color:${m.color}">${m.icon}</span>
      <div class="pm-info">
        <div class="pm-name" style="color:${m.color}">${m.name}</div>
        <div class="pm-status">✓ Seleccionar</div>
      </div>
    </div>
  `,
    )
    .join("");

  overlay.classList.add("open");
  modal.classList.add("open");
}

function closePaymentModal() {
  document.getElementById("paymentModalOverlay").classList.remove("open");
  document.getElementById("paymentModal").classList.remove("open");
}

async function selectPaymentMethod(methodName) {
  closePaymentModal();
  showToast("⌛ Procesando pedido...");

  // 1. Registrar la venta en el servidor
  const success = await registerOnlineSale(methodName);

  if (success) {
    // 2. Mostrar éxito al usuario
    showToast("🏆 ¡Pedido realizado con éxito!");

    // 3. Limpiar carrito
    cart = [];
    saveCart();
    renderCart();
    closeCart();
  } else {
    showToast("❌ Error al procesar el pedido. Intenta de nuevo.");
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
function formatPrice(num) {
  return "$" + num.toLocaleString("es-CO");
}

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
(function init() {
  fetchProducts();
  renderCart();
  observeRevealElements();
  initHeroCounters();
})();
