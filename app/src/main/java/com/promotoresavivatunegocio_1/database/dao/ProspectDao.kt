package com.promotoresavivatunegocio_1.database.dao

import androidx.room.*
import com.promotoresavivatunegocio_1.database.entities.ProspectLocal
import kotlinx.coroutines.flow.Flow

/**
 * DAO para acceso a prospectos almacenados localmente
 */
@Dao
interface ProspectDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(prospect: ProspectLocal)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(prospects: List<ProspectLocal>)

    @Update
    suspend fun update(prospect: ProspectLocal)

    @Delete
    suspend fun delete(prospect: ProspectLocal)

    @Query("SELECT * FROM prospects WHERE id = :prospectId")
    suspend fun getById(prospectId: String): ProspectLocal?

    @Query("SELECT * FROM prospects WHERE promoterId = :promoterId ORDER BY createdAt DESC")
    fun getByPromoterId(promoterId: String): Flow<List<ProspectLocal>>

    @Query("SELECT * FROM prospects WHERE isSynced = 0 ORDER BY createdAt ASC")
    suspend fun getUnsynced(): List<ProspectLocal>

    @Query("SELECT * FROM prospects WHERE isSynced = 0")
    fun getUnsyncedFlow(): Flow<List<ProspectLocal>>

    @Query("SELECT COUNT(*) FROM prospects WHERE isSynced = 0")
    fun getUnsyncedCount(): Flow<Int>

    @Query("UPDATE prospects SET isSynced = 1, updatedAt = :timestamp WHERE id = :prospectId")
    suspend fun markAsSynced(prospectId: String, timestamp: Long = System.currentTimeMillis())

    @Query("SELECT * FROM prospects WHERE status = :status ORDER BY createdAt DESC")
    suspend fun getByStatus(status: String): List<ProspectLocal>

    @Query("SELECT * FROM prospects WHERE isQualified = 1 ORDER BY score DESC")
    suspend fun getQualified(): List<ProspectLocal>

    @Query("""
        SELECT * FROM prospects
        WHERE createdAt BETWEEN :startTime AND :endTime
        ORDER BY createdAt DESC
    """)
    suspend fun getByDateRange(startTime: Long, endTime: Long): List<ProspectLocal>

    @Query("DELETE FROM prospects WHERE createdAt < :cutoffTime AND isSynced = 1")
    suspend fun deleteOldSynced(cutoffTime: Long)

    @Query("SELECT COUNT(*) FROM prospects")
    suspend fun count(): Int

    @Query("DELETE FROM prospects")
    suspend fun deleteAll()
}
