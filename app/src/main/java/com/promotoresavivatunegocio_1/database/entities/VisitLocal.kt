package com.promotoresavivatunegocio_1.database.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.firebase.firestore.GeoPoint

/**
 * Entidad Room para almacenar visitas localmente
 * Permite funcionamiento offline y sincronización posterior
 */
@Entity(tableName = "visits")
data class VisitLocal(
    @PrimaryKey
    val id: String,

    // Información de la visita
    val userId: String,
    val userName: String,
    val businessName: String,
    val businessType: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val photoUrl: String? = null,
    val photoLocalPath: String? = null, // Path local si no se subió
    val notes: String? = null,
    val status: String, // "Solicitud creada", "No interesado", etc.

    // Metadata
    val timestamp: Long,
    val createdAt: Long,
    val updatedAt: Long,

    // Estado de sincronización
    val isSynced: Boolean = false,
    val syncAttempts: Int = 0,
    val lastSyncAttempt: Long? = null,
    val syncError: String? = null,

    // Información adicional
    val prospectId: String? = null,
    val kioskId: String? = null,
    val cityId: String? = null
) {
    /**
     * Convierte GeoPoint a coordenadas para Room
     */
    fun toGeoPoint(): GeoPoint = GeoPoint(latitude, longitude)

    companion object {
        /**
         * Crea una VisitLocal desde coordenadas
         */
        fun fromGeoPoint(
            id: String,
            userId: String,
            userName: String,
            businessName: String,
            businessType: String,
            address: String,
            geoPoint: GeoPoint,
            photoUrl: String? = null,
            notes: String? = null,
            status: String,
            timestamp: Long = System.currentTimeMillis()
        ): VisitLocal {
            return VisitLocal(
                id = id,
                userId = userId,
                userName = userName,
                businessName = businessName,
                businessType = businessType,
                address = address,
                latitude = geoPoint.latitude,
                longitude = geoPoint.longitude,
                photoUrl = photoUrl,
                notes = notes,
                status = status,
                timestamp = timestamp,
                createdAt = timestamp,
                updatedAt = timestamp
            )
        }
    }
}
