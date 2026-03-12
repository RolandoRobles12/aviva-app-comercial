package models

import com.google.firebase.Timestamp

/**
 * Zona asignada a un promotor.
 * Almacenada en Firestore bajo la colección "zones".
 * Las coordenadas son una lista de mapas {lat, lng} (polígono).
 */
data class Zone(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val assignedSellerId: String = "",
    val assignedSellerName: String = "",
    val coordinates: List<Map<String, Double>> = emptyList(),
    val color: String = "#4CAF50",
    val isActive: Boolean = true,
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)
