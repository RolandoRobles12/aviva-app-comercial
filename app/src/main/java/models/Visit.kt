package com.promotoresavivatunegocio_1.models

import com.google.firebase.firestore.GeoPoint

data class Visit(
    var id: String = "", // Debe ser var para poder asignar el ID del documento
    val userId: String = "",
    val userName: String = "",
    val businessName: String = "",
    val businessType: String = "",
    val address: String = "",
    val location: GeoPoint? = null,
    val photoUrl: String = "",
    val notes: String = "",
    val status: String = "solicitud_creada", // Status por defecto
    val timestamp: Long = System.currentTimeMillis(),

    // CAMPOS PARA EMPAREJAMIENTO CON PROSPECTOS AVIVA
    val prospectId: String? = null,
    val kioskId: String? = null,
    val cityId: String? = null,
    val esProspectoAviva: Boolean = false,
    val probabilidadOriginal: Double? = null
) {
    companion object {
        // Constantes para los diferentes status
        const val STATUS_SOLICITUD_CREADA = "solicitud_creada"
        const val STATUS_NO_INTERESADO = "no_interesado"
        const val STATUS_PROGRAMADA = "programada"
        const val STATUS_NO_APLICA = "no_aplica"

        // Función para obtener el texto mostrado en UI
        fun getStatusDisplayText(status: String): String {
            return when (status) {
                STATUS_SOLICITUD_CREADA -> "Solicitud creada"
                STATUS_NO_INTERESADO -> "No interesado"
                STATUS_PROGRAMADA -> "Programada"
                STATUS_NO_APLICA -> "No aplica"
                else -> "Desconocido"
            }
        }

        // Función para obtener todos los status disponibles
        fun getAllStatusOptions(): List<Pair<String, String>> {
            return listOf(
                STATUS_SOLICITUD_CREADA to "Solicitud creada",
                STATUS_NO_INTERESADO to "No interesado",
                STATUS_PROGRAMADA to "Programada",
                STATUS_NO_APLICA to "No aplica"
            )
        }

        // Función para obtener el drawable de background según status
        fun getStatusBackgroundRes(status: String): Int {
            return when (status) {
                STATUS_SOLICITUD_CREADA -> android.R.color.holo_green_dark
                STATUS_NO_INTERESADO -> android.R.color.holo_red_dark
                STATUS_PROGRAMADA -> android.R.color.holo_orange_dark
                STATUS_NO_APLICA -> android.R.color.darker_gray
                else -> android.R.color.darker_gray
            }
        }
    }
}