package com.promotoresavivatunegocio_1.services

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await
import models.*
import java.text.SimpleDateFormat
import java.util.*

class ReportsService {
    private val db = FirebaseFirestore.getInstance()
    private val attendanceService = AttendanceService()
    private val userService = UserService()
    private val kioskService = KioskService()

    companion object {
        private const val TAG = "ReportsService"
    }

    // ATTENDANCE REPORTS
    suspend fun generateAttendanceReport(
        startDate: Date,
        endDate: Date,
        filters: ReportFilters = ReportFilters()
    ): AttendanceReport {
        return try {
            val calendar = Calendar.getInstance()
            val allRecords = mutableListOf<AttendanceRecord>()

            // Collect attendance records for date range
            calendar.time = startDate
            while (!calendar.time.after(endDate)) {
                val dayRecords = attendanceService.getAllAttendanceForDate(calendar.time)
                allRecords.addAll(dayRecords)
                calendar.add(Calendar.DAY_OF_MONTH, 1)
            }

            // Apply filters
            val filteredRecords = applyFilters(allRecords, filters)

            // Calculate statistics
            val totalRecords = filteredRecords.size
            val uniqueUsers = filteredRecords.map { it.userId }.distinct()
            val entriesOnly = filteredRecords.filter { it.type == AttendanceRecord.AttendanceType.ENTRADA }

            val onTimeCount = entriesOnly.count { it.punctuality == AttendanceRecord.PunctualityStatus.ON_TIME }
            val lateCount = entriesOnly.count { it.punctuality == AttendanceRecord.PunctualityStatus.LATE }
            val earlyCount = entriesOnly.count { it.punctuality == AttendanceRecord.PunctualityStatus.EARLY }

            val locationIssues = filteredRecords.count { !it.isLocationValid }
            val photoMissing = filteredRecords.count { it.photoUrl.isNullOrEmpty() }

            // Group by date for trend analysis
            val dailyStats = filteredRecords.groupBy {
                SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(it.timestamp.toDate())
            }.map { (date, records) ->
                DailyAttendanceStats(
                    date = date,
                    totalCheckIns = records.size,
                    uniqueUsers = records.map { it.userId }.distinct().size,
                    onTimeCount = records.count { it.punctuality == AttendanceRecord.PunctualityStatus.ON_TIME },
                    lateCount = records.count { it.punctuality == AttendanceRecord.PunctualityStatus.LATE },
                    issuesCount = records.count { !it.isLocationValid || it.photoUrl.isNullOrEmpty() }
                )
            }.sortedBy { it.date }

            // Group by user for individual analysis
            val userStats = filteredRecords.groupBy { it.userId }.map { (userId, records) ->
                val user = userService.getUserById(userId)
                UserAttendanceStats(
                    userId = userId,
                    userName = user?.displayName ?: "Usuario Desconocido",
                    userEmail = user?.email ?: "",
                    totalCheckIns = records.size,
                    onTimeCount = records.count { it.punctuality == AttendanceRecord.PunctualityStatus.ON_TIME },
                    lateCount = records.count { it.punctuality == AttendanceRecord.PunctualityStatus.LATE },
                    issuesCount = records.count { !it.isLocationValid },
                    workDays = records.map {
                        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(it.timestamp.toDate())
                    }.distinct().size,
                    averageCheckInTime = calculateAverageCheckInTime(records.filter { it.type == AttendanceRecord.AttendanceType.ENTRADA })
                )
            }.sortedByDescending { it.totalCheckIns }

            AttendanceReport(
                startDate = startDate,
                endDate = endDate,
                filters = filters,
                totalRecords = totalRecords,
                uniqueUsers = uniqueUsers.size,
                punctualityStats = PunctualityStats(onTimeCount, lateCount, earlyCount),
                issueStats = IssueStats(locationIssues, photoMissing),
                dailyStats = dailyStats,
                userStats = userStats,
                generatedAt = Timestamp.now()
            )

        } catch (e: Exception) {
            Log.e(TAG, "Error generating attendance report", e)
            AttendanceReport(
                startDate = startDate,
                endDate = endDate,
                error = "Error generando reporte: ${e.message}"
            )
        }
    }

