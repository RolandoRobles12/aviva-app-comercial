package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint

data class Kiosk(
    var id: String = "",
    var name: String = "",
    var description: String = "",
    var productType: ProductType = ProductType.BODEGA_AURRERA,
    var address: String = "",
    var state: String = "",
    var city: String = "",
    var location: GeoPoint? = null,
    var radiusMeters: Int = 100, // GPS validation radius
    var isActive: Boolean = true,
    var createdAt: Timestamp = Timestamp.now(),
    var updatedAt: Timestamp = Timestamp.now(),
    var createdBy: String = "",

    // Contact information
    var contactPhone: String? = null,
    var contactEmail: String? = null,
    var managerName: String? = null,

    // Business information
    var businessHours: String? = null,
    var specialInstructions: String? = null,
    var securityNotes: String? = null,

    // Operational data
    var lastActivityDate: Timestamp? = null,
    var totalCheckIns: Int = 0,
    var averageCheckInsPerDay: Double = 0.0,

    // Configuration
    var allowedUserRoles: List<String> = listOf("promotor"),
    var requiresPhoto: Boolean = true,
    var requiresNotes: Boolean = false,
    var maxCheckInsPerDay: Int = 50
) {
    enum class ProductType {
        BODEGA_AURRERA,
        AVIVA_CONTIGO,
        CONSTRURAMA
    }

    fun getProductTypeDisplayName(): String {
        return when (productType) {
            ProductType.BODEGA_AURRERA -> "Bodega Aurrera"
            ProductType.AVIVA_CONTIGO -> "Aviva Contigo"
            ProductType.CONSTRURAMA -> "Construrama"
        }
    }

    fun getProductTypeValue(): String {
        return when (productType) {
            ProductType.BODEGA_AURRERA -> "bodega_aurrera"
            ProductType.AVIVA_CONTIGO -> "aviva_contigo"
            ProductType.CONSTRURAMA -> "construrama"
        }
    }

    fun getFullAddress(): String {
        return if (city.isNotEmpty() && state.isNotEmpty()) {
            "$address, $city, $state"
        } else address
    }

    fun isWithinRadius(userLocation: GeoPoint): Boolean {
        if (location == null) return false

        val distance = calculateDistance(
            location!!.latitude, location!!.longitude,
            userLocation.latitude, userLocation.longitude
        )

        return distance <= radiusMeters
    }

    private fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val R = 6371000.0 // Earth's radius in meters
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    fun getStatusColor(): String {
        return if (isActive) "#10B981" else "#6B7280"
    }

    fun getStatusDisplayName(): String {
        return if (isActive) "Activo" else "Inactivo"
    }

    companion object {
        // Mexican states for validation
        val MEXICAN_STATES = listOf(
            "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
            "Chiapas", "Chihuahua", "Coahuila", "Colima", "Durango", "Estado de México",
            "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos",
            "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo",
            "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala",
            "Veracruz", "Yucatán", "Zacatecas", "Ciudad de México"
        )

        fun getProductTypeFromString(value: String): ProductType {
            return when (value.lowercase()) {
                "bodega_aurrera" -> ProductType.BODEGA_AURRERA
                "aviva_contigo" -> ProductType.AVIVA_CONTIGO
                "construrama" -> ProductType.CONSTRURAMA
                else -> ProductType.BODEGA_AURRERA
            }
        }
    }
}