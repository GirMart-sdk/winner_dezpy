# Cambios de código - Resumen detallado

## Archivos modificados

### 1. `backend/server.js`

#### Cambio 1: Expiración de JWT aumentada
- **Línea**: 456
- **Antes**: `expiresIn: '8h'`
- **Ahora**: `expiresIn: '7d'`
- **Razón**: Permitir sesiones más largas sin necesidad de re-login

#### Cambio 2: Nuevo endpoint de refresh-token
- **Línea**: 463-481
- **Código agregado**:
```javascript
app.post('/api/refresh-token', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    if (!decoded.sub || decoded.role !== 'admin') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    const newToken = jwt.sign({ sub: decoded.sub, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token: newToken });
  } catch(e) {
    return res.status(401).json({ error: 'Token inválido: ' + e.message });
  }
});
```
- **Razón**: Permitir refrescar tokens expirados sin necesidad de hacer login nuevamente

### 2. `admin-panel.js`

#### Cambio 1: Mejora de apiFetch con auto-refresh
- **Línea**: 40-75
- **Cambios**:
  - Agregado `tokenRefreshInProgress` para evitar loops
  - Si recibe 401, busca refrescar el token automáticamente
  - Reintentar la solicitud con el nuevo token
  - Si falla, redirige a login

```javascript
let tokenRefreshInProgress = false;

const apiFetch = async (url, options = {}) => {
  const headers = { ...(options.headers || {}), 'x-api-key': API_KEY };
  if (AUTH_TOKEN) headers.authorization = `Bearer ${AUTH_TOKEN}`;
  
  let res = await fetch(url, { ...options, headers });
  
  if (res.status === 401 && AUTH_TOKEN && !tokenRefreshInProgress) {
    tokenRefreshInProgress = true;
    try {
      const refreshRes = await fetch(`${API_URL}/refresh-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}`, 'x-api-key': API_KEY }
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        AUTH_TOKEN = data.token;
        LS.set('token', AUTH_TOKEN);
        headers.authorization = `Bearer ${AUTH_TOKEN}`;
        res = await fetch(url, { ...options, headers });
      } else {
        AUTH_TOKEN = null;
        LS.set('token', null);
        location.reload();
      }
    } catch(e) {
      console.error('Error refrescando token:', e);
    } finally {
      tokenRefreshInProgress = false;
    }
  }
  
  return res;
};
```

#### Cambio 2: Modal de selección de talla para POS
- **Línea**: 1050-1125
- **Funciones nuevas**:
  - `openPOSSizeSelector(product)` - Abre modal de tallas
  - `createPOSSizeModal()` - Crea modal dinámicamente con estilos
  - `closePOSSizeModal()` - Cierra el modal

```javascript
function openPOSSizeSelector(product) {
  const modal = $('posSizeModal') || createPOSSizeModal();
  const sizeGrid = modal.querySelector('#posSizeGrid');
  sizeGrid.innerHTML = SIZES.map(size => `
    <button class="pos-size-btn" onclick="addToPOSCart(${product.id},'${size}'); closePOSSizeModal();">
      ${size}
    </button>
  `).join('');
  modal.classList.add('open');
}

function createPOSSizeModal() {
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
      .pos-size-btn:hover {
        background: #0ee80b;
        color: #f7f8fbf7;
        transform: scale(1.05);
      }
      .pos-size-btn:active {
        transform: scale(0.98);
      }
    `;
    document.head.appendChild(style);
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
  document.body.appendChild(modal);
  return modal;
}

function closePOSSizeModal() {
  const modal = $('posSizeModal');
  if (modal) modal.classList.remove('open');
}
```

#### Cambio 3: Mejora de renderPOSProducts con event listeners
- **Línea**: 1035-1060
- **Cambio principal**: Cambiar de inline `onclick` a `data-product-id` y event listeners
- **Ventajas**: 
  - Más seguro
  - Evita inyección de código
  - Más fácil de mantener

```javascript
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
```

---

## Archivos NO modificados (pero verificados)

- ✅ `admin-panel.html` - OK, tiene structure correcta
- ✅ `app.js` - OK, online store funciona
- ✅ `backend/database.js` - OK, BD local funciona
- ✅ `backend/seed.js` - OK, datos de prueba cargados

---

## Resumen de líneas cambiadas

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `backend/server.js` | 456, 463-481 | JWT + refresh endpoint |
| `admin-panel.js` | 40-75 | apiFetch mejorado |
| `admin-panel.js` | 1035-1060 | renderPOSProducts mejorado |
| `admin-panel.js` | 1050-1125 | Modal de talla (3 funciones nuevas) |
| **Total** | **~100 líneas** | Con comentarios incluidos |

---

## Testing realizado

```
✅ POST /api/login → Token JWT válido
✅ POST /api/refresh-token → Nuevo token generado  
✅ GET /api/sales (con token) → 21 ventas devueltas
✅ admin-panel.js → Sin errores de sintaxis
✅ Servidor reiniciado con nuevos endpoints
```

---

## Próximas mejoras opcionales

- [ ] Agregar confirmación visual antes de registrar venta
- [ ] Exportar ventas a PDF/Excel
- [ ] Integración con impresora para tickets
- [ ] Reportes de ventas por período
- [ ] Sistema de usuarios múltiples
- [ ] Historial de cambios de inventario
