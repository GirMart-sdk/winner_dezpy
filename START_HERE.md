# 🚀 START HERE — Tu Sistema Está Listo

**¡Buenas noticias!** Tu e-commerce ahora tiene **soporte automático para SQLite (desarrollo) y PostgreSQL (producción)** sin cambios de código.

---

## ⚡ OPCIÓN 1: EMPEZAR EN 30 SEGUNDOS (Windows)

```bash
start.bat
```

Esto:
1. ✅ Instala dependencias
2. ✅ Carga 25 productos + 45 ventas
3. ✅ Inicia servidor en http://localhost:3000

---

## ⚡ OPCIÓN 1B: EMPEZAR EN 30 SEGUNDOS (macOS/Linux)

```bash
chmod +x start.sh
./start.sh
```

---

## 📱 Accede a Tu App

### Tienda Online
```
http://localhost:3000
```

### Admin Panel
```
http://localhost:3000/admin-panel.html
Usuario: admin
Password: winner2026
```

### API (para testing)
```bash
curl -H "X-API-Key: dev-api-key" http://localhost:3000/api/products
```

---

## 📚 PRÓXIMOS PASOS

### 1️⃣ Test Básico (Ahora mismo)
- [x] Ejecuta `start.bat` o `start.sh`
- [x] Abre http://localhost:3000 en tu navegador
- [x] Verifica que aparecen los 25 productos
- [x] Entra al admin con admin/winner2026

### 2️⃣ Test PostgreSQL (Opcional)
Si quieres probar PostgreSQL localmente:
- Instala PostgreSQL: https://www.postgresql.org/download/
- Lee: [QUICK_TEST_PG.md](QUICK_TEST_PG.md)
- Cambiar BD es tan solo editar `.env` y ejecutar `npm run seed`

### 3️⃣ Deployment a Web (Próxima)
Cuando estés listo para lanzar:
- Lee: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Recomendado: Railway (`$5/mes` gratuito)
- Alternativas: Render, Vercel, Docker, VPS

---

## 📄 DOCUMENTACIÓN

| Archivo | Propósito |
|---------|-----------|
| **README.md** | Overview del proyecto |
| **POSTGRESQL_INTEGRATION_SUMMARY.md** | ⭐ Qué se cambió (PostgreSQL support) |
| **QUICK_TEST_PG.md** | Cómo testear ambas bases de datos |
| **DEPLOYMENT_GUIDE.md** | Cómo deployar a web |
| **POSTGRESQL_GUIDE.md** | Guía completa de PostgreSQL |
| **PRE_DEPLOYMENT_CHECKLIST.md** | Verificaciones antes de lanzar |

---

## 🎯 ARQUITECTURA

Tu app ahora es **database-agnostic** (no depende de una BD específica):

```
┌─────────────────────┐
│   Tu Frontend       │
│ (HTML/CSS/JS)       │
└────────┬────────────┘
         │ HTTP
┌────────▼────────────┐
│  Node.js/Express    │
│   (API Backend)     │
└────────┬────────────┘
         │
    ┌────▼────┐
    │database. │ Detecta automatically:
    │   js    │ DB_TYPE='sqlite' → SQLite 📁
    └────┬────┘ DB_TYPE='postgres' → PostgreSQL 🐘
         │
    ┌────┴─────────┐
    ▼              ▼
  SQLite       PostgreSQL
  (local)      (remote/prod)
```

---

## 🔧 CAMBIAR BASE DE DATOS

### Cambiar de SQLite → PostgreSQL

1. **Edita** `backend/.env`:
```bash
# ANTES:
DB_TYPE=sqlite
DB_PATH=./winner_store.db

# DESPUÉS:
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=winner_store
DB_USER=postgres
DB_PASSWORD=postgres
```

2. **Ejecuta**:
```bash
npm run seed
npm start
```

**¡Eso es todo!** Sin cambios de código. La API es idéntica.

---

## ✅ CHECKLIST

**Desarrollo Local:**
- [ ] Ejecuté `start.bat` sin errores
- [ ] Veo 25 productos en http://localhost:3000
- [ ] Admin panel carga correctamente
- [ ] Puedo ver las ventas en el panel admin

**Testing PostgreSQL (Opcional):**
- [ ] Instalé PostgreSQL localmente
- [ ] Edité .env con credenciales PostgreSQL
- [ ] Ejecuté `npm run seed` sin errores
- [ ] Servidor conecta a PostgreSQL (verificado en logs)
- [ ] API responde igual que con SQLite

**Deployment:**
- [ ] Leí DEPLOYMENT_GUIDE.md
- [ ] Elegí plataforma (Railway recomendado)
- [ ] Configuré variables de ambiente en producción
- [ ] Hice push a GitHub
- [ ] Deployé correctamente
- [ ] Mi app está online 🎉

---

## 💬 COMANDOS ÚTILES

```bash
# Instalar dependencias
npm install

# Cargar datos de prueba (25 productos + 45 ventas)
npm run seed

# Iniciar servidor
npm start

# Limpiar base de datos (elimina todos los datos)
rm backend/winner_store.db

# Parar servidor
CTRL+C
```

---

## 🆘 PROBLEMAS COMUNES

**"Cannot find module 'pg'"**
```bash
npm install  # Ejecuta desde backend/
```

**"Database locked" (SQLite)**
```bash
rm backend/winner_store.db
npm run seed
npm start
```

**"Cannot connect to PostgreSQL"**
```bash
# Verificar que PostgreSQL está corriendo
psql -U postgres
# Si no funciona, instala desde postgresql.org
```

**Productos no aparecen**
```bash
npm run seed  # Asegúrate de ejecutar seed primero
```

---

## 🎉 ¡SIGUIENTES PASOS!

1. **Ahora:**
   - Ejecuta `start.bat` o `start.sh`
   - Verifica que todo funciona

2. **Después (Opcional):**
   - Prueba PostgreSQL si quieres
   - Lee [QUICK_TEST_PG.md](QUICK_TEST_PG.md)

3. **Cuando esté listo:**
   - Lee [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
   - Deploy a Railway/Render/Vercel 🚀

4. **En Producción:**
   - Cambia API_KEY y JWT_SECRET en `.env`
   - Usa PostgreSQL remoto (más confiable)
   - Configura HTTPS/SSL
   - Listo para recibir clientes 💰

---

**¿Preguntas?** Revisa los archivos de documentación. Todo está documentado. 📚

**¿Listo?** Ejecuta `start.bat` y abre http://localhost:3000 💪
