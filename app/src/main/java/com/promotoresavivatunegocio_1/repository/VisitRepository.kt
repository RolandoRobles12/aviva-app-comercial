package com.promotoresavivatunegocio_1.repository

import android.util.Log
import com.google.firebase.firestore.FirebaseFirestore
import com.google.gson.Gson
import com.promotoresavivatunegocio_1.database.dao.SyncQueueDao
import com.promotoresavivatunegocio_1.database.dao.VisitDao
import com.promotoresavivatunegocio_1.database.entities.SyncQueue
import com.promotoresavivatunegocio_1.database.entities.VisitLocal
import com.promotoresavivatunegocio_1.utils.NetworkConnectivityManager
import com.promotoresavivatunegocio_1.models.Visit
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.tasks.await

/**
 * Repository para gestionar visitas con soporte offline
 *
 * Patrón Repository que:
 * - Intenta guardar en Firestore si hay conexión
 * - Guarda localmente en Room siempre
 * - Encola para sincronización si está offline
 * - Proporciona datos desde caché local cuando no hay red
 */
class VisitRepository(
    private val visitDao: VisitDao,
    private val syncQueueDao: SyncQueueDao,
    private val firestore: FirebaseFirestore,
    private val networkManager: NetworkConnectivityManager
) {

    private val gson = Gson()

    companion object {
        private const val TAG = "VisitRepository"
        private const val COLLECTION_VISITS = "visits"
    }

    /**
     * Crea una nueva visita
     *
     * Si hay conexión:
     * 1. Guarda en Firestore
     * 2. Guarda en Room como sincronizado
     *
     * Si no hay conexión:
     * 1. Guarda en Room como no sincronizado
     * 2. Encola para sincronización posterior
     */
    suspend fun createVisit(visit: Visit): Result<String> {
        return try {
            // Convertir a entidad local
            val visitLocal = visit.toLocal()

            // Intentar guardar en Firestore si hay conexión
            if (networkManager.isConnected()) {
                try {
                    firestore.collection(COLLECTION_VISITS)
                        .document(visit.id)
                        .set(visit)
                        .await()

                    // Marcar como sincronizado
                    val syncedVisit = visitLocal.copy(isSynced = true)
                    visitDao.insert(syncedVisit)

                    Log.d(TAG, "✅ Visita guardada en Firestore y Room: ${visit.id}")
                    Result.success(visit.id)
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ Error guardando en Firestore, guardando localmente", e)
                    saveLocallyAndEnqueue(visitLocal, visit)
                }
            } else {
                Log.d(TAG, "📵 Sin conexión, guardando localmente: ${visit.id}")
                saveLocallyAndEnqueue(visitLocal, visit)
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error creando visita", e)
            Result.failure(e)
        }
    }

    /**
     * Guarda localmente y encola para sincronización
     */
    private suspend fun saveLocallyAndEnqueue(visitLocal: VisitLocal, visit: Visit): Result<String> {
        // Guardar en Room
        visitDao.insert(visitLocal)

        // Encolar para sincronización
        val syncItem = SyncQueue(
            entityType = SyncQueue.ENTITY_VISIT,
            entityId = visit.id,
            operation = SyncQueue.OP_CREATE,
            dataJson = gson.toJson(visit),
            priority = SyncQueue.PRIORITY_NORMAL
        )
        syncQueueDao.insert(syncItem)

        Log.d(TAG, "💾 Visita guardada localmente y encolada: ${visit.id}")
        return Result.success(visit.id)
    }

    /**
     * Obtiene visitas de un usuario
     * Primero intenta desde Firestore, si falla usa caché local
     */
    suspend fun getVisitsByUser(userId: String): Result<List<Visit>> {
        return try {
            if (networkManager.isConnected()) {
                try {
                    val snapshot = firestore.collection(COLLECTION_VISITS)
                        .whereEqualTo("userId", userId)
                        .get()
                        .await()

                    val visits = snapshot.documents.mapNotNull { it.toObject(Visit::class.java) }

                    // Actualizar caché local
                    val localVisits = visits.map { it.toLocal().copy(isSynced = true) }
                    visitDao.insertAll(localVisits)

                    Log.d(TAG, "✅ Visitas obtenidas de Firestore: ${visits.size}")
                    Result.success(visits)
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ Error obteniendo de Firestore, usando caché local", e)
                    getFromLocalCache(userId)
                }
            } else {
                Log.d(TAG, "📵 Sin conexión, usando caché local")
                getFromLocalCache(userId)
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error obteniendo visitas", e)
            Result.failure(e)
        }
    }

    /**
     * Obtiene visitas desde el caché local
     */
    private suspend fun getFromLocalCache(userId: String): Result<List<Visit>> {
        val localVisits = visitDao.getByUserId(userId).first()
        val visits = localVisits.map { it.toVisit() }
        Log.d(TAG, "💾 Visitas obtenidas de caché local: ${visits.size}")
        return Result.success(visits)
    }

    /**
     * Obtiene visitas como Flow (actualizaciones en tiempo real desde Room)
     */
    fun getVisitsByUserFlow(userId: String): Flow<List<VisitLocal>> {
        return visitDao.getByUserId(userId)
    }

    /**
     * Obtiene visitas no sincronizadas
     */
    suspend fun getUnsyncedVisits(): List<VisitLocal> {
        return visitDao.getUnsynced()
    }

    /**
     * Obtiene contador de visitas no sincronizadas
     */
    fun getUnsyncedCountFlow(): Flow<Int> {
        return visitDao.getUnsyncedCount()
    }

    /**
     * Sincroniza una visita con Firestore
     */
    suspend fun syncVisit(visitLocal: VisitLocal): Result<Unit> {
        return try {
            val visit = visitLocal.toVisit()

            firestore.collection(COLLECTION_VISITS)
                .document(visit.id)
                .set(visit)
                .await()

            // Marcar como sincronizado
            visitDao.markAsSynced(visit.id)

            Log.d(TAG, "✅ Visita sincronizada: ${visit.id}")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error sincronizando visita: ${visitLocal.id}", e)

            // Incrementar intentos
            visitDao.incrementSyncAttempts(visitLocal.id, error = e.message)

            Result.failure(e)
        }
    }

    /**
     * Limpia visitas antiguas sincronizadas
     * (más de 90 días)
     */
    suspend fun cleanOldSyncedVisits() {
        val cutoffTime = System.currentTimeMillis() - (90 * 24 * 60 * 60 * 1000L)
        visitDao.deleteOldSynced(cutoffTime)
        Log.d(TAG, "🧹 Visitas antiguas eliminadas")
    }
}

/**
 * Extensiones para convertir entre modelos
 */
private fun Visit.toLocal(): VisitLocal {
    return VisitLocal(
        id = this.id,
        userId = this.userId,
        userName = this.userName,
        businessName = this.businessName,
        businessType = this.businessType,
        address = this.address,
        latitude = this.location?.latitude ?: 0.0,
        longitude = this.location?.longitude ?: 0.0,
        photoUrl = this.photoUrl,
        notes = this.notes,
        status = this.status,
        timestamp = this.timestamp,
        createdAt = this.timestamp,
        updatedAt = System.currentTimeMillis(),
        prospectId = this.prospectId,
        kioskId = this.kioskId,
        cityId = this.cityId
    )
}

private fun VisitLocal.toVisit(): Visit {
    return Visit(
        id = this.id,
        userId = this.userId,
        userName = this.userName,
        businessName = this.businessName,
        businessType = this.businessType,
        address = this.address,
        location = this.toGeoPoint(),
        photoUrl = this.photoUrl ?: "",
        notes = this.notes ?: "",
        status = this.status,
        timestamp = this.timestamp,
        prospectId = this.prospectId,
        kioskId = this.kioskId,
        cityId = this.cityId
    )
}
