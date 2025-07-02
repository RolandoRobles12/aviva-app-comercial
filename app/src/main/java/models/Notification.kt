package com.promotoresavivatunegocio_1.models

import com.google.firebase.Timestamp

data class Notification(
    val id: String = "",
    val userId: String = "",
    val title: String = "",
    val message: String = "",
    val type: String = "", // "visit_approved", "visit_rejected", "general", etc.
    val isRead: Boolean = false,
    val timestamp: Timestamp = Timestamp.now(),
    val relatedVisitId: String? = null, // ID de la visita relacionada si aplica
    val actionUrl: String? = null // URL para acción específica si es necesario
) {
    // Constructor sin argumentos requerido por Firestore
    constructor() : this("", "", "", "", "", false, Timestamp.now(), null, null)
}