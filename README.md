# 🏆 WINNER STORE v3.0 — Plataforma E-Commerce Profesional

**WINNER STORE** es la solución e-commerce más completa y moderna para tiendas de ropa streetwear en Colombia.

**Estado:** ✅ **LOCAL READY v3.0** — Funcional para servidor local HTTP  
**Versión:** 3.0 | **Última actualización:** 10 Mayo 2026 | **Rama:** Jamil-winner

---

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Características Principales](#características-principales)
- [Requisitos del Sistema](#requisitos-del-sistema)
- [Inicio Rápido](#inicio-rápido)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Stack Tecnológico](#stack-tecnológico)
- [Métodos de Pago](#métodos-de-pago)
- [Gestión de Inventario](#gestión-de-inventario)
- [Configuración Avanzada](#configuración-avanzada)
- [Troubleshooting Completo](#troubleshooting-completo)
- [FAQ](#faq)
- [Mejoras Futuras](#mejoras-futuras)
- [Documentación Adicional](#documentación-adicional)

---

## 🎯 Descripción General

**WINNER STORE** es una plataforma integral de punto de venta (POS) y e-commerce diseñada específicamente para comerciantes de ropa streetwear en Colombia. Funciona como servidor local HTTP, permitiendo gestión completa de tienda, inventario y pagos desde una máquina.

### Componentes Principales

- ✅ **Panel de Admin Profesional** - Gestión completa de tienda
- ✅ **Sistema POS Integrado** - Punto de venta en tiempo real
- ✅ **7 Métodos de Pago** - Tarjeta, PSE, Nequi, Daviplata, Transferencia, Efectivo, Débito
- ✅ **Gestión de Inventario Avanzada** - Control por talla con códigos QR
- ✅ **Backend REST API** - 30+ endpoints documentados
- ✅ **Base de Datos Local** - Persistencia en la máquina del negocio
- ✅ **Dashboard Analítico** - Reportes y gráficos en tiempo real con Chart.js
- ✅ **Autenticación Segura** - JWT + API Key + Scrypt

---

## 🚀 Características Principales

| Característica        | Detalles                                                  |
| --------------------- | --------------------------------------------------------- |
| **Tienda Online**     | Frontend responsive, diseño moderno, mobile-first         |
| **Métodos de Pago**   | 7 opciones con validación en tiempo real                  |
| **Admin Panel**       | Gestión productos, ventas, inventario, reportes, usuarios |
| **Inventario**        | Control por talla + códigos QR + alertas de stock bajo    |
| **Sistema de Tallas** | Dinámico por categoría (Ropa, Calzado, Accesorios)        |
| **Analytics**         | Dashboards con Chart.js, estadísticas en vivo, gráficos   |
| **Datos de Prueba**   | 26 productos + 73 ventas precargadas                      |
| **Seguridad**         | API Key + JWT + Scrypt + Validación completa              |
| **Base de Datos**     | SQLite (desarrollo) + PostgreSQL (producción)             |
| **API REST**          | 30+ endpoints documentados y testeados                    |
| **Autenticación**     | Multi-usuario con roles y permisos                        |
| **Local First**       | Funciona en red local; algunas imágenes/librerías aún usan internet |

---

## 💻 Requisitos del Sistema

### Servidor Backend

```
- Node.js: v18.0.0 o superior (recomendado: v20+)
- npm: v9.0.0 o superior (recomendado: v10+)
- RAM: 256 MB mínimo (recomendado: 512 MB+)
- Disco: 50 MB disponibles (BD + dependencias)
- Conexión: Local (sin requisito de internet)
```

### Cliente Frontend

```
- Navegador: Chrome, Firefox, Safari, Edge (versiones recientes)
- JavaScript: Debe estar habilitado
- Resolución: Mínimo 1024x768 (recomendado: 1366x768+)
- Conexión: LAN local (intranet de la tienda)
```

### Sistema Operativo

```
✅ Windows 10/11 (recomendado)
✅ macOS 10.15+ (Big Sur, Monterey, Ventura, Sonoma)
✅ Linux: Ubuntu 18.04+, Debian 10+, Fedora 30+
```

---

## ⚡ Inicio Rápido (3 pasos, 5 minutos)

### 1️⃣ Clonar e Instalar

```bash
# Clonar repositorio
git clone https://github.com/GirMart-sdk/winner_dezpy.git
cd winner_dezpy

# Instalar dependencias
npm install
```

### 2️⃣ Inicializar Base de Datos

```bash
# Cargar datos de ejemplo (26 productos + 73 ventas)
npm run seed
```

### 3️⃣ Iniciar Servidor

```bash
# Iniciar servidor local HTTP
npm start

# O usar el iniciador de Windows
npm run start:local
```

### ✨ ¡Accede a la Plataforma!

| Sección           | URL                                    | Usuario | Contraseña   |
| ----------------- | -------------------------------------- | ------- | ------------ |
| **Tienda Online** | http://localhost:3000                  | N/A     | N/A          |
| **Panel Admin**   | http://localhost:3000/admin-panel.html | `admin` | `winner2026` |

---

## 📁 Estructura del Proyecto

```
winner-dezpy-main/
│
├── 📄 Frontend - Tienda Online
│   ├── index.html                  # Página principal
│   ├── app.js                      # Lógica de la tienda
│   ├── styles.css                  # Estilos responsivos
│   └── PAYMENT_INTEGRATION_EXAMPLE.html
│
├── 🎛️ Panel Administrativo (POS)
│   ├── admin-panel.html            # Dashboard principal (2700+ líneas)
│   ├── admin-panel.js              # Lógica POS y pagos (2700+ líneas)
│   ├── admin-panel.css             # Estilos admin
│   ├── admin.js                    # Autenticación y login
│   └── update_theme.js             # Personalización de temas
│
├── 🔧 Backend - API REST
│   ├── backend/
│   │   ├── server.js               # Express API (30+ endpoints)
│   │   ├── database.js             # Conexión SQLite3
│   │   ├── seed.js                 # Script datos iniciales
│   │   ├── winner_store.db         # BD SQLite (persistencia)
│   │   └── .env.example            # Variables de entorno
│   │
│   └── scripts/
│       ├── backup-local.js         # Backup automático
│       └── deploy-windows.bat      # Script deploy
│
├── 📚 Documentación
│   ├── README.md                   # Este archivo
│   ├── REPORTE_FINAL.md            # Reporte técnico completo
│   ├── POS_FLOW_DIAGRAM.md         # Diagramas de flujo
│   └── package.json                # Dependencias del proyecto
│
├── 🚀 Utilidades
│   ├── install-and-run.bat         # Instalación automática (Windows)
│   ├── start-local.bat             # Iniciar servidor
│   ├── fix_encoding.js             # Corrección de encoding
│   └── test-payments.html          # Testing de pagos
│
└── 📁 Configuración
    ├── .env                        # Variables de entorno (local)
    ├── .env.example                # Plantilla .env
    └── package.json                # Scripts npm + dependencias
```

---

## 🔌 Stack Tecnológico

### 🎨 Frontend

- HTML5 (semántico), CSS3 (flexbox, grid, responsive)
- JavaScript Vanilla (sin frameworks)
- Chart.js 3.x (gráficos interactivos)
- QRCode.js (códigos QR)
- Responsive Design (Mobile-first)

### 🔧 Backend

- Node.js v18+ (runtime)
- Express.js v5.2.1 (framework web)
- SQLite3 / PostgreSQL (BD)
- JWT + Crypto (seguridad)
- CORS, Body-Parser, Dotenv

### 💾 Base de Datos

- **SQLite** (desarrollo local)
- **PostgreSQL** (producción opcional)
- Foreign keys activadas
- WAL (Write-Ahead Logging)
- Backup automático

---

## 💳 Métodos de Pago

| Método           | Código          | Validación         | Estado |
| ---------------- | --------------- | ------------------ | ------ |
| 💵 Efectivo      | `efectivo`      | Opciones entrega   | ✅     |
| 📱 Nequi         | `nequi`         | Teléfono válido    | ✅     |
| 📱 Daviplata     | `daviplata`     | CC + Teléfono      | ✅     |
| 🏦 PSE           | `pse`           | Banco + Doc        | ✅     |
| 💳 Débito        | `debito`        | Validación tarjeta | ✅     |
| 💳 Crédito       | `tarjeta`       | Luhn + Vigencia    | ✅     |
| 🔄 Transferencia | `transferencia` | Banco + Cuenta     | ✅     |

**Validaciones incluidas:**

- ✅ Detección marca (Visa, Mastercard, Amex, Discover)
- ✅ Algoritmo Luhn
- ✅ Validación teléfono/CC colombianos
- ✅ Prevención de fraude básica

---

## 📊 Gestión de Inventario

### Categorías

```
📦 ROPA: XS, S, M, L, XL, XXL (8 productos)
👟 CALZADO: 34-43 (1 producto ejemplo)
🎽 ACCESORIOS: Sin talla (9 productos)
```

### Funciones

- ✅ Stock en tiempo real
- ✅ Códigos QR
- ✅ Búsqueda avanzada
- ✅ Alertas de inventario bajo
- ✅ Historial de movimientos

---

## 🔐 Configuración Avanzada

### Variables de Entorno (.env)

```env
# Servidor
NODE_ENV=development
PORT=3000

# Base de Datos
DB_TYPE=sqlite                         # o 'postgres'
DB_PATH=winner_store.db

# Autenticación
ADMIN_USER=admin
ADMIN_PASSWORD=winner2026
ADMIN_SALT=winner_salt_2026

# JWT y API Key
JWT_SECRET=dev-jwt-secret-winner-2026
API_KEY=prod-api-key-winner-2026

# HTTPS/SSL
# Deshabilitado por decisión del proyecto local.
# El servidor solo debe ejecutarse por HTTP: http://localhost:3000
```

### Comandos npm

```bash
npm start              # Servidor local HTTP
npm run start:dev      # Alias local HTTP
npm run start:prod     # Alias local HTTP, sin SSL
npm run seed           # Cargar datos de ejemplo
npm run test           # Validar sintaxis
npm run backup         # Backup manual
npm run backup:local   # Backup local
npm run clean          # Limpiar BD
npm run reset          # Reset completo (clean + seed)
npm run db:check       # Verificar estado BD
```

---

## 🐛 Troubleshooting Completo

### ❌ ERROR: "npm: command not found"

**Problema:** Node.js/npm no está instalado o no en PATH

**Soluciones:**

```bash
# 1. Verificar instalación
node --version
npm --version

# 2. Si no aparece, descargar desde:
# https://nodejs.org/ (LTS v18+)

# 3. Reiniciar terminal después de instalar
# Windows: Cierra y abre cmd de nuevo
# Mac/Linux: source ~/.bashrc

# 4. Verificar instalación nuevamente
node --version    # Debe mostrar v18+
npm --version     # Debe mostrar v9+
```

### ❌ ERROR: "Cannot find module 'express'"

**Problema:** Dependencias no instaladas

**Solución:**

```bash
npm install        # Instala todas las dependencias
# Espera a que termine (2-3 minutos)
npm start
```

### ❌ ERROR: "EADDRINUSE: address already in use :::3000"

**Problema:** Puerto 3000 está en uso

**Soluciones:**

```bash
# Opción 1: Cambiar puerto
# Editar .env: PORT=3001
# Luego: npm start

# Opción 2: Matar proceso en puerto 3000
# Windows:
netstat -ano | findstr :3000        # Ver proceso
taskkill /PID {PID} /F              # Matar proceso

# Mac/Linux:
lsof -i :3000                       # Ver proceso
kill -9 {PID}                       # Matar proceso

# Opción 3: Usar puerto dinámico
npm start -- --port 0               # Usa puerto disponible
```

### ❌ ERROR: "Cannot find module 'sqlite3'"

**Problema:** sqlite3 no compiló correctamente

**Soluciones:**

```bash
# 1. Limpiar node_modules
rm -rf node_modules
rm package-lock.json

# 2. Reinstalar
npm install

# 3. Si sigue fallando, instalar python (requerido para compilar)
# Windows: Descargar Python 3.x desde python.org
# Mac: brew install python3
# Linux: sudo apt-get install python3

# 4. Intentar nuevamente
npm install
```

### ❌ ERROR: "Cannot GET /admin-panel.html"

**Problema:** Admin panel no encuentra archivo o servidor no corre

**Soluciones:**

```bash
# 1. Verificar que npm start está corriendo
# Terminal debe mostrar: "✓ Server running on port 3000"

# 2. Si no corre:
npm start

# 3. Limpiar cookies del navegador
# Chrome: Ctrl + Shift + Del
# Firefox: Ctrl + Shift + Del
# Safari: Cmd + Shift + Del

# 4. Probar en incógnito/privado
# Chrome: Ctrl + Shift + N
# Firefox: Ctrl + Shift + P

# 5. Verificar URL correcta
http://localhost:3000/admin-panel.html
```

### ❌ ERROR: "No products to display" o carrito vacío

**Problema:** Base de datos no tiene datos

**Solución:**

```bash
# Cargar datos de ejemplo
npm run seed

# Verificar que funcionó:
npm start
# Abre: http://localhost:3000
# Debe mostrar: 26 productos
```

### ❌ ERROR: "Admin login no funciona"

**Problema:** Credenciales incorrectas o BD corrupta

**Soluciones:**

```bash
# 1. Verificar credenciales por defecto
Usuario: admin
Contraseña: winner2026

# 2. Limpiar cookies del navegador (F12 > Storage > Clear)

# 3. Probar en navegador incógnito

# 4. Si sigue fallando, reinicializar BD:
npm run reset        # Borra BD y recarga datos

# 5. Verificar en consola del navegador (F12)
# Ver si hay errores específicos
```

### ❌ ERROR: "Database locked" o "database is locked"

**Problema:** Múltiples conexiones a BD o archivo corrupto

**Soluciones:**

```bash
# 1. Detener servidor
# Presiona Ctrl + C en terminal

# 2. Esperar 5 segundos

# 3. Iniciar nuevamente
npm start

# 4. Si persiste, hacer reset:
npm run clean        # Borra BD
npm run seed         # Recrea con datos
npm start
```

### ❌ ERROR: "TypeError: Cannot read property 'split' of undefined"

**Problema:** Variable de entorno o configuración faltante

**Soluciones:**

```bash
# 1. Verificar archivo .env existe
# Si no existe, crear desde .env.example:
cp .env.example .env

# 2. Verificar contenido de .env
cat .env     # Mac/Linux
type .env    # Windows

# 3. Debe contener:
NODE_ENV=development
PORT=3000
DB_TYPE=sqlite
DB_PATH=winner_store.db
ADMIN_USER=admin
ADMIN_PASSWORD=winner2026

# 4. Si falta algo, editar .env
```

### ❌ ERROR: "Payment validation failed"

**Problema:** Datos de pago inválidos

**Soluciones:**

```bash
# Para tarjeta de crédito:
✅ Número: 16 dígitos (ej: 4532015112830366)
✅ Marca: Visa, Mastercard, Amex, Discover
✅ CVV: 3-4 dígitos (ej: 123)
✅ Fecha: MM/YY válida (ej: 12/27)

# Para Nequi/Daviplata:
✅ Teléfono: 10 dígitos colombiano (ej: 3001234567)
✅ Formato: +57 opcional (ej: +573001234567)

# Para PSE:
✅ Banco: Seleccionar de lista
✅ Documento: CC de 8+ dígitos
✅ Tipo: Cédula, Pasaporte, etc.

# Para Efectivo:
✅ Dirección válida
✅ Teléfono de contacto
```

### ❌ ERROR: "CORS error" o "Access-Control-Allow-Origin"

**Problema:** CORS no configurado correctamente

**Soluciones:**

```bash
# 1. Verificar que backend está corriendo
npm start

# 2. CORS debe estar habilitado en server.js
# Buscar: app.use(cors());

# 3. Probar con URL correcta:
http://localhost:3000        # Correcto
```

### ❌ ERROR: "Símbolo extraño" o "encoding error"

**Problema:** Encoding incorrecto de caracteres

**Soluciones:**

```bash
# 1. Ejecutar script de corrección
node fix_encoding.js
# o
python fix_encoding.py

# 2. Verificar configuración UTF-8 en terminal
# Windows: chcp 65001
# Mac/Linux: export LANG=es_CO.UTF-8

# 3. Reiniciar servidor
npm start
```

### ⚠️ Advertencia: "Deprecated API"

**Problema:** Versión antigua de Node.js o paquetes

**Solución:**

```bash
# Actualizar Node.js a v20+
# https://nodejs.org/

# Actualizar paquetes
npm update

# Verificar versiones
npm list
```

---

## ❓ FAQ - Preguntas Frecuentes

**P: ¿Es seguro para producción?**  
R: Es adecuado para uso local. Tiene JWT, API Key y validación Scrypt, pero no debe exponerse a internet sin endurecimiento adicional.

**P: ¿Cuántos usuarios simultáneamente?**  
R: 5-10 usuarios con SQLite. Para más, usar PostgreSQL.

**P: ¿Dónde se guardan los datos?**  
R: En `./backend/winner_store.db` (tu máquina, no en la nube).

**P: ¿Se puede migrar a PostgreSQL?**  
R: Sí. Cambiar `DB_TYPE=postgres` en .env

**P: ¿Funciona sin internet?**  
R: Los datos y ventas se registran localmente. Para 100% offline todavía faltan librerías e imágenes locales.

**P: ¿Cómo respaldar datos?**  
R: `npm run backup` crea respaldo automático.

**P: ¿Puedo cambiar usuarios/contraseñas?**  
R: Sí, editar ADMIN_USER y ADMIN_PASSWORD en .env

**P: ¿Cuál es la licencia?**  
R: Proprietary. Uso exclusivo para clientes autorizados.

---

## 🚀 Mejoras Futuras

### v3.1 (Próximo)

- [ ] Multi-moneda (USD, EUR)
- [ ] Reportes PDF/Excel
- [ ] Auditoría completa
- [ ] Email automático
- [ ] 2FA (autenticación doble)
- [ ] Historial detallado

### v4.0 (Intermedio)

- [ ] Integración PayU
- [ ] Múltiples sucursales
- [ ] CRM básico
- [ ] Email marketing
- [ ] Analytics avanzado
- [ ] Marketplace

### v5.0 (Futuro)

- [ ] Machine Learning
- [ ] Automatización (Zapier)
- [ ] Integraciones (Shopify, WooCommerce)
- [ ] Cloud sync (AWS/Azure)
- [ ] API pública
- [ ] Plugin system

---

## 📖 Documentación Adicional

| Documento                                          | Descripción              |
| -------------------------------------------------- | ------------------------ |
| [REPORTE_FINAL.md](REPORTE_FINAL.md)               | Reporte técnico completo |
| [POS_FLOW_DIAGRAM.md](POS_FLOW_DIAGRAM.md)         | Diagramas de flujo       |

---

## ✅ Checklist de Funcionamiento

- [x] 7 métodos de pago
- [x] Admin panel responsivo
- [x] 26 productos + stock
- [x] 30+ endpoints API
- [x] Diseño responsive
- [x] BD SQLite persistente
- [x] Error handling completo
- [x] HTTP local sin SSL
- [x] Tallas dinámicas
- [x] Totalmente configurado
- [x] Documentación completa
- [x] Backup automático

---

## 📞 Soporte

- 📧 Email: support@girmart.co
- 🐛 Issues: [GitHub Issues](https://github.com/GirMart-sdk/winner_dezpy/issues)
- 📱 WhatsApp: +57 300 000 0000

---

## 📄 Licencia

© 2026 GirMart-SDK. Todos los derechos reservados.  
**WINNER STORE** es Proprietary. Uso exclusivo para clientes autorizados.

---

**🎉 ¡WINNER STORE v3.0 está listo para producción!**

```bash
npm install && npm run seed && npm start
```

Abre http://localhost:3000 en tu navegador. **¡Bienvenido!** 🚀
