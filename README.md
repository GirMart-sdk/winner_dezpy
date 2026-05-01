# 🏆 WINNER STORE v3.0 — Official Edition

**WINNER STORE** es la plataforma de e-commerce más completa y profesional para tiendas de ropa streetwear en Colombia. ✨

**Estado:** ✅ **PRODUCTION READY v3.0** — 100% Completo y Documentado

---

## 📚 CONFIGURACIÓN: 100% SERVIDOR LOCAL

**Tu tienda en tu máquina — Sin servicios externos**

Consulta:

- **[SETUP_COMPLETE_LOCAL.md](SETUP_COMPLETE_LOCAL.md)** — Guía completa de instalación
- **[API_AND_FEATURES.md](API_AND_FEATURES.md)** — Documentación de API y características
- **[PAYMENT_SYSTEM.md](PAYMENT_SYSTEM.md)** — Sistema de pagos integrado

---

## 🎯 Características Principales

- ✅ **Tienda Online Moderna** - Frontend responsive con diseño premium
- ✅ **6 Métodos de Pago** - Tarjeta Crédito, Tarjeta Débito, PSE, Nequi, Daviplata, Efectivo
- ✅ **Admin Panel Completo** - Gestión de productos, ventas, inventario
- ✅ **Sistema de Inventario** - Control por talla con códigos QR
- ✅ **Análisis en Tiempo Real** - Dashboards con Chart.js
- ✅ **26 Productos Precargados** - 73 ventas de ejemplo
- ✅ **Autenticación Segura** - API Key + JWT
- ✅ **BD Dual Compatible** - SQLite (dev) + PostgreSQL (prod)
- ✅ **Base de Datos Persistente** - Con backup automático
- ✅ **30+ API Endpoints** - REST completa y documentada
- ✅ **HTTPS/SSL Configurado** - Certificados SSL generados
- ✅ **Sistema de Tallas** - Por categoría (ropa, calzado, accesorios)

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
