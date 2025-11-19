package com.promotoresavivatunegocio_1.database.dao

import androidx.room.*
import com.promotoresavivatunegocio_1.database.entities.VisitLocal
import kotlinx.coroutines.flow.Flow

/**
 * DAO para acceso a visitas almacenadas localmente
 */
@Dao
interface VisitDao {

    /**
     * Inserta una nueva visita
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(visit: VisitLocal)

    /**
     * Inserta múltiples visitas
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(visits: List<VisitLocal>)

    /**
     * Actualiza una visita existente
     */
    @Update
    suspend fun update(visit: VisitLocal)

    /**
     * Elimina una visita
     */
    @Delete
    suspend fun delete(visit: VisitLocal)

    /**
     * Obtiene una visita por ID
     */
    @Query("SELECT * FROM visits WHERE id = :visitId")
    suspend fun getById(visitId: String): VisitLocal?

    /**
     * Obtiene todas las visitas de un usuario
     */
    @Query("SELECT * FROM visits WHERE userId = :userId ORDER BY timestamp DESC")
    fun getByUserId(userId: String): Flow<List<VisitLocal>>

    /**
     * Obtiene visitas no sincronizadas
     */
    @Query("SELECT * FROM visits WHERE isSynced = 0 ORDER BY timestamp ASC")
    suspend fun getUnsynced(): List<VisitLocal>

    /**
     * Obtiene visitas no sincronizadas como Flow
     */
    @Query("SELECT * FROM visits WHERE isSynced = 0 ORDER BY timestamp ASC")
    fun getUnsyncedFlow(): Flow<List<VisitLocal>>

    /**
     * Cuenta visitas no sincronizadas
     */
    @Query("SELECT COUNT(*) FROM visits WHERE isSynced = 0")
    fun getUnsyncedCount(): Flow<Int>

    /**
     * Marca una visita como sincronizada
     */
    @Query("UPDATE visits SET isSynced = 1, updatedAt = :timestamp WHERE id = :visitId")
    suspend fun markAsSynced(visitId: String, timestamp: Long = System.currentTimeMillis())

    /**
     * Incrementa los intentos de sincronización
     */
    @Query("""
        UPDATE visits
        SET syncAttempts = syncAttempts + 1,
            lastSyncAttempt = :timestamp,
            syncError = :error
        WHERE id = :visitId
    """)
    suspend fun incrementSyncAttempts(
        visitId: String,
        timestamp: Long = System.currentTimeMillis(),
        error: String? = null
    )

    /**
     * Obtiene visitas por rango de fechas
     */
    @Query("SELECT * FROM visits WHERE timestamp BETWEEN :startTime AND :endTime ORDER BY timestamp DESC")
    suspend fun getByDateRange(startTime: Long, endTime: Long): List<VisitLocal>

    /**
     * Obtiene visitas por estado
     */
    @Query("SELECT * FROM visits WHERE status = :status ORDER BY timestamp DESC")
    suspend fun getByStatus(status: String): List<VisitLocal>

    /**
     * Elimina visitas antiguas (más de 90 días)
     */
    @Query("DELETE FROM visits WHERE timestamp < :cutoffTime AND isSynced = 1")
    suspend fun deleteOldSynced(cutoffTime: Long)

    /**
     * Cuenta total de visitas
     */
    @Query("SELECT COUNT(*) FROM visits")
    suspend fun count(): Int

    /**
     * Limpia toda la tabla
     */
    @Query("DELETE FROM visits")
    suspend fun deleteAll()
}
