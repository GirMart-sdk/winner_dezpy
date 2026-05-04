# 🏆 WINNER POS v4.0 — POS FÍSICO PROFESIONAL

**WINNER POS** es el sistema de punto de venta más completo para tiendas físicas de ropa streetwear en Colombia. **SOLO FÍSICO** (online eliminado). ✨

**Estado:** ✅ **POS FÍSICO PURO v4.0** — 100% Productivo

---

## 📱 POS FÍSICO COMPLETO

**Características principales:**

```
✅ Carrito POS + pagos QR/Nequi/Daviplata/Efectivo
✅ Escáner QR por talla (XS-XXL, calzado 34-43)
✅ Dashboard físico ($21.8MM ventas ejemplo)
✅ Inventario con alerts stock bajo
✅ Facturas imprimibles automáticas
✅ Charts ventas/métodos/pago
✅ 26 productos precargados
```

---

## 🚀 Inicio (30 segundos)

```bash
npm install
npm run seed          # 73 ventas físicas
npm start             # localhost:3000
```

**Admin POS:**

```
📱 http://localhost:3000/admin-panel.html
🔑 admin / winner2026
```

---

## 💳 Métodos de Pago Integrados

| Método          | Icono | Estado |
| --------------- | ----- | ------ |
| Efectivo        | 💵    | ✅     |
| Nequi           | 📱    | ✅     |
| Daviplata       | 📱    | ✅     |
| PSE             | 🏦    | ✅     |
| Tarjeta Débito  | 💳    | ✅     |
| Tarjeta Crédito | 💳    | ✅     |

**Todos con validación tiempo real.**

---

## 📊 Base de Datos

**SQLite persistente** (`backend/winner_store.db`):

```
✅ 26 productos (8 mujer, 8 hombre, 9 accesorios, 1 calzado)
✅ Stock por talla diferenciada
✅ 73 ventas físicas ejemplo ($21.8MM)
✅ Analytics POS ready
```

**Reset:**

```bash
npm run seed
```

---

## 🛠️ URLs del Sistema

```
🌐 POS Admin: localhost:3000/admin-panel.html
📦 API: localhost:3000/api/products
📊 Stats: localhost:3000/api/stats
🛒 Feed: localhost:3000/merchant-feed.csv
```

---

## 🔧 Configuración (.env)

```env
NODE_ENV=production
PORT=3000
API_KEY=prod-api-key-winner-2026
ADMIN_PASSWORD=winner2026
```

**Ya configurado por defecto.**

---

## 📱 Funcionalidades POS

```
✅ Carrito con talla + stock real-time
✅ Pagos QR/efectivo/billeteras
✅ Dashboard ventas físicas
✅ Alertas stock bajo/crítica
✅ Códigos QR por producto
✅ Facturación automática
✅ Export CSV ventas/inventario
✅ Responsive tablet/PC
```

---

## 🎉 ¡POS PROFESIONAL LISTO!

```
1. npm install
2. npm run seed
3. npm start
4. localhost:3000/admin-panel.html
```

**¡Tu POS físico está listo para producción! 🚀**

---

## 🚀 Inicio Rápido (60 segundos)

### Paso 1: Instalar

```bash
npm install
```

### Paso 2: Inicializar datos

```bash
npm run seed
```

### Paso 3: Iniciar servidor

```bash
npm start
```

### Paso 4: Acceder ✨

- **Tienda:** http://localhost:3000 o https://localhost (HTTPS)
- **Admin:** http://localhost:3000/admin-panel.html o https://localhost/admin-panel.html
- **Usuario Admin:** `admin` / `winner2026`

---

## 🌐 Métodos de Pago Soportados

| Método             | Código      | Validación                                       |
| ------------------ | ----------- | ------------------------------------------------ |
| Tarjeta de Crédito | `tarjeta`   | ✅ Detección de marca (Visa, MC, Amex, Discover) |
| Tarjeta Débito     | `debito`    | ✅ Número de tarjeta válido                      |
| PSE                | `pse`       | ✅ Banco + documento validado                    |
| Nequi              | `nequi`     | ✅ Teléfono colombiano validado                  |
| Daviplata          | `daviplata` | ✅ Teléfono colombiano validado                  |
| Efectivo C.O.D.    | `efectivo`  | ✅ Opciones de entrega                           |

