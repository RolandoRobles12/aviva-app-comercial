package com.promotoresavivatunegocio_1.models

import com.google.firebase.Timestamp

data class LocationData(
    val userId: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null,
    val accuracy: Float? = null,
    val bearing: Float? = null,
    val speed: Float? = null,
    val altitude: Double? = null,
    val timestamp: Timestamp? = null,
    val provider: String? = null,
    val userEmail: String? = null
)