package com.promotoresavivatunegocio_1.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import com.promotoresavivatunegocio_1.MainActivity
import com.promotoresavivatunegocio_1.R
import kotlinx.coroutines.tasks.await
import models.AttendanceRecord
import models.User
import java.text.SimpleDateFormat
import java.util.*

class NotificationService(private val context: Context) {
    private val db = FirebaseFirestore.getInstance()
    private val notificationsCollection = db.collection("notifications")
    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    private val messaging = FirebaseMessaging.getInstance()

    companion object {
        private const val TAG = "NotificationService"
        private const val CHANNEL_ID_ATTENDANCE = "attendance_notifications"
        private const val CHANNEL_ID_ALERTS = "alert_notifications"
        private const val CHANNEL_ID_REMINDERS = "reminder_notifications"
        private const val CHANNEL_ID_ADMIN = "admin_notifications"
    }

    init {
        createNotificationChannels()
    }

    // NOTIFICATION CHANNELS SETUP
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channels = listOf(
                NotificationChannel(
                    CHANNEL_ID_ATTENDANCE,
                    "Asistencia",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notificaciones de registro de asistencia"
                    enableVibration(true)
                    enableLights(true)
                },
                NotificationChannel(
                    CHANNEL_ID_ALERTS,
                    "Alertas del Sistema",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alertas importantes del sistema"
                    enableVibration(true)
                    enableLights(true)
                },
                NotificationChannel(
                    CHANNEL_ID_REMINDERS,
                    "Recordatorios",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Recordatorios de check-in y tareas"
                    enableVibration(true)
                },
                NotificationChannel(
                    CHANNEL_ID_ADMIN,
                    "Administración",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notificaciones para administradores"
                    enableVibration(true)
                    enableLights(true)
                }
            )