**Todos con validación en tiempo real y formularios personalizados.**

---

## 📁 Estructura

```
├── index.html              # Tienda online
├── admin-panel.html        # Dashboard admin
├── app.js                  # Lógica main
├── styles.css              # Estilos tienda
├── admin-panel.js/css      # Lógica y estilos admin
│
├── backend/
│   ├── server.js           # API Express
│   ├── database.js         # SQLite
│   ├── seed.js             # Script datos
│   ├── winner_store.db     # Base de datos
│   └── .env.example        # Plantilla config
│
└── SETUP_COMPLETE_LOCAL.md # Guía de instalación local
```

---

## 📦 API Endpoints

```
GET  /api/products              # Listar todos
GET  /api/products/:id          # Detalle
GET  /api/sales                 # Historial
POST /api/payments              # Registrar pago
POST /api/login                 # Admin login
```

Todos requieren header: `x-api-key: dev-api-key`

---

## 🏠 Arquitectura: 100% Local

```
TU MÁQUINA
├── Frontend: http://localhost:3000
├── Backend API: http://localhost:3000/api
└── Base de Datos: SQLite (./backend/winner_store.db)
```

**Ventajas:**

- ✅ Completamente tuyo
- ✅ $0 USD (cero costo)
- ✅ Rápido y sin latencia
- ✅ Control total
- ✅ Datos privados en tu máquina

**Limitaciones:**

- ⚠️ Solo accesible localmente
- ⚠️ Tu máquina debe estar encendida
- ⚠️ No escalable para miles de usuarios

---

## 🔐 Configuración Local

### Variables (.env)

```env
NODE_ENV=development
PORT=3000
DB_TYPE=sqlite
DB_PATH=./backend/winner_store.db
ADMIN_USER=admin
ADMIN_PASSWORD=winner2026
JWT_SECRET=dev-jwt-secret-winner-2026
API_KEY=dev-api-key
```

**Archivo .env no necesita estar en GitHub — ya está en .gitignore**

---

## 📊 Base de Datos

**Storage:** SQLite (desarrollo local)

- ✅ 26 productos (mujer, hombre, calzado, accesorios)
- ✅ Stock por talla (XS-XXL para ropa, números para calzado)
- ✅ 73 ventas de ejemplo
- ✅ 6 métodos de pago integrados

### Reset de datos:

```bash
npm run seed      # Reinicializa la BD con datos de ejemplo
npm run clean     # Elimina la BD completamente
```

---

## 🛠️ Tecnologías

| Componente    | Stack                             |
| ------------- | --------------------------------- |
| Frontend      | HTML5, CSS3, Vanilla JS, Chart.js |
| Backend       | Node.js, Express 5.x              |
| Base de Datos | SQLite3                           |
| Autenticación | JWT + API Key                     |
| Persistencia  | Local filesystem                  |

---

## 📞 Troubleshooting

| Problema               | Solución                                  |
| ---------------------- | ----------------------------------------- |
| Productos no cargan    | `npm run seed`                            |
| Admin no funciona      | Limpiar cookies, usar admin/winner2026    |
| Puertos en uso         | Cambiar PORT en .env                      |
| Base de datos corrupta | `npm run clean && npm run seed`           |
| Conexión rechazada     | Verificar que npm start está ejecutándose |

---

## 📖 Documentación

- **[SETUP_COMPLETE_LOCAL.md](SETUP_COMPLETE_LOCAL.md)** - Guía de instalación detallada
- **[API_AND_FEATURES.md](API_AND_FEATURES.md)** - Endpoints y características
- **[PAYMENT_SYSTEM.md](PAYMENT_SYSTEM.md)** - Sistema de pagos

---

## ✅ Checklist de Funcionamiento

- [x] 6 métodos de pago funcionando
- [x] Admin panel operativo
- [x] 26 productos con stock
- [x] API en localhost:3000
- [x] Diseño responsive
- [x] Base de datos SQLite
- [x] Error handling completo
- [x] HTTPS/SSL configurado
- [x] Sistema de tallas por categoría
- [x] Totalmente configurado (listo para usar)

---

## 🎉 ¡LISTO PARA USAR!

```bash
npm install
npm run seed
npm start
```

Abre http://localhost:3000 en tu navegador.

**¡Bienvenido a WINNER STORE! 🚀**
