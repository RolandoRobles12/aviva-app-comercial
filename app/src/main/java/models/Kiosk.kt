package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint

/**
 * Modelo de Kiosko/Punto de Venta
 * Representa una ubicación física donde los vendedores están asignados
 */
data class Kiosk(
    val id: String = "",
    val name: String = "",
    val productType: String = "", // "BA" = Bodega Aurrera, etc.

    // Ubicación
    val coordinates: GeoPoint? = null,
    val city: String = "",
    val state: String = "",

    // Configuración de tracking
    val radiusOverride: Float = 100f, // Radio permitido en metros (default: 100m)

    // Reglas de tiempo
    val workHoursStart: Int = 9, // Hora de inicio (default: 9 AM)
    val workHoursEnd: Int = 19,   // Hora de fin (default: 7 PM)
    val requiresPresence: Boolean = true, // Si requiere presencia física

    // Estado
    val status: KioskStatus = KioskStatus.ACTIVE,

    // Integración HubSpot
    val hubId: String? = null,

    // Timestamps
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now()
) {
    enum class KioskStatus {
        ACTIVE,
        INACTIVE,
        MAINTENANCE,
        CLOSED
    }

    /**
     * Verifica si una ubicación está dentro del radio del kiosco
     */
    fun isWithinRadius(location: GeoPoint): Boolean {
        if (coordinates == null) return false

        val distance = calculateDistance(coordinates, location)
        return distance <= radiusOverride
    }

    /**
     * Obtiene la distancia en metros desde el kiosco a una ubicación
     */
    fun getDistanceFrom(location: GeoPoint): Float {
        if (coordinates == null) return Float.MAX_VALUE
        return calculateDistance(coordinates, location)
    }

    /**
     * Calcula distancia entre dos puntos usando fórmula Haversine
     */
    private fun calculateDistance(point1: GeoPoint, point2: GeoPoint): Float {
        val results = FloatArray(1)
        android.location.Location.distanceBetween(
            point1.latitude, point1.longitude,
            point2.latitude, point2.longitude,
            results
        )
        return results[0]
    }

    /**
     * Verifica si la hora actual está dentro del horario laboral del kiosco
     */
    fun isWithinWorkHours(): Boolean {
        val calendar = java.util.Calendar.getInstance()
        val currentHour = calendar.get(java.util.Calendar.HOUR_OF_DAY)
        return currentHour in workHoursStart until workHoursEnd
    }

    fun getStatusDisplayName(): String {
        return when (status) {
            KioskStatus.ACTIVE -> "Activo"
            KioskStatus.INACTIVE -> "Inactivo"
            KioskStatus.MAINTENANCE -> "En mantenimiento"
            KioskStatus.CLOSED -> "Cerrado"
        }
    }
}
