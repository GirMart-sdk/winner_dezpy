# 🔒 Configuración HTTPS/SSL/TLS

**Propósito:** Guía para usar HTTPS en producción con certificados SSL/TLS  
**Actualizado:** 2 de abril 2026

---

## 🚨 Por qué HTTPS es Obligatorio

Las pasarelas de pago (Wompi, PSE, Nequi) **solo funcionan en HTTPS** por seguridad:

```
❌ http://tu-sitio.com      ← Bloqueado por navegadores
✅ https://tu-sitio.com     ← Permitido y seguro
```

---

## 🛠️ Obtener Certificado SSL/TLS

### **Opción 1: Let's Encrypt (GRATIS) - RECOMENDADO**

#### **1.1 Usando Certbot**

**Instalar Certbot:**
```bash
# Windows
choco install certbot

# macOS
brew install certbot

# Ubuntu/Debian
sudo apt-get install certbot
```

**Generar certificado:**
```bash
certbot certonly --standalone -d tu-dominio.com -d www.tu-dominio.com
```

**Ubicación de certificados:**
```
Linux/Mac:
- Certificado: /etc/letsencrypt/live/tu-dominio.com/fullchain.pem
- Clave privada: /etc/letsencrypt/live/tu-dominio.com/privkey.pem

Windows:
- Certificado: C:\Certbot\live\tu-dominio.com\fullchain.pem
- Clave privada: C:\Certbot\live\tu-dominio.com\privkey.pem
```

#### **1.2 Auto-renovación (Let's Encrypt caduca cada 90 días)**

```bash
# Linux/Mac
sudo certbot renew --dry-run   # Test
sudo certbot renew              # Renovar

# Agregar a cron para auto-renovar
sudo crontab -e
# Agregar: 0 3 * * * /usr/bin/certbot renew --quiet
```

### **Opción 2: Certificado Comercial**

**Proveedores:**
- DigiCert: $200-800/año
- Sectigo: $50-300/año
- SSL.com: $50-200/año

**Ventajas:**
- Soporte de proveedor
- Wildcard (* .tu-dominio.com)
- Garantía de confianza

---

## 📋 Configurar en .env

```env
# Producción - HTTPS
NODE_ENV=production
CERT_PATH=/etc/letsencrypt/live/tu-dominio.com/fullchain.pem
KEY_PATH=/etc/letsencrypt/live/tu-dominio.com/privkey.pem
HTTPS_PORT=443
HTTP_PORT=80

# Desarrollo - HTTP local
# NODE_ENV=development
# (No necesita CERT_PATH ni KEY_PATH)

# URLs permitidas en CORS
ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com,http://localhost:3000
```

---

## 🚀 Desplegar servidor HTTPS

### **Paso 1: Verificar certificados**
```bash
# Probar lectura de archivos
ls -la /etc/letsencrypt/live/tu-dominio.com/

# Probar permisos
sudo chmod 644 /etc/letsencrypt/live/tu-dominio.com/fullchain.pem
sudo chmod 644 /etc/letsencrypt/live/tu-dominio.com/privkey.pem
```

### **Paso 2: Actualizar archivo .env**
```bash
# En servidor de producción
export NODE_ENV=production
export CERT_PATH=/etc/letsencrypt/live/tu-dominio.com/fullchain.pem
export KEY_PATH=/etc/letsencrypt/live/tu-dominio.com/privkey.pem
export HTTPS_PORT=443
export HTTP_PORT=80
```

### **Paso 3: Iniciar servidor**
```bash
cd backend
npm install  # Instalar dependencias
node server.js
```

**Salida esperada:**
```
╔══════════════════════════════════════════════╗
║   WINNER STORE  —  Servidor v2.0 (HTTPS)    ║
╠══════════════════════════════════════════════╣
║   🔒  https://winner.com                     ║
║   🔑  Admin: admin / winner2026              ║
║   📦  API:   /api/products                  ║
║   📊  Stats: /api/stats                     ║
║   🛒  Feed:  /merchant-feed.csv             ║
║   🌐  HTTP:  puerto 80 → HTTPS               ║
╚══════════════════════════════════════════════╝
   ↳ HTTP redirect activo en puerto 80
```

---

## 🔄 Flujo de Redirección HTTPS

```
Cliente accede a http://tu-dominio.com
    ↓
Servidor HTTP (puerto 80) recibe request
    ↓
Redirecciona a https://tu-dominio.com
    ↓
Servidor HTTPS (puerto 443) responde
    ↓
Navegador muestra 🔒 (sitio seguro)
```

---

## 🧪 Testing HTTPS Localmente

### **Generar certificado autofirmado para desarrollo**

