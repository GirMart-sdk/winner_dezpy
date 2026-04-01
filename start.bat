@echo off
REM ═══════════════════════════════════════════════════════════
REM WINNER STORE - Quick Start (SQLite + PostgreSQL)
REM Descarga dependencias e inicia con SQLite (default)
REM ═══════════════════════════════════════════════════════════

echo.
echo 🚀 WINNER STORE - Quick Start
echo ═══════════════════════════════════════════════════════════
echo.

:: Paso 1: Instalar dependencias
echo 📦 Paso 1: Instalando dependencias...
cd backend
call npm install
if errorlevel 1 (
    echo ❌ Error instalando dependencias
    pause
    exit /b 1
)
cd ..

:: Paso 2: Verificar .env
if not exist "backend\.env" (
    echo 📝 Paso 2: Creando archivo .env desde .env.example...
    copy backend\.env.example backend\.env
    echo ✅ Archivo .env creado (SQLite configurado por default)
) else (
    echo ✅ Paso 2: Archivo .env ya existe
)

:: Paso 3: Limpiar base de datos vieja (opcional)
echo.
echo 🗑️  Limpiando base de datos anterior...
if exist "backend\winner_store.db" (
    del backend\winner_store.db
    del backend\winner_store.db-shm 2>nul
    del backend\winner_store.db-wal 2>nul
    echo ✅ Base de datos limpiada
) else (
    echo ℹ️  No había base de datos previa
)

:: Paso 4: Ejecutar seed
echo.
echo 🌱 Paso 3: Cargando productos y ventas de muestra (seed)...
cd backend
call npm run seed
if errorlevel 1 (
    echo ❌ Error en seed
    pause
    exit /b 1
)
cd ..

:: Paso 5: Iniciar servidor
echo.
echo 🚀 Paso 4: Iniciando servidor...
echo.
echo ═══════════════════════════════════════════════════════════
echo ✅ Servidor iniciado correctamente
echo.
echo 📱 Abre en tu navegador:
echo    Tienda online:  http://localhost:3000
echo    Panel admin:    http://localhost:3000/admin-panel.html
echo    API:            http://localhost:3000/api/products
echo.
echo 🔐 Credenciales admin:
echo    Usuario: admin
echo    Password: winner2026
echo.
echo 💾 Base de datos: SQLite (local)
echo.
echo Para cambiar a PostgreSQL:
echo   1. Edita backend\.env
echo   2. Cambia: DB_TYPE=postgres
echo   3. Configura: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
echo   4. Ejecuta: npm run seed
echo.
echo ═══════════════════════════════════════════════════════════
echo.

cd backend
call npm start
