# 🧪 QUICK TEST — PostgreSQL + SQLite Dual Engine

Tu sistema ahora soporta **SQLite** (desarrollo) y **PostgreSQL** (producción) automáticamente. Aquí está cómo testearlo.

---

## ✅ PASO 1: Instalar Dependencias

```bash
cd backend
npm install
cd ..
```

Esto descargará el paquete PostgreSQL `pg` (8.11.3) que ahora está en `package.json`.

---

## 📋 PASO 2: Testar con SQLite (Default - Sin Configuración)

SQLite es el engine **default** si no estableces `DB_TYPE`.

### 2.1 Crear archivo `.env` en `backend/`

```bash
# backend/.env
PORT=3000
API_KEY=dev-api-key
JWT_SECRET=dev-jwt-secret-winner-2026
ADMIN_USER=admin
ADMIN_PASSWORD=winner2026
ADMIN_SALT=winner_salt_2026

# Base de Datos - SQLite (DEFAULT)
DB_TYPE=sqlite
DB_PATH=./winner_store.db

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
NODE_ENV=development
```

### 2.2 Ejecutar Seed SQLite

```bash
npm run seed
```

**Salida esperada:**
```
🌱 Iniciando seed WINNER STORE v3.0...

✅ Productos cargados : 25
   Mujer      : 8 (P001-P008)
   Hombre     : 8 (P009-P016)
   Accesorios : 9 (P017-P025)
✅ Ventas muestra: 45 (14 dias)
💰 Revenue total : $5,186,960

🚀 npm start  ->  http://localhost:3000
🔐 Panel admin ->  admin / winner2026
```

### 2.3 Iniciar Servidor SQLite

```bash
npm start
```

**Salida esperada:**
```
📦 Inicializando SQLite...
   Ruta: D:\...\backend\winner_store.db
✅ Conectado a SQLite: D:\...\backend\winner_store.db

🔧 Inicializando schema (SQLITE)...

✅ Tabla products lista
✅ Tabla inventory lista
✅ Tabla sales lista
✅ Tabla sale_items lista

🚀 Servidor iniciado en http://localhost:3000
📊 Panel admin disponible en http://localhost:3000/admin-panel.html
```

### 2.4 Verificar Endpoints

En otra terminal:

```bash
# Obtener productos
curl -H "X-API-Key: dev-api-key" http://localhost:3000/api/products

# Login admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"winner2026"}'

# Obtener estadísticas
curl -H "X-API-Key: dev-api-key" http://localhost:3000/api/stats
```

---

## 🐘 PASO 3: Testar con PostgreSQL Localmente

Si tienes PostgreSQL instalado localmente:

### 3.1 Crear Base de Datos PostgreSQL

**Windows (PowerShell):**
```powershell
# Conectar a PostgreSQL
psql -U postgres

# En psql:
CREATE DATABASE winner_store;
\q
```

**macOS/Linux:**
```bash
createdb winner_store
```

### 3.2 Actualizar Archivo `.env`

```bash
# backend/.env
PORT=3000
API_KEY=dev-api-key
JWT_SECRET=dev-jwt-secret-winner-2026
ADMIN_USER=admin
ADMIN_PASSWORD=winner2026
ADMIN_SALT=winner_salt_2026

# Base de Datos - PostgreSQL
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=winner_store
DB_USER=postgres
DB_PASSWORD=postgres

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
NODE_ENV=development
```

### 3.3 Ejecutar Seed PostgreSQL

```bash
npm run seed
```

**Salida esperada:**
```
📦 Inicializando PostgreSQL...
   Host: localhost
   BD: winner_store
✅ Conectado a PostgreSQL

🌱 Iniciando seed WINNER STORE v3.0...

✅ Productos cargados : 25
✅ Ventas muestra: 45 (14 dias)
💰 Revenue total : $5,186,960
```

### 3.4 Iniciar Servidor PostgreSQL

```bash
npm start
```

