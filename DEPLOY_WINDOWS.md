# 🚀 DESPLIEGUE WINNER STORE en Windows Server 2022/2019

## 📋 Requisitos Previos

```
- Windows Server 2019+ (IIS 10+ recomendado)
- Node.js 18+ LTS
- Git
- OpenSSL (para SSL)
- Acceso Administrador
```

## 🎯 PASO 1: Instalar Node.js y Git

```powershell
# Descargar desde https://nodejs.org (LTS)
# O usar winget:
winget install OpenJS.NodeJS.LTS
winget install Git.Git

# Verificar
node --version
npm --version
git --version
```

## 🎯 PASO 2: Preparar el Servidor

```powershell
# Crear carpetas
mkdir C:\winner-store
cd C:\winner-store

# Clonar proyecto
git clone https://github.com/GirMart-sdk/winner_dezpy.git .
git checkout main

# Instalar dependencias
npm install --production
```

## 🎯 PASO 3: Configurar Variables

```powershell
# Copiar env producción
copy .env.production .env

# EDITAR .env con tu API_KEY personalizada y dominio
notepad .env
```

## 🎯 PASO 4: Base de Datos

```powershell
# Sembrar datos iniciales (25 productos + 73 ventas)
npm run seed

# Verificar BD
dir backend\winner_store.db
```

## 🎯 PASO 5: Instalar PM2 (Process Manager)

```powershell
npm install -g pm2
pm2 --version
```

## 🎯 PASO 6: Iniciar con PM2

```powershell
# Probar local
npm start

# Si funciona OK (localhost:3000):
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Seguír instrucciones
pm2 logs winner-store
```

## 🎯 PASO 7: Configurar IIS como Proxy Reverso

### 1. Instalar URL Rewrite y ARR

```
Panel IIS → Server → Roles → Add Role Services
→ Web Server → Application Development → URL Rewrite
→ Application Request Routing
```

### 2. Crear Site en IIS

```
IIS Manager → Sites → Add Website
Name: winner-store
Physical path: C:\winner-store
Port: 80 (HTTP) / 443 (HTTPS)
```

### 3. Configurar web.config

Crear `web.config` en `C:\winner-store`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyInboundRule1" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".db"
               mimeType="application/octet-stream" />
    </staticContent>
  </system.webServer>
</configuration>
```

## 🎯 PASO 8: SSL Gratuito con Win-Acme (Alternativa Certbot)

**Opción 1: Win-Acme (Recomendado - Fácil para IIS)**

```powershell
# 1. Descargar Win-Acme: https://github.com/win-acme/win-acme/releases
# 2. Ejecutar como Administrador
# 3. Seleccionar: IIS → tu-dominio.com → Email → Auto-renew

# Los certificados se instalan automáticamente en IIS
```

**Opción 2: SSL Gratuito con ZeroSSL (Web)**

```powershell
# 1. Ir a https://zerossl.com
# 2. Crear cuenta gratis
# 3. Generar certificado para tudominio.com
# 4. Descargar cert.pem + privkey.pem → ./certs/
```

**Opción 3: Self-signed (Desarrollo)**

```powershell
powershell -Command "
  New-SelfSignedCertificate -DnsName 'localhost', 'tu-servidor-ip' -CertStoreLocation 'cert:\LocalMachine\My' | Out-Null;
  $cert = Get-ChildItem -Path cert:\LocalMachine\My\[thumbprint];
  Export-Certificate -Cert $cert -FilePath './certs/cert.pem';
  $privateKey = $cert.PrivateKey.ExportPkcs8PrivateKey();
  [System.IO.File]::WriteAllBytes('./certs/key.pem', $privateKey);
  echo '✅ Certificados generados en ./certs/'
"
```

**Configurar Node.js HTTPS** (después de generar certs):

```powershell
pm2 restart ecosystem.config.js --env production
```

## 🎯 PASO 9: Verificar

```
http://tu-servidor → https://tudominio.com

Admin: https://tudominio.com/admin-panel.html
Credenciales: admin / winner2026
```

## 🔧 COMANDOS ÚTILES

```powershell
# Estado PM2
pm2 status
pm2 logs winner-store --lines 50
pm2 restart winner-store

# Reiniciar IIS
iisreset

# Backup BD
copy backend\winner_store.db backup-winner-%date:~-4,4%%date:~-10,2%%date:~-7,2%.db

# Update código
cd C:\winner-store
git pull
npm install
pm2 restart winner-store
```

## 📊 Monitoreo

```
PM2 Dashboard: http://localhost:8080
PM2 Monit: pm2 monit
```

## ✅ Checklist Final

- [ ] Node.js + npm instalados
- [ ] PM2 ejecutando winner-store
- [ ] IIS proxy a puerto 3000
- [ ] SSL configurado
- [ ] BD sembrada con datos
- [ ] Admin panel funcionando

**¡Tu tienda está LIVE! 🎉**

---

**Soporte:** Abre issue en GitHub o contacta al autor.
