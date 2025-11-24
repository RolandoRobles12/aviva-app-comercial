# Panel Administrativo Aviva Tu Negocio

Panel web de administración para gestionar la app Android sin necesidad de recompilar el APK.

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
- Roles: `admin` y `user` (solo admins tienen acceso al panel)

## 📊 Funcionalidades

### 1. Dashboard
- Estadísticas generales
- Resumen de kioscos, usuarios, métricas

### 2. Kioscos
- CRUD completo de kioscos/sucursales
- Ubicación geográfica (lat/lng)
- Radio de validación para asistencia
- Estado activo/inactivo

### 3. Textos Dinámicos
- Gestión de textos que se muestran en la app
- Categorización por sección (home, profile, errors, etc.)
- Actualización en tiempo real sin recompilar APK

### 4. Configuración del Sistema
- URLs (ayuda, privacidad, términos)
- Features flags (habilitar/deshabilitar funciones)
- Configuración de asistencia (radio, período de gracia)
- Versión mínima de la app
- Modo mantenimiento

## 🔗 Integración con la App Android

### Leer textos dinámicos

```kotlin
// En cualquier Activity o Fragment
import com.google.firebase.firestore.FirebaseFirestore

val db = FirebaseFirestore.getInstance()

// Leer un texto específico
db.collection("dynamic_texts")
    .document("home_welcome_message")
    .get()
    .addOnSuccessListener { document ->
        if (document != null) {
            val text = document.getString("value")
            // Usar el texto en tu UI
            textView.text = text
        }
    }

// Escuchar cambios en tiempo real
db.collection("dynamic_texts")
    .document("home_welcome_message")
    .addSnapshotListener { snapshot, e ->
        if (e != null) {
            Log.w(TAG, "Listen failed.", e)
            return@addSnapshotListener
        }

        if (snapshot != null && snapshot.exists()) {
            val text = snapshot.getString("value")
            textView.text = text
        }
    }
```

### Leer configuración del sistema

```kotlin
// Crear un servicio para manejar la configuración
class SystemConfigService {
    private val db = FirebaseFirestore.getInstance()
    private val configDoc = db.collection("system_config").document("settings")

    fun getConfig(callback: (SystemConfig?) -> Unit) {
        configDoc.get().addOnSuccessListener { document ->
            if (document.exists()) {
                val config = SystemConfig(
                    enableAttendance = document.getBoolean("enableAttendance") ?: true,
                    enableMetrics = document.getBoolean("enableMetrics") ?: true,
                    attendanceCheckInRadius = document.getLong("attendanceCheckInRadius")?.toInt() ?: 100,
                    appMinimumVersion = document.getString("appMinimumVersion") ?: "1.0.0",
                    appMaintenanceMode = document.getBoolean("appMaintenanceMode") ?: false
                )
                callback(config)
            }
        }
    }

    // Escuchar cambios en tiempo real
    fun listenToConfig(callback: (SystemConfig?) -> Unit): ListenerRegistration {
        return configDoc.addSnapshotListener { snapshot, e ->
            if (e != null) {
                Log.w(TAG, "Config listen failed.", e)
                return@addSnapshotListener
            }

            if (snapshot != null && snapshot.exists()) {
                val config = SystemConfig(
                    enableAttendance = snapshot.getBoolean("enableAttendance") ?: true,
                    // ... resto de campos
                )
                callback(config)
            }
        }
    }
}

data class SystemConfig(
    val enableAttendance: Boolean,
    val enableMetrics: Boolean,
    val attendanceCheckInRadius: Int,
    val appMinimumVersion: String,
    val appMaintenanceMode: Boolean
)
```

### Leer kioscos dinámicamente

```kotlin
class KioskService {
    private val db = FirebaseFirestore.getInstance()

    fun getAllKiosks(callback: (List<Kiosk>) -> Unit) {
        db.collection("kiosks")
            .whereEqualTo("isActive", true)
            .get()
            .addOnSuccessListener { documents ->
                val kiosks = documents.map { doc ->
                    Kiosk(
                        id = doc.id,
                        name = doc.getString("name") ?: "",
                        address = doc.getString("address") ?: "",
                        latitude = doc.getDouble("latitude") ?: 0.0,
                        longitude = doc.getDouble("longitude") ?: 0.0,
                        validationRadius = doc.getLong("validationRadius")?.toInt() ?: 100
                    )
                }
                callback(kiosks)
            }
    }
}

data class Kiosk(
    val id: String,
    val name: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val validationRadius: Int
)
```

## 🔒 Firestore Security Rules

Las reglas ya están configuradas en `firestore.rules`:

- **Usuarios autenticados** pueden leer kioscos, textos dinámicos y configuración
- **Solo admins** pueden escribir/editar
- **Usuarios** solo pueden modificar sus propios datos
- **Emails @avivacredito.com** requeridos

## 📱 Flujo de Datos

```
1. Admin edita texto en Panel Web
       ↓
2. Cambio se guarda en Firestore
       ↓
3. App Android escucha cambios (SnapshotListener)
       ↓
4. UI se actualiza automáticamente
```

**Sin recompilación del APK necesaria** 🎉

## 🎯 Casos de Uso

### Cambiar texto de bienvenida sin recompilar

1. Ir al Panel → Textos Dinámicos
2. Editar `home_welcome_message`
3. Cambiar valor a "¡Hola, bienvenido!"
4. Guardar
5. La app se actualiza automáticamente

### Agregar nueva sucursal

1. Panel → Kioscos → Agregar Kiosco
2. Llenar datos (nombre, dirección, ubicación)
3. Guardar
4. La app inmediatamente puede detectar el nuevo kiosko

### Deshabilitar una funcionalidad

1. Panel → Configuración
2. Desactivar "Habilitar Métricas"
3. Guardar
4. La app oculta la sección de métricas

## 🚨 Troubleshooting

### Error: "Firestore permission denied"

- Verificar que el usuario está autenticado
- Verificar que tiene rol `admin` en Firestore
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

## 📞 Soporte

Para problemas o preguntas:
- Revisar logs de Firebase Console
- Verificar reglas de Firestore
- Contactar al equipo de desarrollo

## 🎉 Beneficios

✅ **Sin recompilación**: Cambia textos, URLs y configuraciones sin tocar el código
✅ **Tiempo real**: Los cambios se propagan instantáneamente
✅ **Centralizado**: Un solo lugar para gestionar todo
✅ **Seguro**: Reglas de Firestore protegen los datos
✅ **Escalable**: Firebase maneja millones de usuarios
