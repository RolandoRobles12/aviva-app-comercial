package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint
import com.promotoresavivatunegocio_1.models.LocationData
import java.util.Date
import java.text.SimpleDateFormat
import java.util.Locale

data class AttendanceRecord(
    var id: String = "",
    var userId: String = "",
    var userName: String = "",
    var userEmail: String = "",
    var type: AttendanceType = AttendanceType.ENTRADA,
    var timestamp: Timestamp = Timestamp.now(),
    var location: LocationData? = null,
    var kioskId: String = "",
    var kioskName: String = "",
    var productType: String = "",
    var photoUrl: String? = null,
    var notes: String = "",
    var isManual: Boolean = false,
    var approvedBy: String? = null,
    var status: AttendanceStatus = AttendanceStatus.RECORDED,
    var state: String = "",
    var city: String = "",

    // Enhanced tracking fields
    var punctuality: PunctualityStatus = PunctualityStatus.ON_TIME,
    var locationAccuracy: Float? = null,
    var deviceInfo: String? = null,
    var appVersion: String? = null,
    var sessionId: String? = null,

    // Validation and compliance
    var isLocationValid: Boolean = true,
    var locationValidationMessage: String? = null,
    var requiresReview: Boolean = false,
    var reviewReason: String? = null,

    // Metadata
    var createdAt: Timestamp = Timestamp.now(),
    var updatedAt: Timestamp = Timestamp.now(),
    var syncStatus: SyncStatus = SyncStatus.SYNCED,

    // Deprecated fields for compatibility
    @Deprecated("Use kioskId instead")
    var kiosk: String = "",
    @Deprecated("Use kioskName instead")
    var kioskLocation: String = "",
    @Deprecated("Use productType instead")
    var product: String = ""
) {
    enum class AttendanceType {
        ENTRADA,    // Entry
        COMIDA,     // Lunch break
        SALIDA      // Exit
    }

    enum class AttendanceStatus {
        RECORDED,
        PENDING_APPROVAL,
        APPROVED,
        REJECTED,
        FLAGGED,
        AUTO_CLOSED
    }

    enum class PunctualityStatus {
        ON_TIME,
        LATE,
        EARLY,
        UNKNOWN
    }

    enum class SyncStatus {
        SYNCED,
        PENDING_SYNC,
        SYNC_FAILED,
        OFFLINE
    }

    // Business logic methods
    fun getFormattedTime(): String {
        val date = timestamp.toDate()
        val format = SimpleDateFormat("HH:mm", Locale.getDefault())
        return format.format(date)
    }

    fun getFormattedDate(): String {
        val date = timestamp.toDate()
        val format = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
        return format.format(date)
    }

    fun getFormattedDateTime(): String {
        val date = timestamp.toDate()
        val format = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
        return format.format(date)
    }

    fun getTypeDisplayName(): String {
        return when (type) {
            AttendanceType.ENTRADA -> "Entrada"
            AttendanceType.COMIDA -> "Comida"
            AttendanceType.SALIDA -> "Salida"
        }
    }

    fun getStatusDisplayName(): String {
        return when (status) {
            AttendanceStatus.RECORDED -> "Registrado"
            AttendanceStatus.PENDING_APPROVAL -> "Pendiente de Aprobación"
            AttendanceStatus.APPROVED -> "Aprobado"
            AttendanceStatus.REJECTED -> "Rechazado"
            AttendanceStatus.FLAGGED -> "Marcado"
            AttendanceStatus.AUTO_CLOSED -> "Cerrado Automáticamente"
        }
    }

    fun getPunctualityDisplayName(): String {
        return when (punctuality) {
            PunctualityStatus.ON_TIME -> "A Tiempo"
            PunctualityStatus.LATE -> "Tarde"
            PunctualityStatus.EARLY -> "Temprano"
            PunctualityStatus.UNKNOWN -> "No Determinado"
        }
    }

    fun getPunctualityColor(): String {
        return when (punctuality) {
            PunctualityStatus.ON_TIME -> "#10B981"
            PunctualityStatus.LATE -> "#EF4444"
            PunctualityStatus.EARLY -> "#F59E0B"
            PunctualityStatus.UNKNOWN -> "#6B7280"
        }
    }

    fun getStatusColor(): String {
        return when (status) {
            AttendanceStatus.RECORDED -> "#10B981"
            AttendanceStatus.PENDING_APPROVAL -> "#F59E0B"
            AttendanceStatus.APPROVED -> "#10B981"
            AttendanceStatus.REJECTED -> "#EF4444"
            AttendanceStatus.FLAGGED -> "#F59E0B"
            AttendanceStatus.AUTO_CLOSED -> "#6B7280"
        }
    }

    fun requiresAttention(): Boolean {
        return status == AttendanceStatus.PENDING_APPROVAL ||
               status == AttendanceStatus.FLAGGED ||
               punctuality == PunctualityStatus.LATE ||
               requiresReview ||
               !isLocationValid
    }

    fun getLocationValidationString(): String? {
        return if (!isLocationValid) {
            locationValidationMessage ?: "Ubicación fuera del rango permitido"
        } else null
    }

    fun hasValidLocation(): Boolean {
        return location != null && isLocationValid
    }

    fun getWorkDuration(exitRecord: AttendanceRecord?): Long? {
        if (type != AttendanceType.ENTRADA || exitRecord?.type != AttendanceType.SALIDA) {
            return null
        }
        return exitRecord.timestamp.toDate().time - timestamp.toDate().time
    }

    fun getFormattedWorkDuration(exitRecord: AttendanceRecord?): String? {
        val duration = getWorkDuration(exitRecord) ?: return null
        val hours = duration / (1000 * 60 * 60)
        val minutes = (duration % (1000 * 60 * 60)) / (1000 * 60)
        return String.format("%d:%02d", hours, minutes)
    }

    // Compatibility methods for existing code
    @Deprecated("Use getTypeDisplayName() instead")
    fun getTypeDisplayNameOld(): String {
        return when (type) {
            AttendanceType.ENTRADA -> "Entrada"
            AttendanceType.SALIDA -> "Salida"
            AttendanceType.COMIDA -> "Salida a Almorzar"
        }
    }

    companion object {
        // Convert from old AttendanceType format
        fun fromLegacyType(legacyType: String): AttendanceType {
            return when (legacyType.uppercase()) {
                "CHECK_IN" -> AttendanceType.ENTRADA
                "CHECK_OUT" -> AttendanceType.SALIDA
                "LUNCH_OUT", "LUNCH_IN" -> AttendanceType.COMIDA
                else -> AttendanceType.ENTRADA
            }
        }

        // Product type constants matching the web app
        const val PRODUCT_TYPE_BODEGA_AURRERA = "bodega_aurrera"
        const val PRODUCT_TYPE_AVIVA_CONTIGO = "aviva_contigo"
        const val PRODUCT_TYPE_CONSTRURAMA = "construrama"

        fun getProductTypeDisplayName(productType: String): String {
            return when (productType) {
                PRODUCT_TYPE_BODEGA_AURRERA -> "Bodega Aurrera"
                PRODUCT_TYPE_AVIVA_CONTIGO -> "Aviva Contigo"
                PRODUCT_TYPE_CONSTRURAMA -> "Construrama"
                else -> productType
            }
        }
    }
}