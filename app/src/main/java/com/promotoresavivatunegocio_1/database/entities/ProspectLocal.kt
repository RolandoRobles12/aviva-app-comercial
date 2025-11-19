package com.promotoresavivatunegocio_1.database.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Entidad Room para almacenar prospectos localmente
 */
@Entity(tableName = "prospects")
data class ProspectLocal(
    @PrimaryKey
    val id: String,

    // Información del negocio
    val businessName: String,
    val businessType: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val city: String,
    val state: String,

    // Información del propietario
    val ownerName: String? = null,
    val ownerPhone: String? = null,
    val ownerEmail: String? = null,

    // Evaluación
    val approvalProbability: Double, // 0.0 - 1.0
    val score: Int,
    val isQualified: Boolean,

    // Promotor
    val promoterId: String,
    val promoterName: String,

    // Estado
    val status: String, // "Nuevo", "Contactado", "Convertido", "Rechazado"
    val contactDate: Long? = null,
    val conversionDate: Long? = null,

    // Metadata
    val createdAt: Long,
    val updatedAt: Long,

    // Sincronización
    val isSynced: Boolean = false,
    val syncAttempts: Int = 0,
    val lastSyncAttempt: Long? = null,

    // Datos adicionales de DENUE
    val denueId: String? = null,
    val employeeCount: Int? = null,
    val activityCode: String? = null,
    val activityName: String? = null
)
