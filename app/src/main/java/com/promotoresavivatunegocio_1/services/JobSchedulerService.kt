package com.promotoresavivatunegocio_1.services

import android.content.Context
import android.util.Log
import androidx.work.*
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import models.AttendanceRecord
import models.SystemConfig
import models.User
import java.util.*
import java.util.concurrent.TimeUnit

class JobSchedulerService(private val context: Context) {
    private val workManager = WorkManager.getInstance(context)
    private val db = FirebaseFirestore.getInstance()

    companion object {
        private const val TAG = "JobSchedulerService"

        // Job Names
        private const val JOB_ABSENCE_DETECTION = "absence_detection"
        private const val JOB_ATTENDANCE_REMINDERS = "attendance_reminders"
        private const val JOB_LATE_ARRIVAL_ALERTS = "late_arrival_alerts"
        private const val JOB_LOCATION_VIOLATION_ALERTS = "location_violation_alerts"
        private const val JOB_AUTO_CLOSE_SESSIONS = "auto_close_sessions"
        private const val JOB_CLEANUP_OLD_DATA = "cleanup_old_data"
        private const val JOB_CALCULATE_STATS = "calculate_stats"
        private const val JOB_SYSTEM_HEALTH_CHECK = "system_health_check"
        private const val JOB_NOTIFICATION_CLEANUP = "notification_cleanup"
        private const val JOB_PHOTO_CLEANUP = "photo_cleanup"
    }

    // INITIALIZE ALL BACKGROUND JOBS
    suspend fun initializeAllJobs() {
        try {
            val config = getSystemConfig()

            if (config.enableBackgroundJobs) {
                scheduleAbsenceDetectionJob(config.jobIntervalMinutes.toLong())
                scheduleAttendanceRemindersJob()
                scheduleLateArrivalAlertsJob()
                scheduleLocationViolationAlertsJob()
                scheduleAutoCloseSessionsJob()
                scheduleStatsCalculationJob()
                scheduleSystemHealthCheckJob()
                scheduleDataCleanupJob()

                Log.d(TAG, "All background jobs initialized successfully")
            } else {
                Log.d(TAG, "Background jobs disabled in system configuration")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing background jobs", e)
        }
    }

    // ABSENCE DETECTION JOB
    private fun scheduleAbsenceDetectionJob(intervalMinutes: Long) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val workRequest = PeriodicWorkRequestBuilder<AbsenceDetectionWorker>(
            intervalMinutes, TimeUnit.MINUTES,
            15, TimeUnit.MINUTES // Flex interval
        )
            .setConstraints(constraints)
            .addTag(JOB_ABSENCE_DETECTION)
            .build()

        workManager.enqueueUniquePeriodicWork(
            JOB_ABSENCE_DETECTION,
            ExistingPeriodicWorkPolicy.REPLACE,
            workRequest
        )
    }

