# Sistema de Roles

## Roles disponibles

```kotlin
enum class UserRole {
    SUPER_ADMIN,
    ADMIN,
    GERENTE_AVIVA_CONTIGO,
    PROMOTOR_AVIVA_TU_NEGOCIO,
    EMBAJADOR_AVIVA_TU_COMPRA,
    PROMOTOR_AVIVA_TU_CASA
}

enum class ProductLine {
    AVIVA_TU_NEGOCIO,
    AVIVA_CONTIGO,
    AVIVA_TU_COMPRA,
    AVIVA_TU_CASA
}
```

## Matriz de permisos

| Funcionalidad | Gerente Contigo | Promotor Negocio | Embajador Compra | Promotor Casa |
|---------------|:---:|:---:|:---:|:---:|
| Dashboard equipo / mapa equipo | ✓ | — | — | — |
| Métricas de equipo | ✓ | — | — | — |
| Check-in / Asistencia | ✓ | ✓ | ✓ | ✓ |
| Registro de visitas | ✓ | ✓ | — | — |
| Prospección | ✓ | ✓ | — | — |
| Métricas personales | ✓ | ✓ | ✓ | ✓ |
| Ligas / Competencias | ✓ | ✓ | ✓ | — |
| Badges | ✓ | ✓ | ✓ | ✓ |
| Perfil / Carrera | ✓ | ✓ | ✓ | ✓ |
| Aprobar tiempo libre | ✓ | — | — | — |

## Arquitectura

### Modelo (`models/User.kt`)

```kotlin
data class User(
    val role: UserRole = UserRole.PROMOTOR_AVIVA_TU_NEGOCIO,
    val productLine: ProductLine = ProductLine.AVIVA_TU_NEGOCIO,
    val assignedPromoters: List<String> = emptyList(),
    // ...
)
```

Funciones de utilidad: `hasPermission()`, `canAccessVisits()`, `canAccessProspection()`, `canAccessLeagues()`, `canAccessTeamDashboard()`, `isManager()`, `isAdmin()`, `getRoleDisplayName()`, `getProductLineDisplayName()`

### Navigation Manager (`services/RoleBasedNavigationManager.kt`)

```kotlin
fun getNavigationConfig(): NavigationConfig
fun configureBottomNavigation(menu: Menu)
fun getStartDestination(): Int
fun canNavigateTo(destinationId: Int): Boolean
fun navigateIfAllowed(navController: NavController, destinationId: Int): Boolean
```

### MainActivity — API pública para Fragments

```kotlin
fun getCurrentUser(): User?
fun getNavigationManager(): RoleBasedNavigationManager?
fun canAccessDashboard(): Boolean
fun isManager(): Boolean
fun getManagerPromoters(): List<String>
```

## Flujo de autenticación

1. Google Sign-In con dominio `@avivacredito.com`
2. `MainActivity.loadUserAndSetupNavigation(userId)` — carga `User` desde Firestore
3. Instancia `RoleBasedNavigationManager` con el rol del usuario
4. `setupRoleBasedNavigation()` — configura visibilidad del menú

## Constantes de permisos (`User.companion object`)

**Administrativos:** `PERMISSION_VIEW_DASHBOARD`, `PERMISSION_MANAGE_USERS`, `PERMISSION_VIEW_ALL_ATTENDANCE`, `PERMISSION_APPROVE_TIMEOFF`, `PERMISSION_MANAGE_LOCATIONS`, `PERMISSION_MANAGE_SCHEDULES`, `PERMISSION_VIEW_REPORTS`, `PERMISSION_SYSTEM_CONFIG`

**Campo:** `PERMISSION_CHECKIN`, `PERMISSION_REQUEST_TIMEOFF`, `PERMISSION_VIEW_VISITS`, `PERMISSION_MANAGE_VISITS`, `PERMISSION_VIEW_PROSPECTION`, `PERMISSION_MANAGE_PROSPECTION`, `PERMISSION_VIEW_LEAGUES`, `PERMISSION_VIEW_BADGES`, `PERMISSION_VIEW_PROFILE`, `PERMISSION_VIEW_METRICS`, `PERMISSION_VIEW_TEAM_DASHBOARD`, `PERMISSION_VIEW_TEAM_METRICS`

## Bottom navigation por rol

| Rol | Pestañas |
|-----|----------|
| GERENTE_AVIVA_CONTIGO | Home, Métricas, Asistencia, Ligas, Perfil |
| PROMOTOR_AVIVA_TU_NEGOCIO | Métricas, Asistencia*, Ligas, Perfil |
| EMBAJADOR_AVIVA_TU_COMPRA | Métricas, Asistencia*, Ligas, Perfil |
| PROMOTOR_AVIVA_TU_CASA | Métricas, Asistencia*, Perfil |

\* Destino inicial

## Schema Firestore — colección `users`

```json
{
  "id": "uid",
  "uid": "uid",
  "email": "usuario@avivacredito.com",
  "displayName": "Nombre",
  "role": "PROMOTOR_AVIVA_TU_NEGOCIO",
  "productLine": "AVIVA_TU_NEGOCIO",
  "status": "ACTIVE",
  "assignedPromoters": [],
  "managerId": null,
  "permissions": [],
  "hubspotOwnerId": "123456789",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Uso en Fragments

```kotlin
val user = (requireActivity() as MainActivity).getCurrentUser()
if (user?.canAccessVisits() == true) { /* mostrar UI */ }

val navigationManager = (activity as MainActivity).getNavigationManager()
if (!navigationManager?.navigateIfAllowed(navController, R.id.navigation_home)) {
    Toast.makeText(context, "Acceso denegado", Toast.LENGTH_SHORT).show()
}
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isAvivaUser() {
      return isAuthenticated() && request.auth.token.email.matches('.*@avivacredito.com$');
    }
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    function isAdmin() {
      return isAvivaUser() && getUserData().role in ['SUPER_ADMIN', 'ADMIN'];
    }

    match /users/{userId} {
      allow read: if isAvivaUser() && (request.auth.uid == userId || isAdmin());
      allow write: if isAdmin();
    }
    match /visits/{visitId} {
      allow read: if isAvivaUser();
      allow create: if isAvivaUser() &&
        getUserData().role in ['PROMOTOR_AVIVA_TU_NEGOCIO', 'GERENTE_AVIVA_CONTIGO', 'ADMIN', 'SUPER_ADMIN'];
    }
    match /leagues/{leagueId} {
      allow read: if isAvivaUser() && getUserData().role != 'PROMOTOR_AVIVA_TU_CASA';
    }
  }
}
```

## Extender el sistema

**Nuevo rol:**
1. Agregar al enum `UserRole` en `models/User.kt`
2. Definir lista de permisos en `companion object`
3. Actualizar `hasPermission()` y `getRoleDisplayName()`
4. Agregar `NavigationConfig` en `RoleBasedNavigationManager.kt`
5. Actualizar Firestore Rules si aplica

**Nuevo permiso:**
1. Agregar constante en `User.companion object`
2. Agregar a las listas de roles correspondientes
3. Usar `user.hasPermission(PERMISSION_NAME)` en el Fragment/ViewModel

## Referencias

- `app/src/main/java/models/User.kt`
- `app/src/main/java/com/promotoresavivatunegocio_1/services/RoleBasedNavigationManager.kt`
- `app/src/main/java/com/promotoresavivatunegocio_1/MainActivity.kt`
- `app/src/main/res/navigation/mobile_navigation.xml`
