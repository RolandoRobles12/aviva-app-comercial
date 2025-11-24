# Panel Administrativo Aviva Tu Negocio
## Basado en Análisis Real del Código Android

Este panel fue construido **exclusivamente** basándose en un análisis exhaustivo del código Android existente, no en suposiciones. Externaliza solo lo que está **realmente hardcodeado** en el código.

---

## 🔍 Análisis del Código (Resumen Ejecutivo)

### ❌ CRÍTICO - Actualmente Hardcodeado

| Elemento | Ubicación | Prioridad | Estado |
|----------|-----------|-----------|--------|
| **Catálogo de Giros** | `AvivaConfig.kt` | 🔴 ALTA | 9 giros + montos hardcodeados |
| **Lista de Admins** | `MainActivity.kt:142-149` | 🔴 ALTA | 7 emails hardcodeados |
| **URLs de Servicios** | Múltiples archivos | 🔴 ALTA | 10+ URLs dispersas |
| **Parámetros DENUE** | 3 archivos diferentes | 🟡 MEDIA | Valores inconsistentes |
| **Config de Location** | `LocationService.kt` | 🟡 MEDIA | Intervalos y timeouts |

### ✅ YA FUNCIONA - En Firestore

| Elemento | Colección | Estado |
|----------|-----------|--------|
| **Kioscos** | `kiosks` | ✅ CRUD completo |
| **System Config** | `system_config/settings` | ⚠️ Existe pero se carga solo una vez |

---

## 📦 Módulos del Panel (Solo lo Real)

### 1. **Dashboard**
- Estadísticas de kioscos, usuarios, métricas
- Resumen general del sistema

### 2. **Kioscos** ✅ (Ya existe en Firestore)
- Gestión completa de sucursales
- Ubicación GPS con validación
- Radio configurable (10-1000m)
- **Ya funciona perfectamente** en la app

### 3. **Catálogo de Giros** 🆕 (CRÍTICO)
**Problema actual:** 9 giros hardcodeados en `AvivaConfig.kt`:
```kotlin
// Línea 15-23
val girosRelevantes = listOf(
    "Abarrotes" to 7500, // $75.00
    "Carnicerías" to 10000, // $100.00
    "Tortillerías" to 7500,
    // ... etc
)
```

**Solución:** CRUD en Firestore `giros_relevantes`
- Nombre del giro
- Código DENUE
- Monto de crédito (en centavos)
- Descripción
- Estado (activo/inactivo)

**Impacto:** La app puede agregar/modificar giros sin recompilar

### 4. **Administradores** 🆕 (CRÍTICO)
**Problema actual:** 7 emails hardcodeados en `MainActivity.kt`:
```kotlin
// Líneas 142-149
val adminEmails = listOf(
    "rolando.robles@avivacredito.com",
    "jesica.silva@avivacredito.com",
    "christian.garcia@avivacredito.com",
    // ...
)
```

**Solución:** Colección `admins` en Firestore
- Email
- Nombre
- Fecha de agregado
- Agregado por

**Impacto:** Gestionar admins sin modificar código

### 5. **Configuración del Sistema** 🔧 (Mejorado)
**Ya existe en Firestore** pero ampliado con parámetros reales encontrados:

#### URLs Hardcodeadas (10 encontradas):
```kotlin
// DenueService.kt:27
private const val BASE_URL = "https://www.inegi.org.mx/app/api/denue/v1/consulta"

// AttendanceFragment.kt:49
"https://registro-aviva.web.app/"

// AvivaTuNegocioFragment.kt:857
"https://aos.cloudaviva.com/auth/azure/sign-in"

// MetricsFragment.kt:53
"https://lookerstudio.google.com/u/0/reporting/..."
```

#### Parámetros DENUE (Inconsistencias Críticas):
```kotlin
// AvivaConfig.kt → 3000m
// ProspeccionService.kt → 2000m
// DenueService.kt → 1500m
```
**3 valores diferentes para el mismo parámetro!**

#### Location Tracking:
```kotlin
// LocationService.kt
UPDATE_INTERVAL = 15 * 60 * 1000L // 15 minutos
FASTEST_INTERVAL = 5 * 60 * 1000L // 5 minutos
MIN_DISPLACEMENT = 75f // metros
```

