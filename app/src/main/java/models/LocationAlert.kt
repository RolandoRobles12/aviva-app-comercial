package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint

/**
 * Alerta generada cuando un vendedor estático se encuentra fuera de su ubicación asignada
 */
data class LocationAlert(
    val id: String = "",
    val userId: String = "",
    val userEmail: String = "",
    val userName: String = "",

    // Ubicación detectada
    val detectedLocation: GeoPoint,
    val detectedLocationAccuracy: Float = 0f,

    // Ubicación asignada
    val assignedLocation: GeoPoint,
    val assignedLocationName: String? = null,

    // Distancia
    val distanceFromAssigned: Float = 0f, // Metros
    val allowedRadius: Float = 150f,

    // Estado
    val alertType: AlertType = AlertType.OUT_OF_BOUNDS,
    val severity: AlertSeverity = AlertSeverity.WARNING,
    val status: AlertStatus = AlertStatus.ACTIVE,

    // Timestamps
    val detectedAt: Timestamp = Timestamp.now(),
    val resolvedAt: Timestamp? = null,
    val resolvedBy: String? = null,

    // Notas
    val notes: String? = null
) {
    enum class AlertType {
        OUT_OF_BOUNDS,      // Fuera del radio permitido
        NO_CONFIG,          // Sin configuración de ubicación
        GPS_DISABLED        // GPS desactivado
    }

    enum class AlertSeverity {
        INFO,
        WARNING,
        CRITICAL
    }

    enum class AlertStatus {
        ACTIVE,     // Alerta activa
        RESOLVED,   // Resuelta
        DISMISSED   // Descartada
    }

    fun getAlertMessage(): String {
        return when (alertType) {
            AlertType.OUT_OF_BOUNDS ->
                "Vendedor fuera de ubicación asignada (${distanceFromAssigned.toInt()}m de distancia)"
            AlertType.NO_CONFIG ->
                "Vendedor sin ubicación asignada configurada"
            AlertType.GPS_DISABLED ->
                "GPS desactivado o sin permisos"
        }
    }
}
