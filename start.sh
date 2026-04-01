#!/bin/bash

# ═══════════════════════════════════════════════════════════
# WINNER STORE - Quick Start (SQLite + PostgreSQL)
# Descarga dependencias e inicia con SQLite (default)
# ═══════════════════════════════════════════════════════════

echo ""
echo "🚀 WINNER STORE - Quick Start"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Paso 1: Instalar dependencias
echo "📦 Paso 1: Instalando dependencias..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias"
    exit 1
fi
cd ..

# Paso 2: Verificar .env
if [ ! -f "backend/.env" ]; then
    echo "📝 Paso 2: Creando archivo .env desde .env.example..."
    cp backend/.env.example backend/.env
    echo "✅ Archivo .env creado (SQLite configurado por default)"
else
    echo "✅ Paso 2: Archivo .env ya existe"
fi

# Paso 3: Limpiar base de datos vieja (opcional)
echo ""
echo "🗑️  Limpiando base de datos anterior..."
if [ -f "backend/winner_store.db" ]; then
    rm -f backend/winner_store.db
    rm -f backend/winner_store.db-shm
    rm -f backend/winner_store.db-wal
    echo "✅ Base de datos limpiada"
else
    echo "ℹ️  No había base de datos previa"
fi

# Paso 4: Ejecutar seed
echo ""
echo "🌱 Paso 3: Cargando productos y ventas de muestra (seed)..."
cd backend
npm run seed
if [ $? -ne 0 ]; then
    echo "❌ Error en seed"
    exit 1
fi
cd ..

# Paso 5: Iniciar servidor
echo ""
echo "🚀 Paso 4: Iniciando servidor..."
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Servidor iniciado correctamente"
echo ""
echo "📱 Abre en tu navegador:"
echo "   Tienda online:  http://localhost:3000"
echo "   Panel admin:    http://localhost:3000/admin-panel.html"
echo "   API:            http://localhost:3000/api/products"
echo ""
echo "🔐 Credenciales admin:"
echo "   Usuario: admin"
echo "   Password: winner2026"
echo ""
echo "💾 Base de datos: SQLite (local)"
echo ""
echo "Para cambiar a PostgreSQL:"
echo "  1. Edita backend/.env"
echo "  2. Cambia: DB_TYPE=postgres"
echo "  3. Configura: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD"
echo "  4. Ejecuta: npm run seed"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

cd backend
npm start
