@echo off
REM ═══════════════════════════════════════════════════════
REM WINNER STORE - Script de Inicializaci[n para Windows
REM ═══════════════════════════════════════════════════════

echo.
echo 🚀 Inicializando WINNER STORE...
echo.

REM Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js no está instalado
    echo Descargalo desde: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js: 
node --version

REM Instalar dependencias
echo.
echo 📦 Instalando dependencias...
echo.
call npm install

REM Crear .env
if not exist backend\.env (
    echo.
    echo 📝 Creando archivo .env...
    copy backend\.env.example backend\.env
    echo ✅ .env creado. Edítalo si necesitas cambiar configuraciones
)

REM Inicializar BD
echo.
echo 🗄️  Inicializando base de datos...
cd backend
node -e "require('./database.js')"
cd ..

echo.
echo ✅ ¡COMPLETADO!
echo.
echo 📋 Próximos pasos:
echo    1. Ejecuta el servidor: npm start
echo    2. Abre: http://localhost:3000
echo    3. Login: admin / winner2026
echo.
pause
