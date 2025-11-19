# 🔥 Guía Detallada: Configurar Firebase Functions (Paso a Paso)

## ¿Qué es Firebase Functions?

**Firebase Cloud Functions** es como tener un servidor backend en la nube que corre automáticamente cuando lo llamas desde tu app. En lugar de crear un servidor tradicional, Firebase lo maneja todo por ti.

**¿Por qué lo necesitamos?**
- ✅ Tu app Android **NO** puede guardar el token de HubSpot (es inseguro)
- ✅ Firebase Functions actúa como **intermediario seguro** entre tu app y HubSpot
- ✅ El token de HubSpot vive **solo en el servidor** (Firebase)
- ✅ Tu app solo envía peticiones autenticadas a Firebase Functions

```
┌─────────────┐                  ┌──────────────────┐                  ┌──────────┐
│  App Android│  ──Firebase──▶   │ Firebase Functions│  ──API Key──▶   │ HubSpot  │
│  (Cliente)  │     Auth         │    (Servidor)     │    Segura       │   CRM    │
└─────────────┘                  └──────────────────┘                  └──────────┘
```

---

## Parte 1: Instalar Firebase CLI (Solo una vez)

### ¿Qué es Firebase CLI?
Es una herramienta de línea de comandos que te permite controlar Firebase desde tu computadora.

### Paso 1.1: Verificar si tienes Node.js

Abre tu terminal y ejecuta:

```bash
node --version
```

**¿Qué esperar?**
- ✅ Si ves algo como `v18.17.0` o `v20.x.x` → **Todo bien, continúa**
- ❌ Si ves un error → **Necesitas instalar Node.js**

**Si necesitas instalar Node.js:**
```bash
# En Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# En Mac:
brew install node

# En Windows:
# Descarga el instalador de: https://nodejs.org/
```

### Paso 1.2: Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

**¿Qué hace este comando?**
- `npm` = Gestor de paquetes de Node.js
- `install -g` = Instala de forma **global** (disponible en toda tu computadora)
- `firebase-tools` = Las herramientas de Firebase

**¿Qué esperar?**
Verás algo como:
```
added 800 packages in 45s
```

**Verificar que se instaló:**
```bash
firebase --version
```

Deberías ver algo como: `12.9.1` o similar.

---

## Parte 2: Conectar Firebase CLI con tu cuenta

### Paso 2.1: Iniciar sesión en Firebase

```bash
firebase login
```

**¿Qué pasa aquí?**
1. Se abrirá tu navegador web
2. Te pedirá que inicies sesión con tu cuenta de Google
3. Te preguntará si permites que Firebase CLI acceda a tu cuenta
4. Haz clic en **"Permitir"**

**¿Qué esperar en la terminal?**
```
✔ Success! Logged in as tu-email@gmail.com
```

### Paso 2.2: Verificar que estás conectado

```bash
firebase projects:list
```

**¿Qué hace?**
Lista todos tus proyectos de Firebase.

**¿Qué esperar?**
```
┌──────────────────────┬────────────────────┬──────────────┬──────────┐
│ Project Display Name │ Project ID         │ Project #    │ Resource │
├──────────────────────┼────────────────────┼──────────────┼──────────┤
│ Aviva App Comercial  │ aviva-app-comercial│ 123456789012 │          │
└──────────────────────┴────────────────────┴──────────────┴──────────┘
```

**⚠️ IMPORTANTE:** Copia el **"Project ID"** (ejemplo: `aviva-app-comercial`)
Lo necesitarás después.

---

## Parte 3: Seleccionar tu proyecto

### Paso 3.1: Ir al directorio de tu proyecto

```bash
cd /home/user/aviva-app-comercial
```

**¿Qué hace?**
Te mueve al directorio de tu proyecto Android.

### Paso 3.2: Conectar Firebase CLI con este proyecto

```bash
firebase use --add
```

**¿Qué pasa aquí?**
1. Te mostrará una lista de tus proyectos
2. Selecciona tu proyecto (usa las flechas ↑↓ y Enter)
3. Te preguntará un "alias" → escribe: **default**

