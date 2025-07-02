package com.promotoresavivatunegocio_1.models

import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
data class ProspectoAviva(
    val id: String = UUID.randomUUID().toString(),

    /* Datos básicos */
    val nombre: String,
    val giro: String,

    /* Geo-referencia */
    val latitud: Double,
    val longitud: Double,
    val direccion: String,

    /* Contacto opcional */
    val telefono: String? = null,

    /* Rangos de crédito (centavos) */
    val montoMinimoCentavos: Long,
    val montoMaximoCentavos: Long,

    /* Scoring — sin algoritmo aún */
    val probabilidad: Double = 0.0,
    val razonProbabilidad: String = "",

    /* Meta-datos internos */
    val promotorId: String,
    val esNegocioFijo: Boolean = true,
    val tieneInstalaciones: Boolean = false,
    val fechaAsignacion: Instant = Clock.System.now(),
)