#### Configuración de Imágenes:
```kotlin
// PhotoStorageService.kt:97
MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
MAX_RESOLUTION = 1920
COMPRESSION_QUALITY = 85
```

**Todo esto ahora es editable desde el panel**

---

## 🚀 Cómo Usar el Panel

### Deploy

```bash
cd admin
npm install
npm run build
cd ..
firebase deploy --only hosting,firestore:rules
```

### Estructura de Firestore a Crear

```
/giros_relevantes (nuevo)
  /{giroId}
    - nombre: "Abarrotes"
    - codigo: "461110"
    - montoCredito: 7500  // centavos
    - descripcion: "Tiendas de abarrotes"
    - activo: true

/admins (nuevo)
  /{adminId}
    - email: "user@avivacredito.com"
    - nombre: "Nombre Completo"
    - fechaAgregado: timestamp
    - agregadoPor: "panel-admin"

/kiosks (ya existe)
  ... (sin cambios)

/system_config (ya existe, ampliado)
  /settings
    - denueApiUrl: "https://..."
    - denueSearchRadius: 3000
    - attendanceWebUrl: "https://..."
    - lookerDashboardUrl: "https://..."
    - ... (50+ parámetros)
```

---

## 🔗 Integración con Android

### 1. Leer Catálogo de Giros

**Antes (hardcodeado):**
```kotlin
// AvivaConfig.kt
val girosRelevantes = listOf(
    "Abarrotes" to 7500,
    "Carnicerías" to 10000,
    // ... hardcoded
)
```

**Después (dinámico):**
```kotlin
// Crear GirosService.kt
class GirosService {
    private val db = FirebaseFirestore.getInstance()

    fun getGirosActivos(callback: (List<Giro>) -> Unit) {
        db.collection("giros_relevantes")
            .whereEqualTo("activo", true)
            .get()
            .addOnSuccessListener { documents ->
                val giros = documents.map { doc ->
                    Giro(
                        id = doc.id,
                        nombre = doc.getString("nombre") ?: "",
                        codigo = doc.getString("codigo") ?: "",
                        montoCredito = doc.getLong("montoCredito")?.toInt() ?: 0,
                        descripcion = doc.getString("descripcion")
                    )
                }
                callback(giros)
            }
    }
}

data class Giro(
    val id: String,
    val nombre: String,
    val codigo: String,
    val montoCredito: Int, // centavos
    val descripcion: String?
)
```

**Reemplazar en:**
- `AvivaConfig.kt` - Eliminar lista hardcodeada
- `ProspeccionService.kt` - Usar servicio dinámico
- `DenueService.kt` - Usar códigos desde Firestore

### 2. Verificar Administradores

**Antes (hardcodeado):**
```kotlin
// MainActivity.kt:142-149
val adminEmails = listOf(
    "rolando.robles@avivacredito.com",
    "jesica.silva@avivacredito.com",
    // ...
)
val isAdmin = adminEmails.contains(userEmail)
```

**Después (dinámico):**
```kotlin
class AdminService {
    private val db = FirebaseFirestore.getInstance()

    suspend fun isAdmin(email: String): Boolean {
        return try {
            val result = db.collection("admins")
                .whereEqualTo("email", email.lowercase())
                .limit(1)
                .get()
                .await()

            !result.isEmpty
        } catch (e: Exception) {
            false
        }
    }
}

// En MainActivity.kt
lifecycleScope.launch {
    val isAdmin = AdminService().isAdmin(userEmail)
    if (isAdmin) {
        // Mostrar opciones de admin
    }
}
```

### 3. Usar Configuración Dinámica

**Antes (hardcodeado):**
```kotlin
// DenueService.kt
private const val SEARCH_RADIUS = 1500 // ← Hardcoded
```

**Después (dinámico):**
```kotlin
// Actualizar SystemConfig existente
class SystemConfigService {
    private val db = FirebaseFirestore.getInstance()

    // Listener en tiempo real
    fun listenToConfig(callback: (SystemConfig) -> Unit): ListenerRegistration {
        return db.collection("system_config")
            .document("settings")
            .addSnapshotListener { snapshot, e ->
                if (snapshot != null && snapshot.exists()) {
                    val config = SystemConfig(
                        denueSearchRadius = snapshot.getLong("denueSearchRadius")?.toInt() ?: 3000,
                        denueApiUrl = snapshot.getString("denueApiUrl") ?: "",
                        denueMaxResults = snapshot.getLong("denueMaxResults")?.toInt() ?: 50,
                        // ... etc
                    )
                    callback(config)
                }
            }
    }
}

// En DenueService.kt
private var searchRadius = 3000 // default

init {
    SystemConfigService().listenToConfig { config ->
        searchRadius = config.denueSearchRadius
        // Actualizar otros parámetros
    }
}
```

