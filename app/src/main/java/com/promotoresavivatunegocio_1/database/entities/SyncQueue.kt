package com.promotoresavivatunegocio_1.database.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Cola de sincronización para operaciones pendientes
 * Almacena acciones que deben sincronizarse cuando haya conexión
 */
@Entity(tableName = "sync_queue")
data class SyncQueue(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    // Tipo de operación
    val entityType: String, // "visit", "prospect", "attendance", "metrics", etc.
    val entityId: String,
    val operation: String, // "CREATE", "UPDATE", "DELETE"

    // Datos
    val dataJson: String, // Datos serializados en JSON

    // Estado
    val status: String = "PENDING", // "PENDING", "SYNCING", "FAILED", "COMPLETED"
    val priority: Int = 0, // 0 = normal, 1 = alta, -1 = baja

    // Intentos
    val attempts: Int = 0,
    val maxAttempts: Int = 5,
    val lastAttemptAt: Long? = null,
    val errorMessage: String? = null,

    // Timestamps
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val scheduledAt: Long? = null // Para retry con backoff exponencial
) {
    companion object {
        // Estados
        const val STATUS_PENDING = "PENDING"
        const val STATUS_SYNCING = "SYNCING"
        const val STATUS_FAILED = "FAILED"
        const val STATUS_COMPLETED = "COMPLETED"

        // Tipos de entidad
        const val ENTITY_VISIT = "visit"
        const val ENTITY_PROSPECT = "prospect"
        const val ENTITY_ATTENDANCE = "attendance"
        const val ENTITY_LOCATION = "location"

        // Operaciones
        const val OP_CREATE = "CREATE"
        const val OP_UPDATE = "UPDATE"
        const val OP_DELETE = "DELETE"

        // Prioridades
        const val PRIORITY_HIGH = 1
        const val PRIORITY_NORMAL = 0
        const val PRIORITY_LOW = -1
    }

    /**
     * Verifica si se pueden hacer más reintentos
     */
    fun canRetry(): Boolean = attempts < maxAttempts

    /**
     * Calcula el tiempo de espera para el siguiente intento (backoff exponencial)
     */
    fun getNextRetryDelay(): Long {
        // 2^attempts * 1000ms (1s, 2s, 4s, 8s, 16s, ...)
        return (1 shl attempts) * 1000L
    }
}
