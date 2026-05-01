# 🔑 PASO A PASO: Exportar Certificado SSL desde Almacén Windows

## 🎯 MÉTODO 1: PowerShell Automático (Recomendado)

**Ejecuta como ADMINISTRADOR:**

```powershell
# 1. Generar/Exportar certificado con tu ID
$certId = "5498d2d1d45b1995481379c811c08799"
$cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1", $env:COMPUTERNAME, $certId -CertStoreLocation "cert:\LocalMachine\My" -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider"

# 2. Crear carpetas
New-Item -ItemType Directory -Force -Path "./certs"

# 3. Exportar certificado público
Export-Certificate -Cert $cert -FilePath "./certs/cert.pem"

# 4. Exportar clave privada (PKCS#8)
$privateKey = $cert.PrivateKey.ExportPkcs8PrivateKey()
[System.IO.File]::WriteAllBytes("./certs/key.pem", $privateKey)

# 5. Verificar
Write-Host "✅ Certificados generados en ./certs/" -ForegroundColor Green
Write-Host "   - cert.pem (público)" -ForegroundColor Yellow
Write-Host "   - key.pem (privado)" -ForegroundColor Yellow
Get-ChildItem ./certs/
```

## 🎯 MÉTODO 2: MMC Manual (Certificado Existente)

1. **Abrir MMC:**

   ```
   Win+R → mmc → Enter
   ```

2. **Añadir Snap-in:**

   ```
   Archivo → Añadir/Quitar componente software → Certificados
   → Añadir → Cuenta de equipo → Local → Finalizar → Aceptar
   ```

3. **Navegar Certificados:**

   ```
   Certificados (Equipo Local) → Personal → Certificados
   ```

4. **Exportar Certificado:**

   ```
   Clic derecho certificado → Todas las tareas → Exportar
   → No, no exportar clave privada → Formato: Base-64 → cert.pem
   ```

5. **Exportar Clave Privada (separado):**
   ```powershell
   # Usa el script de arriba con tu thumbprint
   $thumbprint = "TU_THUMBPRINT_AQUI"
   $cert = Get-ChildItem -Path cert:\LocalMachine\My\$thumbprint
   $privateKey = $cert.PrivateKey.ExportPkcs8PrivateKey()
   [System.IO.File]::WriteAllBytes("./certs/key.pem", $privateKey)
   ```

## 🎯 MÉTODO 3: Script 1-Clic Completo

**Guarda como `generate-certs.ps1` y ejecuta:**

```powershell
param([string]$CertId = "5498d2d1d45b1995481379c811c08799")

Write-Host "🔐 Generando certificados SSL para Winner Store..." -ForegroundColor Cyan

# Eliminar certificados previos
Remove-Item ./certs/* -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "./certs"

# Crear nuevo certificado
$cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1", $env:COMPUTERNAME, $CertId -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(2)

# Exportar
Export-Certificate -Cert $cert -FilePath "./certs/cert.pem" -Type CERT
$privateKey = $cert.PrivateKey.ExportPkcs8PrivateKey()
[System.IO.File]::WriteAllBytes("./certs/key.pem", $privateKey)

# Verificar .env
if (-not (Test-Path ".env.production")) { Copy-Item ".env.production" ".env" }

# Actualizar permisos (Windows)
icacls ".\certs" /grant "Everyone:R" /T

Write-Host "`n✅ CERTIFICADOS GENERADOS!" -ForegroundColor Green
Write-Host "📁 Ubicación: ./certs/" -ForegroundColor Yellow
Write-Host "`n🚀 Inicia el servidor:" -ForegroundColor Cyan
Write-Host "pm2 restart ecosystem.config.js --env production" -ForegroundColor White
Write-Host "`n🔗 URLs HTTPS:" -ForegroundColor Magenta
Write-Host "   https://localhost" -ForegroundColor White
Write-Host "   https://127.0.0.1" -ForegroundColor White
Write-Host "   https://$env:COMPUTERNAME" -ForegroundColor White
```

**Ejecutar:**

```powershell
.\generate-certs.ps1
```

## ✅ VERIFICAR CERTIFICADOS

```powershell
dir .\certs\
# Debe mostrar: cert.pem  key.pem

# Probar Node.js HTTPS
npm start
# Visita: https://localhost (acepta excepción en navegador)
```

**¡Listo! Tus certificados están configurados para desarrollo local y producción.**
