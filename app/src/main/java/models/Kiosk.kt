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
    val location: GeoPoint? = null, // Alias for coordinates for compatibility
    val address: String = "",
    val city: String = "",
    val state: String = "",
    val description: String = "",

    // Configuración de tracking
    val radiusOverride: Float = 100f, // Radio permitido en metros (default: 100m)
    val radiusMeters: Int = 100, // Radio en metros como Int

    // Reglas de tiempo
    val workHoursStart: Int = 9, // Hora de inicio (default: 9 AM)
    val workHoursEnd: Int = 19,   // Hora de fin (default: 7 PM)
    val requiresPresence: Boolean = true, // Si requiere presencia física

    // Estado
    val status: KioskStatus = KioskStatus.ACTIVE,
    val isActive: Boolean = true,

    // Métricas
    val averageCheckInsPerDay: Double = 0.0,

    // Integración HubSpot
    val hubId: String? = null,

    // Timestamps
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now(),
    val createdBy: String = ""
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

    fun getProductTypeDisplayName(): String {
        return when (productType) {
            PRODUCT_TYPE_BODEGA_AURRERA -> "Bodega Aurrera"
            PRODUCT_TYPE_AVIVA_CONTIGO -> "Aviva Contigo"
            PRODUCT_TYPE_CONSTRURAMA -> "Construrama"
            else -> productType
        }
    }

    companion object {
        // Product type constants
        const val PRODUCT_TYPE_BODEGA_AURRERA = "bodega_aurrera"
        const val PRODUCT_TYPE_AVIVA_CONTIGO = "aviva_contigo"
        const val PRODUCT_TYPE_CONSTRURAMA = "construrama"

        // ProductType enum for type-safe operations
        enum class ProductType {
            BODEGA_AURRERA,
            AVIVA_CONTIGO,
            CONSTRURAMA;

            fun toDisplayName(): String {
                return when (this) {
                    BODEGA_AURRERA -> "Bodega Aurrera"
                    AVIVA_CONTIGO -> "Aviva Contigo"
                    CONSTRURAMA -> "Construrama"
                }
            }

            fun toStringValue(): String {
                return when (this) {
                    BODEGA_AURRERA -> PRODUCT_TYPE_BODEGA_AURRERA
                    AVIVA_CONTIGO -> PRODUCT_TYPE_AVIVA_CONTIGO
                    CONSTRURAMA -> PRODUCT_TYPE_CONSTRURAMA
                }
            }
        }

        fun getProductTypeFromString(productType: String): ProductType {
            return when (productType.lowercase()) {
                PRODUCT_TYPE_BODEGA_AURRERA, "ba", "bodega" -> ProductType.BODEGA_AURRERA
                PRODUCT_TYPE_AVIVA_CONTIGO, "ac", "contigo" -> ProductType.AVIVA_CONTIGO
                PRODUCT_TYPE_CONSTRURAMA, "construrama" -> ProductType.CONSTRURAMA
                else -> ProductType.BODEGA_AURRERA
            }
        }

        // Mexican states for validation
        val MEXICAN_STATES = listOf(
            "Aguascalientes", "Baja California", "Baja California Sur",
            "Campeche", "Chiapas", "Chihuahua", "Ciudad de México",
            "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero",
            "Hidalgo", "Jalisco", "México", "Michoacán", "Morelos",
            "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
            "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora",
            "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz",
            "Yucatán", "Zacatecas"
        )
    }
}
