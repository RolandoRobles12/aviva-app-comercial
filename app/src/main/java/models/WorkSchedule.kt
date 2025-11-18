package models

import com.google.firebase.Timestamp
import java.util.Calendar
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.Date

data class WorkSchedule(
    var id: String = "",
    var name: String = "",
    var description: String = "",
    var productType: String = "", // "bodega_aurrera", "aviva_contigo", "construrama"
    var workDays: List<Int> = listOf(), // 1=Sunday, 2=Monday, etc.
    var entryTime: String = "08:00", // HH:mm format
    var exitTime: String = "17:00", // HH:mm format
    var lunchDuration: Int = 60, // minutes
    var lunchStartTime: String = "12:00",
    var toleranceMinutes: Int = 15,
    var workOnHolidays: Boolean = false,
    var isActive: Boolean = true,
    var createdAt: Timestamp = Timestamp.now(),
    var updatedAt: Timestamp = Timestamp.now(),
    var createdBy: String = "",

    // Enhanced schedule configuration
    var allowFlexibleLunch: Boolean = false,
    var maxLunchDuration: Int = 120, // minutes
    var minWorkHours: Int = 8, // minimum hours per day
    var overtimeThreshold: Int = 480, // minutes (8 hours)
    var allowEarlyCheckout: Boolean = false,
    var earlyCheckoutTime: String? = null,

    // Holiday and special day handling
    var holidayWork: Boolean = false,
    var holidaySchedule: HolidaySchedule? = null,
    var specialDays: List<SpecialDay> = emptyList(),

    // Validation and compliance
    var requirePhoto: Boolean = true,
    var requireLocation: Boolean = true,
    var allowedLocations: List<String> = emptyList(), // Kiosk IDs
    var maxLocationRadius: Int = 100, // meters

    // Notifications and alerts
    var lateThresholdMinutes: Int = 30,
    var sendLateAlerts: Boolean = true,
    var sendMissedCheckAlerts: Boolean = true,

    // Statistics
    var totalUsersAssigned: Int = 0,
    var averageComplianceRate: Double = 0.0
) {
    data class HolidaySchedule(
        var entryTime: String = "09:00",
        var exitTime: String = "15:00",
        var lunchDuration: Int = 30,
        var toleranceMinutes: Int = 30
    )

    data class SpecialDay(
        var date: String = "", // yyyy-MM-dd
        var name: String = "",
        var isWorkDay: Boolean = false,
        var customSchedule: HolidaySchedule? = null
    )

    enum class ScheduleType {
        STANDARD,      // Mon-Fri
        EXTENDED,      // Mon-Sat
        FULL_WEEK,     // All days
        CUSTOM         // Custom days
    }

    fun isWorkDay(dayOfWeek: Int): Boolean {
        return workDays.contains(dayOfWeek)
    }

    fun isWorkDay(calendar: Calendar): Boolean {
        return isWorkDay(calendar.get(Calendar.DAY_OF_WEEK))
    }

    fun isWorkDay(date: Date): Boolean {
        val calendar = Calendar.getInstance()
        calendar.time = date
        return isWorkDay(calendar)
    }

    fun getWorkDaysString(): String {
        val dayNames = listOf("", "Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb")
        return workDays.mapNotNull { dayNames.getOrNull(it) }.joinToString(", ")
    }

    fun getFormattedSchedule(): String {
        return "$entryTime - $exitTime"
    }

    fun getLunchTimeRange(): String {
        val endTime = calculateEndTime(lunchStartTime, lunchDuration)
        return "$lunchStartTime - $endTime"
    }

    fun getProductTypeDisplayName(): String {
        return when (productType) {
            "bodega_aurrera" -> "Bodega Aurrera"
            "aviva_contigo" -> "Aviva Contigo"
            "construrama" -> "Construrama"
            else -> productType
        }
    }

    fun getScheduleType(): ScheduleType {
        return when {
            workDays.sorted() == listOf(2, 3, 4, 5, 6) -> ScheduleType.STANDARD // Mon-Fri
            workDays.sorted() == listOf(2, 3, 4, 5, 6, 7) -> ScheduleType.EXTENDED // Mon-Sat
            workDays.size == 7 -> ScheduleType.FULL_WEEK
            else -> ScheduleType.CUSTOM
        }
    }

    fun calculateExpectedWorkMinutes(): Int {
        val entryMinutes = timeStringToMinutes(entryTime)
        val exitMinutes = timeStringToMinutes(exitTime)
        val workMinutes = exitMinutes - entryMinutes
        return if (workMinutes > lunchDuration) workMinutes - lunchDuration else workMinutes
    }

    fun isLateEntry(checkInTime: String): Boolean {
        val checkInMinutes = timeStringToMinutes(checkInTime)
        val expectedMinutes = timeStringToMinutes(entryTime)
        return checkInMinutes > (expectedMinutes + toleranceMinutes)
    }

    fun isEarlyExit(checkOutTime: String): Boolean {
        val checkOutMinutes = timeStringToMinutes(checkOutTime)
        val expectedMinutes = timeStringToMinutes(exitTime)
        return checkOutMinutes < (expectedMinutes - toleranceMinutes)
    }

    fun isValidLunchDuration(lunchStartTime: String, lunchEndTime: String): Boolean {
        val startMinutes = timeStringToMinutes(lunchStartTime)
        val endMinutes = timeStringToMinutes(lunchEndTime)
        val actualDuration = endMinutes - startMinutes

        return if (allowFlexibleLunch) {
            actualDuration <= maxLunchDuration
        } else {
            actualDuration <= (lunchDuration + toleranceMinutes)
        }
    }

    fun getComplianceStatus(checkInTime: String?, checkOutTime: String?): ComplianceStatus {
        if (checkInTime == null) return ComplianceStatus.MISSING_ENTRY
        if (checkOutTime == null) return ComplianceStatus.MISSING_EXIT

        val isLate = isLateEntry(checkInTime)
        val isEarly = isEarlyExit(checkOutTime)

        return when {
            isLate && isEarly -> ComplianceStatus.LATE_AND_EARLY_EXIT
            isLate -> ComplianceStatus.LATE_ENTRY
            isEarly -> ComplianceStatus.EARLY_EXIT
            else -> ComplianceStatus.COMPLIANT
        }
    }

    enum class ComplianceStatus {
        COMPLIANT,
        LATE_ENTRY,
        EARLY_EXIT,
        LATE_AND_EARLY_EXIT,
        MISSING_ENTRY,
        MISSING_EXIT,
        OVERTIME,
        INSUFFICIENT_HOURS
    }

    private fun timeStringToMinutes(timeString: String): Int {
        val parts = timeString.split(":")
        return parts[0].toInt() * 60 + parts[1].toInt()
    }

    private fun calculateEndTime(startTime: String, durationMinutes: Int): String {
        val parts = startTime.split(":")
        val hour = parts[0].toInt()
        val minute = parts[1].toInt()

        val totalMinutes = hour * 60 + minute + durationMinutes
        val endHour = (totalMinutes / 60) % 24
        val endMinute = totalMinutes % 60

        return String.format("%02d:%02d", endHour, endMinute)
    }

    fun isSpecialDay(date: Date): Boolean {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val dateString = dateFormat.format(date)
        return specialDays.any { it.date == dateString }
    }

    fun getSpecialDaySchedule(date: Date): HolidaySchedule? {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val dateString = dateFormat.format(date)
        return specialDays.find { it.date == dateString }?.customSchedule
    }

    companion object {
        // Default schedules for different product types
        fun getDefaultScheduleForProductType(productType: String): WorkSchedule {
            return when (productType) {
                "bodega_aurrera" -> WorkSchedule(
                    name = "Horario Bodega Aurrera",
                    productType = productType,
                    workDays = listOf(2, 3, 4, 5, 6, 7), // Mon-Sat
                    entryTime = "08:00",
                    exitTime = "17:00",
                    lunchDuration = 60,
                    toleranceMinutes = 15
                )
                "aviva_contigo" -> WorkSchedule(
                    name = "Horario Aviva Contigo",
                    productType = productType,
                    workDays = listOf(2, 3, 4, 5, 6), // Mon-Fri
                    entryTime = "09:00",
                    exitTime = "18:00",
                    lunchDuration = 60,
                    toleranceMinutes = 15
                )
                "construrama" -> WorkSchedule(
                    name = "Horario Construrama",
                    productType = productType,
                    workDays = listOf(2, 3, 4, 5, 6, 7), // Mon-Sat
                    entryTime = "07:00",
                    exitTime = "16:00",
                    lunchDuration = 45,
                    toleranceMinutes = 10
                )
                else -> WorkSchedule(
                    name = "Horario Estándar",
                    productType = productType,
                    workDays = listOf(2, 3, 4, 5, 6), // Mon-Fri
                    entryTime = "08:00",
                    exitTime = "17:00",
                    lunchDuration = 60,
                    toleranceMinutes = 15
                )
            }
        }
    }
}