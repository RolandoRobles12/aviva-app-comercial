# Sistema de Roles - Aviva App Comercial

## 📋 Descripción General

Sistema completo de gestión de roles para la aplicación Android de Aviva, soportando 4 tipos de vendedores con interfaces y permisos diferenciados.

## 🎯 Roles Disponibles

### Roles Administrativos
- **SUPER_ADMIN**: Acceso completo al sistema
- **ADMIN**: Gestión de usuarios y configuración

### Roles de Vendedores
- **GERENTE_AVIVA_CONTIGO**: Gerente con promotores de Aviva Tu Negocio a cargo
- **PROMOTOR_AVIVA_TU_NEGOCIO**: Promotor con visitas y prospección
- **EMBAJADOR_AVIVA_TU_COMPRA**: Embajador sin visitas ni prospección
- **PROMOTOR_AVIVA_TU_CASA**: Promotor de casa sin visitas, prospección ni ligas

## 📦 Líneas de Producto

```kotlin
enum class ProductLine {
    AVIVA_TU_NEGOCIO,   // Producto actual (con visitas y prospección)
    AVIVA_CONTIGO,      // Gerentes
    AVIVA_TU_COMPRA,    // Embajadores
    AVIVA_TU_CASA       // Promotores de casa
}
```

## 🔐 Matriz de Permisos

| Funcionalidad | Gerente Contigo | Promotor Negocio | Embajador Compra | Promotor Casa |
|---------------|:---------------:|:----------------:|:----------------:|:-------------:|
| Dashboard con mapa de equipo | ✅ | ❌ | ❌ | ❌ |
| Ver métricas de equipo | ✅ | ❌ | ❌ | ❌ |
| Check-in/Asistencia | ✅ | ✅ | ✅ | ✅ |
| Registro de visitas | ✅ | ✅ | ❌ | ❌ |
| Prospección | ✅ | ✅ | ❌ | ❌ |
| Métricas personales | ✅ | ✅ | ✅ | ✅ |
| Ligas/Competencias | ✅ | ✅ | ✅ | ❌ |
| Badges | ✅ | ✅ | ✅ | ✅ |
| Perfil/Carrera | ✅ | ✅ | ✅ | ✅ |
| Aprobar tiempo libre | ✅ | ❌ | ❌ | ❌ |

## 🏗️ Arquitectura

### 1. Modelo de Datos (`models/User.kt`)

```kotlin
data class User(
    val role: UserRole = UserRole.PROMOTOR_AVIVA_TU_NEGOCIO,
    val productLine: ProductLine = ProductLine.AVIVA_TU_NEGOCIO,
    val assignedPromoters: List<String> = emptyList(), // Para gerentes
    // ... otros campos
)
```

**Funciones de utilidad:**
- `hasPermission(permission: String): Boolean` - Verifica si el usuario tiene un permiso específico
- `canAccessVisits(): Boolean` - Verifica acceso a visitas
- `canAccessProspection(): Boolean` - Verifica acceso a prospección
- `canAccessLeagues(): Boolean` - Verifica acceso a ligas
- `canAccessTeamDashboard(): Boolean` - Verifica acceso a dashboard de equipo
- `isManager(): Boolean` - Verifica si es gerente
- `isAdmin(): Boolean` - Verifica si es admin
- `getRoleDisplayName(): String` - Nombre legible del rol
- `getProductLineDisplayName(): String` - Nombre legible de la línea de producto

### 2. Navegación (`services/RoleBasedNavigationManager.kt`)

Gestiona la visibilidad de elementos de navegación y valida el acceso a diferentes pantallas.

**Funciones principales:**
```kotlin
fun getNavigationConfig(): NavigationConfig
fun configureBottomNavigation(menu: Menu)
fun getStartDestination(): Int
fun canNavigateTo(destinationId: Int): Boolean
fun navigateIfAllowed(navController: NavController, destinationId: Int): Boolean
```

### 3. MainActivity

**Funciones públicas para acceso desde fragments:**
```kotlin
fun getCurrentUser(): User? - Obtiene el usuario actual
fun getNavigationManager(): RoleBasedNavigationManager? - Obtiene el navigation manager
fun canAccessDashboard(): Boolean - Verifica acceso al dashboard
fun isManager(): Boolean - Verifica si es gerente
fun getManagerPromoters(): List<String> - Obtiene promotores asignados
```

## 🔄 Flujo de Autenticación

1. Usuario inicia sesión con Google (dominio @avivacredito.com)
2. `MainActivity.loadUserAndSetupNavigation(userId)` carga el User desde Firestore
3. Se crea un `RoleBasedNavigationManager` basado en el rol del usuario
4. `setupRoleBasedNavigation()` configura la visibilidad del menú
5. El usuario solo ve las opciones permitidas para su rol