            channels.forEach { channel ->
                notificationManager.createNotificationChannel(channel)
            }
        }
    }

    // FCM TOKEN MANAGEMENT
    suspend fun registerFCMToken(userId: String): Result<String> {
        return try {
            val token = messaging.token.await()

            // Save token to Firestore
            val tokenData = mapOf(
                "fcmToken" to token,
                "userId" to userId,
                "lastUpdated" to Timestamp.now(),
                "platform" to "android"
            )

            db.collection("fcm_tokens").document(userId).set(tokenData).await()

            Log.d(TAG, "FCM token registered successfully for user: $userId")
            Result.success(token)
        } catch (e: Exception) {
            Log.e(TAG, "Error registering FCM token", e)
            Result.failure(e)
        }
    }

    suspend fun subscribeByCriteria(userId: String, role: String, productTypes: List<String>) {
        try {
            // Subscribe to role-based topics
            messaging.subscribeToTopic("role_$role").await()

            // Subscribe to product type topics
            productTypes.forEach { productType ->
                messaging.subscribeToTopic("product_$productType").await()
            }

            // Subscribe to general notifications
            messaging.subscribeToTopic("all_users").await()

            Log.d(TAG, "User subscribed to topics: role_$role, products: $productTypes")
        } catch (e: Exception) {
            Log.e(TAG, "Error subscribing to topics", e)
        }
    }

    // LOCAL NOTIFICATIONS
    fun showAttendanceConfirmation(attendanceType: String, location: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID_ATTENDANCE)
            .setSmallIcon(R.drawable.ic_attendance_24)
            .setContentTitle("✅ Asistencia Registrada")
            .setContentText("$attendanceType registrado en $location")
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        notificationManager.notify(1001, notification)
    }

    fun showAttendanceReminder(message: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID_REMINDERS)
            .setSmallIcon(R.drawable.ic_attendance_24)
            .setContentTitle("⏰ Recordatorio de Asistencia")
            .setContentText(message)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        notificationManager.notify(1002, notification)
    }

    fun showAlert(title: String, message: String, severity: AlertSeverity = AlertSeverity.INFO) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val (icon, priority) = when (severity) {
            AlertSeverity.CRITICAL -> R.drawable.ic_notifications_24 to NotificationCompat.PRIORITY_MAX
            AlertSeverity.HIGH -> R.drawable.ic_notifications_24 to NotificationCompat.PRIORITY_HIGH
            AlertSeverity.MEDIUM -> R.drawable.ic_notifications_24 to NotificationCompat.PRIORITY_DEFAULT
            AlertSeverity.LOW -> R.drawable.ic_notifications_24 to NotificationCompat.PRIORITY_LOW
            AlertSeverity.INFO -> R.drawable.ic_notifications_24 to NotificationCompat.PRIORITY_DEFAULT
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID_ALERTS)
            .setSmallIcon(icon)
            .setContentTitle(title)
            .setContentText(message)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(priority)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    // NOTIFICATION HISTORY AND MANAGEMENT
    suspend fun createNotification(notification: AppNotification): Result<String> {
        return try {
            val docRef = notificationsCollection.add(notification).await()
            notification.id = docRef.id
            notificationsCollection.document(docRef.id).set(notification).await()

            Log.d(TAG, "Notification created: ${notification.title}")
            Result.success(docRef.id)
        } catch (e: Exception) {
            Log.e(TAG, "Error creating notification", e)
            Result.failure(e)
        }
    }

    suspend fun getNotificationsForUser(userId: String, limit: Int = 50): List<AppNotification> {
        return try {
            val snapshot = notificationsCollection
                .whereEqualTo("userId", userId)
                .orderBy("createdAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
                .limit(limit.toLong())
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(AppNotification::class.java)?.apply {
                    id = doc.id
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting notifications for user", e)
            emptyList()
        }
    }

    suspend fun markNotificationAsRead(notificationId: String): Result<Boolean> {
        return try {
            val updates = mapOf(
                "isRead" to true,
                "readAt" to Timestamp.now()
            )
            notificationsCollection.document(notificationId).update(updates).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error marking notification as read", e)
            Result.failure(e)
        }
    }

    suspend fun getUnreadNotificationsCount(userId: String): Int {
        return try {
            val snapshot = notificationsCollection
                .whereEqualTo("userId", userId)
                .whereEqualTo("isRead", false)
                .get()
                .await()

            snapshot.size()
        } catch (e: Exception) {
            Log.e(TAG, "Error getting unread notifications count", e)
            0
        }
    }

    // AUTOMATED NOTIFICATIONS
    suspend fun sendAttendanceReminders() {
        try {
            val activeUsers = UserService().getActiveUsers()
            val attendanceService = AttendanceService()
            val currentTime = Calendar.getInstance()
            val currentHour = currentTime.get(Calendar.HOUR_OF_DAY)
            val currentMinute = currentTime.get(Calendar.MINUTE)

            // Send reminders based on schedule
            activeUsers.forEach { user ->
                val todayRecords = attendanceService.getTodayAttendanceForUser(user.id)

                when {
                    // Morning entry reminder (8:00 AM if no entry)
                    currentHour == 8 && currentMinute == 0 -> {
                        val hasEntry = todayRecords.any { it.type == AttendanceRecord.AttendanceType.ENTRADA }
                        if (!hasEntry) {
                            createAndSendNotification(
                                userId = user.id,
                                type = NotificationType.REMINDER,
                                title = "Recordatorio de Entrada",
                                message = "No olvides registrar tu entrada del día",
                                severity = AlertSeverity.MEDIUM
                            )
                        }
                    }

                    // Lunch reminder (12:00 PM)
                    currentHour == 12 && currentMinute == 0 -> {
                        val hasLunch = todayRecords.any { it.type == AttendanceRecord.AttendanceType.COMIDA }
                        if (!hasLunch) {
                            createAndSendNotification(
                                userId = user.id,
                                type = NotificationType.REMINDER,
                                title = "Hora de Almuerzo",
                                message = "Recuerda registrar tu salida a almorzar",
                                severity = AlertSeverity.LOW
                            )
                        }
                    }

                    // Exit reminder (5:00 PM if no exit)
                    currentHour == 17 && currentMinute == 0 -> {
                        val hasExit = todayRecords.any { it.type == AttendanceRecord.AttendanceType.SALIDA }
                        val hasEntry = todayRecords.any { it.type == AttendanceRecord.AttendanceType.ENTRADA }
                        if (hasEntry && !hasExit) {
                            createAndSendNotification(
                                userId = user.id,
                                type = NotificationType.REMINDER,
                                title = "Recordatorio de Salida",
                                message = "No olvides registrar tu salida del día",
                                severity = AlertSeverity.MEDIUM
                            )
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending attendance reminders", e)
        }
    }

    suspend fun sendLateArrivalAlerts() {
        try {
            val attendanceService = AttendanceService()
            val issues = attendanceService.getAttendanceIssues()

            // Send alerts for late arrivals to supervisors/admins
            val lateArrivals = issues.filter {
                it.type == AttendanceService.AttendanceIssueType.LATE_ENTRY
            }

            if (lateArrivals.isNotEmpty()) {
                val adminUsers = UserService().getUsersByRole(User.UserRole.ADMIN)

                adminUsers.forEach { admin ->
                    createAndSendNotification(
                        userId = admin.id,
                        type = NotificationType.ALERT,
                        title = "Alertas de Llegadas Tarde",
                        message = "Se detectaron ${lateArrivals.size} llegadas tarde hoy",
                        severity = AlertSeverity.HIGH,
                        data = mapOf(
                            "issueCount" to lateArrivals.size.toString(),
                            "issueType" to "late_arrivals"
                        )
                    )
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending late arrival alerts", e)
        }
    }

    suspend fun sendLocationViolationAlerts() {
        try {
            val attendanceService = AttendanceService()
            val issues = attendanceService.getAttendanceIssues()

            val locationViolations = issues.filter {
                it.type == AttendanceService.AttendanceIssueType.INVALID_LOCATION
            }

            if (locationViolations.isNotEmpty()) {
                val adminUsers = UserService().getUsersByRole(User.UserRole.ADMIN)

                adminUsers.forEach { admin ->
                    createAndSendNotification(
                        userId = admin.id,
                        type = NotificationType.ALERT,
                        title = "Violaciones de Ubicación",
                        message = "Se detectaron ${locationViolations.size} violaciones de ubicación",
                        severity = AlertSeverity.CRITICAL,
                        data = mapOf(
                            "issueCount" to locationViolations.size.toString(),
                            "issueType" to "location_violations"
                        )
                    )
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending location violation alerts", e)
        }
    }

    private suspend fun createAndSendNotification(
        userId: String,
        type: NotificationType,
        title: String,
        message: String,
        severity: AlertSeverity = AlertSeverity.INFO,
        data: Map<String, String> = emptyMap()
    ) {
        val notification = AppNotification(
            userId = userId,
            type = type,
            title = title,
            message = message,
            severity = severity,
            data = data,
            createdAt = Timestamp.now()
        )

        createNotification(notification)

        // Send local notification if user is currently active
        when (type) {
            NotificationType.REMINDER -> showAttendanceReminder(message)
            NotificationType.ALERT -> showAlert(title, message, severity)
            else -> showAlert(title, message, severity)
        }
    }

    // PUSH NOTIFICATION SENDING (for admin use)
    suspend fun sendPushNotificationToUser(
        userId: String,
        title: String,
        message: String,
        data: Map<String, String> = emptyMap()
    ): Result<Boolean> {
        return try {
            // This would typically use Firebase Cloud Functions or a backend service
            // to send FCM messages. For now, we'll create a local notification.

            createAndSendNotification(
                userId = userId,
                type = NotificationType.MANUAL,
                title = title,
                message = message,
                data = data
            )

            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending push notification", e)
            Result.failure(e)
        }
    }

    suspend fun sendBroadcastNotification(
        title: String,
        message: String,
        targetRole: User.UserRole? = null,
        targetProductTypes: List<String> = emptyList()
    ): Result<Int> {
        return try {
            val userService = UserService()
            val targetUsers = when {
                targetRole != null -> userService.getUsersByRole(targetRole)
                targetProductTypes.isNotEmpty() -> {
                    targetProductTypes.flatMap { productType ->
                        userService.getUsersByProductType(productType)
                    }.distinct()
                }
                else -> userService.getActiveUsers()
            }

            var sentCount = 0
            targetUsers.forEach { user ->
                createAndSendNotification(
                    userId = user.id,
                    type = NotificationType.BROADCAST,
                    title = title,
                    message = message,
                    severity = AlertSeverity.INFO
                )
                sentCount++
            }

            Log.d(TAG, "Broadcast notification sent to $sentCount users")
            Result.success(sentCount)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending broadcast notification", e)
            Result.failure(e)
        }
    }

    // NOTIFICATION CLEANUP
    suspend fun cleanupOldNotifications(daysToKeep: Int = 30): Result<Int> {
        return try {
            val cutoffDate = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_MONTH, -daysToKeep)
            }.time

            val snapshot = notificationsCollection
                .whereLessThan("createdAt", Timestamp(cutoffDate))
                .get()
                .await()

            var deletedCount = 0
            val batch = db.batch()

            snapshot.documents.forEach { doc ->
                batch.delete(doc.reference)
                deletedCount++
            }

            if (deletedCount > 0) {
                batch.commit().await()
            }

            Log.d(TAG, "Cleaned up $deletedCount old notifications")
            Result.success(deletedCount)
        } catch (e: Exception) {
            Log.e(TAG, "Error cleaning up old notifications", e)
            Result.failure(e)
        }
    }

    // DATA CLASSES
    data class AppNotification(
        var id: String = "",
        val userId: String = "",
        val type: NotificationType = NotificationType.INFO,
        val title: String = "",
        val message: String = "",
        val severity: AlertSeverity = AlertSeverity.INFO,
        val data: Map<String, String> = emptyMap(),
        val isRead: Boolean = false,
        val readAt: Timestamp? = null,
        val createdAt: Timestamp = Timestamp.now()
    ) {
        fun getFormattedTime(): String {
            val format = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
            return format.format(createdAt.toDate())
        }

        fun getTimeAgo(): String {
            val now = Date()
            val notificationTime = createdAt.toDate()
            val diffMs = now.time - notificationTime.time
            val diffMinutes = diffMs / (1000 * 60)

            return when {
                diffMinutes < 1 -> "Ahora"
                diffMinutes < 60 -> "${diffMinutes}m"
                diffMinutes < 1440 -> "${diffMinutes / 60}h"
                else -> "${diffMinutes / 1440}d"
            }
        }
    }

    enum class NotificationType {
        REMINDER,
        ALERT,
        INFO,
        BROADCAST,
        MANUAL,
        SYSTEM
    }

    enum class AlertSeverity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL,
        INFO
    }
}