# SETUP_AND_DEPLOYMENT.md
# 🛠️ SETUP, CONFIGURACIÓN Y DEPLOYMENT - WINNER STORE v2.0

**Guía completa: Instalación, Configuración, Seguridad y Deployment a Producción**

---

## 📋 TABLA DE CONTENIDOS

1. [Instalación Completa](#instalación-completa)
2. [Configuración (.env)](#configuración-env)
3. [Seguridad](#seguridad)
4. [PostgreSQL en Producción](#postgresql-en-producción)
5. [Deployment](#deployment)
6. [Verificación Pre-Launch](#verificación-pre-launch)

---

## ⚡ INSTALACIÓN COMPLETA

### Requisitos Previos
- Node.js 14+ (recomendado 18+)
- npm 6+
- 500 MB espacio disco
- Git (opcional)

### Paso 1: Instalar Dependencias
```bash
cd "D:\PROYECTO MARKET\WINNER_DEZPY"
npm install
```

**Qué instala:**
- Express.js (servidor web)
- SQLite3 (base de datos local)
- PostgreSQL driver (para producción)
- JWT (autenticación)
- CORS (control de origen)

### Paso 2: Inicializar Base de Datos
```bash
npm run seed
```

**Qué hace:**
- Crea tabla: products (25 productos)
- Crea tabla: inventory (stock por talla)
- Crea tabla: sales (73 ventas de ejemplo)
- Crea tabla: customer_profiles (15+ clientes)
- ✅ Cargar algunos datos iniciales para prueba

### Paso 3: Iniciar Servidor
```bash
npm start
```

**Salida esperada:**
```
📦 Inicializando SQLite...
Ruta: D:\PROYECTO MARKET\WINNER_DEZPY\backend\winner_store.db
✅ Conectado a SQLite: ...
✅ Schema inicializado correctamente
🌐 Servidor escuchando en puerto 3000
```

### Paso 4: Verificar Funcionamiento
Abre en navegador:
- **Tienda:** http://localhost:3000
- **Admin:** http://localhost:3000/admin-panel.html
- **Usuario:** admin
- **Contraseña:** winner2026

**Si todo funciona, ¡FELICIDADES! 🎉**

---

## Scripts Disponibles

```bash
npm start           # Inicia servidor (desarrollo)
npm run start:dev   # Modo desarrollo con logs
npm run start:prod  # Modo producción (NODE_ENV=production)
npm run seed        # Cargar datos iniciales
npm run test        # Validar sintaxis
npm run reset       # Limpiar BD y reiniciar
npm run db:check    # Ver estado de BD
npm run backup      # Hacer respaldo
npm run init        # Setup completo (install + seed + start)
```

---

## 🔧 CONFIGURACIÓN (.env)

### Crear archivo .env
```bash
# Copiar plantilla
cp .env.example .env

# Luego editar con tus valores
```

### Variables de Entorno Completas

```env
# ─── AMBIENTE ───────────────────────────────────────────
NODE_ENV=development
# Opciones: development | staging | production

# ─── PUERTO ─────────────────────────────────────────────
PORT=3000
# En producción: usar 8000+ (no <1024 sin permisos root)

# ─── BASE DE DATOS ──────────────────────────────────────
DB_TYPE=sqlite
# Opciones: sqlite | postgres

# Para SQLite (desarrollo)
DB_PATH=./backend/winner_store.db

# Para PostgreSQL (producción)
# DATABASE_URL=postgresql://user:pass@host:5432/winner_store
# O por partes:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=winner_store
# DB_USER=postgres
# DB_PASSWORD=your_password

# ─── AUTENTICACIÓN JWT ──────────────────────────────────
JWT_SECRET=dev-jwt-secret-winner-2026
# En producción: generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ─── CREDENCIALES ADMIN ─────────────────────────────────
ADMIN_USER=admin
ADMIN_PASSWORD=winner2026
# En producción: cambiar a contraseña fuerte

ADMIN_SALT=winner_salt_2026

# ─── SEGURIDAD API ──────────────────────────────────────
API_KEY=dev-api-key
# En producción: clave aleatoria fuerte

# ─── CORS ──────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
# En producción: agregar tu dominio oficial

# ─── SSL/TLS (HTTPS) ────────────────────────────────────
# CERT_PATH=/ruta/a/certificado.pem
# KEY_PATH=/ruta/a/clave-privada.key
HTTPS_PORT=443
HTTP_PORT=80

# ─── LOGGING ────────────────────────────────────────────
LOG_LEVEL=info
# Opciones: debug | info | warn | error

# ─── LÍMITES ────────────────────────────────────────────
BODY_LIMIT=15mb
SESSION_TIMEOUT=60
```

### Ejemplo .env para Producción

```env
NODE_ENV=production
PORT=8000
DB_TYPE=postgres
DATABASE_URL=postgresql://myuser:mypassword@prod-db.railway.app:5432/winner_store
JWT_SECRET=tu_jwt_secret_key_aqui_PRODUCCION
ADMIN_USER=admin
ADMIN_PASSWORD=tu_password_secure_PRODUCCION
ADMIN_SALT=prod_salt_2026
API_KEY=sk_test_example_key_SUSTITUIR
ALLOWED_ORIGINS=https://winner-store.com,https://www.winner-store.com
HTTPS_PORT=443
HTTP_PORT=80
LOG_LEVEL=warn
```

---

## 🔐 SEGURIDAD

### Implementaciones Incluidas

#### 1. JWT Tokens
- Expiran cada 7 días
- Refresh automático
- Validación en cada request
- No se almacenan en BD

```javascript
// Uso en API:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 2. Password Hashing
- Algoritmo: scrypt (más seguro que bcrypt)
- Salt: personalizado
- No se almacena contraseña en plano

```javascript
// Generación:
const hash = scryptSync(password, salt, 64).toString('hex');
```

#### 3. API Key Validation
- Requerido en header: `x-api-key`
- Diferente para tienda vs admin
- Cambiable por request

```bash
curl -H "x-api-key: dev-api-key" http://localhost:3000/api/products
```

#### 4. CORS (Cross-Origin Resource Sharing)
- Whitelist de orígenes permitidos
- Bloquea requests no autorizadas
- Configurable en .env

```javascript
ALLOWED_ORIGINS=https://tudominio.com
```

#### 5. Rate Limiting
- 5 requests por minuto por IP
- Previene ataques DDoS
- Implementado en middleware

#### 6. XSS Protection
- Validación de entrada
- Sanitización de datos
- Headers de seguridad

#### 7. CSRF Protection
- Tokens CSRF
- Validación de origen
- Métodos POST/PUT/DELETE protegidos

#### 8. HTTPS/TLS
- Forzado en producción
- Certificado SSL requerido
- Headers Strict-Transport-Security

```bash
CERT_PATH=/etc/ssl/certs/server.crt
KEY_PATH=/etc/ssl/private/server.key
```

### Checklist de Seguridad Pre-Producción

- [ ] Cambié JWT_SECRET a valor aleatorio fuerte
- [ ] Cambié ADMIN_PASSWORD a contraseña fuerte
- [ ] Cambié API_KEY a valor aleatorio
- [ ] Configuré ALLOWED_ORIGINS con mi dominio
- [ ] Obtengo certificado SSL/TLS
- [ ] NODE_ENV=production
- [ ] Desactivé modo debug (LOG_LEVEL=warn)
- [ ] Realicé backup de BD antes de deploy
- [ ] Probé todo localmente primero
- [ ] Revisé todos los headers de seguridad

---

## 🐘 PostgreSQL en Producción

### Instalación Local (para testing)

**Windows:**
```bash
# Descargar desde: https://www.postgresql.org/download/windows/
# O usar Chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Configuración Inicial

```bash
# Conectar como superusuario
psql -U postgres

# Crear BD
CREATE DATABASE winner_store;

# Crear usuario
CREATE USER winner WITH PASSWORD 'tu_contraseña';

# Dar permisos
GRANT ALL PRIVILEGES ON DATABASE winner_store TO winner;

# Salir
\q
```

### Cambiar de SQLite a PostgreSQL

**1. Editar .env:**
```env
DB_TYPE=postgres
DATABASE_URL=postgresql://winner:tu_contraseña@localhost:5432/winner_store
```

**2. Inicializar schema:**
```bash
npm run seed
```

**3. Verificar conexión:**
```bash
node -e "
const db = require('./backend/database.js');
db.all('SELECT COUNT(*) as count FROM products', (err, rows) => {
  console.log('Productos:', rows[0].count);
});
"
```

### PostgreSQL en Producción (Railway)

**Pasos:**
1. Ve a railway.app
2. Crea nuevo proyecto
3. Agrega servicio: PostgreSQL
4. Copia DATABASE_URL
5. Pega en .env

```env
DB_TYPE=postgres
DATABASE_URL=postgresql://user:pass@prod-db.railway.app:5432/winner_store
```

### Respaldos PostgreSQL

```bash
# Hacer backup
pg_dump -U winner winner_store > backup.sql

# Restaurar backup
psql -U winner winner_store < backup.sql
```

---

## 🚀 DEPLOYMENT

### Opción 1: Railway (⭐ Recomendado)

**Ventajas:**
- $5/mes gratuitos
- PostgreSQL incluida
- 1 click deploy
- Mejor valor
- Support 24/7

**Pasos:**

1. **Preparar proyecto:**
```bash
git init
git add .
git commit -m "Initial commit"
```

2. **Crear en Railway:**
   - Ve a https://railway.app
   - Haz click "New Project"
   - Selecciona "Deploy from GitHub"
   - Autoriza GitHub
   - Selecciona tu repositorio

3. **Configurar Variables:**
   - Ve a "Variables"
   - Agrega:
     - NODE_ENV=production
     - PORT=3000
     - DB_TYPE=postgres
     - DATABASE_URL={autogenerada por Railway}
     - JWT_SECRET={genera una aleatoria}
     - API_KEY={genera una aleatoria}
     - ADMIN_PASSWORD={tu contraseña fuerte}
     - ALLOWED_ORIGINS={tu dominio}

4. **Deploy:**
   - Haz click "Deploy"
   - Espera 2-3 minutos
   - Tu app está en vivo! 🎉

### Opción 2: Heroku

```bash
heroku login
heroku create winner-store-tudominio
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
heroku config:set NODE_ENV=production
heroku open
```

### Opción 3: AWS EC2

```bash
# 1. Lanzar instancia EC2 (Ubuntu 20.04)
# 2. SSH a servidor:
ssh -i your-key.pem ubuntu@your-ec2-ip

# 3. Instalar dependencias:
sudo apt update
sudo apt install nodejs npm postgresql postgresql-contrib

# 4. Clonar proyecto:
git clone your-repo-url
cd winner_dezpy

# 5. Instalar y iniciar:
npm install
npm run seed

# 6. Usar PM2 para mantener vivo:
npm install -g pm2
pm2 start backend/server.js --name "winner-store"
pm2 save
pm2 startup

# 7. Nginx como reverse proxy:
sudo apt install nginx
# ... configurar nginx ...

# 8. SSL con Let's Encrypt:
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d tudominio.com
```

### Opción 4: DigitalOcean

```bash
# En DigitalOcean App Platform:
# 1. Conecta GitHub
# 2. Selecciona repo
# 3. Configura environment variables
# 4. Deploy automático
# Cost: $12/mes $5/mes con PostgreSQL
```

### Opción 5: VPS Manual (Linode, Vultr, etc)

```bash
# 1. Conectar a VPS
ssh root@your-vps-ip

# 2. Instalar Node y PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs postgresql postgresql-contrib nginx

# 3. Clonar proyecto
cd /var/www
git clone your-repo-url
cd winner_dezpy

# 4. Instalar y seed
npm install --production
npm run seed

# 5. PM2 para mantener proceso vivo
npm install -g pm2
pm2 start backend/server.js
pm2 startup
pm2 save

# 6. Nginx reverse proxy
sudo tee /etc/nginx/sites-available/default > /dev/null << EOF
server {
    listen 80 default_server;
    server_name tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo nginx -t
sudo systemctl restart nginx

# 7. SSL con Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d tudominio.com
# (Configurar rutas en nginx)

# 8. Firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## ✅ VERIFICACIÓN PRE-LAUNCH

### Verificación Local

```bash
# 1. Instalar sin errores
npm install
# ✅ Debe completar sin warnings críticos

# 2. Seed sin errores
npm run seed
# ✅ Debe crear tablas sin errores

# 3. Servidor levanta
npm start
# ✅ Debe mostrar "Servidor escuchando en puerto 3000"

# 4. Tienda carga
curl http://localhost:3000
# ✅ Debe retornar HTML

# 5. Admin carga
curl http://localhost:3000/admin-panel.html
# ✅ Debe retornar HTML

# 6. API responde
curl -H "x-api-key: dev-api-key" http://localhost:3000/api/products
# ✅ Debe retornar JSON array
```

### Checklist Final Pre-Deployment

**Configuración:**
- [ ] .env correctamente configurado
- [ ] NODE_ENV=production
- [ ] JWT_SECRET es aleatorio fuerte
- [ ] API_KEY es aleatorio fuerte
- [ ] ADMIN_PASSWORD cambió de default
- [ ] ALLOWED_ORIGINS incluye mi dominio

**Seguridad:**
- [ ] HTTPS/SSL certificado obtenido
- [ ] Rate limiting habilitado
- [ ] CORS whitelist configurado
- [ ] Headers de seguridad activos
- [ ] Password hashing en scrypt
- [ ] Logs sin información sensible

**Base de Datos:**
- [ ] Usando PostgreSQL en producción
- [ ] Backup realizado
- [ ] Índices creados
- [ ] Foreign keys habilitadas
- [ ] Schema validado

**Funcionalidad:**
- [ ] Tienda online funciona
- [ ] Admin panel accesible
- [ ] Todos los endpoints responden
- [ ] 5 métodos de pago funcionan
- [ ] Carrito persistente
- [ ] Checkout completo
- [ ] Confirmación de pago

**Performance:**
- [ ] Tiempo de carga < 3 segundos
- [ ] API responde < 200ms
- [ ] DB indexes activos
- [ ] Cache headers configurados
- [ ] Compresión gzip activa

**Monitoreo:**
- [ ] Logs configurados
- [ ] Error tracking habilitado
- [ ] Backups automáticos
- [ ] Alertas configuradas
- [ ] Health checks activos

**Documentación:**
- [ ] Instrucciones de rollback documentadas
- [ ] Manuales de recuperación de desastres
- [ ] Credenciales backup seguro
- [ ] Números de soporte disponibles

---

## 🆘 Troubleshooting

**Error: "Cannot find module 'express'"**
```bash
npm install
npm install --save express
```

**Error: "Port 3000 already in use"**
```bash
# Cambiar puerto en .env:
PORT=3001
```

**Error: "Database locked" (SQLite)**
```bash
rm backend/winner_store.db
npm run seed
```

**Error: "Cannot connect to PostgreSQL"**
```bash
# Verificar que PostgreSQL está corriendo:
psql -U postgres
# Si no funciona, reinstalar PostgreSQL
```

**Error: "CORS blocked"**
```env
# Agregar tu dominio en .env:
ALLOWED_ORIGINS=https://tudominio.com
```

**Error: "Invalid JWT token"**
```bash
# Generar nuevo JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Actualizar en .env y reiniciar
```

---

## 📞 Soporte

- Documentación: Ver **API_AND_FEATURES.md**
- Problemas técnicos: Ver sección "Troubleshooting"
- Seguridad: Revisar todas las variables en .env
- Performance: Usar Chrome DevTools (F12)
- Logs: Ver consola cuando ejecutas `npm start`

---

*Última actualización: 6 de Abril, 2026*
*Versión: 2.0.0*