## 📝 Permisos Disponibles

### Permisos Administrativos
- `PERMISSION_VIEW_DASHBOARD` - Ver dashboard administrativo
- `PERMISSION_MANAGE_USERS` - Gestionar usuarios
- `PERMISSION_VIEW_ALL_ATTENDANCE` - Ver asistencia de todos
- `PERMISSION_APPROVE_TIMEOFF` - Aprobar solicitudes de tiempo libre
- `PERMISSION_MANAGE_LOCATIONS` - Gestionar ubicaciones
- `PERMISSION_MANAGE_SCHEDULES` - Gestionar horarios
- `PERMISSION_VIEW_REPORTS` - Ver reportes
- `PERMISSION_SYSTEM_CONFIG` - Configuración del sistema

### Permisos de Operaciones de Campo
- `PERMISSION_CHECKIN` - Registrar asistencia
- `PERMISSION_REQUEST_TIMEOFF` - Solicitar tiempo libre
- `PERMISSION_VIEW_VISITS` - Ver visitas
- `PERMISSION_MANAGE_VISITS` - Gestionar visitas
- `PERMISSION_VIEW_PROSPECTION` - Ver prospección
- `PERMISSION_MANAGE_PROSPECTION` - Gestionar prospección
- `PERMISSION_VIEW_LEAGUES` - Ver ligas/competencias
- `PERMISSION_VIEW_BADGES` - Ver badges
- `PERMISSION_VIEW_PROFILE` - Ver perfil
- `PERMISSION_VIEW_METRICS` - Ver métricas
- `PERMISSION_VIEW_TEAM_DASHBOARD` - Ver dashboard de equipo
- `PERMISSION_VIEW_TEAM_METRICS` - Ver métricas de equipo

## 🎨 Navegación por Rol

### Gerente Aviva Contigo
```
Bottom Navigation:
├── 🏠 Inicio (Dashboard de equipo)
├── 📊 Métricas
├── ✅ Asistencia
├── 🏆 Ligas
└── 👤 Perfil
```

### Promotor Aviva Tu Negocio
```
Bottom Navigation:
├── 📊 Métricas
├── ✅ Asistencia (página inicial)
├── 🏆 Ligas
└── 👤 Perfil
```

### Embajador Aviva Tu Compra
```
Bottom Navigation:
├── 📊 Métricas
├── ✅ Asistencia (página inicial)
├── 🏆 Ligas
└── 👤 Perfil
```

### Promotor Aviva Tu Casa
```
Bottom Navigation:
├── 📊 Métricas
├── ✅ Asistencia (página inicial)
└── 👤 Perfil
```

## 🔧 Configuración de Usuarios en Firestore

### Estructura del documento en colección `users`:

```json
{
  "id": "user_uid",
  "uid": "user_uid",
  "email": "usuario@avivacredito.com",
  "displayName": "Nombre Usuario",
  "role": "PROMOTOR_AVIVA_TU_NEGOCIO",
  "productLine": "AVIVA_TU_NEGOCIO",
  "status": "ACTIVE",
  "assignedPromoters": [],  // Solo para gerentes
  "managerId": null,        // ID del gerente (si aplica)
  "permissions": [],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Ejemplo - Gerente:
```json
{
  "role": "GERENTE_AVIVA_CONTIGO",
  "productLine": "AVIVA_CONTIGO",
  "assignedPromoters": ["promotor_uid_1", "promotor_uid_2"]
}
```

### Ejemplo - Promotor Aviva Tu Negocio:
```json
{
  "role": "PROMOTOR_AVIVA_TU_NEGOCIO",
  "productLine": "AVIVA_TU_NEGOCIO",
  "managerId": "gerente_uid"
}
```

### Ejemplo - Embajador Aviva Tu Compra:
```json
{
  "role": "EMBAJADOR_AVIVA_TU_COMPRA",
  "productLine": "AVIVA_TU_COMPRA"
}
```

### Ejemplo - Promotor Aviva Tu Casa:
```json
{
  "role": "PROMOTOR_AVIVA_TU_CASA",
  "productLine": "AVIVA_TU_CASA"
}
```

## 🚀 Uso en Código

### Validar permisos en un Fragment:

```kotlin
class MiFragment : Fragment() {

    private fun verificarPermisos() {
        val mainActivity = requireActivity() as MainActivity
        val user = mainActivity.getCurrentUser()

        if (user?.canAccessVisits() == true) {
            // Mostrar funcionalidad de visitas
        }

        if (user?.isManager() == true) {
            // Mostrar dashboard de equipo
            val promotores = mainActivity.getManagerPromoters()
        }
    }
}
```

### Navegar con validación de permisos:

```kotlin
val navigationManager = (activity as MainActivity).getNavigationManager()
val navController = findNavController()

