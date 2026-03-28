#!/bin/bash
# ═══════════════════════════════════════════════════════════
# WINNER STORE — Script de Inicialización
# Ejecuta esto la primera vez para preparar todo
# ═══════════════════════════════════════════════════════════

echo "🚀 Inicializando WINNER STORE..."
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "Descargalo desde: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

# Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
npm install

# Crear archivo .env si no existe
if [ ! -f backend/.env ]; then
    echo ""
    echo "📝 Creando archivo .env..."
    cp backend/.env.example backend/.env
    echo "✅ .env creado. Edítalo si necesitas cambiar configuraciones"
fi

# Crear base de datos
echo ""
echo "🗄️  Inicializando base de datos..."
cd backend
node -e "require('./database.js')"
cd ..

echo ""
echo "✅ COMPLETADO!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Inicia el servidor:  npm start"
echo "   2. Abre en navegador:   http://localhost:3000"
echo "   3. Login:              admin / winner2026"
echo ""
