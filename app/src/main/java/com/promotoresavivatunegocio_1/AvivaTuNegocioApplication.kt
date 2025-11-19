package com.promotoresavivatunegocio_1

import android.app.Application
import android.util.Log
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.lifecycleScope
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.services.*
import kotlinx.coroutines.launch

class AvivaTuNegocioApplication : Application() {

    // Service instances
    private lateinit var authService: AuthService
    private lateinit var jobSchedulerService: JobSchedulerService
    private lateinit var notificationService: NotificationService
    private lateinit var photoStorageService: PhotoStorageService

    companion object {
        private const val TAG = "AvivaTuNegocioApp"
        lateinit var instance: AvivaTuNegocioApplication
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this

        // Initialize Firebase
        FirebaseApp.initializeApp(this)

        // Initialize services
        initializeServices()

        // Setup background monitoring
        setupBackgroundMonitoring()

        Log.d(TAG, "Aviva Tu Negocio Application initialized successfully")
    }

    private fun initializeServices() {
        try {
            // Initialize core services
            authService = AuthService(this)
            jobSchedulerService = JobSchedulerService(this)
            notificationService = NotificationService(this)
            photoStorageService = PhotoStorageService(this)

            Log.d(TAG, "All services initialized successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing services", e)
        }
    }

    private fun setupBackgroundMonitoring() {
        ProcessLifecycleOwner.get().lifecycleScope.launch {
            try {
                // Initialize background jobs
                jobSchedulerService.initializeAllJobs()

                // Register for FCM if user is authenticated
                val currentUser = FirebaseAuth.getInstance().currentUser
                if (currentUser != null) {
                    registerFCMToken(currentUser.uid)
                }

                Log.d(TAG, "Background monitoring setup completed")
            } catch (e: Exception) {
                Log.e(TAG, "Error setting up background monitoring", e)
            }
        }
    }

    // PUBLIC METHODS FOR ACCESSING SERVICES
    fun getAuthService(): AuthService = authService

    fun getJobSchedulerService(): JobSchedulerService = jobSchedulerService

    fun getNotificationService(): NotificationService = notificationService

    fun getPhotoStorageService(): PhotoStorageService = photoStorageService

    // USER SESSION MANAGEMENT
    suspend fun onUserSignedIn(userId: String, userRole: String, productTypes: List<String>) {
        try {
            // Register FCM token
            registerFCMToken(userId)

            // Subscribe to relevant topics
            notificationService.subscribeByCriteria(userId, userRole, productTypes)

            // Initialize user-specific services
            initializeUserServices(userId)

            Log.d(TAG, "User session initialized: $userId")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing user session", e)
        }
    }

    suspend fun onUserSignedOut() {
        try {
            // Cancel personalized background jobs
            // Clean up user data if needed
            photoStorageService.cleanupTempFiles()

            Log.d(TAG, "User session cleaned up")
        } catch (e: Exception) {
            Log.e(TAG, "Error cleaning up user session", e)
        }
    }

    private suspend fun registerFCMToken(userId: String) {
        try {
            val result = notificationService.registerFCMToken(userId)
            if (result.isSuccess) {
                Log.d(TAG, "FCM token registered for user: $userId")
            } else {
                Log.w(TAG, "Failed to register FCM token: ${result.exceptionOrNull()?.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error registering FCM token", e)
        }
    }

    private suspend fun initializeUserServices(userId: String) {
        try {
            // Initialize services that require user context
            val userService = UserService()
            val user = userService.getUserById(userId)

            if (user != null) {
                // Set up role-specific configurations
                when (user.role) {
                    models.User.UserRole.ADMIN,
                    models.User.UserRole.SUPER_ADMIN -> {
                        // Enable admin-specific background monitoring
                        enableAdminMonitoring()
                    }
                    models.User.UserRole.GERENTE_AVIVA_CONTIGO -> {
                        // Enable manager-specific features (supervisor replacement)
                        enableSupervisorFeatures(user.assignedPromoters)
                    }
                    models.User.UserRole.PROMOTOR_AVIVA_TU_NEGOCIO -> {
                        // Enable promotor-specific features (full functionality)
                        enablePromotorFeatures(user.productTypes, user.kiosks)
                    }
                    models.User.UserRole.EMBAJADOR_AVIVA_TU_COMPRA,
                    models.User.UserRole.PROMOTOR_AVIVA_TU_CASA -> {
                        // Enable basic promotor features (limited functionality)
                        enablePromotorFeatures(user.productTypes, user.kiosks)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing user-specific services", e)
        }
    }

    private fun enableAdminMonitoring() {
        // Enable additional monitoring for admin users
        Log.d(TAG, "Admin monitoring enabled")
    }

    private fun enableSupervisorFeatures(assignedPromoters: List<String>) {
        // Enable supervisor-specific features
        Log.d(TAG, "Supervisor features enabled for ${assignedPromoters.size} promoters")
    }

    private fun enablePromotorFeatures(productTypes: List<String>, kiosks: List<String>) {
        // Enable promotor-specific features
        Log.d(TAG, "Promotor features enabled for ${productTypes.size} product types, ${kiosks.size} kiosks")
    }

    // SYSTEM HEALTH AND MONITORING
    suspend fun performSystemHealthCheck(): SystemHealthResult {
        return try {
            val dashboardService = DashboardService()
            val healthStatus = dashboardService.getSystemHealthStatus()
            val jobStatuses = jobSchedulerService.getJobStatus()

            val allJobsHealthy = jobStatuses.all { (_, status) ->
                status in listOf(
                    JobSchedulerService.JobStatus.SCHEDULED,
                    JobSchedulerService.JobStatus.RUNNING,
                    JobSchedulerService.JobStatus.COMPLETED
                )
            }

            val overallHealth = when {
                healthStatus.level == DashboardService.HealthLevel.CRITICAL || !allJobsHealthy ->
                    SystemHealth.CRITICAL
                healthStatus.level == DashboardService.HealthLevel.WARNING ->
                    SystemHealth.WARNING
                healthStatus.level == DashboardService.HealthLevel.CAUTION ->
                    SystemHealth.CAUTION
                else -> SystemHealth.HEALTHY
            }

            SystemHealthResult(
                health = overallHealth,
                healthStatus = healthStatus,
                jobStatuses = jobStatuses,
                lastChecked = System.currentTimeMillis()
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error performing system health check", e)
            SystemHealthResult(
                health = SystemHealth.ERROR,
                errorMessage = e.localizedMessage
            )
        }
    }

    // APP LIFECYCLE METHODS
    override fun onLowMemory() {
        super.onLowMemory()
        Log.w(TAG, "Low memory warning - cleaning up resources")

        // Clean up temporary files
        photoStorageService.cleanupTempFiles()
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        Log.w(TAG, "Memory trim requested - level: $level")

        when (level) {
            TRIM_MEMORY_BACKGROUND,
            TRIM_MEMORY_MODERATE,
            TRIM_MEMORY_COMPLETE -> {
                // Aggressive cleanup
                photoStorageService.cleanupTempFiles()
            }
        }
    }

    // DATA CLASSES
    data class SystemHealthResult(
        val health: SystemHealth,
        val healthStatus: DashboardService.SystemHealthStatus? = null,
        val jobStatuses: Map<String, JobSchedulerService.JobStatus> = emptyMap(),
        val lastChecked: Long = 0L,
        val errorMessage: String? = null
    )

    enum class SystemHealth {
        HEALTHY,
        CAUTION,
        WARNING,
        CRITICAL,
        ERROR
    }
}