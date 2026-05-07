# Panel Administrativo - Arquitectura y Configuración

Externaliza configuraciones hardcodeadas en Android a Firestore, permitiendo actualizaciones sin recompilar el APK.

## Stack

- React 18 + TypeScript
- Vite
- Material-UI v5
- React Router v6
- Firebase SDK v10 (Auth, Firestore, Storage)

## Comandos

```bash
cd admin
npm install
npm run dev       # localhost:5173
npm run build     # salida en admin/dist/
```

## Deploy

```bash
firebase deploy                      # hosting + functions + rules
firebase deploy --only hosting       # solo panel web
firebase deploy --only firestore:rules
```

## Autenticación

- Google OAuth con dominio `@avivacredito.com`
- Verificación de email en colección `admins` con `activo: true`

## Módulos y Colecciones Firestore

### Giros Relevantes

Reemplaza el array hardcodeado en `AvivaConfig.kt:12-85`.

**Colección:** `/giros_relevantes`

```
{
  codigo: string           // ej: "461110"
  nombre: string           // ej: "Abarrotes"
  montoMinimoCentavos: int // ej: 75000 = $750.00
  montoMaximoCentavos: int
  descripcion: string
  palabrasClave: string[]
  activo: boolean
}
```

Giros actuales hardcodeados a migrar: Abarrotes (461110), Carnicerías (461121), Tortillerías (461170), Fruterías (461130), Papelerías (464111), Panaderías (311811), Tlapalerías (467111), Artesanías (339999), Farmacias (464121).

### Administradores

Reemplaza el array hardcodeado en `MainActivity.kt:142-150`.

**Colección:** `/admins`

```
{
  email: string        // solo @avivacredito.com
  nombre: string
  activo: boolean
  fechaAgregado: Timestamp
  agregadoPor: string
}
```

### Configuración del Sistema

**Colección:** `/system_config/system_config` (ya existe)

50+ campos: URLs del sistema, feature flags, configuración de asistencia, parámetros DENUE, versión mínima de app, modo mantenimiento.

## Integración Android

### Externalizar Giros (`GirosService.kt`)

```kotlin
// Crear: app/src/main/java/com/promotoresavivatunegocio_1/services/GirosService.kt
class GirosService {
    private val db = FirebaseFirestore.getInstance()

    suspend fun getGirosActivos(): List<GiroRelevante> {
        return try {
            db.collection("giros_relevantes")
                .whereEqualTo("activo", true)
                .get().await()
                .documents.mapNotNull { doc ->
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
        } catch (e: Exception) { emptyList() }
    }
}
```

Modificar `AvivaConfig.kt`: eliminar líneas 12-85 y reemplazar por:

```kotlin
object AvivaConfig {
    private val girosService = GirosService()
    suspend fun getGirosAceptados(): List<GiroRelevante> = girosService.getGirosActivos()

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

### Externalizar Admins (`MainActivity.kt`)

Eliminar `setupInitialAdmins()` (líneas 142-156) y reemplazar por:

```kotlin
private fun isAdminEmail(email: String, callback: (Boolean) -> Unit) {
    db.collection("admins")
        .whereEqualTo("email", email.lowercase())
        .whereEqualTo("activo", true)
        .limit(1).get()
        .addOnSuccessListener { callback(!it.isEmpty) }
        .addOnFailureListener { callback(false) }
}
```

### Config en Tiempo Real (`AuthService.kt:203`)

```kotlin
private fun listenToSystemConfig() {
    db.collection("system_config").document("system_config")
        .addSnapshotListener { snapshot, error ->
            if (error != null) { systemConfig = SystemConfig.getDefaultConfig(); return@addSnapshotListener }
            systemConfig = snapshot?.toObject(SystemConfig::class.java) ?: SystemConfig.getDefaultConfig()
            onConfigUpdated(systemConfig!!)
        }
}
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid))
        && get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.activo == true;
    }

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

## Troubleshooting

**Firestore permission denied**: Verificar auth, colección `admins` con `activo: true`, y reglas desplegadas.

**Panel no carga tras deploy**:
```bash
cd admin && rm -rf dist && npm run build && firebase deploy --only hosting
```

**App no recibe actualizaciones**: Verificar que Firestore está habilitado, reglas permiten lectura, `google-services.json` tiene el project ID correcto, y el `SnapshotListener` está activo.

## Archivos Modificados

**Android:**
- Crear: `app/src/main/java/.../services/GirosService.kt`
- Modificar: `AvivaConfig.kt` (eliminar líneas 12-85)
- Modificar: `MainActivity.kt` (eliminar líneas 142-156)
- Modificar: `AuthService.kt` (cambiar línea 203)

**Panel Web (ya implementado):**
- `admin/src/pages/Dashboard.tsx`
- `admin/src/pages/Giros.tsx`
- `admin/src/pages/Administradores.tsx`
- `admin/src/pages/Configuracion.tsx`
