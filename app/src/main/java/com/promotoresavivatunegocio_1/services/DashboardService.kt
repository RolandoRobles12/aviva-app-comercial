package com.promotoresavivatunegocio_1.services

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await
import models.*
import java.text.SimpleDateFormat
import java.util.*

class DashboardService {
    private val db = FirebaseFirestore.getInstance()
    private val attendanceService = AttendanceService()
    private val userService = UserService()
    private val kioskService = KioskService()

    companion object {
        private const val TAG = "DashboardService"
    }

    // DASHBOARD KPIs - Matching Web App
    suspend fun getDashboardKPIs(date: Date = Date()): DashboardKPIs {
        return try {
            val todayAttendance = attendanceService.getAllAttendanceForDate(date)
            val allUsers = userService.getActiveUsers()
            val allKiosks = kioskService.getActiveKiosks()
            val timeOffRequests = attendanceService.getPendingTimeOffRequests()
            val attendanceIssues = attendanceService.getAttendanceIssues()

            // Calculate metrics
            val totalCheckIns = todayAttendance.size
            val uniqueUsers = todayAttendance.map { it.userId }.distinct().size
            val expectedUsers = allUsers.size
            val attendanceRate = if (expectedUsers > 0) (uniqueUsers.toDouble() / expectedUsers) * 100 else 0.0

            // Punctuality metrics
            val entries = todayAttendance.filter { it.type == AttendanceRecord.AttendanceType.ENTRADA }
            val onTimeEntries = entries.count { it.punctuality == AttendanceRecord.PunctualityStatus.ON_TIME }
            val lateEntries = entries.count { it.punctuality == AttendanceRecord.PunctualityStatus.LATE }
            val punctualityRate = if (entries.isNotEmpty()) (onTimeEntries.toDouble() / entries.size) * 100 else 0.0

            // Active locations
            val activeLocations = todayAttendance.map { it.kioskId }.distinct().size

            DashboardKPIs(
                totalCheckIns = totalCheckIns,
                attendanceRate = attendanceRate,
                punctualityRate = punctualityRate,
                attendanceIncidents = attendanceIssues.size,
                activeEmployees = uniqueUsers,
                expectedEmployees = expectedUsers,
                onTimeArrivals = onTimeEntries,
                lateArrivals = lateEntries,
                pendingTimeOffRequests = timeOffRequests.size,
                activeLocations = activeLocations,
                totalLocations = allKiosks.size
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating dashboard KPIs", e)
            DashboardKPIs() // Return empty KPIs on error
        }
    }

    // RECENT ACTIVITY - Real-time monitoring
    suspend fun getRecentActivity(limit: Int = 10): List<ActivityItem> {
        return try {
            val activities = mutableListOf<ActivityItem>()

            // Recent check-ins
            val recentCheckIns = attendanceService.getRecentCheckIns(limit)
            recentCheckIns.forEach { record ->
                activities.add(
                    ActivityItem(
                        id = record.id,
                        type = ActivityType.ATTENDANCE,
                        userId = record.userId,
                        userName = record.userName,
                        description = "${record.userName} - ${record.getTypeDisplayName()} en ${record.kioskName}",
                        timestamp = record.timestamp,
                        status = if (record.punctuality == AttendanceRecord.PunctualityStatus.LATE)
                            ActivityStatus.WARNING else ActivityStatus.SUCCESS,
                        location = record.kioskName,
                        productType = record.productType
                    )
                )
            }

            // Recent time-off requests
            val recentTimeOff = attendanceService.getPendingTimeOffRequests().take(5)
            recentTimeOff.forEach { request ->
                activities.add(
                    ActivityItem(
                        id = request.id,
                        type = ActivityType.TIME_OFF_REQUEST,
                        userId = request.userId,
                        userName = request.userName,
                        description = "${request.userName} solicitó ${request.getTypeDisplayName()}",
                        timestamp = request.createdAt,
                        status = ActivityStatus.PENDING,
                        details = "Del ${request.getFormattedDateRange()}"
                    )
                )
            }

            // Recent issues
            val recentIssues = attendanceService.getAttendanceIssues().take(3)
            recentIssues.forEach { issue ->
                activities.add(
                    ActivityItem(
                        id = issue.id,
                        type = ActivityType.ATTENDANCE_ISSUE,
                        userId = issue.userId,
                        userName = issue.userName,
                        description = issue.message,
                        timestamp = issue.timestamp,
                        status = when (issue.severity) {
                            AttendanceService.IssueSeverity.HIGH, AttendanceService.IssueSeverity.CRITICAL -> ActivityStatus.ERROR
                            AttendanceService.IssueSeverity.MEDIUM -> ActivityStatus.WARNING
                            else -> ActivityStatus.INFO
                        }
                    )
                )
            }

            // Sort by timestamp and return limited results
            activities.sortedByDescending { it.timestamp.toDate() }.take(limit)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting recent activity", e)
            emptyList()
        }
    }

    // ATTENDANCE STATISTICS BY TIME PERIODS
    suspend fun getAttendanceStatsByPeriod(
        startDate: Date,
        endDate: Date,
        groupBy: PeriodGrouping = PeriodGrouping.DAILY
    ): List<AttendancePeriodStats> {
        return try {
            val stats = mutableListOf<AttendancePeriodStats>()
            val calendar = Calendar.getInstance()
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

            calendar.time = startDate
            while (!calendar.time.after(endDate)) {
                val currentDate = calendar.time
                val attendance = attendanceService.getAllAttendanceForDate(currentDate)

                val periodStats = AttendancePeriodStats(
                    period = dateFormat.format(currentDate),
                    date = currentDate,
                    totalCheckIns = attendance.size,
                    uniqueUsers = attendance.map { it.userId }.distinct().size,
                    onTimeCount = attendance.count { it.punctuality == AttendanceRecord.PunctualityStatus.ON_TIME },
                    lateCount = attendance.count { it.punctuality == AttendanceRecord.PunctualityStatus.LATE },
                    issuesCount = attendance.count { !it.isLocationValid || it.requiresReview }
                )

                stats.add(periodStats)

                // Increment by period
                when (groupBy) {
                    PeriodGrouping.DAILY -> calendar.add(Calendar.DAY_OF_MONTH, 1)
                    PeriodGrouping.WEEKLY -> calendar.add(Calendar.WEEK_OF_YEAR, 1)
                    PeriodGrouping.MONTHLY -> calendar.add(Calendar.MONTH, 1)
                }
            }

            stats
        } catch (e: Exception) {
            Log.e(TAG, "Error getting attendance stats by period", e)
            emptyList()
        }
    }

    // PRODUCT TYPE ANALYTICS
    suspend fun getProductTypeAnalytics(): List<ProductTypeStats> {
        return try {
            val today = Date()
            val allAttendance = attendanceService.getAllAttendanceForDate(today)
            val productTypeGroups = allAttendance.groupBy { it.productType }

            productTypeGroups.map { (productType, records) ->
                val uniqueUsers = records.map { it.userId }.distinct().size
                val onTimeCount = records.count { it.punctuality == AttendanceRecord.PunctualityStatus.ON_TIME }
                val lateCount = records.count { it.punctuality == AttendanceRecord.PunctualityStatus.LATE }
                val punctualityRate = if (records.isNotEmpty()) (onTimeCount.toDouble() / records.size) * 100 else 0.0

                ProductTypeStats(
                    productType = productType,
                    displayName = AttendanceRecord.getProductTypeDisplayName(productType),
                    totalCheckIns = records.size,
                    activeUsers = uniqueUsers,
                    punctualityRate = punctualityRate,
                    onTimeCount = onTimeCount,
                    lateCount = lateCount,
                    issuesCount = records.count { !it.isLocationValid }
                )
            }.sortedByDescending { it.totalCheckIns }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting product type analytics", e)
            emptyList()
        }
    }

    // LOCATION PERFORMANCE ANALYTICS
    suspend fun getLocationPerformance(): List<LocationPerformanceStats> {
        return try {
            val today = Date()
            val allAttendance = attendanceService.getAllAttendanceForDate(today)
            val locationGroups = allAttendance.groupBy { it.kioskId }

            val locationStats = mutableListOf<LocationPerformanceStats>()

            locationGroups.forEach { (kioskId, records) ->
                val kiosk = kioskService.getKioskById(kioskId)
                if (kiosk != null) {
                    val uniqueUsers = records.map { it.userId }.distinct().size
                    val issues = records.count { !it.isLocationValid || it.requiresReview }
                    val avgAccuracy = records.mapNotNull { it.locationAccuracy }.average()

                    locationStats.add(
                        LocationPerformanceStats(
                            kioskId = kioskId,
                            kioskName = kiosk.name,
                            state = kiosk.state,
                            city = kiosk.city,
                            productType = kiosk.getProductTypeDisplayName(),
                            totalCheckIns = records.size,
                            activeUsers = uniqueUsers,
                            issuesCount = issues,
                            averageLocationAccuracy = if (avgAccuracy.isNaN()) 0.0 else avgAccuracy,
                            lastActivity = records.maxByOrNull { it.timestamp.toDate() }?.timestamp
                        )
                    )
                }
            }

            locationStats.sortedByDescending { it.totalCheckIns }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting location performance", e)
            emptyList()
        }
    }

    // REAL-TIME MONITORING
    suspend fun getSystemHealthStatus(): SystemHealthStatus {
        return try {
            val issues = attendanceService.getAttendanceIssues()
            val criticalIssues = issues.count { it.severity == AttendanceService.IssueSeverity.CRITICAL }
            val highIssues = issues.count { it.severity == AttendanceService.IssueSeverity.HIGH }
            val mediumIssues = issues.count { it.severity == AttendanceService.IssueSeverity.MEDIUM }

            val status = when {
                criticalIssues > 0 -> HealthLevel.CRITICAL
                highIssues > 5 -> HealthLevel.WARNING
                mediumIssues > 10 -> HealthLevel.CAUTION
                else -> HealthLevel.HEALTHY
            }

            SystemHealthStatus(
                level = status,
                criticalIssues = criticalIssues,
                highIssues = highIssues,
                mediumIssues = mediumIssues,
                totalIssues = issues.size,
                lastUpdate = Timestamp.now(),
                message = when (status) {
                    HealthLevel.CRITICAL -> "Sistema requiere atención inmediata"
                    HealthLevel.WARNING -> "Se detectaron problemas importantes"
                    HealthLevel.CAUTION -> "Funcionamiento normal con alertas menores"
                    HealthLevel.HEALTHY -> "Sistema funcionando normalmente"
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error getting system health status", e)
            SystemHealthStatus(
                level = HealthLevel.CRITICAL,
                message = "Error al verificar estado del sistema"
            )
        }
    }

    // DATA MODELS
    data class DashboardKPIs(
        val totalCheckIns: Int = 0,
        val attendanceRate: Double = 0.0,
        val punctualityRate: Double = 0.0,
        val attendanceIncidents: Int = 0,
        val activeEmployees: Int = 0,
        val expectedEmployees: Int = 0,
        val onTimeArrivals: Int = 0,
        val lateArrivals: Int = 0,
        val pendingTimeOffRequests: Int = 0,
        val activeLocations: Int = 0,
        val totalLocations: Int = 0
    ) {
        fun getAttendanceRateFormatted(): String = "%.1f%%".format(attendanceRate)
        fun getPunctualityRateFormatted(): String = "%.1f%%".format(punctualityRate)
        fun getLocationUtilizationRate(): Double =
            if (totalLocations > 0) (activeLocations.toDouble() / totalLocations) * 100 else 0.0
    }

    data class ActivityItem(
        val id: String,
        val type: ActivityType,
        val userId: String,
        val userName: String,
        val description: String,
        val timestamp: Timestamp,
        val status: ActivityStatus,
        val location: String? = null,
        val productType: String? = null,
        val details: String? = null
    ) {
        fun getTimeAgo(): String {
            val now = Date()
            val activityTime = timestamp.toDate()
            val diffMs = now.time - activityTime.time
            val diffMinutes = diffMs / (1000 * 60)

            return when {
                diffMinutes < 1 -> "Ahora"
                diffMinutes < 60 -> "${diffMinutes}m"
                diffMinutes < 1440 -> "${diffMinutes / 60}h"
                else -> "${diffMinutes / 1440}d"
            }
        }
    }

    enum class ActivityType {
        ATTENDANCE,
        TIME_OFF_REQUEST,
        ATTENDANCE_ISSUE,
        USER_CREATED,
        KIOSK_UPDATED,
        SYSTEM_ALERT
    }

    enum class ActivityStatus {
        SUCCESS,
        WARNING,
        ERROR,
        INFO,
        PENDING
    }

    data class AttendancePeriodStats(
        val period: String,
        val date: Date,
        val totalCheckIns: Int,
        val uniqueUsers: Int,
        val onTimeCount: Int,
        val lateCount: Int,
        val issuesCount: Int
    ) {
        fun getPunctualityRate(): Double =
            if (totalCheckIns > 0) (onTimeCount.toDouble() / totalCheckIns) * 100 else 0.0
    }

    enum class PeriodGrouping {
        DAILY,
        WEEKLY,
        MONTHLY
    }

    data class ProductTypeStats(
        val productType: String,
        val displayName: String,
        val totalCheckIns: Int,
        val activeUsers: Int,
        val punctualityRate: Double,
        val onTimeCount: Int,
        val lateCount: Int,
        val issuesCount: Int
    )

    data class LocationPerformanceStats(
        val kioskId: String,
        val kioskName: String,
        val state: String,
        val city: String,
        val productType: String,
        val totalCheckIns: Int,
        val activeUsers: Int,
        val issuesCount: Int,
        val averageLocationAccuracy: Double,
        val lastActivity: Timestamp?
    ) {
        fun getPerformanceScore(): Double {
            val baseScore = 100.0
            val accuracyPenalty = if (averageLocationAccuracy > 50) (averageLocationAccuracy - 50) * 0.5 else 0.0
            val issuesPenalty = issuesCount * 5.0
            return maxOf(0.0, baseScore - accuracyPenalty - issuesPenalty)
        }
    }

    data class SystemHealthStatus(
        val level: HealthLevel,
        val criticalIssues: Int = 0,
        val highIssues: Int = 0,
        val mediumIssues: Int = 0,
        val totalIssues: Int = 0,
        val lastUpdate: Timestamp = Timestamp.now(),
        val message: String = ""
    )

    enum class HealthLevel {
        HEALTHY,
        CAUTION,
        WARNING,
        CRITICAL
    }
}