**Salida esperada:**
```
📦 Inicializando PostgreSQL...
   Host: localhost
   BD: winner_store
✅ Conectado a PostgreSQL

🔧 Inicializando schema (POSTGRES)...

✅ Tabla products lista
✅ Tabla inventory lista
✅ Tabla sales lista
✅ Tabla sale_items lista

🚀 Servidor iniciado en http://localhost:3000
📊 Panel admin disponible en http://localhost:3000/admin-panel.html
```

### 3.5 Verificar Endpoints (igual que con SQLite)

```bash
curl -H "X-API-Key: dev-api-key" http://localhost:3000/api/products
```

---

## 🚀 PASO 4: Producción con PostgreSQL en Railway/Render

### Para Railway:

1. **Crear proyecto en Railway** → Agregar PostgreSQL
2. **Copiar DATABASE_URL** de Railway
3. **Actualizar `.env` en producción:**

```bash
DB_TYPE=postgres
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
```

4. **Ejecutar seed en Railway:**
```bash
npm run seed
```

### Para Render:

1. **Crear PostgreSQL en Render**
2. **Copiar Internal Database URL**
3. **Mismo proceso que Railway**

---

## ✅ CHECKLIST DE VALIDACIÓN

### SQLite ✓
- [ ] `npm run seed` sin errores
- [ ] `npm start` conecta a SQLite
- [ ] `GET /api/products` retorna 25 productos
- [ ] `POST /auth/login` funciona con admin/winner2026
- [ ] Panel admin carga en `localhost:3000/admin-panel.html`

### PostgreSQL ✓
- [ ] Base de datos creada
- [ ] `npm run seed` carga datos en PostgreSQL
- [ ] `npm start` conecta a PostgreSQL
- [ ] `GET /api/products` retorna 25 productos
- [ ] `POST /auth/login` funciona
- [ ] Panel admin responde igual que con SQLite

### Endpoints Críticos ✓
```javascript
GET  /api/products                    // Lista productos
POST /auth/login                      // Login admin
GET  /api/stats                       // Estadísticas
POST /api/checkout                    // Procesar compra
GET  /api/sales                       // Lista ventas (admin)
GET  /admin/merchant-feed.csv         // CSV para Google Merchant
```

---

## 🐛 TROUBLESHOOTING

### "Cannot find module 'pg'"
```bash
npm install pg@8.11.3
```

### PostgreSQL Connection Refused
```bash
# Verificar que PostgreSQL está corriendo
psql -U postgres -d winner_store

# En Windows, verificar servicio
net start postgresql-x64-15  # (cambiar versión según instalada)
```

### SQLite Database Locked
```bash
# Eliminar base de datos y reintentar
rm backend/winner_store.db
npm run seed
npm start
```

### Tablas ya existen (WARNING)
Esto es normal. El script `CREATE TABLE IF NOT EXISTS` evita duplicados.

---

## 📊 Comparativa: SQLite vs PostgreSQL

| Característica | SQLite | PostgreSQL |
|---|---|---|
| **Setup** | ✅ Cero config | 📦 Requiere instalación |
| **Desarrollo** | ⚡ Perfecto | ⚡ Perfecto |
| **Producción** | ⚠️ Limitado | ✅ Recomendado |
| **Concurrencia** | ⚠️ Limitada | ✅ Excelente |
| **Escala** | 📦 ~100M registros | 📦 Ilimitada |
| **Backup** | 📁 Copiar archivo | 🔄 Automated |
| **Costo** | 💰 $0 | 💰 $5-50/mes |

---

## 🎯 Próximos Pasos

1. **Elige tu plataforma:**
   - Desarrollo: SQLite ✅
   - Producción: PostgreSQL + Railway/Render/Supabase

2. **Consulta POSTGRESQL_GUIDE.md** para:
   - Configuración VPS completa
   - Backup/Restore procedures
   - Monitoreo y performance

3. **Lee DEPLOYMENT_GUIDE.md** para:
   - Deployment en Railway
   - Deployment en Vercel
   - Deployment en Docker

---

## 💬 Comandos Rápidos

```bash
# Desarrollo SQLite
npm install && npm run seed && npm start

# Producción PostgreSQL (remoto)
export DB_TYPE=postgres
export DATABASE_URL=postgresql://...
npm run seed && npm start
```

**¡Tu app ahora es database-agnóstica! 🎉**
