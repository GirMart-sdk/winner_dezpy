param([string]$CertId = "5498d2d1d45b1995481379c811c08799")

Write-Host "[Generando certificados SSL para Winner Store...]" -ForegroundColor Cyan

try {
    # Eliminar certificados previos
    Remove-Item ./certs -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path "./certs"

    # Crear nuevo certificado
    $cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1", $env:COMPUTERNAME, $CertId -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(2) -KeyExportPolicy Exportable

    # Exportar certificado
    Export-Certificate -Cert $cert -FilePath "./certs/cert.pem" -Type CERT

    # Exportar clave privada (PS7+)
    if ($cert.PrivateKey -and $cert.PrivateKey.ExportPkcs8PrivateKey) {
        $privateKey = $cert.PrivateKey.ExportPkcs8PrivateKey()
        [System.IO.File]::WriteAllBytes("./certs/key.pem", $privateKey)
    }
    else {
        Write-Warning "Clave privada no exportable. Usar PFX: openssl pkcs12 -in cert.pfx -nocerts -nodes -out key.pem"
        Export-PfxCertificate -Cert $cert -FilePath "./certs/cert.pfx" -Password (ConvertTo-SecureString -String '' -Force -AsPlainText) | Out-Null
    }

    # Verificar .env
    if (-not (Test-Path ".env")) { 
        if (Test-Path ".env.production") { 
            Copy-Item ".env.production" ".env" 
        }
        else {
            Write-Warning "No .env.production encontrado"
        }
    }

    # Permisos
    icacls "./certs" /grant "Everyone:R" /T

    Write-Host "`n[OK] CERTIFICADOS GENERADOS!" -ForegroundColor Green
    Write-Host "Ubicacion: ./certs/" -ForegroundColor Yellow
    Write-Host "`nInicia el servidor:" -ForegroundColor Cyan
    Write-Host "pm2 restart ecosystem.config.js --env production" -ForegroundColor White
    Write-Host "`nURLs HTTPS:" -ForegroundColor Magenta
    Write-Host "   https://localhost" -ForegroundColor White
    Write-Host "   https://127.0.0.1" -ForegroundColor White
    Write-Host "   https://$($env:COMPUTERNAME)" -ForegroundColor White
    Write-Host ("Thumbprint para IIS: " + $cert.Thumbprint) -ForegroundColor Yellow
}
catch {
    Write-Error "Error generando certificados: $_"
}