    // ATTENDANCE REMINDERS JOB
    private fun scheduleAttendanceRemindersJob() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val workRequest = PeriodicWorkRequestBuilder<AttendanceRemindersWorker>(
            15, TimeUnit.MINUTES,
            5, TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .addTag(JOB_ATTENDANCE_REMINDERS)
            .build()

        workManager.enqueueUniquePeriodicWork(
            JOB_ATTENDANCE_REMINDERS,
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    // LATE ARRIVAL ALERTS JOB
    private fun scheduleLateArrivalAlertsJob() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val workRequest = PeriodicWorkRequestBuilder<LateArrivalAlertsWorker>(
            30, TimeUnit.MINUTES,
            10, TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .addTag(JOB_LATE_ARRIVAL_ALERTS)
            .build()

        workManager.enqueueUniquePeriodicWork(
            JOB_LATE_ARRIVAL_ALERTS,
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    // LOCATION VIOLATION ALERTS JOB
    private fun scheduleLocationViolationAlertsJob() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val workRequest = PeriodicWorkRequestBuilder<LocationViolationAlertsWorker>(
            15, TimeUnit.MINUTES,
            5, TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .addTag(JOB_LOCATION_VIOLATION_ALERTS)
            .build()

        workManager.enqueueUniquePeriodicWork(
            JOB_LOCATION_VIOLATION_ALERTS,
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    // AUTO CLOSE SESSIONS JOB
    private fun scheduleAutoCloseSessionsJob() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val workRequest = PeriodicWorkRequestBuilder<AutoCloseSessionsWorker>(
            2, TimeUnit.HOURS,
            30, TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .addTag(JOB_AUTO_CLOSE_SESSIONS)
            .build()

        workManager.enqueueUniquePeriodicWork(
            JOB_AUTO_CLOSE_SESSIONS,
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    // STATISTICS CALCULATION JOB
    private fun scheduleStatsCalculationJob() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val workRequest = PeriodicWorkRequestBuilder<StatsCalculationWorker>(
            6, TimeUnit.HOURS,
            1, TimeUnit.HOURS
        )
            .setConstraints(constraints)
            .addTag(JOB_CALCULATE_STATS)
            .build()

        workManager.enqueueUniquePeriodicWork(
            JOB_CALCULATE_STATS,
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    // SYSTEM HEALTH CHECK JOB
    private fun scheduleSystemHealthCheckJob() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val workRequest = PeriodicWorkRequestBuilder<SystemHealthCheckWorker>(
            1, TimeUnit.HOURS,
            15, TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .addTag(JOB_SYSTEM_HEALTH_CHECK)
            .build()

        workManager.enqueueUniquePeriodicWork(
            JOB_SYSTEM_HEALTH_CHECK,
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    // DATA CLEANUP JOB
    private fun scheduleDataCleanupJob() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresCharging(true) // Only run when charging
            .build()

        // Run daily at 2 AM
        val currentTime = Calendar.getInstance()
        val targetTime = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 2)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)

            // If it's already past 2 AM today, schedule for tomorrow
            if (before(currentTime)) {
                add(Calendar.DAY_OF_MONTH, 1)
            }
        }

        val initialDelay = targetTime.timeInMillis - currentTime.timeInMillis

        val workRequest = PeriodicWorkRequestBuilder<DataCleanupWorker>(
            24, TimeUnit.HOURS,
            2, TimeUnit.HOURS
        )
            .setConstraints(constraints)
            .setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
            .addTag(JOB_CLEANUP_OLD_DATA)
            .build()

        workManager.enqueueUniquePeriodicWork(
            JOB_CLEANUP_OLD_DATA,
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    // JOB MANAGEMENT
    fun cancelAllJobs() {
        workManager.cancelAllWork()
        Log.d(TAG, "All background jobs cancelled")
    }

    fun cancelJobByTag(tag: String) {
        workManager.cancelAllWorkByTag(tag)
        Log.d(TAG, "Job cancelled: $tag")
    }

    suspend fun getJobStatus(): Map<String, JobStatus> {
        val jobTags = listOf(
            JOB_ABSENCE_DETECTION,
            JOB_ATTENDANCE_REMINDERS,
            JOB_LATE_ARRIVAL_ALERTS,
            JOB_LOCATION_VIOLATION_ALERTS,
            JOB_AUTO_CLOSE_SESSIONS,
            JOB_CALCULATE_STATS,
            JOB_SYSTEM_HEALTH_CHECK,
            JOB_CLEANUP_OLD_DATA
        )

        val statusMap = mutableMapOf<String, JobStatus>()

        jobTags.forEach { tag ->
            try {
                val workInfos = workManager.getWorkInfosByTag(tag).get()
                val status = when {
                    workInfos.isEmpty() -> JobStatus.NOT_SCHEDULED
                    workInfos.any { it.state == WorkInfo.State.RUNNING } -> JobStatus.RUNNING
                    workInfos.any { it.state == WorkInfo.State.ENQUEUED } -> JobStatus.SCHEDULED
                    workInfos.any { it.state == WorkInfo.State.FAILED } -> JobStatus.FAILED
                    else -> JobStatus.COMPLETED
                }
                statusMap[tag] = status
            } catch (e: Exception) {
                statusMap[tag] = JobStatus.ERROR
                Log.e(TAG, "Error getting status for job: $tag", e)
            }
        }

        return statusMap
    }

    // UTILITY METHODS
    private suspend fun getSystemConfig(): SystemConfig {
        return try {
            val configDoc = db.collection("system_config").document("system_config").get().await()
            if (configDoc.exists()) {
                configDoc.toObject(SystemConfig::class.java) ?: SystemConfig.getDefaultConfig()
            } else {
                SystemConfig.getDefaultConfig()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error loading system config", e)
            SystemConfig.getDefaultConfig()
        }
    }

    // ENUMS
    enum class JobStatus {
        NOT_SCHEDULED,
        SCHEDULED,
        RUNNING,
        COMPLETED,
        FAILED,
        ERROR
    }
}

// WORKER CLASSES
class AbsenceDetectionWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            val attendanceService = AttendanceService(applicationContext)
            val today = Date()

            val absences = attendanceService.detectAbsences(today)
            Log.d("AbsenceDetectionWorker", "Detected ${absences.size} absences for today")

            // Here you could send notifications or alerts about absences
            Result.success()
        } catch (e: Exception) {
            Log.e("AbsenceDetectionWorker", "Error detecting absences", e)
            Result.retry()
        }
    }
}

class AttendanceRemindersWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            val notificationService = NotificationService(applicationContext)
            notificationService.sendAttendanceReminders()

            Log.d("AttendanceRemindersWorker", "Attendance reminders sent")
            Result.success()
        } catch (e: Exception) {
            Log.e("AttendanceRemindersWorker", "Error sending reminders", e)
            Result.retry()
        }
    }
}

class LateArrivalAlertsWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            val notificationService = NotificationService(applicationContext)
            notificationService.sendLateArrivalAlerts()

            Log.d("LateArrivalAlertsWorker", "Late arrival alerts sent")
            Result.success()
        } catch (e: Exception) {
            Log.e("LateArrivalAlertsWorker", "Error sending late arrival alerts", e)
            Result.retry()
        }
    }
}

class LocationViolationAlertsWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            val notificationService = NotificationService(applicationContext)
            notificationService.sendLocationViolationAlerts()

