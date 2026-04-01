# 🐘 WINNER STORE — PostgreSQL Setup Guide

## ¿Por qué PostgreSQL?

- ✅ **Mejor para producción** - Más robusto que SQLite
- ✅ **Escalable** - Múltiples conexiones simultáneas
- ✅ **Fiable** - ACID transactions garantizadas
- ✅ **Flexible** - Funciona en cualquier servidor Linux/Mac/Windows
- ✅ **Gratis** - Open source y sin costo

## 🚀 OPCIÓN 1: PostgreSQL Local (Desarrollo)

### Windows
1. Descargar PostgreSQL: https://www.postgresql.org/download/windows/
2. Instalar (default: port 5432, user: postgres)
3. En pgAdmin o terminal:
```bash
# Conectar como postgres
psql -U postgres

# Crear BD y usuario
CREATE DATABASE winner_store;
CREATE USER winner WITH PASSWORD 'tu_password';
ALTER ROLE winner SET client_encoding TO 'utf8';
ALTER ROLE winner SET default_transaction_isolation TO 'read committed';
ALTER ROLE winner SET default_transaction_deferrable TO on;
ALTER ROLE winner SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE winner_store TO winner;
```

### macOS
```bash
# Con Homebrew
brew install postgresql@15
brew services start postgresql@15

# Crear BD
createdb winner_store
createuser winner -P  # Ingresa password
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Como superuser postgres
sudo -u postgres psql

# En psql:
CREATE DATABASE winner_store;
CREATE USER winner WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE winner_store TO winner;
```

### Configurar app.js

Crear `.env` en raíz:
```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=winner_store
DB_USER=winner
DB_PASSWORD=tu_password
NODE_ENV=development
```

Instalar dependencia:
```bash
npm install pg
npm start
```

---

## 🌐 OPCIÓN 2: PostgreSQL en Servidor VPS (DigitalOcean, Linode, AWS, etc.)

### Paso 1: Crear VPS con Ubuntu 20.04+
- DigitalOcean: $4-6/mes (Droplet pequeño)
- Linode: $5/mes (Linode 2GB)
- AWS: $10/mes (t2.micro gratis 1 año)
- Google Cloud: $10/mes (e2-medium)

### Paso 2: Instalar PostgreSQL

SSH a tu servidor:
```bash
ssh root@tu_ip_publica
```

Instalar:
```bash
apt-get update
apt-get install postgresql postgresql-contrib

# Iniciar
systemctl start postgresql
systemctl enable postgresql  # Auto-start

# Crear BD y usuario
sudo -u postgres psql

# En psql:
CREATE DATABASE winner_store;
CREATE USER winner WITH PASSWORD 'tu_password_segura';
GRANT ALL PRIVILEGES ON DATABASE winner_store TO winner;
\q
```

### Paso 3: Configurar acceso remoto (Opcional)

Editar `/etc/postgresql/12/main/postgresql.conf`:
```bash
nano /etc/postgresql/12/main/postgresql.conf
```

Buscar y cambiar:
```
listen_addresses = '*'
```

Editar `/etc/postgresql/12/main/pg_hba.conf`:
```
# Agregar línea:
host    all             all             0.0.0.0/0               md5
```

Reiniciar:
```bash
systemctl restart postgresql
```

### Paso 4: Instalar Node.js y app

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install nodejs

# Clonar app
git clone https://github.com/GirMart-sdk/winner_dezpy.git
cd winner_dezpy
npm install

# Crear .env
cat > .env << EOF
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=winner_store
DB_USER=winner
DB_PASSWORD=tu_password_segura
API_KEY=tu-api-key-segura
JWT_SECRET=tu-jwt-secret-seguro
ADMIN_PASSWORD=tu-admin-password
NODE_ENV=production
ALLOWED_ORIGINS=https://tu-dominio.com
EOF

# Instalar PM2 para mantener app activa
npm install -g pm2
pm2 start backend/server.js --name "winner-store"
pm2 startup
pm2 save
```

### Paso 5: Configurar nginx (Reverse Proxy)

```bash
apt-get install nginx

