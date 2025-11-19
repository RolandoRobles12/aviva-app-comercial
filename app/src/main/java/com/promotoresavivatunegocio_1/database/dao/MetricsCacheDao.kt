package com.promotoresavivatunegocio_1.database.dao

import androidx.room.*
import com.promotoresavivatunegocio_1.database.entities.MetricsCache
import kotlinx.coroutines.flow.Flow

/**
 * DAO para caché de métricas
 */
@Dao
interface MetricsCacheDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(metrics: MetricsCache)

    @Update
    suspend fun update(metrics: MetricsCache)

    @Delete
    suspend fun delete(metrics: MetricsCache)

    @Query("SELECT * FROM metrics_cache WHERE id = :id")
    suspend fun getById(id: String): MetricsCache?

    /**
     * Obtiene métricas de un usuario para un período específico
     */
    @Query("""
        SELECT * FROM metrics_cache
        WHERE userId = :userId
        AND period = :period
        AND expiresAt > :currentTime
        ORDER BY cachedAt DESC
        LIMIT 1
    """)
    suspend fun getLatestForPeriod(
        userId: String,
        period: String,
        currentTime: Long = System.currentTimeMillis()
    ): MetricsCache?

    /**
     * Obtiene métricas como Flow
     */
    @Query("""
        SELECT * FROM metrics_cache
        WHERE userId = :userId
        AND period = :period
        ORDER BY cachedAt DESC
        LIMIT 1
    """)
    fun getLatestForPeriodFlow(userId: String, period: String): Flow<MetricsCache?>

    /**
     * Obtiene todas las métricas de un usuario
     */
    @Query("SELECT * FROM metrics_cache WHERE userId = :userId ORDER BY cachedAt DESC")
    fun getAllForUser(userId: String): Flow<List<MetricsCache>>

    /**
     * Marca métricas como obsoletas
     */
    @Query("""
        UPDATE metrics_cache
        SET isStale = 1
        WHERE userId = :userId
        AND period = :period
    """)
    suspend fun markAsStale(userId: String, period: String)

    /**
     * Elimina caché expirado
     */
    @Query("DELETE FROM metrics_cache WHERE expiresAt < :currentTime OR isStale = 1")
    suspend fun deleteExpired(currentTime: Long = System.currentTimeMillis())

    /**
     * Elimina caché de un usuario
     */
    @Query("DELETE FROM metrics_cache WHERE userId = :userId")
    suspend fun deleteForUser(userId: String)

    @Query("SELECT COUNT(*) FROM metrics_cache")
    suspend fun count(): Int

    @Query("DELETE FROM metrics_cache")
    suspend fun deleteAll()

    /**
     * Verifica si existe caché válido para un período
     */
    @Query("""
        SELECT COUNT(*) > 0
        FROM metrics_cache
        WHERE userId = :userId
        AND period = :period
        AND expiresAt > :currentTime
        AND isStale = 0
    """)
    suspend fun hasValidCache(
        userId: String,
        period: String,
        currentTime: Long = System.currentTimeMillis()
    ): Boolean
}