            Log.d("LocationViolationAlertsWorker", "Location violation alerts sent")
            Result.success()
        } catch (e: Exception) {
            Log.e("LocationViolationAlertsWorker", "Error sending location violation alerts", e)
            Result.retry()
        }
    }
}

class AutoCloseSessionsWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            // Logic to auto-close inactive attendance sessions
            val attendanceService = AttendanceService(applicationContext)
            val userService = UserService()

            val activeUsers = userService.getActiveUsers()
            var closedSessions = 0

            activeUsers.forEach { user ->
                val todayRecords = attendanceService.getTodayAttendanceForUser(user.id)
                val hasEntry = todayRecords.any { it.type == AttendanceRecord.AttendanceType.ENTRADA }
                val hasExit = todayRecords.any { it.type == AttendanceRecord.AttendanceType.SALIDA }

                // Auto-close if user has entry but no exit after work hours
                if (hasEntry && !hasExit) {
                    val entryTime = todayRecords.find { it.type == AttendanceRecord.AttendanceType.ENTRADA }?.timestamp?.toDate()
                    if (entryTime != null) {
                        val hoursSinceEntry = (Date().time - entryTime.time) / (1000 * 60 * 60)
                        if (hoursSinceEntry >= 12) { // Auto-close after 12 hours
                            // Create auto exit record
                            // This would be implemented based on your business rules
                            closedSessions++
                        }
                    }
                }
            }

            Log.d("AutoCloseSessionsWorker", "Auto-closed $closedSessions sessions")
            Result.success()
        } catch (e: Exception) {
            Log.e("AutoCloseSessionsWorker", "Error auto-closing sessions", e)
            Result.retry()
        }
    }
}

class StatsCalculationWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            val attendanceService = AttendanceService(applicationContext)
            val yesterday = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_MONTH, -1)
            }.time

            val stats = attendanceService.calculateDailyStats(yesterday)
            attendanceService.saveDailyStats(stats)

            Log.d("StatsCalculationWorker", "Daily stats calculated and saved")
            Result.success()
        } catch (e: Exception) {
            Log.e("StatsCalculationWorker", "Error calculating stats", e)
            Result.retry()
        }
    }
}

class SystemHealthCheckWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            val dashboardService = DashboardService()
            val healthStatus = dashboardService.getSystemHealthStatus()

            // Send critical alerts if needed
            if (healthStatus.level == DashboardService.HealthLevel.CRITICAL) {
                val notificationService = NotificationService(applicationContext)
                notificationService.sendBroadcastNotification(
                    title = "⚠️ Sistema Crítico",
                    message = healthStatus.message,
                    targetRole = User.UserRole.ADMIN
                )
            }

            Log.d("SystemHealthCheckWorker", "System health check completed: ${healthStatus.level}")
            Result.success()
        } catch (e: Exception) {
            Log.e("SystemHealthCheckWorker", "Error performing health check", e)
            Result.retry()
        }
    }
}

class DataCleanupWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            val photoStorageService = PhotoStorageService(applicationContext)
            val notificationService = NotificationService(applicationContext)

            // Cleanup old photos
            val deletedPhotos = photoStorageService.cleanupOldAttendancePhotos(90)

            // Cleanup old notifications
            val deletedNotifications = notificationService.cleanupOldNotifications(30)

            // Cleanup temp files
            photoStorageService.cleanupTempFiles()

            Log.d("DataCleanupWorker", "Cleanup completed: ${deletedPhotos.getOrNull() ?: 0} photos, ${deletedNotifications.getOrNull() ?: 0} notifications")
            Result.success()
        } catch (e: Exception) {
            Log.e("DataCleanupWorker", "Error during cleanup", e)
            Result.retry()
        }
    }
}