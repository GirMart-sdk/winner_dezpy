@echo off
echo 🌱 Iniciando WINNER STORE - Modo LOCAL (Puerto 3000)
echo.

REM Limpiar procesos Node anteriores
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

REM Instalar dependencias si no existen
if not exist "node_modules" (
  echo 📦 Instalando dependencias...
  npm install --silent
)

REM Semilla de datos (solo si DB vacía)
if not exist "backend\winner_store.db" (
  echo 🗄️  Creando base de datos...
  cd backend
  node seed.js
  cd ..
) else (
  echo ✅ BD detectada: backend\winner_store.db
)

REM Iniciar servidor en puerto 3000 HTTP (LOCAL)
set NODE_ENV=development
set PORT=3000
echo 🚀 Servidor → http://localhost:3000
echo 🔐 Admin → admin-panel.html (admin/winner2026)
echo.

npm start

REM Abrir admin automáticamente
timeout /t 3 /nobreak >nul
start admin-panel.html
start index.html

echo.
echo 🎉 WINNER STORE LISTO!
echo Presiona Ctrl+C para detener.
pause
