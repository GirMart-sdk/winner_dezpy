# 🏪 WINNER STORE — E-commerce Streetwear Colombiano

**WINNER STORE** es una plataforma de e-commerce moderna lista para producción. Soporta **5 métodos de pago diferentes** (Tarjeta, PSE, Nequi, Daviplata, Efectivo) y cuenta con un panel administrativo completo.

**Estado:** ✅ **Production Ready** — Listo para deployar a web

---

## 🎯 Características Principales

- ✅ **Tienda Online Moderna** - Frontend responsive con diseño premium
- ✅ **5 Métodos de Pago** - Tarjeta, PSE, Nequi, Daviplata, Efectivo  
- ✅ **Admin Panel Completo** - Gestión de productos, ventas, inventario
- ✅ **Sistema de Inventario** - Control por talla con códigos QR
- ✅ **Análisis en Tiempo Real** - Dashboards con Chart.js
- ✅ **25 Productos Precargados** - 73 ventas de ejemplo
- ✅ **Autenticación Segura** - API Key + JWT
- ✅ **BD Dual Compatible** - SQLite (dev) + PostgreSQL (prod) ⭐ **NEW**
- ✅ **Base de Datos Persistente** - Con backup automático

---

## 🚀 Inicio Rápido

### Instalar
```bash
npm install
npm run seed          # Cargar 25 productos + datos
npm start             # Iniciar en http://localhost:3000
```

### Acceder
- **Tienda:** http://localhost:3000
- **Admin:** http://localhost:3000/admin-panel.html
- **Credenciales:** `admin` / `winner2026`

---

## 🌐 Métodos de Pago Soportados

| Método | Código | Validación |
|--------|--------|-----------|
| Tarjeta de Crédito | `tarjeta` | ✅ Detección de marca (Visa, MC, Amex) |
| PSE | `pse` | ✅ Banco + documento |
| Nequi | `nequi` | ✅ Teléfono validado |
| Daviplata | `daviplata` | ✅ Teléfono validado |
| Efectivo C.O.D. | `efectivo` | ✅ Opciones de entrega |

Cada método tiene formulario personalizado y validación en tiempo real.

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
└── DEPLOYMENT_GUIDE.md     # 👈 LEER ESTO
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

Todos requieren header: `x-api-key: dev-api-key` (en producción cambiar)

---

## 🚀 Deployment a Web

**Plataforma Recomendada:** Railway (⭐ $5 gratuito/mes)

### Pasos:
1. Push a GitHub
2. Ve a https://railway.app
3. Importa repositorio
4. Configura variables de ambiente
5. ¡Deploy! 🎉

**Ver:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) para detalles completos y otras plataformas.

---

## 🔐 Configuración Producción

### Variables Required (.env)
```env
API_KEY=tu-api-key-seguro
JWT_SECRET=tu-jwt-secret-seguro
ADMIN_PASSWORD=tu-password-nuevo
ALLOWED_ORIGINS=https://tu-dominio.com
NODE_ENV=production
```

**⚠️ NUNCA commitear .env a GitHub**

---

## 📊 Base de Datos

### Storage Options ⭐ Dual Compatible
- **SQLite** (Default) - Desarrollo local, cero configuración
- **PostgreSQL** (Producción) - Escalable, confiable, auto-configurado

### Auto-Switching
```javascript
// database.js detecta automaticamente:
DB_TYPE=sqlite    → SQLite local
DB_TYPE=postgres  → PostgreSQL remoto
```

### Incluye:
- ✅ 25 productos (mujer, hombre, accesorios)
- ✅ Stock por talla (XS-XXL)
- ✅ 73 ventas de ejemplo (14 días)
- ✅ Múltiples métodos de pago

### Reset/Seed:
```bash
npm run seed      # Funciona con SQLite y PostgreSQL
```

---

## 🛠️ Tecnologías

| Componente | Stack |
|-----------|-------|
| Frontend | HTML5, CSS3, Vanilla JS, Chart.js |
| Backend | Node.js, Express 5.x |
| BD | **SQLite3** (dev) + **PostgreSQL 14+** (prod) ⭐ |
| Auth | JWT + API Key |
| Deploy | Railway/Render/Vercel/Heroku/Docker |

---

## 📞 Troubleshooting

| Problema | Solución |
|----------|----------|
| Productos no cargan | `npm run seed` |
| Admin no funciona | Limpiar cookies, verificar credenciales |
| API retorna 401 | Check `x-api-key` header |
| CORS errors | Configurar `ALLOWED_ORIGINS` en .env |

---

## 📖 Documentación

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Deploy step-by-step  
- **[PAYMENT_FORMS_GUIDE.md](PAYMENT_FORMS_GUIDE.md)** - Métodos de pago
- **[package.json](package.json)** - Dependencias

---

## ✅ Production Checklist

- [x] 5 métodos de pago funcionando
- [x] Admin panel operativo
- [x] 25 productos con stock
- [x] API secured con keys
- [x] Diseño responsive
- [x] Base de datos persistente
- [x] Error handling completo
- [ ] Variables de environment configuradas (HACER ANTES DE DEPLOY)
- [ ] Cambiar credenciales admin (HACER ANTES DE DEPLOY)

---

## 🎉 ¡LISTO PARA PRODUCCIÓN!

Sigue [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) para lanzar tu tienda a la web.

**¡Buena suerte! 🚀**
