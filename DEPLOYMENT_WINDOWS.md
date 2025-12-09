# 🪟 Instrucciones de Deployment para Windows

## 🚀 DEPLOYMENT RÁPIDO (3 comandos)

```powershell
# 1. Ve a la raíz del proyecto
cd C:\Users\RolandoRobles\AndroidStudioProjects\PromotoresAvivaTuNegocio2

# 2. Ejecuta el script de deployment
.\deploy-all.ps1

# 3. Selecciona opción 1 (Todo)
```

---

## 📋 DEPLOYMENT MANUAL PASO A PASO

### Paso 1: Ir a la raíz del proyecto

```powershell
cd C:\Users\RolandoRobles\AndroidStudioProjects\PromotoresAvivaTuNegocio2
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

## ✅ DEPLOYMENT EXITOSO - ¿Qué esperar?

### En el Admin (https://promotores-aviva-tu-negocio.web.app)

1. Ve a **"Metas Comerciales"**
2. Clic en **"Nueva Meta"**
3. Verás en **"Tipo de Objetivo"**:
   - ✅ Todos los Promotores
   - ✅ **Por Liga** ← NUEVO
   - ✅ **Por Promotor Específico**
   - ✅ **Por Kiosco Específico**

4. Al seleccionar **"Por Promotor Específico"**:
   - ✅ Aparecerá un **Autocomplete con búsqueda**
   - ✅ Podrás **seleccionar MÚLTIPLES usuarios**
   - ✅ Verás nombre y email de cada usuario
   - ✅ Podrás buscar por nombre o email

5. Al seleccionar **"Por Liga"**:
   - ✅ Aparecerá un **Autocomplete de ligas**
   - ✅ Podrás **seleccionar MÚLTIPLES ligas**
   - ✅ Todos los miembros de esas ligas tendrán la meta

### En la App Android

1. Abre la app
2. Ve a **"Metas & Bono"**
3. Verás:
   - ✅ **Datos REALES de HubSpot** (no dummy)
   - ✅ Progreso actual de llamadas
   - ✅ Progreso actual de colocación
   - ✅ Porcentajes reales
   - ✅ **Sin errores HTTP 404**

---

## 🔧 TROUBLESHOOTING

### Error: "El término './deploy-all.sh' no se reconoce"

**Causa:** Estás intentando ejecutar un script bash en PowerShell.

**Solución:** Usa el script de PowerShell:

```powershell
.\deploy-all.ps1
```

Si no funciona, ejecuta:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy-all.ps1
```

### Error: "firestore.indexes.json does not exist"

**Solución:**

```powershell
# Hacer pull de los cambios
git pull origin claude/fix-promoter-routes-map-01QCXWei158ixn5MFBhf1sRE

# O crear el archivo manualmente
@"
{
  "indexes": [],
  "fieldOverrides": []
}
"@ | Out-File -FilePath firestore.indexes.json -Encoding utf8
```

### No puedo ver el Autocomplete en el admin

**Causa:** Cache del navegador o deployment no completado.

**Solución:**

1. Limpia el cache: `Ctrl + Shift + Delete`
2. Abre en modo incógnito: `Ctrl + Shift + N`
3. Refresca con cache limpio: `Ctrl + F5`

### Sigue apareciendo HTTP 404 en la app

**Causa:** Las functions no están desplegadas correctamente.

**Verificación:**

```powershell
# Ver functions desplegadas
firebase functions:list
```

Debes ver (entre otras):
- ✅ getMyGoals
- ✅ getMyLeagueStats

**Solución:**

```powershell
firebase deploy --only functions
```

### No aparecen usuarios en el Autocomplete

**Causa:** No hay usuarios con rol "seller" en Firebase.

**Solución:**

1. Ve al admin → **"Usuarios"**
2. Edita o crea usuarios
3. Asegúrate de que tengan **Rol: "Promotor"** (seller)
4. Refresca la página de Metas Comerciales

### No aparecen ligas en el Autocomplete

**Causa:** No hay ligas creadas.

**Solución:**

1. Ve al admin → **"Ligas"**
2. Crea al menos una liga
3. Agrega miembros a la liga
4. Refresca la página de Metas Comerciales

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

## 📞 RESUMEN DE PASOS

1. ✅ **Pull los cambios:**
   ```powershell
   git pull origin claude/fix-promoter-routes-map-01QCXWei158ixn5MFBhf1sRE
   ```

2. ✅ **Desplegar:**
   ```powershell
   firebase deploy
   ```

3. ✅ **Abrir admin:**
   - https://promotores-aviva-tu-negocio.web.app
   - Ir a "Metas Comerciales"
   - Crear nueva meta
   - Seleccionar "Por Promotor Específico"
   - **Verás el Autocomplete para seleccionar usuarios**

4. ✅ **Probar en app:**
   - Abrir app Android
   - Ir a "Metas & Bono"
   - **Verás datos reales, sin HTTP 404**
