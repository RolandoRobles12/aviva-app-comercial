# Instrucciones de Deployment - Metas Comerciales

## 🚨 PROBLEMAS ACTUALES Y SOLUCIÓN

### Problema 1: No puedes seleccionar usuarios en el admin
**Causa:** El admin está mostrando una versión vieja sin los cambios más recientes.
**Solución:** Desplegar el admin actualizado (ver Paso 1 abajo).

### Problema 2: La app sigue mostrando datos dummy / HTTP 404
**Causa:** Las Cloud Functions no están desplegadas.
**Solución:** Desplegar las Cloud Functions (ver Paso 2 abajo).

### Problema 3: No aparecen las metas en la app
**Causa:** Combinación de los problemas 1 y 2.
**Solución:** Completar ambos deployments.

---

## 📋 PASOS PARA DESPLEGAR TODO

### Paso 1: Desplegar el Admin Actualizado

El admin ya está construido con los últimos cambios. Solo necesitas desplegarlo:

```bash
cd /home/user/aviva-app-comercial

# Desplegar solo el hosting (admin)
firebase deploy --only hosting
```

**¿Qué incluye esta actualización?**
- ✅ Selección múltiple de usuarios (Autocomplete multi-select)
- ✅ Selección múltiple de kioscos
- ✅ Selección de ligas (nueva opción)
- ✅ Cambio de enum: "seller" → "users", "kiosk" → "kiosks"

### Paso 2: Desplegar las Cloud Functions

```bash
cd /home/user/aviva-app-comercial

# Desplegar todas las functions
firebase deploy --only functions
```

**Funciones críticas que se desplegarán:**
- `getMyGoals` - Retorna las metas asignadas al usuario con progreso real de HubSpot
- `getMyLeagueStats` - Retorna estadísticas de benchmarking de la liga

**⚠️ IMPORTANTE:** Antes de desplegar, verifica que la API key de HubSpot esté configurada:

```bash
# Ver configuración actual
firebase functions:config:get

# Si no está configurada, agrégala:
firebase functions:config:set hubspot.apikey="TU_HUBSPOT_API_KEY"

# Después de configurar, despliega las functions
firebase deploy --only functions
```

### Paso 3: Desplegar Todo de una Vez (Opcional)

Si prefieres desplegar todo junto:

```bash
cd /home/user/aviva-app-comercial
firebase deploy
```

---

## ✅ VERIFICACIÓN POST-DEPLOYMENT

### 1. Verificar el Admin

1. Abre el admin: `https://promotores-aviva-tu-negocio.web.app`
2. Ve a "Metas Comerciales"
3. Clic en "Nueva Meta"
4. En "Tipo de Objetivo" deberías ver:
   - ✅ Todos los Promotores
   - ✅ Por Liga (con selector de ligas)
   - ✅ Por Promotor Específico (con selector múltiple de usuarios)
   - ✅ Por Kiosco Específico (con selector múltiple de kioscos)

### 2. Verificar las Cloud Functions

Después del deployment, verifica que las funciones estén activas:

```bash
firebase functions:list
```

Deberías ver (entre otras):
- ✅ getMyGoals
- ✅ getMyLeagueStats

### 3. Probar en la App Android

1. Abre la app
2. Ve a "Metas & Bono"
3. Deberías ver:
   - ✅ Datos reales de HubSpot (no dummy)
   - ✅ Progreso actual vs meta
   - ✅ Sin errores HTTP 404

---

## 🔧 CÓMO CREAR UNA META DESPUÉS DEL DEPLOYMENT

### Opción 1: Meta Global (Todos los Promotores)
1. Nombre: "Meta Semanal - Diciembre 2025"
2. Período: Semanal
3. Tipo de Objetivo: **Todos los Promotores**
4. Meta Llamadas: 60
5. Meta Colocación: 150000
6. Fechas: Define el rango de la semana
7. Activa: ✅

### Opción 2: Meta Individual (Promotores Específicos)
1. Nombre: "Meta Top Sellers - Diciembre"
2. Período: Mensual
3. Tipo de Objetivo: **Por Promotor Específico**
4. **AQUÍ APARECERÁ EL AUTOCOMPLETE** donde puedes seleccionar múltiples usuarios
5. Selecciona los promotores (puedes elegir varios)
6. Meta Llamadas: 250
7. Meta Colocación: 600000
8. Fechas: Define el rango del mes
9. Activa: ✅

### Opción 3: Meta por Liga
1. Nombre: "Meta Liga Oro - Diciembre"
2. Período: Mensual
3. Tipo de Objetivo: **Por Liga**
4. **AQUÍ APARECERÁ EL AUTOCOMPLETE** de ligas
5. Selecciona una o varias ligas
6. Meta Llamadas: 200
7. Meta Colocación: 500000
8. Fechas: Define el rango
9. Activa: ✅

