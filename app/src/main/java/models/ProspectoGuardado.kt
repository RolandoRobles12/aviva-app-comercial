package com.promotoresavivatunegocio_1.models

import com.google.firebase.Timestamp

data class ProspectoGuardado(
    val id: String = "",
    val nombre: String = "",
    val giro: String = "",
    val direccion: String = "",
    val telefono: String? = null,
    val latitud: Double = 0.0,
    val longitud: Double = 0.0,
    val probabilidad: Double = 0.0,
    val razonProbabilidad: String = "",
    val montoMinimoCentavos: String = "",
    val montoMaximoCentavos: String = "",
    val fechaDeteccion: Timestamp = Timestamp.now(),
    val usuarioId: String = "",
    val estado: String = "detectado", // "detectado", "visitado", "descartado"
    val visitaId: String? = null // ID de la visita relacionada
)

data class EstadisticasProspectos(
    val totalDetectados: Int = 0,
    val pendientes: Int = 0,
    val visitados: Int = 0,
    val descartados: Int = 0
)