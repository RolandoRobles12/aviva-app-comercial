# ⚡ Setup Rápido - Solo Comandos

## 1. Instalar Firebase CLI (si no lo tienes)

```bash
npm install -g firebase-tools
```

---

## 2. Iniciar sesión en Firebase

```bash
firebase login
```

Se abrirá el navegador → Permite el acceso

---

## 3. Ir al directorio del proyecto

```bash
cd /home/user/aviva-app-comercial
```

---

## 4. Conectar con tu proyecto Firebase

```bash
firebase use --add
```

Selecciona tu proyecto → Escribe `default` como alias

---

## 5. Instalar dependencias de las Functions

```bash
cd functions
npm install
npm run build
cd ..
```

---

## 6. Configurar token de HubSpot

**Primero, obtén tu token:**
1. Ve a: https://app.hubspot.com/settings/integrations/private-apps
2. Crea una Private App
3. Activa estos permisos:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - `crm.schemas.contacts.read`
   - `crm.schemas.deals.read`
4. Copia el token (empieza con `pat-na1-...`)

**Luego, configúralo en Firebase:**

```bash
firebase functions:config:set hubspot.apikey="TU_TOKEN_AQUI"
```

Reemplaza `TU_TOKEN_AQUI` con el token que copiaste.

---

## 7. Desplegar las Functions

```bash
firebase deploy --only functions
```

Espera 2-5 minutos. Al terminar verás las URLs de tus functions.

---

## 8. Obtener la URL de tus Functions

```bash
firebase functions:list
```

Copia la URL base. Ejemplo:
```
https://us-central1-aviva-app-comercial.cloudfunctions.net/
```

---

## 9. Actualizar la URL en tu app Android

Edita el archivo:
```
app/src/main/java/com/promotoresavivatunegocio_1/services/HubSpotRepository.kt
```

Línea 23, cambia:
```kotlin
private const val FUNCTIONS_BASE_URL = "https://us-central1-TU_PROJECT_ID.cloudfunctions.net/"
```

Por tu URL real:
```kotlin
private const val FUNCTIONS_BASE_URL = "https://us-central1-aviva-app-comercial.cloudfunctions.net/"
```

---

## 10. Compilar la app

En Android Studio:
1. Build → Rebuild Project
2. Ejecuta la app

---

## 11. Probar

1. Inicia sesión como usuario con `role: "admin"` en Firestore
2. Ve a pestaña "Admin"
3. Abre "📊 HubSpot"
4. Presiona "🔄 Actualizar Métricas"

---

## Comandos útiles después del setup

**Ver logs en tiempo real:**
```bash
firebase functions:log
```

**Ver configuración actual:**
```bash
firebase functions:config:get
```

**Cambiar el token de HubSpot:**
```bash
firebase functions:config:set hubspot.apikey="NUEVO_TOKEN"
firebase deploy --only functions
```

**Re-desplegar después de cambios:**
```bash
firebase deploy --only functions
```

---

## Script Automatizado (Opcional)

Si prefieres un script que te guíe paso a paso:

```bash
chmod +x setup-firebase.sh
./setup-firebase.sh
```
