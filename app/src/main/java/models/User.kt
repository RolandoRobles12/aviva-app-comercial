package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint

data class User(
    val id: String = "",
    val uid: String = "",
    val email: String = "",
    val displayName: String = "",
    val photoUrl: String? = null,
    val lastLogin: Timestamp? = null,
    val isActive: Boolean = true,
    val status: UserStatus = UserStatus.ACTIVE,
    val lastLocation: GeoPoint? = null,
    val lastLocationUpdate: Timestamp? = null,
    val lastLocationAccuracy: Float? = null,
    val role: UserRole = UserRole.PROMOTOR_AVIVA_TU_NEGOCIO,
    val productLine: ProductLine = ProductLine.AVIVA_TU_NEGOCIO,
    val profileImageUrl: String? = null,
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now(),
    val lastLocationProvider: String? = null,
    val isLocationActive: Boolean = false,

    // Role-based access
    val productTypes: List<String> = emptyList(),  // ["bodega_aurrera", "aviva_contigo", "construrama"]
    val kiosks: List<String> = emptyList(),        // Array of kiosk IDs (legacy)
    val assignedKioskId: String? = null,           // ID del kiosco asignado (nuevo sistema)

    // Hierarchy
    val assignedPromoters: List<String> = emptyList(), // IDs de promotores asignados (para admin/supervisor)
    val managerId: String? = null,                      // ID del gerente/supervisor

    // Additional profile info
    val phoneNumber: String? = null,
    val employeeId: String? = null,
    val department: String? = null,
    val position: String? = null,
    val hireDate: Timestamp? = null,

    // Permissions (calculated based on role)
    val permissions: List<String> = emptyList()
) {
    enum class UserRole {
        // Roles administrativos
        SUPER_ADMIN,                    // Full system access
        ADMIN,                          // User management, approvals

        // Roles de vendedores
        GERENTE_AVIVA_CONTIGO,          // Gerente con promotores a cargo (solo Aviva Tu Negocio)
        PROMOTOR_AVIVA_TU_NEGOCIO,      // Promotor con visitas y prospección
        EMBAJADOR_AVIVA_TU_COMPRA,      // Embajador sin visitas ni prospección
        PROMOTOR_AVIVA_TU_CASA          // Promotor de casa sin visitas, prospección ni ligas
    }

    enum class ProductLine {
        AVIVA_TU_NEGOCIO,   // Producto actual (con visitas y prospección)
        AVIVA_CONTIGO,       // Gerentes
        AVIVA_TU_COMPRA,     // Embajadores
        AVIVA_TU_CASA        // Promotores de casa
    }

    enum class UserStatus {
        ACTIVE,
        INACTIVE,
        SUSPENDED,
        PENDING_ACTIVATION
    }

    fun hasPermission(permission: String): Boolean {
        return when (role) {
            UserRole.SUPER_ADMIN -> true // Super admin has all permissions
            UserRole.ADMIN -> adminPermissions.contains(permission)
            UserRole.GERENTE_AVIVA_CONTIGO -> gerentePermissions.contains(permission)
            UserRole.PROMOTOR_AVIVA_TU_NEGOCIO -> promotorNegocioPermissions.contains(permission)
            UserRole.EMBAJADOR_AVIVA_TU_COMPRA -> embajadorCompraPermissions.contains(permission)
            UserRole.PROMOTOR_AVIVA_TU_CASA -> promotorCasaPermissions.contains(permission)
        }
    }

    fun canManageUser(targetUser: User): Boolean {
        return when (role) {
            UserRole.SUPER_ADMIN -> true
            UserRole.ADMIN -> targetUser.role != UserRole.SUPER_ADMIN
            UserRole.GERENTE_AVIVA_CONTIGO ->
                targetUser.role == UserRole.PROMOTOR_AVIVA_TU_NEGOCIO &&
                assignedPromoters.contains(targetUser.id)
            UserRole.PROMOTOR_AVIVA_TU_NEGOCIO,
            UserRole.EMBAJADOR_AVIVA_TU_COMPRA,
            UserRole.PROMOTOR_AVIVA_TU_CASA -> false
        }
    }

    fun getRoleDisplayName(): String {
        return when (role) {
            UserRole.SUPER_ADMIN -> "Super Administrador"
            UserRole.ADMIN -> "Administrador"
            UserRole.GERENTE_AVIVA_CONTIGO -> "Gerente Aviva Contigo"
            UserRole.PROMOTOR_AVIVA_TU_NEGOCIO -> "Promotor Aviva Tu Negocio"
            UserRole.EMBAJADOR_AVIVA_TU_COMPRA -> "Embajador Aviva Tu Compra"
            UserRole.PROMOTOR_AVIVA_TU_CASA -> "Promotor Aviva Tu Casa"
        }
    }

    fun getStatusDisplayName(): String {
        return when (status) {
            UserStatus.ACTIVE -> "Activo"
            UserStatus.INACTIVE -> "Inactivo"
            UserStatus.SUSPENDED -> "Suspendido"
            UserStatus.PENDING_ACTIVATION -> "Pendiente de Activación"
        }
    }

    // Helper functions for role-based features
    fun canAccessVisits(): Boolean = hasPermission(PERMISSION_VIEW_VISITS)
    fun canAccessProspection(): Boolean = hasPermission(PERMISSION_VIEW_PROSPECTION)
    fun canAccessLeagues(): Boolean = hasPermission(PERMISSION_VIEW_LEAGUES)
    fun canAccessTeamDashboard(): Boolean = hasPermission(PERMISSION_VIEW_TEAM_DASHBOARD)
    fun isManager(): Boolean = role == UserRole.GERENTE_AVIVA_CONTIGO
    fun isAdmin(): Boolean = role == UserRole.ADMIN || role == UserRole.SUPER_ADMIN
    fun isSalesRole(): Boolean = role in listOf(
        UserRole.GERENTE_AVIVA_CONTIGO,
        UserRole.PROMOTOR_AVIVA_TU_NEGOCIO,
        UserRole.EMBAJADOR_AVIVA_TU_COMPRA,
        UserRole.PROMOTOR_AVIVA_TU_CASA
    )

    fun getProductLineDisplayName(): String {
        return when (productLine) {
            ProductLine.AVIVA_TU_NEGOCIO -> "Aviva Tu Negocio"
            ProductLine.AVIVA_CONTIGO -> "Aviva Contigo"
            ProductLine.AVIVA_TU_COMPRA -> "Aviva Tu Compra"
            ProductLine.AVIVA_TU_CASA -> "Aviva Tu Casa"
        }
    }

    companion object {
        // Permission constants - Administrative
        const val PERMISSION_VIEW_DASHBOARD = "view_dashboard"
        const val PERMISSION_MANAGE_USERS = "manage_users"
        const val PERMISSION_VIEW_ALL_ATTENDANCE = "view_all_attendance"
        const val PERMISSION_APPROVE_TIMEOFF = "approve_timeoff"
        const val PERMISSION_MANAGE_LOCATIONS = "manage_locations"
        const val PERMISSION_MANAGE_SCHEDULES = "manage_schedules"
        const val PERMISSION_VIEW_REPORTS = "view_reports"
        const val PERMISSION_SYSTEM_CONFIG = "system_config"

        // Permission constants - Sales/Field Operations
        const val PERMISSION_CHECKIN = "checkin"
        const val PERMISSION_REQUEST_TIMEOFF = "request_timeoff"
        const val PERMISSION_VIEW_VISITS = "view_visits"
        const val PERMISSION_MANAGE_VISITS = "manage_visits"
        const val PERMISSION_VIEW_PROSPECTION = "view_prospection"
        const val PERMISSION_MANAGE_PROSPECTION = "manage_prospection"
        const val PERMISSION_VIEW_LEAGUES = "view_leagues"
        const val PERMISSION_VIEW_BADGES = "view_badges"
        const val PERMISSION_VIEW_PROFILE = "view_profile"
        const val PERMISSION_VIEW_METRICS = "view_metrics"
        const val PERMISSION_VIEW_TEAM_DASHBOARD = "view_team_dashboard"
        const val PERMISSION_VIEW_TEAM_METRICS = "view_team_metrics"

        // Permissions for Gerente Aviva Contigo
        val gerentePermissions = listOf(
            PERMISSION_VIEW_TEAM_DASHBOARD,
            PERMISSION_VIEW_TEAM_METRICS,
            PERMISSION_CHECKIN,
            PERMISSION_VIEW_VISITS,
            PERMISSION_MANAGE_VISITS,
            PERMISSION_VIEW_PROSPECTION,
            PERMISSION_MANAGE_PROSPECTION,
            PERMISSION_VIEW_METRICS,
            PERMISSION_VIEW_LEAGUES,
            PERMISSION_VIEW_BADGES,
            PERMISSION_VIEW_PROFILE,
            PERMISSION_REQUEST_TIMEOFF,
            PERMISSION_APPROVE_TIMEOFF,
            PERMISSION_VIEW_REPORTS
        )

        // Permissions for Promotor Aviva Tu Negocio (current full functionality)
        val promotorNegocioPermissions = listOf(
            PERMISSION_CHECKIN,
            PERMISSION_VIEW_VISITS,
            PERMISSION_MANAGE_VISITS,
            PERMISSION_VIEW_PROSPECTION,
            PERMISSION_MANAGE_PROSPECTION,
            PERMISSION_VIEW_METRICS,
            PERMISSION_VIEW_LEAGUES,
            PERMISSION_VIEW_BADGES,
            PERMISSION_VIEW_PROFILE,
            PERMISSION_REQUEST_TIMEOFF
        )

        // Permissions for Embajador Aviva Tu Compra (no visits/prospection)
        val embajadorCompraPermissions = listOf(
            PERMISSION_CHECKIN,
            PERMISSION_VIEW_METRICS,
            PERMISSION_VIEW_LEAGUES,
            PERMISSION_VIEW_BADGES,
            PERMISSION_VIEW_PROFILE,
            PERMISSION_REQUEST_TIMEOFF
        )

        // Permissions for Promotor Aviva Tu Casa (no visits/prospection/leagues)
        val promotorCasaPermissions = listOf(
            PERMISSION_CHECKIN,
            PERMISSION_VIEW_METRICS,
            PERMISSION_VIEW_BADGES,
            PERMISSION_VIEW_PROFILE,
            PERMISSION_REQUEST_TIMEOFF
        )

        // Admin permissions (legacy compatibility)
        val adminPermissions = gerentePermissions + listOf(
            PERMISSION_MANAGE_USERS,
            PERMISSION_VIEW_ALL_ATTENDANCE,
            PERMISSION_MANAGE_LOCATIONS,
            PERMISSION_MANAGE_SCHEDULES,
            PERMISSION_VIEW_DASHBOARD
        )

        val superAdminPermissions = adminPermissions + listOf(
            PERMISSION_SYSTEM_CONFIG
        )
    }
}