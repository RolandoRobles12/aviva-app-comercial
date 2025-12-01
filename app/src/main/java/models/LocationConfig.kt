package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint

/**
 * Configuración de tracking de ubicación para un usuario
 *
 * Define parámetros específicos de tracking según el tipo de vendedor:
 * - Vendedores de campo (AVIVA_TU_NEGOCIO, AVIVA_TU_CASA): Solo tracking de ruta
 * - Vendedores estáticos (AVIVA_TU_COMPRA, AVIVA_CONTIGO): Validación de ubicación asignada
 */
data class LocationConfig(
    val id: String = "",
    val userId: String = "",

    // Ubicación asignada (para vendedores estáticos)
    val assignedLocation: GeoPoint? = null,
    val assignedLocationName: String? = null, // Nombre descriptivo del lugar

    // Configuración de radio permitido (metros)
    val allowedRadius: Float = 150f, // Default: 150 metros

    // Configuración de tracking
    val trackingInterval: Long = 15 * 60 * 1000L, // Default: 15 minutos
    val minAccuracy: Float = 100f, // Default: 100 metros

    // Tipo de validación según productLine
    val validationType: ValidationType = ValidationType.ROUTE_ONLY,

    // Estado
    val isActive: Boolean = true,
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now(),

    // Usuario que configuró
    val configuredBy: String? = null
) {
    enum class ValidationType {
        ROUTE_ONLY,      // Solo rastrea ruta (vendedores de campo)
        FIXED_LOCATION   // Valida ubicación asignada (vendedores estáticos)
    }

    /**
     * Verifica si una ubicación está dentro del radio permitido
     */
    fun isWithinAllowedRadius(location: GeoPoint): Boolean {
        if (assignedLocation == null || validationType == ValidationType.ROUTE_ONLY) {
            return true // No hay restricción para vendedores de campo
        }

        val distance = calculateDistance(assignedLocation, location)
        return distance <= allowedRadius
    }

    /**
     * Calcula distancia en metros entre dos puntos GPS usando fórmula Haversine
     */
    private fun calculateDistance(point1: GeoPoint, point2: GeoPoint): Float {
        val earthRadius = 6371000f // Radio de la Tierra en metros

        val lat1Rad = Math.toRadians(point1.latitude)
        val lat2Rad = Math.toRadians(point2.latitude)
        val deltaLatRad = Math.toRadians(point2.latitude - point1.latitude)
        val deltaLonRad = Math.toRadians(point2.longitude - point1.longitude)

        val a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
                Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2)

        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

        return (earthRadius * c).toFloat()
    }

    /**
     * Obtiene el tipo de validación según el productLine del usuario
     */
    companion object {
        fun getValidationTypeForProductLine(productLine: User.ProductLine): ValidationType {
            return when (productLine) {
                User.ProductLine.AVIVA_TU_NEGOCIO,
                User.ProductLine.AVIVA_TU_CASA -> ValidationType.ROUTE_ONLY

                User.ProductLine.AVIVA_TU_COMPRA,
                User.ProductLine.AVIVA_CONTIGO -> ValidationType.FIXED_LOCATION
            }
        }
    }
}
