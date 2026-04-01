# 🚀 GUÍA DE DEPLOYMENT - WINNER STORE

## 📋 Base de Datos: Elige tu opción

### 🗄️ SQLite (Desarrollo/Pruebas)
- ✅ Cero configuración
- ✅ Incluido en el proyecto
- ✅ Rápido para desarrollo
- ❌ No escalable (no recomendado para producción)

### 🐘 PostgreSQL (⭐ RECOMENDADO PARA PRODUCCIÓN)
- ✅ Production-ready
- ✅ Escalable y confiable
- ✅ Funciona en cualquier servidor
- ✅ Opción managed disponible (Railway, Render, Supabase)

**→ Ver: [POSTGRESQL_GUIDE.md](POSTGRESQL_GUIDE.md) para setup completo de PostgreSQL**

---

## 📋 Pre-Deployment Checklist

### ✅ Antes de hacer deploy:

- [x] Todos los archivos estilizados (-debug.html, test-*.html pueden removerse)
- [x] No hay errores en consola del navegador
- [x] Datos de ejemplo cargados en BD
- [x] API funciona localmente (http://localhost:3000/api/products)
- [x] Frontend carga correctamente
- [x] Admin panel funciona (admin/winner2026)
- [x] Sistema de pagos configurado

### 🔧 Archivos a LIMPIAR antes de deployment:

```bash
# Estos archivos de debug pueden eliminarse en producción:
- debug.html
- debug-fetch.html
- test-api.html
- test-payments.html
- tmp_lines.txt
- CAMBIOS_CODIGO.md
- CORRECCIONES_MARZO_2026.md
- ERRORES_CORREGIDOS.md
- FIXES_*.md
- *.example files

# Mantener:
- index.html (tienda online)
- admin-panel.html (panel admin)
- app.js, styles.css, admin-panel.js, admin-panel.css
- backend/server.js, backend/database.js, backend/seed.js
- package.json, package-lock.json
- README.md
- DEPLOYMENT_GUIDE.md (esta guía)
```

---

## 🌐 OPCIÓN 1: Railway (⭐ Recomendado - GRATIS los primeros $5)

### Paso 1: Preparar el proyecto
```bash
# 1. Crear archivo .env para producción (NUNCA commitear)
# Crear archivo: .env

PORT=3000
API_KEY=tu-api-key-segura-aqui
JWT_SECRET=tu-jwt-secret-seguro-aqui
ADMIN_USER=admin
ADMIN_PASSWORD=tu-password-segura
ADMIN_SALT=tu-salt-seguro
```

### Paso 2: Subir a GitHub (Si no está ya)
```bash
git add .
git commit -m "🚀 Preparando para deployment"
git push origin main
```

### Paso 3: Deploy en Railway
1. Ir a: https://railway.app/
2. Hacer login con GitHub
3. Clickear "New Project"
4. Seleccionar repositorio: `winner_dezpy`
5. Railway detectará Node.js automáticamente
6. Configurar variables de ambiente:
   - PORT=3000
   - API_KEY=tu-api-key-segura
   - JWT_SECRET=tu-jwt-secret-seguro
   - ADMIN_USER=admin
   - ADMIN_PASSWORD=tu-password-nuevo
   - ADMIN_SALT=tu-salt-seguro
7. Clickear "Deploy"
8. Esperar ~3-5 minutos
9. Tu app estará en: `https://[tu-proyecto].up.railway.app`

**Ventajas Railway:**
- ✅ Gratis para $5 créditos mensuales
- ✅ Muy fácil con GitHub
- ✅ Auto-deploy en cada push
- ✅ Base de datos SQLite incluida
- ✅ Soporte excelente

---

## 🌍 OPCIÓN 2: Vercel (Fácil pero solo frontend)

**Nota:** Vercel es mejor para frontend. Para backend completo, usa Railway.

1. Subir código a GitHub
2. Ir a: https://vercel.com
3. Importar repositorio
4. Vercel desplegará automáticamente

**⚠️ Limitación:** Vercel máximo 10 segundos por request. Si tu BD es pesada, prefiere Railway.

---

## 💻 OPCIÓN 3: Heroku (Pagado, pero estable)

### Con esta guía puedes deployar en Heroku:

```bash
# 1. Instalar Heroku CLI
# Descargar desde: https://devcenter.heroku.com/articles/heroku-cli

# 2. Hacer login
heroku login

# 3. Crear app
heroku create winner-store-app

# 4. Configurar variables de ambiente
heroku config:set API_KEY=tu-api-key-segura
heroku config:set JWT_SECRET=tu-jwt-secret-seguro
heroku config:set ADMIN_PASSWORD=tu-password-nuevo

# 5. Hacer push a Heroku
git push heroku main

# 6. Tu app estará en:
# https://winner-store-app.herokuapp.com
```

---

## 🐳 OPCIÓN 4: Docker (Profesional)

Si quieres containerizar tu app:

### Crear `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Crear `.dockerignore`:
```
node_modules
npm-debug.log
.git
.gitignore
.vscode
*.md
debug*.html
test-*.html
```

### Buildear y correr:
```bash
docker build -t winner-store .
docker run -p 3000:3000 \
  -e API_KEY=tu-clave \
  -e JWT_SECRET=tu-secret \
  -e ADMIN_PASSWORD=tu-pass \
  winner-store
```

---

## 🔒 Variables de Ambiente - CRÍTICAS para Producción

**NUNCA commitear .env a GitHub!**

Crear archivo `.env` en raíz (local only):
```env
PORT=3000
API_KEY=cambiar-a-algo-seguro-32-caracteres-aleatorios
JWT_SECRET=cambiar-a-algo-seguro-32-caracteres-aleatorios
ADMIN_USER=admin
ADMIN_PASSWORD=cambiar-a-password-fuerte-aqui
ADMIN_SALT=cambiar-a-salt-aleatorio-32-chars
ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
NODE_ENV=production
```

### Generar claves seguras en terminal:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## 📊 Migrar Base de Datos

### Opción A: Usar BD existente (recomendado)
```bash
# La BD winner_store.db ya tiene datos
# Se copia automáticamente al deploy
```

### Opción B: Seed en producción (si necesitas resetear)
```bash
# En la terminal de producción (Railway/Heroku):
npm run seed

# Esto creará tablas y cargará 25 productos + 73 ventas de ejemplo
```

---

## 🧪 Pruebas Pre-Deploy

Ejecuta localmente antes de hacer deploy:

```bash
# 1. Iniciar servidor
npm start

# 2. En otra terminal, probar API
# GET /api/products
curl -H "x-api-key: dev-api-key" http://localhost:3000/api/products

# 3. Frontend debe cargar
# Abrir http://localhost:3000 en navegador
# Verificar:
# - ✅ Productos visibles
# - ✅ Carrito funciona
# - ✅ Admin panel accesible (admin/winner2026)
# - ✅ Sistema de pagos funciona

# 4. Revisar consola (F12) - NO DEBE HABER ERRORES ROJOS
```

---

## 🚨 Troubleshooting

### "Products not loading after deploy"
```bash
# Problema: API_KEY no configurada correctamente
# Solución: 
1. Verificar variables de ambiente en tu proveedor (Railway/Heroku)
2. Reiniciar la app
3. Probar: curl -H "x-api-key: [tu-api-key]" https://tu-app.com/api/products
```

### "Database not found"
```bash
# Problema: BD no se copió al deploy
# Solución:
1. Ejecutar: npm run seed
2. Esto creará y poblará automáticamente la BD
```

### "CORS errors"
```bash
# Problema: Frontend en dominio diferente al backend
# Solución: Configura ALLOWED_ORIGINS en .env
ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
```

### "Cannot POST /api/payments"
```bash
# Problema: Rutas POST no funcionan
# Solución: Verificar que Content-Type: application/json está siendo enviado
```

---

## 📱 Subdominios Recomendados

```
Tu dominio: ganador.com
├── ganador.com              → Frontend (tienda online)
├── admin.ganador.com        → Frontend admin (mismo archivo, ruta /admin)
├── api.ganador.com          → Backend API (opcional, usar proxy)
└── panel.ganador.com        → Admin dashboard
```

### Configurar proxies (nginx ejemplo):
```nginx
server {
    listen 80;
    server_name api.ganador.com;
    
    location / {
        proxy_pass http://localhost:3000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## ✅ Checklist Final Pre-Deploy

- [ ] Variables de ambiente configuradas (API_KEY, JWT_SECRET, ADMIN_PASSWORD)
- [ ] Base de datos seeded o copiada
- [ ] Sin errores en DevTools (F12)
- [ ] Todos los productos cargan
- [ ] Admin panel funciona
- [ ] Pagos procesan correctamente
- [ ] CORS configurado para tu dominio
- [ ] Repository pusheado a GitHub
- [ ] .env NUNCA committeado (.gitignore contiene .env)
- [ ] Leer todas las advertencias de seguridad arriba

---

## 🎯 Siguiente Paso

**Elige tu plataforma:**
1. ⭐ **Railway** (más fácil y recomendado): https://railway.app
2. **Vercel** (solo frontend): https://vercel.com
3. **Heroku** (pagado): https://heroku.com
4. **Docker** (tu servidor propio): Usar Dockerfile arriba

**Necesitas dominio?**
- Recomendado: GoDaddy, Namecheap, Google Domains
- Costo: ~$10-15 USD/año

---

## 📞 Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| 401 API key inválida | API_KEY mal configurada | Verificar .env en proveedor |
| 500 Database error | BD no existe | Ejecutar `npm run seed` |
| Blank page en frontend | Archivos no servidos | Verificar PORT correcto |
| Products don't load | API no responde | Verificar CORS + API_KEY |
| Admin login falla | PASSWORD mal | Reset password en .env + restart |

---

## 🔐 Cambiar Credenciales Admin en Producción

```bash
# 1. Actualizar .env local:
ADMIN_PASSWORD=nuevo-password-fuerte

# 2. Push a GitHub (sin .env):
git add -A
git commit -m "Update admin credentials"
git push origin main

# 3. En Railway/Heroku, actualizar variable de ambiente
# 4. La app se reinicia automáticamente

# 5. Nuevo login: admin / nuevo-password-fuerte
```

---

**¡Buena suerte con tu deployment! 🚀**

Si tienes problemas, abre una issue en GitHub con:
- Proveedor que usas (Railway/Heroku/etc)
- Mensaje de error completo
- Qué ya intentaste