**Ejemplo de lo que verás:**
```
? Which project do you want to add?
❯ aviva-app-comercial
  otro-proyecto

? What alias do you want to use for this project? (e.g. staging)
> default

✔ Created alias default for aviva-app-comercial
```

### Paso 3.3: Verificar que está conectado

```bash
firebase projects:list
```

Deberías ver tu proyecto con un asterisco (*) o resaltado.

---

## Parte 4: Instalar dependencias de las Functions

### ¿Qué son las dependencias?

Las Firebase Functions usan Node.js, y necesitan instalar librerías (como Retrofit en Android, pero para Node.js).

### Paso 4.1: Ir al directorio de functions

```bash
cd functions
```

**¿Qué hace?**
Entra a la carpeta donde están las Firebase Functions que creamos.

### Paso 4.2: Instalar dependencias

```bash
npm install
```

**¿Qué hace?**
Lee el archivo `package.json` e instala todas las librerías necesarias:
- `firebase-admin` → Para acceder a Firestore y Auth
- `firebase-functions` → Para crear las funciones
- `axios` → Para hacer peticiones HTTP a HubSpot
- `cors` → Para permitir peticiones desde tu app
- `typescript` → Para compilar TypeScript a JavaScript

**¿Qué esperar?**
```
npm WARN deprecated ...
npm WARN deprecated ...

added 500 packages, and audited 501 packages in 30s

150 packages are looking for funding
```

**⚠️ Los warnings son normales, no te preocupes.**

### Paso 4.3: Verificar que compile

```bash
npm run build
```

**¿Qué hace?**
Compila tu código TypeScript a JavaScript (que es lo que Node.js entiende).

**¿Qué esperar?**
Si todo está bien, verás:
```
> build
> tsc

✔ Compilation successful
```

Si hay errores, me los copias y te ayudo.

---

## Parte 5: Configurar el Token de HubSpot

### ¿Por qué este paso?

Aquí es donde guardamos el token de HubSpot de forma **segura** en Firebase. Nunca estará en tu código ni en tu app.

### Paso 5.1: Volver al directorio raíz

```bash
cd ..
```

**¿Qué hace?**
Regresas de `functions/` a `aviva-app-comercial/`

### Paso 5.2: Configurar el token de HubSpot

```bash
firebase functions:config:set hubspot.apikey="TU_TOKEN_DE_HUBSPOT_AQUI"
```

**⚠️ IMPORTANTE:** Reemplaza `TU_TOKEN_DE_HUBSPOT_AQUI` con el token real que copiaste de HubSpot.

**Ejemplo:**
```bash
firebase functions:config:set hubspot.apikey="pat-na1-12345678-abcd-1234-efgh-1234567890ab"
```

**¿Qué hace?**
Guarda el token en Firebase de forma segura. Es como crear una variable de entorno en el servidor.

**¿Qué esperar?**
```
✔ Functions config updated.

Please deploy your functions for the change to take effect by running:
   firebase deploy --only functions
```

### Paso 5.3: Verificar que se guardó

```bash
firebase functions:config:get
```

**¿Qué esperar?**
```json
{
  "hubspot": {
    "apikey": "pat-na1-12345678-abcd-1234-efgh-1234567890ab"
  }
}
```

**✅ Perfecto, el token está guardado.**

---

## Parte 6: Desplegar las Functions a Firebase

### ¿Qué es "desplegar"?

Es subir tu código a los servidores de Firebase para que esté disponible en internet.

### Paso 6.1: Desplegar solo las functions

```bash
firebase deploy --only functions
```

**¿Qué hace?**
1. Compila tu código TypeScript
2. Empaqueta todo
3. Lo sube a Firebase
4. Crea las 6 funciones en la nube

