package com.promotoresavivatunegocio_1.models

import com.google.firebase.firestore.GeoPoint
import com.google.firebase.Timestamp

data class Visit(
    val id: String = "",
    val userId: String = "",
    val userName: String = "",
    val businessName: String = "",
    val comments: String = "",
    val imageUrl: String? = null,
    val location: GeoPoint = GeoPoint(0.0, 0.0),
    val accuracy: Float = 0f,
    val timestamp: Timestamp = Timestamp.now(),
    val status: String = "pending",

    // NUEVOS CAMPOS PARA EMPAREJAMIENTO
    val prospectoId: String? = null, // ID del prospecto sugerido
    val esProspectoAviva: Boolean = false, // Si vino de una sugerencia
    val probabilidadOriginal: Double? = null // Probabilidad del prospecto original
)