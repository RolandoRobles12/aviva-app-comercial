# 🪟 Guía de Deployment (Windows/PowerShell)

## 🚀 DEPLOYMENT RÁPIDO

```powershell
# 1. Ve a la raíz del proyecto
cd ruta\a\tu\proyecto\aviva-app-comercial

# 2. Desplegar todo
firebase deploy

# O desplegar componentes específicos
firebase deploy --only hosting      # Solo admin panel
firebase deploy --only functions    # Solo cloud functions
```

---

## 📋 DEPLOYMENT MANUAL PASO A PASO

### Paso 1: Ir a la raíz del proyecto

```powershell
# Navega a la carpeta de tu proyecto
cd C:\ruta\a\tu\proyecto\aviva-app-comercial
```

### Paso 2: Construir el Admin

```powershell
cd admin
npm run build
cd ..
```

### Paso 3: Construir las Functions

```powershell
cd functions
npm run build
cd ..
```

### Paso 4: Desplegar todo

```powershell
# Opción A: Desplegar TODO (recomendado)
firebase deploy

# Opción B: Solo admin
firebase deploy --only hosting

# Opción C: Solo functions
firebase deploy --only functions
```

---

## ❌ ERROR: "firestore.indexes.json does not exist"

**Solo necesitas:

1. **Hacer pull de los cambios:**

```powershell
git fetch origin
git pull
```

2. **Desplegar:**

```powershell
firebase deploy
```

---

## ✅ VERIFICAR DEPLOYMENT EXITOSO

### Admin Panel

```powershell
# Ver URL del admin desplegado
firebase hosting:channel:list
```

Abre tu admin panel en: `https://TU_PROJECT_ID.web.app`

Verifica:
- ✅ Login funciona correctamente
- ✅ Todas las secciones cargan sin errores
- ✅ Conexión a Firestore funciona

### Firebase Functions

```powershell
# Ver funciones desplegadas
firebase functions:list

# Ver logs
firebase functions:log
```

Verifica:
- ✅ Todas las funciones aparecen con estado "ACTIVE"
- ✅ No hay errores en los logs

---

## 🔧 TROUBLESHOOTING

### Error: "El término './deploy-all.sh' no se reconoce"

**Causa:** Estás intentando ejecutar un script bash en PowerShell.

**Solución:**

```powershell
# Usa Firebase CLI directamente
firebase deploy

# O si hay un script PowerShell disponible
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy-all.ps1
```

### Error: "firestore.indexes.json does not exist"

**Solución:**

```powershell
# Opción 1: Hacer pull de los últimos cambios
git pull

# Opción 2: Crear el archivo manualmente
@"
{
  "indexes": [],
  "fieldOverrides": []
}
"@ | Out-File -FilePath firestore.indexes.json -Encoding utf8
```

### El admin no carga después del deploy

**Causa:** Cache del navegador.

**Solución:**

1. Limpia el cache: `Ctrl + Shift + Delete`
2. Abre en modo incógnito: `Ctrl + Shift + N`
3. Refresca con cache limpio: `Ctrl + F5`

### Las functions no responden

**Causa:** Functions no desplegadas o error de configuración.

**Solución:**

```powershell
# Ver estado de functions
firebase functions:list

# Ver logs de errores
firebase functions:log

# Redesplegar
firebase deploy --only functions
```

---

## 📊 VERIFICAR HubSpot API Key

```powershell
# Ver configuración actual
firebase functions:config:get

# Si no está configurada, agregarla
firebase functions:config:set hubspot.apikey="TU_HUBSPOT_API_KEY"

# Después de configurar, redesplegar functions
firebase deploy --only functions
```

---

## 🚀 COMANDOS ÚTILES

```powershell
# Deploy completo
firebase deploy

# Deploy solo admin
firebase deploy --only hosting

# Deploy solo functions
firebase deploy --only functions

# Ver logs en tiempo real
firebase functions:log --only getMyGoals

# Listar functions desplegadas
firebase functions:list

# Ver configuración de functions
firebase functions:config:get

# Limpiar cache de npm (si hay errores de build)
cd admin
npm cache clean --force
npm install
npm run build
cd ..

cd functions
npm cache clean --force
npm install
npm run build
cd ..
```

---

## 📞 CHECKLIST DE DEPLOYMENT

- [ ] Código actualizado con `git pull`
- [ ] Admin compilado: `cd admin && npm run build`
- [ ] Functions compiladas: `cd functions && npm run build`
- [ ] Deployment ejecutado: `firebase deploy`
- [ ] Admin panel verificado en navegador
- [ ] Functions activas: `firebase functions:list`
- [ ] Logs sin errores: `firebase functions:log`
- [ ] App Android probada con nuevos cambios
