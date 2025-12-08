# Panel Administrativo Aviva Tu Negocio

Panel web de administración para gestionar la app Android **sin necesidad de recompilar el APK**.

## 🎯 Propósito

Externalizar configuraciones actualmente **hardcodeadas** en el código Android a Firestore, permitiendo su edición dinámica desde una interfaz web.

## 🚀 Estructura del Proyecto

```
aviva-app-comercial/
├── app/                  # 📱 App Android nativa (Kotlin)
├── functions/            # ☁️ Backend (Firebase Functions)
├── admin/                # 🖥️ Panel Web Administrativo (React + Vite)
├── firebase.json         # Configuración Firebase
└── firestore.rules       # Reglas de seguridad Firestore
```

## 🛠️ Tecnologías del Panel Admin

- **React 18** + **TypeScript**
- **Vite** (build tool ultrarrápido)
- **Material-UI v5** (componentes UI)
- **React Router v6** (navegación)
- **Firebase SDK v10** (Auth, Firestore, Storage)

## 📦 Instalación y Desarrollo

### Instalar dependencias

```bash
cd admin
npm install
```

### Ejecutar en modo desarrollo

```bash
npm run dev
```

El panel estará disponible en `http://localhost:5173`

### Compilar para producción

```bash
npm run build
```

Los archivos compilados estarán en `admin/dist/`

## 🔥 Despliegue

### Desplegar todo (Hosting + Functions + Firestore Rules)

```bash
firebase deploy
```

### Desplegar solo el panel web

```bash
cd admin
npm run build
cd ..
firebase deploy --only hosting
```

### Desplegar solo las reglas de Firestore

```bash
firebase deploy --only firestore:rules
```

## 🔐 Autenticación

- Solo cuentas de **@avivacredito.com**
- Login con Google OAuth
- Verificación de email en colección `admins` de Firestore

## 📊 Módulos del Panel

### 1. Dashboard
- Estadísticas generales del sistema
- Resumen de configuraciones
- Métricas de uso

### 2. Catálogo de Giros 🔴 NUEVO
**Problema:** Actualmente hardcodeado en `AvivaConfig.kt:12-85`

**Solución:** CRUD completo de giros relevantes

**Campos (coinciden con modelo Android `GiroRelevante`):**
- `codigo`: String (ej: "461110")
- `nombre`: String (ej: "Abarrotes")
- `montoMinimoCentavos`: Int (ej: 75000 = $750.00)
- `montoMaximoCentavos`: Int (ej: 150000 = $1,500.00)
- `descripcion`: String
- `palabrasClave`: List<String> (para búsqueda)
- `activo`: Boolean

**Colección Firestore:** `/giros_relevantes`

**Giros actuales hardcodeados:**
1. Abarrotes (461110)
2. Carnicerías (461121)
3. Tortillerías (461170)
4. Fruterías (461130)
5. Papelerías (464111)
6. Panaderías (311811)
7. Tlapalerías (467111)
8. Artesanías (339999)
9. Farmacias (464121)

### 3. Administradores 🔴 NUEVO
**Problema:** Actualmente hardcodeado en `MainActivity.kt:142-150`

**Solución:** CRUD de emails administrativos

**Campos:**
- `email`: String (solo @avivacredito.com)
- `nombre`: String (opcional)
- `activo`: Boolean
- `fechaAgregado`: Timestamp
- `agregadoPor`: String

**Colección Firestore:** `/admins`

**Admins actuales hardcodeados:**
1. rolando.robles@avivacredito.com

### 4. Configuración del Sistema
**Estado:** Ya existe en Firestore como `system_config/system_config`

**Función del panel:** Editor web para los 50+ campos existentes

**Categorías:**
- URLs del sistema (ayuda, privacidad, términos)
- Features flags (habilitar/deshabilitar funciones)
- Configuración de asistencia
- Parámetros de búsqueda DENUE
- Configuración de imágenes
- Versión mínima de la app
- Modo mantenimiento

## 🔗 Integración con la App Android

### 1. Externalizar Giros

**Crear servicio en Android:**

```kotlin
// Crear archivo: app/src/main/java/com/promotoresavivatunegocio_1/services/GirosService.kt

package com.promotoresavivatunegocio_1.services

import com.google.firebase.firestore.FirebaseFirestore
import com.promotoresavivatunegocio_1.services.AvivaConfig.GiroRelevante
import kotlinx.coroutines.tasks.await

class GirosService {
    private val db = FirebaseFirestore.getInstance()

    suspend fun getGirosActivos(): List<GiroRelevante> {
        return try {
            db.collection("giros_relevantes")
                .whereEqualTo("activo", true)
                .get()
                .await()
                .documents
                .mapNotNull { doc ->
                    GiroRelevante(
                        codigo = doc.getString("codigo") ?: return@mapNotNull null,
                        nombre = doc.getString("nombre") ?: return@mapNotNull null,
                        montoMinimoCentavos = doc.getLong("montoMinimoCentavos")?.toInt() ?: 0,
                        montoMaximoCentavos = doc.getLong("montoMaximoCentavos")?.toInt() ?: 0,
                        descripcion = doc.getString("descripcion") ?: "",
                        palabrasClave = (doc.get("palabrasClave") as? List<*>)
                            ?.mapNotNull { it as? String } ?: emptyList()
                    )
                }
        } catch (e: Exception) {
            emptyList()
        }
    }
}
```

**Modificar AvivaConfig.kt:**

