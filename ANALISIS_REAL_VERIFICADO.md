# Panel Administrativo - REAL
## Basado en Verificación Directa del Código

## ✅ CONFIRMADO - Estado Real del Repositorio

### LO QUE YA FUNCIONA (No tocar)

1. **Kioscos** → `KioskService.kt` - CRUD completo en Firestore
   - Colección: `kiosks`
   - Ya implementado en Android
   - **NO necesita panel web**

2. **SystemConfig** → `models/SystemConfig.kt` - 50+ campos en Firestore
   - Documento: `system_config/system_config`
   - Ya se carga en `AuthService.kt:203`
   - **Solo necesita interfaz de edición**

### LO QUE ESTÁ HARDCODEADO (Crítico para Panel)

#### 1. Catálogo de Giros 🔴 CRÍTICO
**Ubicación:** `AvivaConfig.kt:12-85`

9 giros hardcodeados con modelo `GiroRelevante`:
| Giro | Código | Monto Mín | Monto Máx |
|------|--------|-----------|-----------|
| Abarrotes | 461110 | $750.00 | $1,500.00 |
| Carnicerías | 461121 | $1,000.00 | $1,500.00 |
| Tortillerías | 461170 | $800.00 | $1,200.00 |
| Fruterías | 461130 | $750.00 | $1,200.00 |
| Papelerías | 464111 | $750.00 | $1,200.00 |
| Panaderías | 311811 | $800.00 | $1,500.00 |
| Tlapalerías | 467111 | $900.00 | $1,500.00 |
| Artesanías | 339999 | $750.00 | $1,000.00 |
| Farmacias | 464121 | $1,000.00 | $1,500.00 |

**Modelo completo:**
```kotlin
data class GiroRelevante(
    val codigo: String,
    val nombre: String,
    val montoMinimoCentavos: Int,
    val montoMaximoCentavos: Int,
    val descripcion: String,
    val palabrasClave: List<String>
)
```

#### 2. Lista de Administradores 🔴 CRÍTICO
**Ubicación:** `MainActivity.kt:142-150`

7 emails hardcodeados:
- rolando.robles@avivacredito.com
- amran@avivacredito.com
- noel.hernandez@avivacredito.com
- andres.rizo@avivacredito.com
- fernando.avelar@avivacredito.com
- filiberto@avivacredito.com
- rafael.barrera@avivacredito.com

#### 3. Parámetros de Búsqueda 🟡 MEDIA
**Ubicación:** `AvivaConfig.kt:113-115`
- `RADIO_BUSQUEDA_METROS = 3000`
- `HORA_BUSQUEDA_AUTOMATICA = 10`
- `MAX_PROSPECTOS_POR_DIA = 5`

---

## 📦 Panel Mínimo Necesario

### Módulos del Panel:

1. **Dashboard**
   - Estadísticas de sistema
   - Resumen de configuraciones

2. **Catálogo de Giros** (NUEVO - crítico)
   - CRUD completo
   - Campos: código, nombre, montoMin, montoMax, descripción, palabrasClave

3. **Administradores** (NUEVO - crítico)
   - CRUD de emails admin
   - Solo dominio @avivacredito.com

4. **Configuración del Sistema** (Editar existente)
   - Interfaz para editar los 50+ campos de `SystemConfig.kt`
   - NO agregar campos nuevos, solo editar los existentes

---

## 🔗 Integración con Android

### 1. Externalizar Giros

**Crear colección Firestore:**
```
/giros_relevantes
  /{giroId}
    codigo: "461110"
    nombre: "Abarrotes"
    montoMinimoCentavos: 75000
    montoMaximoCentavos: 150000
    descripcion: "Tiendas de abarrotes y misceláneas"
    palabrasClave: ["abarrotes", "miscelanea", "tienda"]
    activo: true
```

**Modificar Android:**
```kotlin
// Crear GirosService.kt
class GirosService {
    private val db = FirebaseFirestore.getInstance()

    suspend fun getGirosActivos(): List<GiroRelevante> {
        return db.collection("giros_relevantes")
            .whereEqualTo("activo", true)
            .get()
            .await()
            .documents
            .mapNotNull { it.toObject(GiroRelevante::class.java) }
    }
}

// En AvivaConfig.kt - ELIMINAR:
// val girosAceptados = listOf(...)

// REEMPLAZAR por:
suspend fun getGirosAceptados(): List<GiroRelevante> {
    return GirosService().getGirosActivos()
}
```

### 2. Externalizar Administradores

**Crear colección Firestore:**
```
/admins
  /{adminId}
    email: "rolando.robles@avivacredito.com"
    nombre: "Rolando Robles"
    activo: true
    fechaCreacion: timestamp
```

**Modificar Android:**
```kotlin
// En MainActivity.kt - ELIMINAR líneas 142-156:
// private fun setupInitialAdmins() { ... }

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
```

### 3. SystemConfig - Agregar Listener en Tiempo Real

**Problema actual:** `AuthService.kt:203` solo carga una vez

**Solución:**
```kotlin
// En AuthService.kt - MODIFICAR loadSystemConfig():
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

---

## 📁 Estructura Firestore Final

```
/giros_relevantes (NUEVO)
  /abarrotes
    codigo: "461110"
    nombre: "Abarrotes"
    montoMinimoCentavos: 75000
    montoMaximoCentavos: 150000
    descripcion: "..."
    palabrasClave: [...]
    activo: true

/admins (NUEVO)
  /admin1
    email: "rolando.robles@avivacredito.com"
    nombre: "Rolando Robles"
    activo: true
    fechaCreacion: timestamp

/system_config (YA EXISTE)
  /system_config
    appName: "..."
    appVersion: "..."
    ... (50+ campos existentes)

/kiosks (YA EXISTE - no tocar)
  ... (ya implementado en Android)
```

---

## ⚠️ Errores en el Panel Anterior

1. ❌ **Kioscos** - Ya existe CRUD en Android, no necesita panel web
2. ❌ **Textos Dinámicos** - No existe en tu código
3. ❌ **SystemConfig** - Inventé campos que no existen, debo usar los 50+ campos reales

---

## ✅ Panel Corregido

Solo incluye:
1. Dashboard
2. Giros (NUEVO)
3. Administradores (NUEVO)
4. SystemConfig (editor de campos EXISTENTES)

Sin Kioscos, sin Textos Dinámicos.

---

## 📝 Archivos Android a Modificar

1. `AvivaConfig.kt` - Eliminar `girosAceptados`, crear `getGirosAceptados()`
2. `MainActivity.kt` - Eliminar `setupInitialAdmins()`, crear `isAdminEmail()`
3. `AuthService.kt` - Cambiar `loadSystemConfig()` por `listenToSystemConfig()`
4. Crear `GirosService.kt` - Servicio para leer giros de Firestore

---

**Verificado con código fuente real. No suposiciones.**
