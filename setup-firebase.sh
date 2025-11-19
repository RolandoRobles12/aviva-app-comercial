#!/bin/bash

# 🔥 Script de Setup Automático para Firebase Functions + HubSpot
# Este script te guía paso a paso en la configuración

set -e  # Detener si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🔥 Setup Firebase Functions + HubSpot Integration            ║"
echo "║  Aviva App Comercial                                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ============================================================================
# PASO 1: Verificar Node.js
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 PASO 1: Verificando Node.js"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado"
    echo ""
    echo "Por favor instala Node.js v18+ desde:"
    echo "  - Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo "  - Mac: brew install node"
    echo "  - Windows: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js está instalado: $NODE_VERSION"

# ============================================================================
# PASO 2: Verificar Firebase CLI
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 PASO 2: Verificando Firebase CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v firebase &> /dev/null; then
    print_warning "Firebase CLI no está instalado"
    echo ""
    read -p "¿Quieres instalarlo ahora? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Instalando Firebase CLI..."
        npm install -g firebase-tools
        print_success "Firebase CLI instalado"
    else
        print_error "Firebase CLI es necesario. Instálalo con: npm install -g firebase-tools"
        exit 1
    fi
fi

FIREBASE_VERSION=$(firebase --version)
print_success "Firebase CLI está instalado: $FIREBASE_VERSION"

# ============================================================================
# PASO 3: Verificar login en Firebase
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 PASO 3: Verificando autenticación en Firebase"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! firebase projects:list &> /dev/null; then
    print_warning "No estás autenticado en Firebase"
    echo ""
    read -p "¿Quieres iniciar sesión ahora? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Abriendo navegador para iniciar sesión..."
        firebase login
        print_success "Autenticación exitosa"
    else
        print_error "Debes autenticarte con: firebase login"
        exit 1
    fi
fi

print_success "Autenticación verificada"

# ============================================================================
# PASO 4: Listar y seleccionar proyecto
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PASO 4: Proyectos disponibles"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

firebase projects:list

echo ""
print_info "Si tu proyecto ya está configurado, puedes continuar."
print_info "Si no, ejecuta: firebase use --add"
echo ""

# ============================================================================
# PASO 5: Instalar dependencias
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 PASO 5: Instalando dependencias de Firebase Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d "functions" ]; then
    print_error "No se encontró la carpeta 'functions'"
    print_error "Asegúrate de estar en el directorio raíz del proyecto"
    exit 1
fi

cd functions

if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json en functions/"
    exit 1
fi

print_info "Instalando dependencias (esto puede tomar 1-2 minutos)..."
npm install

print_success "Dependencias instaladas"

# ============================================================================
# PASO 6: Compilar TypeScript
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 PASO 6: Compilando TypeScript"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Compilando código TypeScript a JavaScript..."
npm run build

print_success "Compilación exitosa"

cd ..

# ============================================================================
# PASO 7: Configurar token de HubSpot
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 PASO 7: Configurar Token de HubSpot"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Verificando si ya existe un token configurado..."

CURRENT_CONFIG=$(firebase functions:config:get 2>/dev/null || echo "{}")

if echo "$CURRENT_CONFIG" | grep -q "hubspot"; then
    print_success "Ya existe un token de HubSpot configurado"
    echo ""
    print_warning "Token actual (parcial):"
    echo "$CURRENT_CONFIG" | grep -A 1 "hubspot"
    echo ""
    read -p "¿Quieres reemplazarlo? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Manteniendo token actual"
    else
        echo ""
        print_info "Ingresa tu token de HubSpot (comienza con 'pat-na1-...'):"
        read -r HUBSPOT_TOKEN

        if [ -z "$HUBSPOT_TOKEN" ]; then
            print_error "Token vacío. Saltando este paso."
        else
            firebase functions:config:set hubspot.apikey="$HUBSPOT_TOKEN"
            print_success "Token de HubSpot configurado"
        fi
    fi
else
    echo ""
    print_info "No hay token configurado aún."
    print_info ""
    print_info "Para obtener tu token de HubSpot:"
    print_info "  1. Ve a: https://app.hubspot.com/settings/integrations/private-apps"
    print_info "  2. Crea una Private App con los permisos necesarios"
    print_info "  3. Copia el token generado"
    echo ""

    read -p "¿Tienes tu token de HubSpot listo? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        print_info "Ingresa tu token de HubSpot:"
        read -r HUBSPOT_TOKEN

        if [ -z "$HUBSPOT_TOKEN" ]; then
            print_warning "Token vacío. Puedes configurarlo después con:"
            print_warning "  firebase functions:config:set hubspot.apikey=\"TU_TOKEN\""
        else
            firebase functions:config:set hubspot.apikey="$HUBSPOT_TOKEN"
            print_success "Token de HubSpot configurado"
        fi
    else
        print_warning "Puedes configurar el token después con:"
        print_warning "  firebase functions:config:set hubspot.apikey=\"TU_TOKEN\""
    fi
fi

# ============================================================================
# PASO 8: Desplegar Functions
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 PASO 8: Desplegar Firebase Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_warning "Esto tomará 2-5 minutos..."
echo ""
read -p "¿Quieres desplegar las functions ahora? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Desplegando functions..."
    firebase deploy --only functions

    print_success "Functions desplegadas exitosamente!"

    echo ""
    print_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_success "  ✨ SETUP COMPLETADO ✨"
    print_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Obtener URL base
    print_info "Tus functions están disponibles en:"
    firebase functions:list

    echo ""
    print_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "  📝 PRÓXIMOS PASOS:"
    print_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    print_info "1. Copia la URL base de tus functions (ejemplo: https://us-central1-xxx.cloudfunctions.net/)"
    echo ""
    print_info "2. Edita este archivo:"
    print_info "   app/src/main/java/com/promotoresavivatunegocio_1/services/HubSpotRepository.kt"
    echo ""
    print_info "3. Actualiza la línea 23 con tu URL:"
    print_info "   private const val FUNCTIONS_BASE_URL = \"TU_URL_AQUI/\""
    echo ""
    print_info "4. Compila y ejecuta tu app en Android Studio"
    echo ""
    print_info "5. Inicia sesión como admin y ve a la pestaña 'Admin' → '📊 HubSpot'"
    echo ""

    print_success "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

else
    print_warning "Puedes desplegar después con: firebase deploy --only functions"
fi

echo ""
print_info "Para ver logs en tiempo real: firebase functions:log"
print_info "Para ver la configuración: firebase functions:config:get"
echo ""

print_success "¡Todo listo! 🎉"