# Crear config
cat > /etc/nginx/sites-available/winner << EOF
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

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

# Habilitar
ln -s /etc/nginx/sites-available/winner /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Paso 6: SSL (HTTPS con Let's Encrypt)

```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

✅ **¡Tu app está en producción!**

---

## ☁️ OPCIÓN 3: PostgreSQL Managed (Mejor opción)

### Railway (Recomendado)
1. Ve a https://railway.app
2. "New Project" → "PostgreSQL"
3. Obtén `DATABASE_URL` automáticamente
4. Crear `.env`:
```env
DB_TYPE=postgres
DATABASE_URL=postgresql://user:password@host:port/dbname
NODE_ENV=production
```
5. Deploy app con `npm start` ✅

**Costo:** $5-10/mes (PostgreSQL incluido)

### Render
1. Go to https://render.com
2. "New" → "PostgreSQL"
3. "New" → "Web Service" → Connect Git
4. Auto-populate `DATABASE_URL` ✅

**Costo:** $7-25/mes

### Supabase (PostgreSQL + Auth + Storage)
1. https://supabase.com
2. New Project → PostgreSQL
3. Obtener connection string
4. Usar en .env ✅

**Costo:** Gratis a $25/mes según uso

### AWS RDS
1. AWS Console → RDS
2. Create DB Instance → PostgreSQL
3. Copy connection endpoint
4. Security Group: Allow port 5432

**Costo:** $15-50/mes

---

## ✅ Verificar Conexión

```bash
# Test local
psql -U winner -d winner_store -c "SELECT NOW();"

# Test remoto
psql -h tu_servidor -U winner -d winner_store -c "SELECT NOW();"
```

---

## 🔄 Migracion de SQLite a PostgreSQL

```bash
# 1. Exportar datos de SQLite
sqlite3 winner_store.db ".dump" > export.sql

# 2. Adaptar SQL para PostgreSQL (cambios manuales menores)
# - Quitar AUTOINCREMENT (usar SERIAL)
# - Cambiar tipos: DATETIME→TIMESTAMP
# - Agregar tipos: VARCHAR, DECIMAL

# 3. Importar a PostgreSQL
psql -U winner -d winner_store -f export.sql

# 4. Actualizar .env - listo!
```

---

## 📊 Monitoreo y Maintenance

### Ver BD
```bash
psql -U winner -d winner_store

# Listar tablas
\dt

# Ver tamaño BD
SELECT pg_size_pretty(pg_database_size('winner_store'));

# Ver conexiones activas
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

# Salir
\q
```

### Backup
```bash
# Local
pg_dump -U winner winner_store > backup.sql

# Remoto
pg_dump -h tu_servidor -U winner winner_store > backup.sql

# Restaurar
psql -U winner winner_store < backup.sql
```

### Performance
```bash
# Conectar
psql -U winner -d winner_store

# Ver queries lentas
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

# Crear índices si falta
CREATE INDEX idx_sales_timestamp ON sales(timestamp);
CREATE INDEX idx_inventory_qty_zero ON inventory(qty) WHERE qty = 0;
```

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| Conexión rechazada | Verificar host, port, credenciales |
| BD no existe | `CREATE DATABASE winner_store;` |
| Usuario no tiene permisos | `GRANT ALL ON DATABASE ... TO user;` |
| "too many connections" | Aumentar `max_connections` en postgresql.conf |
| Lento | Ver índices, ejecutar `VACUUM ANALYZE;` |
| Quiero volver a SQLite | Cambiar `DB_TYPE=sqlite` en .env |

---

## 💡 Recomendación Final

**Para desarrollo:** SQLite local (instalado, sin setup)
**Para producción:** 
- **Presupuesto $0-5/mes:** Tu VPS + PostgreSQL local
- **Presupuesto $5-15/mes:** Railway PostgreSQL (más fácil)
- **Presupuesto $15+/mes:** Managed (AWS RDS, Supabase, Render)

---

**¡Listo para usar PostgreSQL! 🚀**
