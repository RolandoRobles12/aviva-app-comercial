package com.promotoresavivatunegocio_1.models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint

data class User(
    val id: String = "",
    val uid: String = "",
    val email: String? = null,
    val displayName: String? = null,
    val photoUrl: String? = null,
    val lastLogin: Timestamp? = null,
    val isActive: Boolean? = null,
    val lastLocation: GeoPoint? = null,
    val lastLocationUpdate: Timestamp? = null,
    val lastLocationAccuracy: Float? = null,
    val name: String? = null,                    // Para compatibilidad
    val role: String? = null,                    // Para sistema de roles (admin, user)
    val profileImageUrl: String? = null,         // URL de imagen de perfil
    val createdAt: Timestamp? = null,            // Fecha de creación del usuario
    val lastLocationProvider: String? = null,    // Proveedor de ubicación
    val isLocationActive: Boolean? = null        // Si el tracking de ubicación está activo
)