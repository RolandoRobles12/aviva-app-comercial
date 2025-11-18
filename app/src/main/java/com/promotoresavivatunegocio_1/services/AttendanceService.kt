package com.promotoresavivatunegocio_1.services

import android.content.Context
import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.GeoPoint
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.tasks.await
import models.*
import java.text.SimpleDateFormat
import java.util.*

class AttendanceService(private val context: Context? = null) {
    private val db = FirebaseFirestore.getInstance()
    private val storage = FirebaseStorage.getInstance()
    private val attendanceCollection = db.collection("checkins")
    private val schedulesCollection = db.collection("schedules")
    private val timeOffCollection = db.collection("time_off_requests")
    private val statsCollection = db.collection("attendanceStats")
    private val kiosksCollection = db.collection("kiosks")
    private val usersCollection = db.collection("users")
    private val holidaysCollection = db.collection("holidays")
    private val configCollection = db.collection("system_config")

    // Services
    private val kioskService = KioskService()
    private val userService = UserService()

    companion object {
        private const val TAG = "AttendanceService"
    }

    // ENHANCED ATTENDANCE RECORDS - Matching Web App
    suspend fun recordAttendance(
        userId: String,
        type: AttendanceRecord.AttendanceType,
        kioskId: String,
        productType: String,
        location: GeoPoint?,
        photoUrl: String? = null,
        notes: String = "",
        deviceInfo: String? = null,
        appVersion: String? = null
    ): Result<String> {
        return try {
            // 1. Validate user
            val user = userService.getUserById(userId)
                ?: return Result.failure(Exception("Usuario no encontrado"))

            if (!user.isActive || user.status != User.UserStatus.ACTIVE) {
                return Result.failure(Exception("Usuario no está activo"))
            }

            // 2. Validate kiosk
            val kiosk = kioskService.getKioskById(kioskId)
                ?: return Result.failure(Exception("Kiosco no encontrado"))

            if (!kiosk.isActive) {
                return Result.failure(Exception("Kiosco no está activo"))
            }

            // 3. Validate product type access
            if (user.productTypes.isNotEmpty() && !user.productTypes.contains(productType)) {
                return Result.failure(Exception("No tiene acceso a este tipo de producto"))
            }

            // 4. Validate kiosk access
            if (user.kiosks.isNotEmpty() && !user.kiosks.contains(kioskId)) {
                return Result.failure(Exception("No tiene acceso a este kiosco"))
            }

            // 5. Validate location if required
            val locationValidation = if (location != null) {
                kioskService.validateUserLocation(location, kioskId)
            } else {
                KioskService.LocationValidationResult(false, "Ubicación no proporcionada", null)
            }

            // 6. Get work schedule for punctuality calculation
            val schedule = getScheduleForProductType(productType)
            val punctuality = calculatePunctuality(type, Timestamp.now(), schedule)

            // 7. Check for conflicts (e.g., already checked in)
            val conflictCheck = checkForAttendanceConflicts(userId, type)
            if (!conflictCheck.isSuccess) {
                return conflictCheck
            }

            // 8. Create attendance record
            val sessionId = generateSessionId()
            val record = AttendanceRecord(
                userId = userId,
                userName = user.displayName,
                userEmail = user.email,
                type = type,
                timestamp = Timestamp.now(),
                location = location?.let { loc ->
                    com.promotoresavivatunegocio_1.models.LocationData(
                        userId = userId,
                        latitude = loc.latitude,
                        longitude = loc.longitude,
                        accuracy = locationValidation.distance?.toFloat() ?: 0f,
                        timestamp = Timestamp.now(),
                        userEmail = user.email
                    )
                },
                kioskId = kioskId,
                kioskName = kiosk.name,
                productType = productType,
                photoUrl = photoUrl,
                notes = notes,
                punctuality = punctuality,
                isLocationValid = locationValidation.isValid,
                locationValidationMessage = if (!locationValidation.isValid) locationValidation.message else null,
                locationAccuracy = locationValidation.distance?.toFloat(),
                deviceInfo = deviceInfo,
                appVersion = appVersion,
                sessionId = sessionId,
                state = kiosk.state,
                city = kiosk.city
            )

            // 9. Save to Firestore
            val docRef = attendanceCollection.add(record).await()
            record.id = docRef.id
            attendanceCollection.document(docRef.id).set(record).await()

            // 10. Update kiosk statistics
            updateKioskStats(kioskId)

            Log.d(TAG, "Asistencia registrada exitosamente: ${user.email} - ${type.name}")
            Result.success(docRef.id)

        } catch (e: Exception) {
            Log.e(TAG, "Error recording attendance", e)
            Result.failure(e)
        }
    }

