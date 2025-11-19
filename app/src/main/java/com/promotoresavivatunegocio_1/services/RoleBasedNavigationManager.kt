package com.promotoresavivatunegocio_1.services

import android.view.Menu
import android.view.MenuItem
import androidx.navigation.NavController
import com.promotoresavivatunegocio_1.R
import models.User

/**
 * Manages navigation and menu visibility based on user roles.
 * This centralized manager ensures consistent role-based access control across the app.
 */
class RoleBasedNavigationManager(private val user: User) {

    /**
     * Navigation items configuration for each role
     */
    data class NavigationConfig(
        val showHome: Boolean = false,          // Dashboard con mapa de equipo (solo gerentes/admin)
        val showMetrics: Boolean = true,        // Métricas (todos)
        val showAttendance: Boolean = true,     // Asistencia/Check-in (todos)
        val showLeagues: Boolean = true,        // Ligas (todos menos Promotor Casa)
        val showProfile: Boolean = true,        // Perfil (todos)
        val showAdmin: Boolean = false          // Panel Admin (solo admin)
    )

    /**
     * Get navigation configuration based on user's role
     */
    fun getNavigationConfig(): NavigationConfig {
        return when (user.role) {
            User.UserRole.SUPER_ADMIN, User.UserRole.ADMIN -> NavigationConfig(
                showHome = true,
                showMetrics = true,
                showAttendance = true,
                showLeagues = true,
                showProfile = true,
                showAdmin = true
            )

            User.UserRole.GERENTE_AVIVA_CONTIGO -> NavigationConfig(
                showHome = true,          // Dashboard de equipo
                showMetrics = true,       // Métricas
                showAttendance = true,    // Check-in
                showLeagues = true,       // Ligas
                showProfile = true,       // Perfil
                showAdmin = false
            )

            User.UserRole.PROMOTOR_AVIVA_TU_NEGOCIO -> NavigationConfig(
                showHome = false,         // No dashboard de equipo
                showMetrics = true,       // Métricas personales
                showAttendance = true,    // Check-in
                showLeagues = true,       // Ligas
                showProfile = true,       // Perfil
                showAdmin = false
            )

            User.UserRole.EMBAJADOR_AVIVA_TU_COMPRA -> NavigationConfig(
                showHome = false,
                showMetrics = true,
                showAttendance = true,
                showLeagues = true,       // Embajadores SÍ tienen ligas
                showProfile = true,
                showAdmin = false
            )

            User.UserRole.PROMOTOR_AVIVA_TU_CASA -> NavigationConfig(
                showHome = false,
                showMetrics = true,
                showAttendance = true,
                showLeagues = false,      // Promotores Casa NO tienen ligas
                showProfile = true,
                showAdmin = false
            )
        }
    }

    /**
     * Configure bottom navigation menu visibility based on user role
     */
    fun configureBottomNavigation(menu: Menu) {
        val config = getNavigationConfig()

        menu.findItem(R.id.navigation_home)?.isVisible = config.showHome
        menu.findItem(R.id.navigation_metrics)?.isVisible = config.showMetrics
        menu.findItem(R.id.navigation_attendance)?.isVisible = config.showAttendance
        menu.findItem(R.id.navigation_leagues)?.isVisible = config.showLeagues
        menu.findItem(R.id.navigation_profile)?.isVisible = config.showProfile
        // Note: Admin is no longer in bottom nav to comply with 5-item limit
        // Admin can be accessed via Profile section for authorized users
        // menu.findItem(R.id.navigation_admin)?.isVisible = config.showAdmin
    }

    /**
     * Get the default start destination based on user role
     */
    fun getStartDestination(): Int {
        return when {
            user.isAdmin() || user.isManager() -> R.id.navigation_home  // Dashboard
            else -> R.id.navigation_attendance  // Check-in como página principal para vendedores
        }
    }

    /**
     * Validate if user can navigate to a specific destination
     */
    fun canNavigateTo(destinationId: Int): Boolean {
        val config = getNavigationConfig()

        return when (destinationId) {
            R.id.navigation_home -> config.showHome
            R.id.navigation_metrics -> config.showMetrics
            R.id.navigation_attendance -> config.showAttendance
            R.id.navigation_leagues -> config.showLeagues
            R.id.navigation_profile -> config.showProfile
            R.id.navigation_admin -> config.showAdmin
            else -> false
        }
    }

    /**
     * Navigate to a destination if user has permission
     * @return true if navigation was successful, false if denied
     */
    fun navigateIfAllowed(navController: NavController, destinationId: Int): Boolean {
        return if (canNavigateTo(destinationId)) {
            navController.navigate(destinationId)
            true
        } else {
            false
        }
    }

    /**
     * Get the appropriate home fragment based on role
     * - Gerentes/Admin: DashboardFragment (con mapa de equipo)
     * - Promotores: HomeFragment (vista personal)
     */
    fun shouldUseDashboardView(): Boolean {
        return user.canAccessTeamDashboard()
    }

    companion object {
        /**
         * Create a NavigationManager instance from a User
         */
        fun create(user: User): RoleBasedNavigationManager {
            return RoleBasedNavigationManager(user)
        }
    }
}