**¿Qué esperar?** (Toma 2-5 minutos)
```
=== Deploying to 'aviva-app-comercial'...

i  deploying functions
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
✔  functions: required API cloudbuild.googleapis.com is enabled
i  functions: preparing codebase default for deployment
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (50 MB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: creating Node.js 18 function getHubSpotMetrics(us-central1)...
i  functions: creating Node.js 18 function getDealsMetrics(us-central1)...
i  functions: creating Node.js 18 function getContactsMetrics(us-central1)...
i  functions: creating Node.js 18 function getPipelineMetrics(us-central1)...
i  functions: creating Node.js 18 function syncVisitToHubSpot(us-central1)...
i  functions: creating Node.js 18 function batchSyncVisits(us-central1)...
✔  functions[getHubSpotMetrics(us-central1)]: Successful create operation.
✔  functions[getDealsMetrics(us-central1)]: Successful create operation.
✔  functions[getContactsMetrics(us-central1)]: Successful create operation.
✔  functions[getPipelineMetrics(us-central1)]: Successful create operation.
✔  functions[syncVisitToHubSpot(us-central1)]: Successful create operation.
✔  functions[batchSyncVisits(us-central1)]: Successful create operation.

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/aviva-app-comercial/overview
```

### Paso 6.2: Verificar que se desplegaron

```bash
firebase functions:list
```

**¿Qué esperar?**
```
┌──────────────────────┬────────────┬─────────────────────────────────────────────┐
│ Name                 │ State      │ Trigger                                     │
├──────────────────────┼────────────┼─────────────────────────────────────────────┤
│ getHubSpotMetrics    │ READY      │ https://us-central1-aviva-app-comercial...  │
│ getDealsMetrics      │ READY      │ https://us-central1-aviva-app-comercial...  │
│ getContactsMetrics   │ READY      │ https://us-central1-aviva-app-comercial...  │
│ getPipelineMetrics   │ READY      │ https://us-central1-aviva-app-comercial...  │
│ syncVisitToHubSpot   │ READY      │ https://us-central1-aviva-app-comercial...  │
│ batchSyncVisits      │ READY      │ https://us-central1-aviva-app-comercial...  │
└──────────────────────┴────────────┴─────────────────────────────────────────────┘
```

**✅ Si ves "READY" en todas, ¡está funcionando!**

---

## Parte 7: Configurar la URL en tu App Android

### Paso 7.1: Obtener la URL base de tus functions

De la lista anterior, copia la URL de cualquier función. Por ejemplo:
```
https://us-central1-aviva-app-comercial.cloudfunctions.net/getHubSpotMetrics
```

La **URL base** es todo antes del nombre de la función:
```
https://us-central1-aviva-app-comercial.cloudfunctions.net/
```

### Paso 7.2: Editar HubSpotRepository.kt

Abre el archivo:
```
app/src/main/java/com/promotoresavivatunegocio_1/services/HubSpotRepository.kt
```

Busca la línea 23 (aprox):
```kotlin
private const val FUNCTIONS_BASE_URL = "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/"
```

Reemplázala con tu URL:
```kotlin
private const val FUNCTIONS_BASE_URL = "https://us-central1-aviva-app-comercial.cloudfunctions.net/"
```

**Guarda el archivo.**

---

## Parte 8: Probar que todo funciona

### Paso 8.1: Ver logs en tiempo real

En una terminal, deja corriendo:
```bash
firebase functions:log
```

**¿Qué hace?**
Muestra los logs de tus functions en tiempo real. Cuando tu app haga peticiones, verás aquí qué está pasando.

### Paso 8.2: Compilar y correr la app

1. Abre **Android Studio**
2. Haz clic en **Build → Rebuild Project**
3. Espera a que termine
4. Ejecuta la app en un dispositivo/emulador

### Paso 8.3: Probar el panel de HubSpot

1. **Inicia sesión** con un usuario que tenga `role: "admin"` en Firestore
2. Ve a la pestaña **"Admin"** (abajo)
3. Verás la pestaña **"📊 HubSpot"** como primera pestaña
4. Haz clic en **"🔄 Actualizar Métricas"**

