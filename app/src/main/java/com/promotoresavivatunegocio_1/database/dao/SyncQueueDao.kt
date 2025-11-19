package com.promotoresavivatunegocio_1.database.dao

import androidx.room.*
import com.promotoresavivatunegocio_1.database.entities.SyncQueue
import kotlinx.coroutines.flow.Flow

/**
 * DAO para la cola de sincronización
 */
@Dao
interface SyncQueueDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: SyncQueue): Long

    @Update
    suspend fun update(item: SyncQueue)

    @Delete
    suspend fun delete(item: SyncQueue)

    @Query("SELECT * FROM sync_queue WHERE id = :id")
    suspend fun getById(id: Long): SyncQueue?

    /**
     * Obtiene items pendientes ordenados por prioridad y fecha
     */
    @Query("""
        SELECT * FROM sync_queue
        WHERE status = :status
        ORDER BY priority DESC, createdAt ASC
    """)
    suspend fun getByStatus(status: String = SyncQueue.STATUS_PENDING): List<SyncQueue>

    /**
     * Obtiene items pendientes como Flow
     */
    @Query("""
        SELECT * FROM sync_queue
        WHERE status IN ('PENDING', 'FAILED')
        AND (scheduledAt IS NULL OR scheduledAt <= :currentTime)
        ORDER BY priority DESC, createdAt ASC
    """)
    fun getPendingFlow(currentTime: Long = System.currentTimeMillis()): Flow<List<SyncQueue>>

    /**
     * Cuenta items pendientes
     */
    @Query("SELECT COUNT(*) FROM sync_queue WHERE status IN ('PENDING', 'FAILED')")
    fun getPendingCount(): Flow<Int>

    /**
     * Marca un item como completado
     */
    @Query("""
        UPDATE sync_queue
        SET status = 'COMPLETED',
            updatedAt = :timestamp
        WHERE id = :id
    """)
    suspend fun markAsCompleted(id: Long, timestamp: Long = System.currentTimeMillis())

    /**
     * Marca un item como fallido e incrementa intentos
     */
    @Query("""
        UPDATE sync_queue
        SET status = 'FAILED',
            attempts = attempts + 1,
            lastAttemptAt = :timestamp,
            errorMessage = :error,
            scheduledAt = :nextRetry,
            updatedAt = :timestamp
        WHERE id = :id
    """)
    suspend fun markAsFailed(
        id: Long,
        error: String,
        nextRetry: Long? = null,
        timestamp: Long = System.currentTimeMillis()
    )

    /**
     * Marca un item como en proceso
     */
    @Query("""
        UPDATE sync_queue
        SET status = 'SYNCING',
            updatedAt = :timestamp
        WHERE id = :id
    """)
    suspend fun markAsSyncing(id: Long, timestamp: Long = System.currentTimeMillis())

    /**
     * Elimina items completados antiguos
     */
    @Query("""
        DELETE FROM sync_queue
        WHERE status = 'COMPLETED'
        AND updatedAt < :cutoffTime
    """)
    suspend fun deleteOldCompleted(cutoffTime: Long)

    /**
     * Elimina items que han excedido el máximo de intentos
     */
    @Query("DELETE FROM sync_queue WHERE attempts >= maxAttempts")
    suspend fun deleteExceededAttempts()

    @Query("SELECT COUNT(*) FROM sync_queue")
    suspend fun count(): Int

    @Query("DELETE FROM sync_queue")
    suspend fun deleteAll()

    /**
     * Obtiene items por tipo de entidad
     */
    @Query("""
        SELECT * FROM sync_queue
        WHERE entityType = :entityType
        AND status IN ('PENDING', 'FAILED')
        ORDER BY priority DESC, createdAt ASC
    """)
    suspend fun getByEntityType(entityType: String): List<SyncQueue>
}
