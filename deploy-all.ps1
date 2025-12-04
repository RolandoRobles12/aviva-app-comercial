# PowerShell script para desplegar Metas Comerciales en Windows

Write-Host "🚀 Desplegando Metas Comerciales - Admin y Cloud Functions" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-Not (Test-Path "firebase.json")) {
    Write-Host "❌ Error: No se encuentra firebase.json" -ForegroundColor Red
    Write-Host "Asegúrate de ejecutar este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Verificar autenticación de Firebase
Write-Host "📋 Verificando autenticación de Firebase..." -ForegroundColor Cyan
$firebaseTest = firebase projects:list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ No estás autenticado en Firebase" -ForegroundColor Red
    Write-Host "Por favor ejecuta: firebase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Autenticación correcta" -ForegroundColor Green
Write-Host ""

# Verificar configuración de HubSpot API
Write-Host "🔑 Verificando configuración de HubSpot API..." -ForegroundColor Cyan
$hubspotConfig = firebase functions:config:get 2>&1 | Out-String

if ($hubspotConfig -match "hubspot") {
    Write-Host "✅ HubSpot API key configurada" -ForegroundColor Green
} else {
    Write-Host "⚠️  HubSpot API key no configurada" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "IMPORTANTE: Necesitas configurar la API key de HubSpot" -ForegroundColor Yellow
    Write-Host "Ejecuta: firebase functions:config:set hubspot.apikey=`"TU_API_KEY`"" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "¿Quieres continuar sin configurar la API key? (s/n)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}
Write-Host ""

# Build del admin
Write-Host "🏗️  Construyendo admin..." -ForegroundColor Cyan
Push-Location admin
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir el admin" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✅ Admin construido correctamente" -ForegroundColor Green
Write-Host ""

# Build de las functions
Write-Host "🏗️  Construyendo Cloud Functions..." -ForegroundColor Cyan
Push-Location functions
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir las functions" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✅ Functions construidas correctamente" -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "🚀 Desplegando a Firebase..." -ForegroundColor Cyan
Write-Host ""

# Preguntar qué desplegar
Write-Host "¿Qué quieres desplegar?" -ForegroundColor Yellow
Write-Host "1) Todo (admin + functions)"
Write-Host "2) Solo admin (hosting)"
Write-Host "3) Solo Cloud Functions"
$option = Read-Host "Selecciona una opción (1-3)"

switch ($option) {
    "1" {
        Write-Host ""
        Write-Host "📦 Desplegando todo..." -ForegroundColor Cyan
        firebase deploy
    }
    "2" {
        Write-Host ""
        Write-Host "📦 Desplegando solo admin..." -ForegroundColor Cyan
        firebase deploy --only hosting
    }
    "3" {
        Write-Host ""
        Write-Host "📦 Desplegando solo functions..." -ForegroundColor Cyan
        firebase deploy --only functions
    }
    default {
        Write-Host "❌ Opción inválida" -ForegroundColor Red
        exit 1
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ ¡Deployment exitoso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "1. Abre el admin: https://promotores-aviva-tu-negocio.web.app"
    Write-Host "2. Ve a 'Metas Comerciales'"
    Write-Host "3. Crea una nueva meta"
    Write-Host "4. Verifica que puedes seleccionar usuarios, kioscos o ligas"
    Write-Host "5. Prueba en la app Android"
    Write-Host ""
    Write-Host "🔍 Para ver logs de las functions:" -ForegroundColor Cyan
    Write-Host "   firebase functions:log"
    Write-Host ""
    Write-Host "📊 Para listar functions desplegadas:" -ForegroundColor Cyan
    Write-Host "   firebase functions:list"
} else {
    Write-Host ""
    Write-Host "❌ Error durante el deployment" -ForegroundColor Red
    Write-Host "Revisa los mensajes de error arriba" -ForegroundColor Yellow
    exit 1
}