**¿Qué esperar?**
- Verás un loading
- En los logs de Firebase (`firebase functions:log`) verás:
  ```
  Function execution started
  Fetching deals metrics...
  Fetching contacts metrics...
  Function execution took 1234 ms
  ```
- En la app verás las métricas de HubSpot

---

## Comandos de Troubleshooting

### Ver logs de una función específica

```bash
firebase functions:log --only getHubSpotMetrics
```

### Ver solo errores

```bash
firebase functions:log --only getHubSpotMetrics --log-level error
```

### Re-desplegar si haces cambios

```bash
firebase deploy --only functions
```

### Ver configuración actual

```bash
firebase functions:config:get
```

### Cambiar el token de HubSpot

```bash
firebase functions:config:set hubspot.apikey="NUEVO_TOKEN"
firebase deploy --only functions
```

---

## Verificación Final - Checklist

Marca cada paso cuando lo completes:

- [ ] Node.js instalado (`node --version`)
- [ ] Firebase CLI instalado (`firebase --version`)
- [ ] Iniciado sesión en Firebase (`firebase login`)
- [ ] Proyecto conectado (`firebase use --add`)
- [ ] Dependencias instaladas (`cd functions && npm install`)
- [ ] Código compila (`npm run build`)
- [ ] Token de HubSpot configurado (`firebase functions:config:set...`)
- [ ] Functions desplegadas (`firebase deploy --only functions`)
- [ ] URL actualizada en HubSpotRepository.kt
- [ ] App compilada sin errores
- [ ] Usuario admin existe en Firestore con `role: "admin"`
- [ ] Métricas cargando en la app

---

## ¿Qué archivos NO debes editar?

❌ **NO TOCAR:**
- `functions/node_modules/` (se genera automáticamente)
- `functions/lib/` (se genera al compilar)
- `functions/.runtimeconfig.json` (se genera automáticamente)

✅ **PUEDES EDITAR:**
- `functions/src/index.ts` (endpoints)
- `functions/src/hubspot.service.ts` (lógica de HubSpot)

---

## Costos de Firebase Functions

**¿Cuánto cuesta?**

Firebase tiene un **plan gratuito** (Spark Plan) que incluye:
- ✅ 2 millones de invocaciones al mes **GRATIS**
- ✅ 400,000 GB-segundos de tiempo de cómputo **GRATIS**
- ✅ 200 GB de transferencia de red **GRATIS**

**Para tu caso:**
Si tienes 100 usuarios activos haciendo ~10 consultas al día:
- 100 usuarios × 10 consultas × 30 días = 30,000 invocaciones/mes
- **Estás MUY por debajo del límite gratuito**

**Si superas el límite:**
Firebase te avisa antes de cobrarte, y puedes configurar alertas.

---

## Resumen Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    TU COMPUTADORA                           │
├─────────────────────────────────────────────────────────────┤
│  1. Instalas Firebase CLI (npm install -g firebase-tools)  │
│  2. Inicias sesión (firebase login)                        │
│  3. Conectas tu proyecto (firebase use --add)              │
│  4. Instalas dependencias (cd functions && npm install)    │
│  5. Configuras token (firebase functions:config:set...)    │
│  6. Despliegas (firebase deploy --only functions)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  FIREBASE (EN LA NUBE)                      │
├─────────────────────────────────────────────────────────────┤
│  ✅ 6 funciones corriendo 24/7                             │
│  ✅ Token de HubSpot guardado de forma segura              │
│  ✅ URLs disponibles públicamente                          │
│  ✅ Autenticación automática                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    TU APP ANDROID                           │
├─────────────────────────────────────────────────────────────┤
│  ✅ Usuario hace clic en "Actualizar Métricas"             │
│  ✅ App envía petición con token de Firebase Auth          │
│  ✅ Firebase Functions recibe, valida y consulta HubSpot   │
│  ✅ App muestra las métricas                                │
└─────────────────────────────────────────────────────────────┘
```

---

¿Necesitas ayuda con algún paso específico? ¿Te salió algún error? Copia y pega el error completo y te ayudo a resolverlo. 🚀