    // PRODUCTIVITY REPORTS
    suspend fun generateProductivityReport(
        startDate: Date,
        endDate: Date,
        productType: String? = null
    ): ProductivityReport {
        return try {
            val calendar = Calendar.getInstance()
            val allRecords = mutableListOf<AttendanceRecord>()

            // Collect data for date range
            calendar.time = startDate
            while (!calendar.time.after(endDate)) {
                val dayRecords = attendanceService.getAllAttendanceForDate(calendar.time)
                allRecords.addAll(dayRecords)
                calendar.add(Calendar.DAY_OF_MONTH, 1)
            }

            // Filter by product type if specified
            val filteredRecords = if (productType != null) {
                allRecords.filter { it.productType == productType }
            } else allRecords

            // Group by user to calculate work hours
            val userProductivity = filteredRecords.groupBy { it.userId }.mapNotNull { (userId, records) ->
                val user = userService.getUserById(userId) ?: return@mapNotNull null

                val dailyRecords = records.groupBy {
                    SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(it.timestamp.toDate())
                }

                val workDays = dailyRecords.map { (date, dayRecords) ->
                    val entry = dayRecords.find { it.type == AttendanceRecord.AttendanceType.ENTRADA }
                    val exit = dayRecords.find { it.type == AttendanceRecord.AttendanceType.SALIDA }

                    val workHours = if (entry != null && exit != null) {
                        val duration = exit.timestamp.toDate().time - entry.timestamp.toDate().time
                        duration / (1000.0 * 60 * 60) // Convert to hours
                    } else 0.0

                    DailyWorkHours(
                        date = date,
                        entryTime = entry?.getFormattedTime(),
                        exitTime = exit?.getFormattedTime(),
                        workHours = workHours,
                        isComplete = entry != null && exit != null
                    )
                }

                val totalWorkHours = workDays.sumOf { it.workHours }
                val completeDays = workDays.count { it.isComplete }
                val averageHoursPerDay = if (completeDays > 0) totalWorkHours / completeDays else 0.0

                UserProductivityStats(
                    userId = userId,
                    userName = user.displayName,
                    userEmail = user.email,
                    totalWorkHours = totalWorkHours,
                    workDays = workDays.size,
                    completeDays = completeDays,
                    averageHoursPerDay = averageHoursPerDay,
                    dailyWorkHours = workDays
                )
            }.sortedByDescending { it.totalWorkHours }

            // Calculate location productivity
            val locationProductivity = filteredRecords.groupBy { it.kioskId }.mapNotNull { (kioskId, records) ->
                val kiosk = kioskService.getKioskById(kioskId) ?: return@mapNotNull null

                val uniqueUsers = records.map { it.userId }.distinct().size
                val totalCheckIns = records.size
                val avgCheckInsPerUser = if (uniqueUsers > 0) totalCheckIns.toDouble() / uniqueUsers else 0.0

                LocationProductivityStats(
                    kioskId = kioskId,
                    kioskName = kiosk.name,
                    totalCheckIns = totalCheckIns,
                    uniqueUsers = uniqueUsers,
                    averageCheckInsPerUser = avgCheckInsPerUser,
                    utilizationRate = calculateLocationUtilization(records)
                )
            }.sortedByDescending { it.totalCheckIns }

            ProductivityReport(
                startDate = startDate,
                endDate = endDate,
                productType = productType,
                userProductivity = userProductivity,
                locationProductivity = locationProductivity,
                totalWorkHours = userProductivity.sumOf { it.totalWorkHours },
                averageWorkHoursPerUser = if (userProductivity.isNotEmpty()) {
                    userProductivity.sumOf { it.totalWorkHours } / userProductivity.size
                } else 0.0,
                generatedAt = Timestamp.now()
            )

        } catch (e: Exception) {
            Log.e(TAG, "Error generating productivity report", e)
            ProductivityReport(
                startDate = startDate,
                endDate = endDate,
                error = "Error generando reporte de productividad: ${e.message}"
            )
        }
    }