    suspend fun getTodayAttendanceForUser(userId: String): List<AttendanceRecord> {
        return try {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val startOfDay = Timestamp(Date().apply {
                hours = 0
                minutes = 0
                seconds = 0
            })
            val endOfDay = Timestamp(Date().apply {
                hours = 23
                minutes = 59
                seconds = 59
            })

            val snapshot = attendanceCollection
                .whereEqualTo("userId", userId)
                .whereGreaterThanOrEqualTo("timestamp", startOfDay)
                .whereLessThanOrEqualTo("timestamp", endOfDay)
                .orderBy("timestamp", Query.Direction.ASCENDING)
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(AttendanceRecord::class.java)?.apply {
                    id = doc.id
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting today's attendance", e)
            emptyList()
        }
    }

    suspend fun getAttendanceForUser(userId: String, startDate: Date, endDate: Date): List<AttendanceRecord> {
        return try {
            val snapshot = attendanceCollection
                .whereEqualTo("userId", userId)
                .whereGreaterThanOrEqualTo("timestamp", Timestamp(startDate))
                .whereLessThanOrEqualTo("timestamp", Timestamp(endDate))
                .orderBy("timestamp", Query.Direction.DESCENDING)
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(AttendanceRecord::class.java)?.apply {
                    id = doc.id
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting attendance history", e)
            emptyList()
        }
    }

    suspend fun getAllAttendanceForDate(date: Date): List<AttendanceRecord> {
        return try {
            val startOfDay = Calendar.getInstance().apply {
                time = date
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
            }.time

            val endOfDay = Calendar.getInstance().apply {
                time = date
                set(Calendar.HOUR_OF_DAY, 23)
                set(Calendar.MINUTE, 59)
                set(Calendar.SECOND, 59)
            }.time

            val snapshot = attendanceCollection
                .whereGreaterThanOrEqualTo("timestamp", Timestamp(startOfDay))
                .whereLessThanOrEqualTo("timestamp", Timestamp(endOfDay))
                .orderBy("timestamp", Query.Direction.ASCENDING)
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(AttendanceRecord::class.java)?.apply {
                    id = doc.id
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting all attendance for date", e)
            emptyList()
        }
    }

    // WORK SCHEDULES
    suspend fun createWorkSchedule(schedule: WorkSchedule): Result<String> {
        return try {
            val docRef = schedulesCollection.add(schedule).await()
            schedule.id = docRef.id
            schedulesCollection.document(docRef.id).set(schedule).await()
            Result.success(docRef.id)
        } catch (e: Exception) {
            Log.e(TAG, "Error creating work schedule", e)
            Result.failure(e)
        }
    }

    suspend fun getWorkSchedules(): List<WorkSchedule> {
        return try {
            val snapshot = schedulesCollection
                .whereEqualTo("isActive", true)
                .orderBy("name")
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(WorkSchedule::class.java)?.apply {
                    id = doc.id
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting work schedules", e)
            emptyList()
        }
    }

    suspend fun updateWorkSchedule(schedule: WorkSchedule): Result<Boolean> {
        return try {
            schedule.updatedAt = Timestamp.now()
            schedulesCollection.document(schedule.id).set(schedule).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error updating work schedule", e)
            Result.failure(e)
        }
    }

    // TIME OFF REQUESTS
    suspend fun createTimeOffRequest(request: TimeOffRequest): Result<String> {
        return try {
            val docRef = timeOffCollection.add(request).await()
            request.id = docRef.id
            timeOffCollection.document(docRef.id).set(request).await()
            Result.success(docRef.id)
        } catch (e: Exception) {
            Log.e(TAG, "Error creating time off request", e)
            Result.failure(e)
        }
    }

    suspend fun getTimeOffRequestsForUser(userId: String): List<TimeOffRequest> {
        return try {
            val snapshot = timeOffCollection
                .whereEqualTo("userId", userId)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(TimeOffRequest::class.java)?.apply {
                    id = doc.id
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting time off requests", e)
            emptyList()
        }
    }

    suspend fun getPendingTimeOffRequests(): List<TimeOffRequest> {
        return try {
            val snapshot = timeOffCollection
                .whereEqualTo("status", TimeOffRequest.RequestStatus.PENDING)
                .orderBy("createdAt", Query.Direction.ASCENDING)
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(TimeOffRequest::class.java)?.apply {
                    id = doc.id
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting pending time off requests", e)
            emptyList()
        }
    }

    suspend fun reviewTimeOffRequest(
        requestId: String,
        status: TimeOffRequest.RequestStatus,
        reviewedBy: String,
        reviewNotes: String
    ): Result<Boolean> {
        return try {
            val updates = mapOf(
                "status" to status,
                "reviewedBy" to reviewedBy,
                "reviewedAt" to Timestamp.now(),
                "reviewNotes" to reviewNotes
            )
            timeOffCollection.document(requestId).update(updates).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error reviewing time off request", e)
            Result.failure(e)
        }
    }

    // ATTENDANCE STATISTICS
    suspend fun calculateDailyStats(date: Date): AttendanceStats {
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(date)
        val allAttendance = getAllAttendanceForDate(date)

        // Group by user to get unique users
        val userAttendance = allAttendance.groupBy { it.userId }

        val stats = AttendanceStats(date = dateStr)

        // For now, assume all users who checked in were expected
        stats.totalExpected = userAttendance.size
        stats.totalPresent = userAttendance.size
        stats.totalAbsent = 0 // This would need user schedule data to calculate properly

        // Count late arrivals (simplified logic)
        val schedules = getWorkSchedules()
        val defaultSchedule = schedules.firstOrNull() // Simplified - in reality, each user would have their schedule

        if (defaultSchedule != null) {
            userAttendance.forEach { (_, records) ->
                val checkIn = records.firstOrNull { it.type == AttendanceRecord.AttendanceType.ENTRADA }
                if (checkIn != null) {
                    // Simple late check - compare with schedule entry time
                    val checkInTime = SimpleDateFormat("HH:mm", Locale.getDefault()).format(checkIn.timestamp.toDate())
                    if (checkInTime > defaultSchedule.entryTime) {
                        stats.totalLate++
                    } else {
                        stats.totalOnTime++
                    }
                }
            }
        }

        stats.calculateRates()
        return stats
    }

    suspend fun saveDailyStats(stats: AttendanceStats): Result<Boolean> {
        return try {
            val docId = "stats_${stats.date}"
            statsCollection.document(docId).set(stats).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error saving daily stats", e)
            Result.failure(e)
        }
    }

    suspend fun getDailyStats(date: Date): AttendanceStats? {
        return try {
            val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(date)
            val docId = "stats_$dateStr"
            val snapshot = statsCollection.document(docId).get().await()
            snapshot.toObject(AttendanceStats::class.java)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting daily stats", e)
            null
        }
    }

    // HELPER METHODS FOR ENHANCED FUNCTIONALITY

    private suspend fun getScheduleForProductType(productType: String): WorkSchedule? {
        return try {
            val snapshot = schedulesCollection
                .whereEqualTo("productType", productType)
                .whereEqualTo("isActive", true)
                .limit(1)
                .get()
                .await()

            if (!snapshot.isEmpty) {
                snapshot.documents.first().toObject(WorkSchedule::class.java)
            } else {
                // Return default schedule if none found
                WorkSchedule.getDefaultScheduleForProductType(productType)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting schedule for product type", e)
            WorkSchedule.getDefaultScheduleForProductType(productType)
        }
    }

    private fun calculatePunctuality(
        type: AttendanceRecord.AttendanceType,
        timestamp: Timestamp,
        schedule: WorkSchedule?
    ): AttendanceRecord.PunctualityStatus {
        if (schedule == null) return AttendanceRecord.PunctualityStatus.UNKNOWN

        val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        val checkTime = timeFormat.format(timestamp.toDate())

        return when (type) {
            AttendanceRecord.AttendanceType.ENTRADA -> {
                if (schedule.isLateEntry(checkTime)) {
                    AttendanceRecord.PunctualityStatus.LATE
                } else {
                    // Check if it's too early (more than tolerance before expected time)
                    val expectedMinutes = timeStringToMinutes(schedule.entryTime)
                    val actualMinutes = timeStringToMinutes(checkTime)
                    if (actualMinutes < (expectedMinutes - schedule.toleranceMinutes)) {
                        AttendanceRecord.PunctualityStatus.EARLY
                    } else {
                        AttendanceRecord.PunctualityStatus.ON_TIME
                    }
                }
            }
            AttendanceRecord.AttendanceType.SALIDA -> {
                if (schedule.isEarlyExit(checkTime)) {
                    AttendanceRecord.PunctualityStatus.EARLY
                } else {
                    AttendanceRecord.PunctualityStatus.ON_TIME
                }
            }
            AttendanceRecord.AttendanceType.COMIDA -> {
                AttendanceRecord.PunctualityStatus.ON_TIME // Lunch breaks are generally flexible
            }
        }
    }

    private fun timeStringToMinutes(timeString: String): Int {
        val parts = timeString.split(":")
        return parts[0].toInt() * 60 + parts[1].toInt()
    }

    private suspend fun checkForAttendanceConflicts(
        userId: String,
        type: AttendanceRecord.AttendanceType
    ): Result<String> {
        return try {
            val todayRecords = getTodayAttendanceForUser(userId)

            when (type) {
                AttendanceRecord.AttendanceType.ENTRADA -> {
                    val hasEntry = todayRecords.any { it.type == AttendanceRecord.AttendanceType.ENTRADA }
                    if (hasEntry) {
                        return Result.failure(Exception("Ya tiene una entrada registrada hoy"))
                    }
                }
                AttendanceRecord.AttendanceType.SALIDA -> {
                    val hasEntry = todayRecords.any { it.type == AttendanceRecord.AttendanceType.ENTRADA }
                    val hasExit = todayRecords.any { it.type == AttendanceRecord.AttendanceType.SALIDA }

                    if (!hasEntry) {
                        return Result.failure(Exception("Debe registrar entrada antes de la salida"))
                    }
                    if (hasExit) {
                        return Result.failure(Exception("Ya tiene una salida registrada hoy"))
                    }
                }
                AttendanceRecord.AttendanceType.COMIDA -> {
                    val hasEntry = todayRecords.any { it.type == AttendanceRecord.AttendanceType.ENTRADA }
                    if (!hasEntry) {
                        return Result.failure(Exception("Debe registrar entrada antes del break de comida"))
                    }
                }
            }

            Result.success("OK")
        } catch (e: Exception) {
            Log.e(TAG, "Error checking attendance conflicts", e)
            Result.failure(e)
        }
    }

    private fun generateSessionId(): String {
        return "${System.currentTimeMillis()}_${(Math.random() * 1000).toInt()}"
    }

    private suspend fun updateKioskStats(kioskId: String) {
        try {
            val updates = mapOf(
                "lastActivityDate" to Timestamp.now(),
                "totalCheckIns" to com.google.firebase.firestore.FieldValue.increment(1)
            )
            kiosksCollection.document(kioskId).update(updates).await()
        } catch (e: Exception) {
            Log.e(TAG, "Error updating kiosk stats", e)
        }
    }

    // ABSENCE DETECTION (Automated Monitoring)
    suspend fun detectAbsences(date: Date): List<AbsenceReport> {
        return try {
            val activeUsers = userService.getActiveUsers()
            val attendanceRecords = getAllAttendanceForDate(date)
            val userAttendance = attendanceRecords.groupBy { it.userId }

            val absences = mutableListOf<AbsenceReport>()

            activeUsers.forEach { user ->
                val userRecords = userAttendance[user.id] ?: emptyList()
                val hasEntry = userRecords.any { it.type == AttendanceRecord.AttendanceType.ENTRADA }

                if (!hasEntry) {
                    // Check if user should be working today
                    val schedule = getScheduleForProductType(user.productTypes.firstOrNull() ?: "")
                    if (schedule?.isWorkDay(date) == true) {
                        absences.add(
                            AbsenceReport(
                                userId = user.id,
                                userName = user.displayName,
                                userEmail = user.email,
                                date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(date),
                                type = AbsenceType.NO_ENTRY,
                                message = "No se registró entrada"
                            )
                        )
                    }
                } else {
                    // Check for missing exit
                    val hasExit = userRecords.any { it.type == AttendanceRecord.AttendanceType.SALIDA }
                    if (!hasExit && isEndOfWorkDay()) {
                        absences.add(
                            AbsenceReport(
                                userId = user.id,
                                userName = user.displayName,
                                userEmail = user.email,
                                date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(date),
                                type = AbsenceType.NO_EXIT,
                                message = "No se registró salida"
                            )
                        )
                    }
                }
            }

            absences
        } catch (e: Exception) {
            Log.e(TAG, "Error detecting absences", e)
            emptyList()
        }
    }

    private fun isEndOfWorkDay(): Boolean {
        val currentHour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return currentHour >= 18 // After 6 PM
    }

    // ADMIN FUNCTIONS
    suspend fun getRecentCheckIns(limit: Int = 10): List<AttendanceRecord> {
        return try {
            val snapshot = attendanceCollection
                .orderBy("timestamp", Query.Direction.DESCENDING)
                .limit(limit.toLong())
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(AttendanceRecord::class.java)?.copy(id = doc.id)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting recent check-ins", e)
            emptyList()
        }
    }

    suspend fun getAttendanceIssues(): List<AttendanceIssue> {
        return try {
            val today = Date()
            val allRecords = getAllAttendanceForDate(today)
            val issues = mutableListOf<AttendanceIssue>()

            // Find late entries
            allRecords.filter {
                it.punctuality == AttendanceRecord.PunctualityStatus.LATE &&
                it.type == AttendanceRecord.AttendanceType.ENTRADA
            }.forEach { record ->
                issues.add(
                    AttendanceIssue(
                        id = record.id,
                        userId = record.userId,
                        userName = record.userName,
                        type = AttendanceIssueType.LATE_ENTRY,
                        message = "Llegada tarde: ${record.getFormattedTime()}",
                        timestamp = record.timestamp,
                        severity = IssueSeverity.MEDIUM
                    )
                )
            }

            // Find location validation issues
            allRecords.filter { !it.isLocationValid }.forEach { record ->
                issues.add(
                    AttendanceIssue(
                        id = record.id,
                        userId = record.userId,
                        userName = record.userName,
                        type = AttendanceIssueType.INVALID_LOCATION,
                        message = record.locationValidationMessage ?: "Ubicación no válida",
                        timestamp = record.timestamp,
                        severity = IssueSeverity.HIGH
                    )
                )
            }

            issues.sortedByDescending { it.timestamp.toDate() }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting attendance issues", e)
            emptyList()
        }
    }

    // DATA CLASSES FOR MONITORING
    data class AbsenceReport(
        val userId: String,
        val userName: String,
        val userEmail: String,
        val date: String,
        val type: AbsenceType,
        val message: String
    )

    enum class AbsenceType {
        NO_ENTRY,
        NO_EXIT,
        EXTENDED_LUNCH
    }

    data class AttendanceIssue(
        val id: String,
        val userId: String,
        val userName: String,
        val type: AttendanceIssueType,
        val message: String,
        val timestamp: Timestamp,
        val severity: IssueSeverity
    )

    enum class AttendanceIssueType {
        LATE_ENTRY,
        EARLY_EXIT,
        INVALID_LOCATION,
        MISSING_PHOTO,
        EXTENDED_LUNCH
    }

    enum class IssueSeverity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    // LEGACY SUPPORT - Maintain compatibility with existing code
    suspend fun recordAttendance(record: AttendanceRecord): Result<String> {
        return recordAttendance(
            userId = record.userId,
            type = record.type,
            kioskId = record.kioskId.ifEmpty { record.kiosk },
            productType = record.productType.ifEmpty { record.product },
            location = record.location?.let { loc ->
                if (loc.latitude != null && loc.longitude != null) {
                    GeoPoint(loc.latitude, loc.longitude)
                } else null
            },
            photoUrl = record.photoUrl,
            notes = record.notes
        )
    }
}