// Intenta navegar, retorna false si no tiene permisos
if (!navigationManager?.navigateIfAllowed(navController, R.id.navigation_home)) {
    Toast.makeText(context, "No tienes acceso a esta sección", Toast.LENGTH_SHORT).show()
}
```

## 🔒 Seguridad

### Reglas de Firestore Recomendadas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Función helper para verificar autenticación
    function isAuthenticated() {
      return request.auth != null;
    }

    // Función helper para verificar dominio
    function isAvivaUser() {
      return isAuthenticated() &&
             request.auth.token.email.matches('.*@avivacredito.com$');
    }

    // Función helper para obtener datos del usuario
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    // Función helper para verificar si es admin
    function isAdmin() {
      return isAvivaUser() &&
             getUserData().role in ['SUPER_ADMIN', 'ADMIN'];
    }

    // Función helper para verificar si es gerente
    function isManager() {
      return isAvivaUser() &&
             getUserData().role == 'GERENTE_AVIVA_CONTIGO';
    }

    // Regla para colección users
    match /users/{userId} {
      // Leer: el propio usuario o admin
      allow read: if isAvivaUser() &&
                     (request.auth.uid == userId || isAdmin());

      // Escribir: solo admins pueden crear/actualizar usuarios
      allow write: if isAdmin();
    }

    // Regla para visitas (solo Aviva Tu Negocio y Gerentes)
    match /visits/{visitId} {
      allow read: if isAvivaUser();
      allow create: if isAvivaUser() &&
                       getUserData().role in [
                         'PROMOTOR_AVIVA_TU_NEGOCIO',
                         'GERENTE_AVIVA_CONTIGO',
                         'ADMIN',
                         'SUPER_ADMIN'
                       ];
    }

    // Regla para ligas (todos excepto Promotor Casa)
    match /leagues/{leagueId} {
      allow read: if isAvivaUser() &&
                     getUserData().role != 'PROMOTOR_AVIVA_TU_CASA';
    }
  }
}
```

## 🛠️ Mantenimiento

### Agregar un nuevo rol:

1. Agregar el rol al enum `UserRole` en `models/User.kt`
2. Crear la lista de permisos en el `companion object`
3. Actualizar `hasPermission()` en `User.kt`
4. Actualizar `getRoleDisplayName()` en `User.kt`
5. Actualizar `getNavigationConfig()` en `RoleBasedNavigationManager.kt`
6. Actualizar las reglas de Firestore si es necesario

### Agregar un nuevo permiso:

1. Agregar la constante en `User.companion object`
2. Agregar el permiso a las listas de roles correspondientes
3. Usar `user.hasPermission(PERMISSION_NAME)` donde se necesite

## 📱 Testing

### Crear usuarios de prueba:

```kotlin
// En Firestore, crear documentos en la colección 'users':

// Gerente
{
  "id": "gerente_test_uid",
  "email": "gerente@avivacredito.com",
  "role": "GERENTE_AVIVA_CONTIGO",
  "productLine": "AVIVA_CONTIGO",
  "assignedPromoters": ["promotor1_uid", "promotor2_uid"],
  "status": "ACTIVE"
}

// Promotor Aviva Tu Negocio
{
  "id": "promotor_negocio_uid",
  "email": "promotor.negocio@avivacredito.com",
  "role": "PROMOTOR_AVIVA_TU_NEGOCIO",
  "productLine": "AVIVA_TU_NEGOCIO",
  "managerId": "gerente_test_uid",
  "status": "ACTIVE"
}

// Embajador
{
  "id": "embajador_uid",
  "email": "embajador@avivacredito.com",
  "role": "EMBAJADOR_AVIVA_TU_COMPRA",
  "productLine": "AVIVA_TU_COMPRA",
  "status": "ACTIVE"
}

// Promotor Casa
{
  "id": "promotor_casa_uid",
  "email": "promotor.casa@avivacredito.com",
  "role": "PROMOTOR_AVIVA_TU_CASA",
  "productLine": "AVIVA_TU_CASA",
  "status": "ACTIVE"
}
```

## 📚 Referencias

- **Modelo de Usuario**: `app/src/main/java/models/User.kt`
- **Navigation Manager**: `app/src/main/java/com/promotoresavivatunegocio_1/services/RoleBasedNavigationManager.kt`
- **MainActivity**: `app/src/main/java/com/promotoresavivatunegocio_1/MainActivity.kt`
- **Navigation Graph**: `app/src/main/res/navigation/mobile_navigation.xml`

---

**Última actualización**: 2025-11-19
**Versión**: 1.0.0
