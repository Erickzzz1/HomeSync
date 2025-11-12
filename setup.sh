#!/bin/bash

# 🏠 Script de Configuración de HomeSync
# Este script automatiza la configuración inicial del proyecto

echo "🏠 =========================================="
echo "   HomeSync - Script de Configuración"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar Node.js
echo "📦 Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Node.js instalado: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js no está instalado"
    echo "   Por favor instala Node.js v16 o superior desde https://nodejs.org/"
    exit 1
fi

# 2. Verificar npm
echo "📦 Verificando npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} npm instalado: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm no está instalado"
    exit 1
fi

# 3. Instalar dependencias
echo ""
echo "📥 Instalando dependencias..."
echo "   (Esto puede tomar varios minutos)"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Dependencias instaladas correctamente"
else
    echo -e "${RED}✗${NC} Error al instalar dependencias"
    exit 1
fi

# 4. Verificar archivo .env
echo ""
echo "🔐 Verificando configuración de variables de entorno..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} Archivo .env encontrado"
    echo -e "${YELLOW}⚠${NC}  Asegúrate de haber configurado tus credenciales de Firebase"
else
    echo -e "${YELLOW}⚠${NC}  Archivo .env no encontrado"
    echo "   Creando .env desde .env.example..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Archivo .env creado"
        echo -e "${RED}❗${NC} IMPORTANTE: Edita el archivo .env con tus credenciales de Firebase"
    else
        echo -e "${RED}✗${NC} .env.example no encontrado"
    fi
fi

# 5. Verificar Expo CLI
echo ""
echo "📱 Verificando Expo CLI..."
if command -v expo &> /dev/null; then
    echo -e "${GREEN}✓${NC} Expo CLI instalado"
else
    echo -e "${YELLOW}⚠${NC}  Expo CLI no está instalado globalmente"
    echo "   Puedes instalarlo con: npm install -g expo-cli"
    echo "   O usar npx expo en su lugar"
fi

# 6. Resumen
echo ""
echo "=========================================="
echo -e "${GREEN}✓ Configuración Completada${NC}"
echo "=========================================="
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. Configura Firebase:"
echo "   - Ve a https://console.firebase.google.com/"
echo "   - Crea un proyecto o selecciona uno existente"
echo "   - Habilita Authentication (Email/Password)"
echo "   - Habilita Firestore Database"
echo "   - Copia las credenciales de configuración"
echo ""
echo "2. Edita el archivo .env con tus credenciales:"
echo "   - Abre .env en tu editor"
echo "   - Reemplaza los valores de ejemplo con tus credenciales"
echo ""
echo "3. Ejecuta la aplicación:"
echo "   npm start         (para abrir el menú de Expo)"
echo "   npm run android   (para ejecutar en Android)"
echo "   npm run ios       (para ejecutar en iOS - solo macOS)"
echo "   npm run web       (para ejecutar en navegador)"
echo ""
echo "📚 Documentación completa en README.md"
echo ""

