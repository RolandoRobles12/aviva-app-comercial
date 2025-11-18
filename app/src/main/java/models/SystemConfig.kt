package models

import com.google.firebase.Timestamp

data class SystemConfig(
    var id: String = "system_config",
    var appName: String = "Sistema de Reloj Checador - Aviva Crédito",
    var appVersion: String = "1.0.0",
    var minSupportedVersion: String = "1.0.0",
    var isMaintenanceMode: Boolean = false,
    var maintenanceMessage: String = "",

    // Authentication settings
    var allowedEmailDomains: List<String> = listOf("avivacredito.com"),
    var requireEmailVerification: Boolean = true,
    var sessionTimeoutMinutes: Int = 480, // 8 hours
    var maxLoginAttempts: Int = 5,
    var lockoutDurationMinutes: Int = 30,

    // Location and check-in settings
    var defaultLocationRadius: Int = 100, // meters
    var maxLocationRadius: Int = 500,
    var minLocationAccuracy: Float = 50.0f, // meters
    var requirePhotoForCheckIn: Boolean = true,
    var maxPhotoSizeMB: Int = 10,
    var allowOfflineCheckIn: Boolean = false,

    // Schedule and attendance settings
    var defaultToleranceMinutes: Int = 15,
    var maxToleranceMinutes: Int = 60,
    var autoCloseSessionHours: Int = 12,
    var enableAutomaticAbsenceDetection: Boolean = true,
    var absenceDetectionDelayMinutes: Int = 30,

    // Job scheduling settings
    var jobIntervalMinutes: Int = 30,
    var enableBackgroundJobs: Boolean = true,
    var maxJobRetries: Int = 3,
    var jobRetryDelayMinutes: Int = 5,

    // Notification settings
    var enablePushNotifications: Boolean = true,
    var enableEmailNotifications: Boolean = true,
    var notificationTimeRangeStart: String = "07:00",
    var notificationTimeRangeEnd: String = "22:00",

    // Data retention settings
    var attendanceDataRetentionDays: Int = 365,
    var photoRetentionDays: Int = 90,
    var logRetentionDays: Int = 30,
    var enableAutoCleanup: Boolean = true,

    // Admin dashboard settings
    var dashboardRefreshIntervalSeconds: Int = 120,
    var maxRecentCheckIns: Int = 10,
    var enableRealTimeUpdates: Boolean = true,
    var statisticsCalculationIntervalHours: Int = 6,

    // Security settings
    var enableAuditLogging: Boolean = true,
    var auditLogRetentionDays: Int = 180,
    var enableLocationEncryption: Boolean = false,
    var requireBiometricAuth: Boolean = false,

    // Performance settings
    var maxRecordsPerPage: Int = 50,
    var cacheExpirationMinutes: Int = 30,
    var enableDataCompression: Boolean = true,
    var maxConcurrentUsers: Int = 1000,

    // Feature flags
    var enableTimeOffRequests: Boolean = true,
    var enableUserManagement: Boolean = true,
    var enableReports: Boolean = true,
    var enableLocationManagement: Boolean = true,
    var enableScheduleManagement: Boolean = true,
    var enableBulkOperations: Boolean = true,

    // Support and help
    var supportEmail: String = "soporte@avivacredito.com",
    var supportPhone: String = "+52-55-1234-5678",
    var helpUrl: String = "https://ayuda.avivacredito.com",
    var privacyPolicyUrl: String = "https://avivacredito.com/privacidad",
    var termsOfServiceUrl: String = "https://avivacredito.com/terminos",

    // Metadata
    var createdAt: Timestamp = Timestamp.now(),
    var updatedAt: Timestamp = Timestamp.now(),
    var updatedBy: String = "",
    var configVersion: Int = 1
) {
    fun isEmailDomainAllowed(email: String): Boolean {
        if (allowedEmailDomains.isEmpty()) return true
        val domain = email.substringAfter("@").lowercase()
        return allowedEmailDomains.any { it.lowercase() == domain }
    }

    fun isVersionSupported(version: String): Boolean {
        return try {
            val currentVersion = parseVersion(version)
            val minVersion = parseVersion(minSupportedVersion)
            currentVersion >= minVersion
        } catch (e: Exception) {
            false
        }
    }

    private fun parseVersion(version: String): Int {
        val parts = version.split(".")
        return if (parts.size >= 3) {
            parts[0].toInt() * 10000 + parts[1].toInt() * 100 + parts[2].toInt()
        } else {
            0
        }
    }

    fun isInNotificationTimeRange(currentTime: String): Boolean {
        return try {
            val current = timeStringToMinutes(currentTime)
            val start = timeStringToMinutes(notificationTimeRangeStart)
            val end = timeStringToMinutes(notificationTimeRangeEnd)

            if (start <= end) {
                current in start..end
            } else {
                // Handle overnight range (e.g., 22:00 to 07:00)
                current >= start || current <= end
            }
        } catch (e: Exception) {
            true // Default to allowing notifications if parsing fails
        }
    }

    private fun timeStringToMinutes(timeString: String): Int {
        val parts = timeString.split(":")
        return parts[0].toInt() * 60 + parts[1].toInt()
    }

    fun getLocationValidationMessage(): String {
        return "Debe estar dentro de un radio de $defaultLocationRadius metros del punto de registro"
    }

    fun shouldAutoCloseSession(lastActivityHours: Int): Boolean {
        return lastActivityHours >= autoCloseSessionHours
    }

    fun isMaintenanceActive(): Boolean {
        return isMaintenanceMode
    }

    fun validateLocationAccuracy(accuracy: Float): Boolean {
        return accuracy <= minLocationAccuracy
    }

    fun getMaxRetentionDays(): Int {
        return maxOf(attendanceDataRetentionDays, photoRetentionDays, logRetentionDays, auditLogRetentionDays)
    }

    companion object {
        // Default configuration for new installations
        fun getDefaultConfig(): SystemConfig {
            return SystemConfig()
        }

        // Configuration validation
        fun validateConfig(config: SystemConfig): List<String> {
            val errors = mutableListOf<String>()

            if (config.defaultLocationRadius < 10 || config.defaultLocationRadius > config.maxLocationRadius) {
                errors.add("Radio de ubicación por defecto debe estar entre 10 y ${config.maxLocationRadius} metros")
            }

            if (config.defaultToleranceMinutes < 0 || config.defaultToleranceMinutes > config.maxToleranceMinutes) {
                errors.add("Tolerancia por defecto debe estar entre 0 y ${config.maxToleranceMinutes} minutos")
            }

            if (config.sessionTimeoutMinutes < 30) {
                errors.add("Tiempo de sesión debe ser al menos 30 minutos")
            }

            if (config.jobIntervalMinutes < 5) {
                errors.add("Intervalo de trabajos debe ser al menos 5 minutos")
            }

            return errors
        }
    }
}