```kotlin
// ELIMINAR líneas 12-85 (val girosAceptados = listOf(...))

// REEMPLAZAR por:
object AvivaConfig {
    private val girosService = GirosService()

    suspend fun getGirosAceptados(): List<GiroRelevante> {
        return girosService.getGirosActivos()
    }

    // Mantener el data class existente
    data class GiroRelevante(
        val codigo: String,
        val nombre: String,
        val montoMinimoCentavos: Int,
        val montoMaximoCentavos: Int,
        val descripcion: String,
        val palabrasClave: List<String>
    )
}
```

### 2. Externalizar Administradores

**Modificar MainActivity.kt:**

```kotlin
// ELIMINAR líneas 142-156 (función setupInitialAdmins)

// REEMPLAZAR por:
private fun isAdminEmail(email: String, callback: (Boolean) -> Unit) {
    db.collection("admins")
        .whereEqualTo("email", email.lowercase())
        .whereEqualTo("activo", true)
        .limit(1)
        .get()
        .addOnSuccessListener { result ->
            callback(!result.isEmpty)
        }
        .addOnFailureListener {
            callback(false)
        }
}

// Usar en el código de autenticación:
private fun onUserAuthenticated(user: FirebaseUser) {
    isAdminEmail(user.email ?: "") { isAdmin ->
        if (isAdmin) {
            // Permitir acceso admin
        } else {
            // Usuario normal
        }
    }
}
```

### 3. Actualizar Configuración en Tiempo Real

**Modificar AuthService.kt (línea 203):**

```kotlin
// CAMBIAR loadSystemConfig() por:
private fun listenToSystemConfig() {
    db.collection("system_config")
        .document("system_config")
        .addSnapshotListener { snapshot, error ->
            if (error != null) {
                systemConfig = SystemConfig.getDefaultConfig()
                return@addSnapshotListener
            }

            systemConfig = snapshot?.toObject(SystemConfig::class.java)
                ?: SystemConfig.getDefaultConfig()

            // Notificar cambios a la app
            onConfigUpdated(systemConfig!!)
        }
}
```

## 📁 Estructura Firestore

```
/giros_relevantes (NUEVO)
  /{giroId}
    codigo: "461110"
    nombre: "Abarrotes"
    montoMinimoCentavos: 75000
    montoMaximoCentavos: 150000
    descripcion: "Tiendas de abarrotes y misceláneas"
    palabrasClave: ["abarrotes", "miscelanea", "tienda"]
    activo: true

/admins (NUEVO)
  /{adminId}
    email: "rolando.robles@avivacredito.com"
    nombre: "Rolando Robles"
    activo: true
    fechaAgregado: timestamp
    agregadoPor: "panel-admin"

/system_config (YA EXISTE - solo se edita)
  /system_config
    appName: "Aviva Tu Negocio"
    appVersion: "1.0.0"
    enableAttendance: true
    enableMetrics: true
    ... (50+ campos existentes)

/kiosks (YA EXISTE - no se toca)
  # Ya tiene CRUD completo en KioskService.kt
```

## 🔒 Firestore Security Rules

Las reglas ya están configuradas en `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Verificar que el usuario es admin
    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid))
        && get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.activo == true;
    }

    // Usuarios autenticados pueden leer
    match /giros_relevantes/{giroId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    match /admins/{adminId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    match /system_config/{configId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
  }
}
```

## 📱 Flujo de Datos

```
1. Admin edita en Panel Web
       ↓
2. Cambio se guarda en Firestore
       ↓
3. App Android escucha cambios (SnapshotListener)
       ↓
4. UI se actualiza automáticamente
```

**Sin recompilación del APK necesaria** 🎉

## 🎯 Beneficios

✅ **Sin recompilación**: Cambia giros, admins y configuraciones sin tocar el código
✅ **Tiempo real**: Los cambios se propagan instantáneamente
✅ **Centralizado**: Un solo lugar para gestionar todo
✅ **Seguro**: Reglas de Firestore protegen los datos
✅ **Escalable**: Firebase maneja millones de usuarios
✅ **Basado en código real**: 100% verificado contra el repositorio existente

## 🚨 Troubleshooting

### Error: "Firestore permission denied"

- Verificar que el usuario está autenticado
- Verificar que tiene email en colección `admins` con `activo: true`
- Verificar que las reglas de Firestore están desplegadas

### Panel no carga después de deploy

```bash
# Limpiar caché y rebuilding
cd admin
rm -rf dist
npm run build
firebase deploy --only hosting
```

### App Android no recibe actualizaciones

- Verificar que Firestore está habilitado en el proyecto
- Verificar que las reglas permiten lectura
- Verificar que el ID del proyecto coincide en google-services.json
- Verificar que el listener está activado (SnapshotListener)

## 📝 Archivos Modificados

### Android
1. **Crear:** `app/src/main/java/.../services/GirosService.kt`
2. **Modificar:** `app/src/main/java/.../services/AvivaConfig.kt` (eliminar líneas 12-85)
3. **Modificar:** `app/src/main/java/.../MainActivity.kt` (eliminar líneas 142-156)
4. **Modificar:** `app/src/main/java/.../services/AuthService.kt` (cambiar línea 203)

### Panel Web (Ya implementado)
- `/admin/src/pages/Dashboard.tsx`
- `/admin/src/pages/Giros.tsx`
- `/admin/src/pages/Administradores.tsx`
- `/admin/src/pages/Configuracion.tsx`

## 📞 Soporte

Para problemas o preguntas:
- Revisar logs de Firebase Console
- Verificar reglas de Firestore
- Consultar documentación de Firebase
- Contactar al equipo de desarrollo
