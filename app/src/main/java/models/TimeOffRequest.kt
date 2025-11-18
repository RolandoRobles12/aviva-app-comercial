package models

import com.google.firebase.Timestamp

data class TimeOffRequest(
    var id: String = "",
    var userId: String = "",
    var userName: String = "",
    var userEmail: String = "",
    var type: TimeOffType = TimeOffType.VACATION,
    var startDate: Timestamp = Timestamp.now(),
    var endDate: Timestamp = Timestamp.now(),
    var reason: String = "",
    var status: RequestStatus = RequestStatus.PENDING,
    var reviewedBy: String? = null,
    var reviewedAt: Timestamp? = null,
    var reviewNotes: String = "",
    var createdAt: Timestamp = Timestamp.now(),
    var totalDays: Int = 1,
    var attachmentUrl: String? = null
) {
    enum class TimeOffType {
        VACATION,
        SICK_LEAVE,
        PERSONAL,
        MATERNITY,
        PATERNITY,
        EMERGENCY,
        TRAINING,
        OTHER
    }

    enum class RequestStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CANCELLED
    }

    fun getTypeDisplayName(): String {
        return when (type) {
            TimeOffType.VACATION -> "Vacaciones"
            TimeOffType.SICK_LEAVE -> "Incapacidad"
            TimeOffType.PERSONAL -> "Permiso Personal"
            TimeOffType.MATERNITY -> "Maternidad"
            TimeOffType.PATERNITY -> "Paternidad"
            TimeOffType.EMERGENCY -> "Emergencia"
            TimeOffType.TRAINING -> "Capacitación"
            TimeOffType.OTHER -> "Otro"
        }
    }

    fun getStatusDisplayName(): String {
        return when (status) {
            RequestStatus.PENDING -> "Pendiente"
            RequestStatus.APPROVED -> "Aprobado"
            RequestStatus.REJECTED -> "Rechazado"
            RequestStatus.CANCELLED -> "Cancelado"
        }
    }

    fun getStatusColor(): String {
        return when (status) {
            RequestStatus.PENDING -> "#F59E0B"
            RequestStatus.APPROVED -> "#10B981"
            RequestStatus.REJECTED -> "#EF4444"
            RequestStatus.CANCELLED -> "#6B7280"
        }
    }

    fun getFormattedDateRange(): String {
        val format = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault())
        val start = format.format(startDate.toDate())
        val end = format.format(endDate.toDate())
        return if (start == end) start else "$start - $end"
    }
}