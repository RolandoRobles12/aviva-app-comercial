package com.promotoresavivatunegocio_1.database.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.firebase.firestore.GeoPoint

/**
 * Entidad Room para almacenar visitas localmente
 * Permite funcionamiento offline y sincronización posterior
 *
 * Campos alineados con com.promotoresavivatunegocio_1.models.Visit
 */
@Entity(tableName = "visits")
data class VisitLocal(
    @PrimaryKey
    val id: String,

    // Información de la visita (coincide con Visit.kt)
    val userId: String,
    val userName: String,
    val businessName: String,
    val comments: String = "", // Corresponde a "comments" en Visit
    val imageUrl: String? = null, // Corresponde a "imageUrl" en Visit
    val imageLocalPath: String? = null, // Path local si no se subió
    val latitude: Double? = null, // location es nullable en Visit
    val longitude: Double? = null,
    val accuracy: Float = 0f,
    val timestampMillis: Long, // Timestamp convertido a millis
    val status: String,

    // Campos de emparejamiento con prospectos
    val prospectoId: String? = null,
    val esProspectoAviva: Boolean = false,
    val probabilidadOriginal: Double? = null,

    // Metadata
    val createdAt: Long,
    val updatedAt: Long,

    // Estado de sincronización
    val isSynced: Boolean = false,
    val syncAttempts: Int = 0,
    val lastSyncAttempt: Long? = null,
    val syncError: String? = null
) {
    /**
     * Convierte coordenadas a GeoPoint (puede ser null)
     */
    fun toGeoPoint(): GeoPoint? {
        return if (latitude != null && longitude != null) {
            GeoPoint(latitude, longitude)
        } else null
    }

    companion object {
        /**
         * Crea una VisitLocal desde GeoPoint
         */
        fun fromGeoPoint(
            id: String,
            userId: String,
            userName: String,
            businessName: String,
            comments: String = "",
            geoPoint: GeoPoint?,
            imageUrl: String? = null,
            accuracy: Float = 0f,
            status: String,
            timestampMillis: Long = System.currentTimeMillis(),
            prospectoId: String? = null,
            esProspectoAviva: Boolean = false,
            probabilidadOriginal: Double? = null
        ): VisitLocal {
            return VisitLocal(
                id = id,
                userId = userId,
                userName = userName,
                businessName = businessName,
                comments = comments,
                latitude = geoPoint?.latitude,
                longitude = geoPoint?.longitude,
                accuracy = accuracy,
                imageUrl = imageUrl,
                timestampMillis = timestampMillis,
                status = status,
                createdAt = timestampMillis,
                updatedAt = timestampMillis,
                prospectoId = prospectoId,
                esProspectoAviva = esProspectoAviva,
                probabilidadOriginal = probabilidadOriginal
            )
        }
    }
}