```bash
# Generar certificado autofirmado (válido 365 días)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Preguntas:
# Country: CO
# State/Province: Cundinamarca
# Locality: Bogotá
# Organization: Winner
# Common Name: localhost

# Resultado:
# - cert.pem (certificado)
# - key.pem (clave privada)
```

### **Configurar .env local con certificado autofirmado**

```env
NODE_ENV=development
CERT_PATH=./cert.pem
KEY_PATH=./key.pem
HTTPS_PORT=3443
HTTP_PORT=3000
```

### **Acceder localmente**

```
✅ https://localhost:3443
❌ http://localhost:3000  (se redirecciona a HTTPS)
```

**Advertencia en navegador:**
- Chrome: "Tu conexión no es privada"
- Firefox: "Conexión no segura"

✅ **Esto es normal para certificados autofirmados en desarrollo**

Hacer clic en "Continuar" o "Excepciones"

---

## 📊 Verificar Certificado HTTPS

### **En terminal**

```bash
# Ver detalles del certificado
openssl s_client -connect tu-dominio.com:443

# Ver cuándo caduca
openssl s_client -connect tu-dominio.com:443 -showcerts | grep -A 5 "Not After"

# Validar con ssllabs.com
# https://www.ssllabs.com/ssltest/analyze.html?d=tu-dominio.com
```

### **En navegador**

1. Ir a https://tu-dominio.com
2. Click en 🔒 (candado) en barra de direcciones
3. Ver "Certificado válido"
4. Detalles del certificado

---

## 🔐 Headers de Seguridad (Automático en HTTPS)

```javascript
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

Estos headers:
- ✅ Previenen ataques MITM
- ✅ Bloquean clickjacking
- ✅ Evitan sniffing
- ✅ Protegen contra XSS

---

## ⚠️ Problemas Comunes

### **Error: "EACCES: permission denied"**

**Causa:** El servidor requiere permisos root para puertos < 1024

**Solución:**
```bash
# Opción 1: Usar puertos altos en desarrollo
HTTPS_PORT=8443
HTTP_PORT=8080

# Opción 2: Ejecutar con sudo en producción (no recomendado)
sudo node server.js

# Opción 3: Usar proxy reverso (Nginx, Apache)
# Ver sección "Nginx" abajo
```

### **Error: "CERT_FILE_NOT_FOUND"**

**Causa:** Rutas incorrectas en .env

**Verificar:**
```bash
ls -la $CERT_PATH
ls -la $KEY_PATH

# Ver variables de entorno
echo $CERT_PATH
echo $KEY_PATH
```

### **Navegador: "Certificado Inválido o Caducado"**

**Solución:**
```bash
# Renovar Let's Encrypt
sudo certbot renew --force-renewal

# Reiniciar servidor
node server.js
```

---

## 🔄 Nginx con SSL (Recomendado para Producción)

**Ventajas:**
- Manejo automático de certificados
- Mejor rendimiento
- Fácil de escalar

**Configurar Nginx:**

```nginx
# /etc/nginx/sites-available/default

upstream backend {
  server localhost:3000;
}

# Redireccionar HTTP → HTTPS
server {
  listen 80;
  listen [::]:80;
  server_name tu-dominio.com www.tu-dominio.com;
  
  return 301 https://$server_name$request_uri;
}

# Servidor HTTPS
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name tu-dominio.com www.tu-dominio.com;
  
  # Certificados SSL
  ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
  
  # Configuración SSL segura
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  
  # Headers de seguridad
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  
  # Proxy a backend
  location / {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**Validar configuración:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## ✅ Checklist Producción

- [ ] Certificado SSL/TLS obtenido (Let's Encrypt o comercial)
- [ ] .env configurado con rutas correctas
- [ ] NODE_ENV=production
- [ ] HTTPS_PORT=443, HTTP_PORT=80
- [ ] Permisos de archivo correctos
- [ ] Firewall permite puertos 80 y 443
- [ ] DNS apunta a tu servidor
- [ ] Servidor HTTPS inicia sin errores
- [ ] Redirección HTTP → HTTPS funciona
- [ ] Certificado válido en navegador
- [ ] API responde por HTTPS
- [ ] Pasarelas Wompi/PSE procesan pagos
- [ ] Email de confirmación funciona
- [ ] Renovación automática de certificado

---

## 📞 Soporte

**Let's Encrypt Support:**
- https://letsencrypt.org/docs/

**Certbot Documentation:**
- https://certbot.eff.org/

**Nginx SSL:**
- https://nginx.org/en/docs/http/ngx_http_ssl_module.html

---

**🔒 Ahora tu tienda Winner es 100% segura con HTTPS**
