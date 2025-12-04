#!/bin/bash

echo "🚀 Desplegando Metas Comerciales - Admin y Cloud Functions"
echo "=========================================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: No se encuentra firebase.json"
    echo "Asegúrate de ejecutar este script desde /home/user/aviva-app-comercial"
    exit 1
fi

# Verificar autenticación de Firebase
echo "📋 Verificando autenticación de Firebase..."
if ! firebase projects:list > /dev/null 2>&1; then
    echo "❌ No estás autenticado en Firebase"
    echo "Por favor ejecuta: firebase login"
    exit 1
fi

echo "✅ Autenticación correcta"
echo ""

# Verificar configuración de HubSpot API
echo "🔑 Verificando configuración de HubSpot API..."
HUBSPOT_CONFIG=$(firebase functions:config:get hubspot.apikey 2>&1)

if [ -z "$HUBSPOT_CONFIG" ] || [[ "$HUBSPOT_CONFIG" == *"Error"* ]]; then
    echo "⚠️  HubSpot API key no configurada"
    echo ""
    echo "IMPORTANTE: Necesitas configurar la API key de HubSpot"
    echo "Ejecuta: firebase functions:config:set hubspot.apikey=\"TU_API_KEY\""
    echo ""
    read -p "¿Quieres continuar sin configurar la API key? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ HubSpot API key configurada"
fi
echo ""

# Build del admin
echo "🏗️  Construyendo admin..."
cd admin
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error al construir el admin"
    exit 1
fi
cd ..
echo "✅ Admin construido correctamente"
echo ""

# Build de las functions
echo "🏗️  Construyendo Cloud Functions..."
cd functions
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error al construir las functions"
    exit 1
fi
cd ..
echo "✅ Functions construidas correctamente"
echo ""

# Deploy
echo "🚀 Desplegando a Firebase..."
echo ""

# Preguntar qué desplegar
echo "¿Qué quieres desplegar?"
echo "1) Todo (admin + functions)"
echo "2) Solo admin (hosting)"
echo "3) Solo Cloud Functions"
read -p "Selecciona una opción (1-3): " option

case $option in
    1)
        echo ""
        echo "📦 Desplegando todo..."
        firebase deploy
        ;;
    2)
        echo ""
        echo "📦 Desplegando solo admin..."
        firebase deploy --only hosting
        ;;
    3)
        echo ""
        echo "📦 Desplegando solo functions..."
        firebase deploy --only functions
        ;;
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Deployment exitoso!"
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Abre el admin: https://promotores-aviva-tu-negocio.web.app"
    echo "2. Ve a 'Metas Comerciales'"
    echo "3. Crea una nueva meta"
    echo "4. Verifica que puedes seleccionar usuarios, kioscos o ligas"
    echo "5. Prueba en la app Android"
    echo ""
    echo "🔍 Para ver logs de las functions:"
    echo "   firebase functions:log"
    echo ""
    echo "📊 Para listar functions desplegadas:"
    echo "   firebase functions:list"
else
    echo ""
    echo "❌ Error durante el deployment"
    echo "Revisa los mensajes de error arriba"
    exit 1
fi