    // COMPLIANCE REPORTS
    suspend fun generateComplianceReport(
        startDate: Date,
        endDate: Date
    ): ComplianceReport {
        return try {
            val allUsers = userService.getActiveUsers()
            val allRecords = mutableListOf<AttendanceRecord>()
            val calendar = Calendar.getInstance()

            // Collect attendance records
            calendar.time = startDate
            while (!calendar.time.after(endDate)) {
                val dayRecords = attendanceService.getAllAttendanceForDate(calendar.time)
                allRecords.addAll(dayRecords)
                calendar.add(Calendar.DAY_OF_MONTH, 1)
            }

            // Analyze compliance for each user
            val userCompliance = allUsers.map { user ->
                val userRecords = allRecords.filter { it.userId == user.id }

                // Calculate expected work days
                val expectedDays = calculateExpectedWorkDays(startDate, endDate, user.productTypes.firstOrNull())
                val actualDays = userRecords.map {
                    SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(it.timestamp.toDate())
                }.distinct().size

                // Compliance violations
                val lateArrivals = userRecords.count {
                    it.type == AttendanceRecord.AttendanceType.ENTRADA &&
                    it.punctuality == AttendanceRecord.PunctualityStatus.LATE
                }
                val locationViolations = userRecords.count { !it.isLocationValid }
                val missingPhotos = userRecords.count { it.photoUrl.isNullOrEmpty() }
                val missingExits = calculateMissingExits(userRecords)

                val totalViolations = lateArrivals + locationViolations + missingPhotos + missingExits
                val complianceScore = if (expectedDays > 0) {
                    maxOf(0.0, 100.0 - (totalViolations * 10.0 / expectedDays))
                } else 100.0

                UserComplianceStats(
                    userId = user.id,
                    userName = user.displayName,
                    userEmail = user.email,
                    expectedDays = expectedDays,
                    actualDays = actualDays,
                    attendanceRate = if (expectedDays > 0) (actualDays.toDouble() / expectedDays) * 100 else 0.0,
                    lateArrivals = lateArrivals,
                    locationViolations = locationViolations,
                    missingPhotos = missingPhotos,
                    missingExits = missingExits,
                    complianceScore = complianceScore
                )
            }.sortedBy { it.complianceScore }

            // Overall compliance statistics
            val overallStats = ComplianceOverallStats(
                totalUsers = allUsers.size,
                fullyCompliantUsers = userCompliance.count { it.complianceScore >= 95.0 },
                partiallyCompliantUsers = userCompliance.count { it.complianceScore >= 70.0 && it.complianceScore < 95.0 },
                nonCompliantUsers = userCompliance.count { it.complianceScore < 70.0 },
                averageComplianceScore = userCompliance.map { it.complianceScore }.average(),
                averageAttendanceRate = userCompliance.map { it.attendanceRate }.average()
            )

            ComplianceReport(
                startDate = startDate,
                endDate = endDate,
                overallStats = overallStats,
                userCompliance = userCompliance,
                generatedAt = Timestamp.now()
            )

        } catch (e: Exception) {
            Log.e(TAG, "Error generating compliance report", e)
            ComplianceReport(
                startDate = startDate,
                endDate = endDate,
                error = "Error generando reporte de cumplimiento: ${e.message}"
            )
        }
    }

    // EXPORT FUNCTIONALITY
    suspend fun exportReportToCSV(report: Any, filename: String): Result<String> {
        return try {
            val csvContent = when (report) {
                is AttendanceReport -> convertAttendanceReportToCSV(report)
                is ProductivityReport -> convertProductivityReportToCSV(report)
                is ComplianceReport -> convertComplianceReportToCSV(report)
                else -> return Result.failure(Exception("Tipo de reporte no soportado"))
            }

            // Save to external storage or return as string
            // This would typically involve writing to a file
            Result.success(csvContent)

        } catch (e: Exception) {
            Log.e(TAG, "Error exporting report to CSV", e)
            Result.failure(e)
        }
    }

