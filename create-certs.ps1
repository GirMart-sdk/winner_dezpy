# SSL Certificate Generator with Exportable Private Key
Write-Host "[Creating SSL certificates for Winner Store...]" -ForegroundColor Cyan

# Create certs directory
if (!(Test-Path "./certs")) {
    New-Item -ItemType Directory -Path "./certs" -Force
}

# Create a new certificate with exportable key using Bouncy Castle or alternative
# Since Windows doesn't easily allow exportable keys, we'll use PFX approach

# Generate certificate in CurrentUser store
$cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1" -CertStoreLocation "Cert:\CurrentUser\My" -KeyAlgorithm RSA -KeyLength 2048 -NotAfter (Get-Date).AddYears(2)

Write-Host "[Certificate created with thumbprint: $($cert.Thumbprint)]" -ForegroundColor Yellow

# Export the certificate to PEM
$base64 = [Convert]::ToBase64String($cert.RawData, [Base64FormattingOptions]::InsertLineBreaks)
$pem = "-----BEGIN CERTIFICATE-----`r`n$base64`r`n-----END CERTIFICATE-----"
$pem | Out-File -FilePath "./certs/cert.pem" -Encoding ASCII

Write-Host "[cert.pem saved]" -ForegroundColor Green

# Export PFX with password (includes private key)
$pfxPath = "./certs/cert.pfx"
$password = ConvertTo-SecureString -String "winner2026" -Force -AsPlainText
Export-PfxCertificate -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" -FilePath $pfxPath -Password $password | Out-Null

Write-Host "[cert.pfx saved (contains private key)]" -ForegroundColor Green

# Try to convert PFX to key using openssl if available
$opensslPath = $null
$possiblePaths = @(
    "C:\Program Files\Git\usr\bin\openssl.exe",
    "C:\Program Files (x86)\Git\usr\bin\openssl.exe",
    "C:\OpenSSL-Win64\bin\openssl.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $opensslPath = $path
        break
    }
}

if ($opensslPath) {
    Write-Host "[Found OpenSSL, converting to key.pem...]" -ForegroundColor Cyan
    & $opensslPath pkcs12 -in $pfxPath -nocerts -nodes -out ./certs/key.pem -password pass:winner2026
    if (Test-Path ./certs/key.pem) {
        Write-Host "[key.pem created successfully]" -ForegroundColor Green
    }
}
else {
    # Try to use certutil
    Write-Host "[OpenSSL not found, trying certutil...]" -ForegroundColor Yellow
    certutil -dump $pfxPath | Out-Null
    # Note: certutil doesn't convert to PEM key easily, we'll note this
    Write-Host "[Note: key.pem not created - OpenSSL required for conversion]" -ForegroundColor Red
    Write-Host "[You can manually convert using: openssl pkcs12 -in cert.pfx -nocerts -nodes -out key.pem]" -ForegroundColor Yellow
}

Write-Host "`n[OK] Certificate generation complete!" -ForegroundColor Green
Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor Yellow
Write-Host "Files in ./certs/: cert.pem, cert.pfx" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "1. If key.pem was not created, install OpenSSL or convert manually" -ForegroundColor White
Write-Host "2. Install cert to Trusted Root: Import-PfxCertificate -Cert 'Cert:\CurrentUser\Root\' -FilePath $pfxPath -Password `$password" -ForegroundColor White