---

## 🐛 TROUBLESHOOTING

### "No puedo ver el Autocomplete para seleccionar usuarios"
- **Causa:** El admin no está desplegado o el cache del browser.
- **Solución:**
  1. Ejecuta `firebase deploy --only hosting`
  2. Abre el admin en modo incógnito o limpia el cache
  3. Refresca la página (Ctrl+F5 o Cmd+Shift+R)

### "Sigue apareciendo HTTP 404 en la app"
- **Causa:** Las Cloud Functions no están desplegadas.
- **Solución:** Ejecuta `firebase deploy --only functions`
- **Verifica:** Las funciones se despliegan correctamente con `firebase functions:list`

### "No aparecen usuarios en el Autocomplete"
- **Causa:** No hay usuarios con role="seller" en Firebase.
- **Solución:** Ve a "Usuarios" en el admin y asegúrate de que hay usuarios con rol "Promotor"

### "No aparecen ligas en el Autocomplete"
- **Causa:** No hay ligas creadas en Firebase.
- **Solución:** Ve a "Ligas" en el admin y crea al menos una liga

### "Los datos siguen siendo dummy en la app"
- **Causa:** Las Cloud Functions no están retornando datos reales.
- **Verificar:**
  1. HubSpot API key configurada: `firebase functions:config:get`
  2. Usuario tiene `hubspotOwnerId` en Firebase
  3. Revisa los logs: `firebase functions:log --only getMyGoals`

---

## 📊 FLUJO COMPLETO DE DATOS

```
1. ADMIN crea meta → Guarda en Firestore
   - targetType: 'users' | 'kiosks' | 'league' | 'all'
   - targetIds: ['userId1', 'userId2', ...] (array)
   - metrics: { llamadas: 60, colocacion: 150000 }

2. APP llama a Cloud Function getMyGoals
   - Autentica con Firebase token
   - Obtiene userId del token
   - Busca metas donde:
     * targetType === 'all' OR
     * targetType === 'users' && targetIds includes userId OR
     * targetType === 'league' && user is member of league

3. Cloud Function consulta HubSpot
   - Usa hubspotOwnerId del usuario
   - Calcula llamadas (deals creados)
   - Calcula colocación (suma de amounts con fecha de disbursement)

4. Cloud Function retorna datos reales
   - current: valores reales de HubSpot
   - target: valores de la meta
   - percentage: (current / target) * 100

5. APP muestra datos reales
   - Actualiza progress bars
   - Muestra comparación con meta
   - Calcula proyección de bono
```

---

## 🎯 RESUMEN DE CAMBIOS REALIZADOS

### Admin (`admin/src/pages/MetasComerciales.tsx`)
```diff
- targetId: string (single)
+ targetIds: string[] (multiple)

- targetName: string (single)
+ targetNames: string[] (multiple)

- <MenuItem value="seller">
+ <MenuItem value="users">

- <MenuItem value="kiosk">
+ <MenuItem value="kiosks">

+ <MenuItem value="league">

- <Autocomplete single select>
+ <Autocomplete multiple select>

+ {formData.targetType === 'league' && (
+   <Autocomplete leagues selector />
+ )}
```

### Cloud Functions (`functions/src/index.ts`)
```diff
- if (goalData.targetType === "seller" && goalData.targetId === userId)
+ if (goalData.targetType === "users" && goalData.targetIds.includes(userId))

- if (goalData.targetType === "kiosk" && goalData.targetId === kioskId)
+ if (goalData.targetType === "kiosks" && goalData.targetIds.includes(kioskId))

+ if (goalData.targetType === "league" && goalData.targetIds) {
+   // Check if user is member of any assigned league
+ }
```

---

## 🚀 COMANDOS RÁPIDOS

```bash
# Deploy completo
firebase deploy

# Deploy solo admin
firebase deploy --only hosting

# Deploy solo functions
firebase deploy --only functions

# Ver logs de functions
firebase functions:log

# Ver configuración
firebase functions:config:get

# Listar functions desplegadas
firebase functions:list
```

---

## 📞 PRÓXIMOS PASOS

1. ✅ Ejecuta `firebase deploy --only hosting,functions`
2. ✅ Verifica que el admin muestre los Autocomplete
3. ✅ Crea una meta de prueba asignada a un usuario específico
4. ✅ Asegúrate de que ese usuario tenga `hubspotOwnerId` configurado
5. ✅ Abre la app Android y verifica que aparezca la meta con datos reales
6. ✅ Si ves HTTP 404, revisa los logs de las functions

