package models

import com.google.firebase.Timestamp

/**
 * Modelo de Zona Prohibida.
 *
 * Representa un área geográfica delimitada por un polígono donde
 * los promotores no deben ingresar o requieren atención especial.
 *
 * Se almacena en Firestore bajo la colección "forbidden_zones".
 * Los puntos del polígono se guardan como lista de mapas {lat, lng}.
 */
data class ForbiddenZone(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    /** Lista de puntos del polígono en orden. Cada mapa contiene "lat" y "lng". */
    val points: List<Map<String, Double>> = emptyList(),
    /** Color de relleno en formato ARGB hex, e.g. "#40FF0000" */
    val fillColorHex: String = "#40FF0000",
    /** Color del borde en formato ARGB hex, e.g. "#FFFF0000" */
    val strokeColorHex: String = "#FFFF0000",
    val strokeWidth: Float = 3f,
    val isActive: Boolean = true,
    /**
     * IDs de los promotores a los que aplica esta zona prohibida.
     * Si la lista está vacía, aplica a TODOS los promotores (comportamiento global).
     */
    val assignedPromotorIds: List<String> = emptyList(),
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)