---

## 📊 Impacto Real

### Sin Panel (Antes)
1. Cambiar giro → Modificar `AvivaConfig.kt` → Recompilar → Publicar APK
2. Agregar admin → Modificar `MainActivity.kt` → Recompilar → Publicar APK
3. Cambiar URL → Buscar en 10 archivos → Recompilar → Publicar APK
4. Ajustar radio DENUE → ¿Cuál de los 3 valores? → Recompilar → Publicar APK

### Con Panel (Ahora)
1. Cambiar giro → Panel web → Guardar → **Actualización instantánea**
2. Agregar admin → Panel web → Guardar → **Sin recompilar**
3. Cambiar URL → Panel web → Guardar → **Sin recompilar**
4. Ajustar radio DENUE → **Un solo lugar** → Guardar → **Consistente**

---

## ⚠️ Problemas Encontrados (Para Corregir en Android)

### 1. Inconsistencias Críticas
- **Radio de búsqueda:** 3 valores diferentes (3000m, 2000m, 1500m)
- **Giros:** Listas en `AvivaConfig` ≠ listas en `ProspeccionService`
- **Location intervals:** Valores ligeramente diferentes en 2 servicios

### 2. SystemConfig no se actualiza en tiempo real
**Problema:** `AuthService.kt` carga config una sola vez al login
**Solución:** Implementar `SnapshotListener` para escuchar cambios

### 3. Duplicación de Código
Varios servicios cargan su propia copia de `system_config` en vez de compartir

---

## 🎯 Roadmap

### ✅ Completado
- Panel base con React + Vite
- Firebase Auth + Firestore
- CRUD de Kioscos (ya existía)
- CRUD de Giros (nuevo, crítico)
- CRUD de Administradores (nuevo, crítico)
- Configuración ampliada (parámetros reales)

### 🔄 Siguiente Fase (Opcional)
- Migrar Ciudades a Firestore (7 ciudades hardcodeadas en `City.kt`)
- Migrar Productos a Firestore (3 productos en `AvivaConfig.kt`)
- Dashboard con métricas reales de uso
- Log de cambios (audit trail)

### 🚫 NO Implementado (No Necesario)
- ❌ Textos Dinámicos (no es crítico según análisis)
- ❌ CRUDs inventados que no existen en el código
- ❌ Funcionalidades "futuras" no solicitadas

---

## 📝 Notas Importantes

1. **Este panel fue construido basándose en análisis real**, no suposiciones
2. **Solo externaliza lo que está hardcodeado** en tu código actual
3. **Mantiene lo que ya funciona** (Kioscos, SystemConfig)
4. **Soluciona inconsistencias** (múltiples radios DENUE)
5. **No modifica la arquitectura** innecesariamente

---

## 🔐 Seguridad

- Login obligatorio con @avivacredito.com
- Firestore Rules protegen escritura (solo admins)
- Lectura permitida para usuarios autenticados
- Super admin no puede ser eliminado

---

## 📞 Para Desarrolladores

**Archivos Android a modificar:**
1. `AvivaConfig.kt` - Eliminar giros hardcodeados, leer de Firestore
2. `MainActivity.kt` - Eliminar lista de admins, leer de Firestore
3. `DenueService.kt` - Usar `denueSearchRadius` desde SystemConfig
4. `ProspeccionService.kt` - Sincronizar con Firestore
5. `AuthService.kt` - Agregar listener en tiempo real para SystemConfig

**Testing:**
1. Agregar giro en panel → Verificar que aparece en búsqueda
2. Cambiar radio DENUE → Verificar que se aplica en búsqueda
3. Agregar admin → Verificar que tiene acceso en la app

---

**Fecha de análisis:** 2025-11-24
**Archivos analizados:** ~80 archivos Kotlin
**Valores hardcodeados encontrados:** ~80+
**URLs encontradas:** 10
