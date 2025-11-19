# 🚀 Guía de Configuración: Integración HubSpot CRM con Aviva App

Esta guía te ayudará a configurar la integración completa entre tu app Android y HubSpot CRM usando Firebase Cloud Functions.

---

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Configurar HubSpot](#1-configurar-hubspot)
3. [Configurar Firebase Functions](#2-configurar-firebase-functions)
4. [Configurar App Android](#3-configurar-app-android)
5. [Desplegar y Probar](#4-desplegar-y-probar)
6. [Troubleshooting](#troubleshooting)

---

## Prerrequisitos

Antes de comenzar, asegúrate de tener:

- ✅ Cuenta de HubSpot (Free, Starter, o superior)
- ✅ Proyecto de Firebase configurado
- ✅ Firebase CLI instalado: `npm install -g firebase-tools`
- ✅ Node.js v18+ instalado
- ✅ Android Studio configurado con el proyecto

---

## 1. Configurar HubSpot

### Paso 1.1: Crear Private App en HubSpot

1. **Inicia sesión** en tu cuenta de HubSpot
2. Ve a **Settings** (⚙️) → **Integrations** → **Private Apps**
3. Haz clic en **Create a private app**

### Paso 1.2: Configurar Scopes (Permisos)

Marca los siguientes scopes necesarios:

#### 📊 CRM Scopes - Contacts
- ✅ `crm.objects.contacts.read`
- ✅ `crm.objects.contacts.write`

#### 💼 CRM Scopes - Deals
- ✅ `crm.objects.deals.read`
- ✅ `crm.objects.deals.write`

#### 📈 CRM Scopes - Schemas
- ✅ `crm.schemas.contacts.read`
- ✅ `crm.schemas.deals.read`

### Paso 1.3: Generar Token

1. Haz clic en **Create app**
2. Copia el **Access Token** generado (comienza con `pat-na1-...`)
3. **⚠️ IMPORTANTE:** Guarda este token de forma segura, solo se muestra una vez

---

## 2. Configurar Firebase Functions

### Paso 2.1: Inicializar Firebase CLI

```bash
# Iniciar sesión en Firebase
firebase login

# Ir al directorio del proyecto
cd /path/to/aviva-app-comercial

# Inicializar Firebase (si no está inicializado)
firebase init
```

**Selecciona:**
- ✅ Functions: Configure a Cloud Functions directory
- ✅ Firestore (si aún no lo tienes)

### Paso 2.2: Instalar Dependencias de Functions

```bash
# Ir al directorio de functions
cd functions

# Instalar dependencias
npm install

# Verificar que todo compile
npm run build
```

### Paso 2.3: Configurar API Key de HubSpot

```bash
# Configurar el token de HubSpot en Firebase Functions
firebase functions:config:set hubspot.apikey="TU_HUBSPOT_TOKEN_AQUI"

# Verificar que se guardó correctamente
firebase functions:config:get
```

**Deberías ver:**
```json
{
  "hubspot": {
    "apikey": "pat-na1-xxxxx-xxxx-xxxx"
  }
}
```

### Paso 2.4: Configurar Proyecto ID

Edita el archivo `functions/src/hubspot.service.ts` y actualiza:

```typescript
// ANTES:
private const val FUNCTIONS_BASE_URL = "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/"

// DESPUÉS:
private const val FUNCTIONS_BASE_URL = "https://us-central1-aviva-app-comercial.cloudfunctions.net/"
```

---

## 3. Configurar App Android

### Paso 3.1: Actualizar URL de Firebase Functions

Edita `app/src/main/java/com/promotoresavivatunegocio_1/services/HubSpotRepository.kt`:

```kotlin
companion object {
    // ⚠️ Reemplaza con tu PROJECT_ID de Firebase
    private const val FUNCTIONS_BASE_URL = "https://us-central1-TU_PROJECT_ID.cloudfunctions.net/"
}
```

**Para encontrar tu PROJECT_ID:**
1. Ve a Firebase Console
2. Configuración del proyecto (⚙️)
3. Copia el "ID del proyecto"

### Paso 3.2: Verificar Dependencias en build.gradle.kts

Asegúrate de tener estas dependencias ya incluidas:

```kotlin
// Retrofit (ya está en tu proyecto)
implementation("com.squareup.retrofit2:retrofit:2.9.0")
implementation("com.squareup.retrofit2:converter-gson:2.9.0")

// OkHttp (ya está en tu proyecto)
implementation("com.squareup.okhttp3:okhttp:4.12.0")
implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

// Coroutines (ya está en tu proyecto)
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
```

### Paso 3.3: Sincronizar Proyecto

```bash
# En Android Studio:
# File → Sync Project with Gradle Files
```

---

## 4. Desplegar y Probar

### Paso 4.1: Desplegar Firebase Functions

```bash
# Asegúrate de estar en la raíz del proyecto
cd /path/to/aviva-app-comercial

# Desplegar SOLO las functions
firebase deploy --only functions

# Espera a que termine (puede tomar 2-5 minutos)
```

**Verás algo como:**
```
✔ functions[getHubSpotMetrics]: Successful create operation.
✔ functions[getDealsMetrics]: Successful create operation.
✔ functions[getContactsMetrics]: Successful create operation.
✔ functions[syncVisitToHubSpot]: Successful create operation.
✔ Deploy complete!
```

### Paso 4.2: Verificar Functions Desplegadas

```bash
# Listar todas las functions
firebase functions:list

# Ver logs en tiempo real
firebase functions:log
```

### Paso 4.3: Probar en la App

1. **Compila y ejecuta la app** en Android Studio
2. **Inicia sesión** con un usuario que tenga **rol de Admin**
3. Ve a la pestaña **"Admin"** en el menú inferior
4. Verás la nueva pestaña **"📊 HubSpot"** como primera pestaña
5. Haz clic en **"🔄 Actualizar Métricas"**

**Deberías ver:**
- 💼 Total de Deals
- 💰 Valor Total
- 👥 Total de Contactos
- 📈 Pipelines activos

---

## 5. Características Implementadas

### 🎯 Panel de Métricas HubSpot

El nuevo panel de admin muestra:

✅ **Deals/Negocios:**
- Total de deals
- Valor total en moneda
- Promedio por deal
- Distribución por etapas

✅ **Contactos:**
- Total de contactos
- Distribución por lifecycle stage
- Contactos recientes

✅ **Pipelines:**
- Total de pipelines
- Deals por pipeline
- Valor total por pipeline

### 🔄 Sincronización de Visitas

Las funciones implementadas permiten:

✅ **Sync Individual:**
```kotlin
viewModel.syncVisit(visitId)
```

✅ **Batch Sync:**
```kotlin
viewModel.batchSyncVisits(listOf("visit1", "visit2", "visit3"))
```

Cuando sincronizas una visita:
1. Se crea/actualiza el **contacto** en HubSpot
2. Se crea un **deal** asociado
3. Se marca la visita como sincronizada en Firestore

---

## 🔐 Seguridad

### Autenticación Implementada

Todas las Firebase Functions están protegidas:

✅ **Verificación de Token:** Solo usuarios autenticados con Firebase Auth
✅ **Verificación de Rol:** Solo usuarios con `role: "admin"` pueden acceder
✅ **API Key Segura:** El token de HubSpot NUNCA se expone en la app Android

### Flujo de Seguridad

```
[App Android]
    ↓ Firebase Auth Token
[Firebase Functions] → Verifica token
    ↓ Verifica role == "admin"
[HubSpot API] ← API Key guardada en Firebase Config
```

---

## Troubleshooting

### ❌ Error: "HubSpot API key not configured"

**Solución:**
```bash
firebase functions:config:set hubspot.apikey="TU_TOKEN"
firebase deploy --only functions
```

### ❌ Error: "Forbidden: Admin access required"

**Solución:**
Verifica que el usuario tenga el rol de admin en Firestore:

```javascript
// En Firestore Console:
users/{userId}
  role: "admin"
```

### ❌ Error: "Failed to fetch HubSpot metrics"

**Soluciones:**
1. Verifica que tu token de HubSpot sea válido
2. Revisa que los scopes estén correctamente configurados
3. Checa los logs de Firebase:
```bash
firebase functions:log --only getHubSpotMetrics
```

### ❌ Error de compilación en Android

**Solución:**
```bash
# Limpiar y reconstruir
./gradlew clean
./gradlew build
```

### ❌ Functions no se despliegan

**Solución:**
```bash
# Verificar que estés autenticado
firebase login --reauth

# Verificar el proyecto correcto
firebase use --add

# Intentar deploy nuevamente
firebase deploy --only functions
```

---

## 📊 Endpoints Disponibles

Todas las Firebase Functions están en:
`https://REGION-PROJECT_ID.cloudfunctions.net/`

### GET /getHubSpotMetrics
Obtiene todas las métricas (deals, contacts, pipelines)

**Headers:**
```
Authorization: Bearer {FIREBASE_ID_TOKEN}
```

**Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

### GET /getDealsMetrics
Obtiene solo métricas de deals

### GET /getContactsMetrics
Obtiene solo métricas de contactos

### GET /getPipelineMetrics
Obtiene métricas de pipelines

### POST /syncVisitToHubSpot
Sincroniza una visita individual

**Body:**
```json
{
  "visitId": "FIRESTORE_VISIT_ID"
}
```

### POST /batchSyncVisits
Sincroniza múltiples visitas

**Body:**
```json
{
  "visitIds": ["visit1", "visit2", "visit3"]
}
```

---

## 🎓 Próximos Pasos

### Funcionalidades Adicionales Recomendadas

1. **Auto-sync de visitas:**
   - Trigger automático cuando se crea una visita
   - Sincronización en background

2. **Webhooks de HubSpot:**
   - Recibir notificaciones cuando cambia un deal
   - Actualizar app en tiempo real

3. **Reports personalizados:**
   - Gráficas con MPAndroidChart
   - Exportar a PDF/Excel

4. **Configuración desde la app:**
   - Permitir al admin configurar mappings de estados
   - Customizar pipelines y stages

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs de Firebase Functions:
```bash
firebase functions:log
```

2. Revisa los logs de Android (Logcat):
```
Tag: HubSpotRepository, HubSpotMetricsViewModel
```

3. Verifica la documentación de HubSpot:
https://developers.hubspot.com/docs/api/overview

---

## ✅ Checklist de Implementación

- [ ] Token de HubSpot creado y copiado
- [ ] Scopes correctos configurados en HubSpot
- [ ] Firebase CLI instalado y autenticado
- [ ] API Key configurada en Firebase Functions
- [ ] PROJECT_ID actualizado en HubSpotRepository.kt
- [ ] Functions desplegadas exitosamente
- [ ] App compilada sin errores
- [ ] Usuario admin creado en Firestore
- [ ] Métricas cargando correctamente en la app

---

**¡Felicidades! 🎉 Tu integración con HubSpot está completa.**

Ahora tienes un panel de super admin donde puedes:
- 📊 Ver métricas en tiempo real de HubSpot
- 🔄 Sincronizar visitas con el CRM
- 📈 Monitorear pipelines y deals
- 👥 Gestionar contactos y negocios

Todo desde un solo lugar, de forma segura y centralizada.