    // HELPER METHODS
    private fun applyFilters(records: List<AttendanceRecord>, filters: ReportFilters): List<AttendanceRecord> {
        var filtered = records

        if (filters.userIds.isNotEmpty()) {
            filtered = filtered.filter { it.userId in filters.userIds }
        }

        if (filters.productTypes.isNotEmpty()) {
            filtered = filtered.filter { it.productType in filters.productTypes }
        }

        if (filters.kioskIds.isNotEmpty()) {
            filtered = filtered.filter { it.kioskId in filters.kioskIds }
        }

        if (filters.attendanceTypes.isNotEmpty()) {
            filtered = filtered.filter { it.type in filters.attendanceTypes }
        }

        if (filters.onlyIssues) {
            filtered = filtered.filter { !it.isLocationValid || it.photoUrl.isNullOrEmpty() || it.requiresReview }
        }

        return filtered
    }

    private fun calculateAverageCheckInTime(entries: List<AttendanceRecord>): String {
        if (entries.isEmpty()) return "00:00"

        val totalMinutes = entries.map { record ->
            val time = record.getFormattedTime()
            val parts = time.split(":")
            parts[0].toInt() * 60 + parts[1].toInt()
        }.average()

        val hours = (totalMinutes / 60).toInt()
        val minutes = (totalMinutes % 60).toInt()
        return String.format("%02d:%02d", hours, minutes)
    }

    private fun calculateLocationUtilization(records: List<AttendanceRecord>): Double {
        val totalHours = 24.0 // Hours in a day
        val activeHours = records.size * 0.1 // Rough estimate
        return minOf(100.0, (activeHours / totalHours) * 100)
    }

    private suspend fun calculateExpectedWorkDays(startDate: Date, endDate: Date, productType: String?): Int {
        val schedule = if (productType != null) {
            attendanceService.getWorkSchedules().find { it.productType == productType }
        } else null

        val calendar = Calendar.getInstance()
        var expectedDays = 0

        calendar.time = startDate
        while (!calendar.time.after(endDate)) {
            val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)

            if (schedule?.isWorkDay(dayOfWeek) == true) {
                expectedDays++
            } else if (schedule == null) {
                // Default Monday-Friday if no schedule
                if (dayOfWeek in 2..6) expectedDays++
            }

            calendar.add(Calendar.DAY_OF_MONTH, 1)
        }

