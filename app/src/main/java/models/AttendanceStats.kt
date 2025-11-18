package models

import com.google.firebase.Timestamp

data class AttendanceStats(
    var date: String = "", // yyyy-MM-dd format
    var totalExpected: Int = 0,
    var totalPresent: Int = 0,
    var totalAbsent: Int = 0,
    var totalLate: Int = 0,
    var totalOnTime: Int = 0,
    var attendanceRate: Double = 0.0,
    var punctualityRate: Double = 0.0,
    var lastUpdated: Timestamp = Timestamp.now()
) {
    fun calculateRates() {
        attendanceRate = if (totalExpected > 0) {
            (totalPresent.toDouble() / totalExpected.toDouble()) * 100
        } else {
            0.0
        }

        punctualityRate = if (totalPresent > 0) {
            (totalOnTime.toDouble() / totalPresent.toDouble()) * 100
        } else {
            0.0
        }
    }

    fun getAttendanceRateFormatted(): String {
        return String.format("%.1f%%", attendanceRate)
    }

    fun getPunctualityRateFormatted(): String {
        return String.format("%.1f%%", punctualityRate)
    }
}

data class UserAttendanceStats(
    var userId: String = "",
    var userName: String = "",
    var totalWorkDays: Int = 0,
    var daysPresent: Int = 0,
    var daysAbsent: Int = 0,
    var totalLateArrivals: Int = 0,
    var totalEarlyDepartures: Int = 0,
    var averageWorkHours: Double = 0.0,
    var attendanceRate: Double = 0.0,
    var punctualityRate: Double = 0.0,
    var periodStart: Timestamp = Timestamp.now(),
    var periodEnd: Timestamp = Timestamp.now()
) {
    fun calculateRates() {
        attendanceRate = if (totalWorkDays > 0) {
            (daysPresent.toDouble() / totalWorkDays.toDouble()) * 100
        } else {
            0.0
        }

        punctualityRate = if (daysPresent > 0) {
            ((daysPresent - totalLateArrivals).toDouble() / daysPresent.toDouble()) * 100
        } else {
            0.0
        }
    }
}