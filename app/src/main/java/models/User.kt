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
    val role: UserRole = UserRole.PROMOTOR,
    val profileImageUrl: String? = null,
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now(),
    val lastLocationProvider: String? = null,
    val isLocationActive: Boolean = false,

    // Role-based access
    val productTypes: List<String> = emptyList(),  // ["bodega_aurrera", "aviva_contigo", "construrama"]
    val kiosks: List<String> = emptyList(),        // Array of kiosk IDs

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
        SUPER_ADMIN,    // Full system access
        ADMIN,          // User management, approvals
        SUPERVISOR,     // Reports, time-off approvals
        PROMOTOR        // Basic check-in functionality
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
            UserRole.SUPERVISOR -> supervisorPermissions.contains(permission)
            UserRole.PROMOTOR -> promotorPermissions.contains(permission)
        }
    }

    fun canManageUser(targetUser: User): Boolean {
        return when (role) {
            UserRole.SUPER_ADMIN -> true
            UserRole.ADMIN -> targetUser.role != UserRole.SUPER_ADMIN
            UserRole.SUPERVISOR -> targetUser.role == UserRole.PROMOTOR &&
                                   assignedPromoters.contains(targetUser.id)
            UserRole.PROMOTOR -> false
        }
    }

    fun getRoleDisplayName(): String {
        return when (role) {
            UserRole.SUPER_ADMIN -> "Super Administrador"
            UserRole.ADMIN -> "Administrador"
            UserRole.SUPERVISOR -> "Supervisor"
            UserRole.PROMOTOR -> "Promotor"
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

    companion object {
        // Permission constants
        const val PERMISSION_VIEW_DASHBOARD = "view_dashboard"
        const val PERMISSION_MANAGE_USERS = "manage_users"
        const val PERMISSION_VIEW_ALL_ATTENDANCE = "view_all_attendance"
        const val PERMISSION_APPROVE_TIMEOFF = "approve_timeoff"
        const val PERMISSION_MANAGE_LOCATIONS = "manage_locations"
        const val PERMISSION_MANAGE_SCHEDULES = "manage_schedules"
        const val PERMISSION_VIEW_REPORTS = "view_reports"
        const val PERMISSION_SYSTEM_CONFIG = "system_config"
        const val PERMISSION_CHECKIN = "checkin"
        const val PERMISSION_REQUEST_TIMEOFF = "request_timeoff"

        val promotorPermissions = listOf(
            PERMISSION_CHECKIN,
            PERMISSION_REQUEST_TIMEOFF
        )

        val supervisorPermissions = promotorPermissions + listOf(
            PERMISSION_VIEW_DASHBOARD,
            PERMISSION_VIEW_REPORTS,
            PERMISSION_APPROVE_TIMEOFF
        )

        val adminPermissions = supervisorPermissions + listOf(
            PERMISSION_MANAGE_USERS,
            PERMISSION_VIEW_ALL_ATTENDANCE,
            PERMISSION_MANAGE_LOCATIONS,
            PERMISSION_MANAGE_SCHEDULES
        )

        val superAdminPermissions = adminPermissions + listOf(
            PERMISSION_SYSTEM_CONFIG
        )
    }
}