        return expectedDays
    }

    private fun calculateMissingExits(userRecords: List<AttendanceRecord>): Int {
        val dailyRecords = userRecords.groupBy {
            SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(it.timestamp.toDate())
        }

        return dailyRecords.count { (_, records) ->
            val hasEntry = records.any { it.type == AttendanceRecord.AttendanceType.ENTRADA }
            val hasExit = records.any { it.type == AttendanceRecord.AttendanceType.SALIDA }
            hasEntry && !hasExit
        }
    }

    // CSV CONVERSION METHODS
    private fun convertAttendanceReportToCSV(report: AttendanceReport): String {
        val header = "Usuario,Email,Total Check-ins,A Tiempo,Tarde,Problemas,Días Trabajados,Promedio Check-in\n"
        val rows = report.userStats.joinToString("\n") { stats ->
            "${stats.userName},${stats.userEmail},${stats.totalCheckIns},${stats.onTimeCount},${stats.lateCount},${stats.issuesCount},${stats.workDays},${stats.averageCheckInTime}"
        }
        return header + rows
    }

    private fun convertProductivityReportToCSV(report: ProductivityReport): String {
        val header = "Usuario,Email,Horas Totales,Días Trabajados,Días Completos,Promedio Horas/Día\n"
        val rows = report.userProductivity.joinToString("\n") { stats ->
            "${stats.userName},${stats.userEmail},${"%.2f".format(stats.totalWorkHours)},${stats.workDays},${stats.completeDays},${"%.2f".format(stats.averageHoursPerDay)}"
        }
        return header + rows
    }

    private fun convertComplianceReportToCSV(report: ComplianceReport): String {
        val header = "Usuario,Email,Días Esperados,Días Actuales,% Asistencia,Llegadas Tarde,Violaciones Ubicación,Fotos Faltantes,Salidas Faltantes,Puntuación Cumplimiento\n"
        val rows = report.userCompliance.joinToString("\n") { stats ->
            "${stats.userName},${stats.userEmail},${stats.expectedDays},${stats.actualDays},${"%.1f".format(stats.attendanceRate)},${stats.lateArrivals},${stats.locationViolations},${stats.missingPhotos},${stats.missingExits},${"%.1f".format(stats.complianceScore)}"
        }
        return header + rows
    }

    // DATA CLASSES
    data class ReportFilters(
        val userIds: List<String> = emptyList(),
        val productTypes: List<String> = emptyList(),
        val kioskIds: List<String> = emptyList(),
        val attendanceTypes: List<AttendanceRecord.AttendanceType> = emptyList(),
        val onlyIssues: Boolean = false
    )

    data class AttendanceReport(
        val startDate: Date,
        val endDate: Date,
        val filters: ReportFilters = ReportFilters(),
        val totalRecords: Int = 0,
        val uniqueUsers: Int = 0,
        val punctualityStats: PunctualityStats = PunctualityStats(),
        val issueStats: IssueStats = IssueStats(),
        val dailyStats: List<DailyAttendanceStats> = emptyList(),
        val userStats: List<UserAttendanceStats> = emptyList(),
        val generatedAt: Timestamp = Timestamp.now(),
        val error: String? = null
    )

    data class PunctualityStats(
        val onTimeCount: Int = 0,
        val lateCount: Int = 0,
        val earlyCount: Int = 0
    ) {
        val total = onTimeCount + lateCount + earlyCount
        val punctualityRate = if (total > 0) (onTimeCount.toDouble() / total) * 100 else 0.0
    }

    data class IssueStats(
        val locationIssues: Int = 0,
        val photoMissing: Int = 0
    ) {
        val totalIssues = locationIssues + photoMissing
    }

    data class DailyAttendanceStats(
        val date: String,
        val totalCheckIns: Int,
        val uniqueUsers: Int,
        val onTimeCount: Int,
        val lateCount: Int,
        val issuesCount: Int
    )

    data class UserAttendanceStats(
        val userId: String,
        val userName: String,
        val userEmail: String,
        val totalCheckIns: Int,
        val onTimeCount: Int,
        val lateCount: Int,
        val issuesCount: Int,
        val workDays: Int,
        val averageCheckInTime: String
    ) {
        val punctualityRate = if (totalCheckIns > 0) (onTimeCount.toDouble() / totalCheckIns) * 100 else 0.0
    }

    data class ProductivityReport(
        val startDate: Date,
        val endDate: Date,
        val productType: String? = null,
        val userProductivity: List<UserProductivityStats> = emptyList(),
        val locationProductivity: List<LocationProductivityStats> = emptyList(),
        val totalWorkHours: Double = 0.0,
        val averageWorkHoursPerUser: Double = 0.0,
        val generatedAt: Timestamp = Timestamp.now(),
        val error: String? = null
    )

    data class UserProductivityStats(
        val userId: String,
        val userName: String,
        val userEmail: String,
        val totalWorkHours: Double,
        val workDays: Int,
        val completeDays: Int,
        val averageHoursPerDay: Double,
        val dailyWorkHours: List<DailyWorkHours>
    )

    data class DailyWorkHours(
        val date: String,
        val entryTime: String?,
        val exitTime: String?,
        val workHours: Double,
        val isComplete: Boolean
    )

    data class LocationProductivityStats(
        val kioskId: String,
        val kioskName: String,
        val totalCheckIns: Int,
        val uniqueUsers: Int,
        val averageCheckInsPerUser: Double,
        val utilizationRate: Double
    )

    data class ComplianceReport(
        val startDate: Date,
        val endDate: Date,
        val overallStats: ComplianceOverallStats = ComplianceOverallStats(),
        val userCompliance: List<UserComplianceStats> = emptyList(),
        val generatedAt: Timestamp = Timestamp.now(),
        val error: String? = null
    )

    data class ComplianceOverallStats(
        val totalUsers: Int = 0,
        val fullyCompliantUsers: Int = 0,
        val partiallyCompliantUsers: Int = 0,
        val nonCompliantUsers: Int = 0,
        val averageComplianceScore: Double = 0.0,
        val averageAttendanceRate: Double = 0.0
    )

    data class UserComplianceStats(
        val userId: String,
        val userName: String,
        val userEmail: String,
        val expectedDays: Int,
        val actualDays: Int,
        val attendanceRate: Double,
        val lateArrivals: Int,
        val locationViolations: Int,
        val missingPhotos: Int,
        val missingExits: Int,
        val complianceScore: Double
    )
}