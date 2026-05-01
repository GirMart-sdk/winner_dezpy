# TODO: SSL Certificate Setup & HTTPS Project Launch

## Plan Approved Steps (Step-by-step execution)

**✅ Step 1: Create certs directory**

- Run: `mkdir certs` (or PowerShell creates it)
- Status: ✅ COMPLETE - Directory created

**✅ Step 2: Generate SSL certificates**

- Create & run PowerShell script `generate-certs.ps1` as Administrator
- Expected: `./certs/cert.pem` and `./certs/key.pem` created
- Cert ID: `5498d2d1d45b1995481379c811c08799` (localhost trusted)
- Status: ✅ COMPLETE - All certificates generated
- Files created:
  - `cert.pem` ✅
  - `key.pem` ✅
  - `cert.pfx` ✅ (contains private key, password: winner2026)

**✅ Step 3: Verify certs generated**

- Check: `dir certs` shows `cert.pem` `key.pem`
- Update TODO after success
- Status: ✅ COMPLETE - All files verified:
  - `cert.pem` - Certificate (BEGIN CERTIFICATE)
  - `key.pem` - Private key (BEGIN PRIVATE KEY)
  - `cert.pfx` - PFX bundle with private key

**✅ Step 4: Configure .env.production**

- Add: `NODE_ENV=production`, `CERT_PATH=./certs/cert.pem`, `KEY_PATH=./certs/key.pem`, `HTTPS_PORT=443`, `HTTP_PORT=80`
- Status: ✅ COMPLETE - Configured production environment

**✅ Step 5: Copy .env.production → .env**

- Status: ✅ COMPLETE - Copied to .env

**✅ Step 6: Update ecosystem.config.js**

- Add SSL env vars to `env_production`
- Status: ✅ COMPLETE - Added:
  - CERT_PATH: "./certs/cert.pem"
  - KEY_PATH: "./certs/key.pem"
  - HTTPS_PORT: "443"
  - HTTP_PORT: "80"

**✅ Step 7: PM2 restart**

- `pm2 restart ecosystem.config.js --env production`
- Test: `https://localhost` / `https://127.0.0.1`
- Status: ✅ COMPLETE - Server running with HTTPS

**✅ Step 8: Verify HTTPS**

- Browser: Accept self-signed cert warning
- PM2 logs: No cert errors
- Admin: `https://localhost/admin-panel.html` (admin/winner2026)
- Status: ✅ COMPLETE - Server online at https://localhost (port 443)

**✅ ALL STEPS COMPLETE - SSL/HTTPS Setup Successful**

- Server: WINNER STORE v2.0 (HTTPS)
- URL: https://localhost
- Admin: https://localhost/admin-panel.html
- Credentials: admin / winner2026

## Fix applied: API_KEY Configuration

- Updated app.js API_KEY to production key: `prod-api-key-winner-2026`
- Products seeded: 26 products loaded
- Server restarted with HTTPS
