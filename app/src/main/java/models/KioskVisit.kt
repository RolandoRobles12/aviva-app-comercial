package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint

/**
 * Registro de visita a un kiosco
 * Rastrea cuándo un vendedor entra y sale del radio del kiosco
 */
data class KioskVisit(
    val id: String = "",
    val userId: String = "",
    val userEmail: String = "",
    val userName: String = "",

    val kioskId: String = "",
    val kioskName: String = "",

    // Check-in
    val checkInLocation: GeoPoint,
    val checkInTime: Timestamp = Timestamp.now(),
    val checkInAccuracy: Float = 0f,

    // Check-out
    val checkOutLocation: GeoPoint? = null,
    val checkOutTime: Timestamp? = null,
    val checkOutAccuracy: Float? = null,

    // Estadísticas
    val durationMinutes: Int? = null, // Calculado al hacer check-out
    val distanceFromKiosk: Float = 0f, // Distancia promedio durante la visita

    // Estado
    val status: VisitStatus = VisitStatus.ACTIVE
) {
    enum class VisitStatus {
        ACTIVE,      // En el kiosco actualmente
        COMPLETED,   // Salió del kiosco
        ABANDONED    // Perdió señal o se fue sin check-out
    }

    /**
     * Calcula la duración de la visita en minutos
     */
    fun calculateDuration(): Int? {
        if (checkOutTime == null) return null

        val durationMs = checkOutTime.toDate().time - checkInTime.toDate().time
        return (durationMs / 1000 / 60).toInt()
    }

    fun getStatusDisplayName(): String {
        return when (status) {
            VisitStatus.ACTIVE -> "En kiosco"
            VisitStatus.COMPLETED -> "Completada"
            VisitStatus.ABANDONED -> "Abandonada"
        }
    }
}
