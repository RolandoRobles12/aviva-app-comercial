package com.promotoresavivatunegocio_1.workers

import android.content.Context
import android.util.Log
import androidx.work.*
import com.google.firebase.firestore.FirebaseFirestore
import com.google.gson.Gson
import com.promotoresavivatunegocio_1.database.AppDatabase
import com.promotoresavivatunegocio_1.database.entities.SyncQueue
import com.promotoresavivatunegocio_1.utils.NetworkConnectivityManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.tasks.await
import com.promotoresavivatunegocio_1.models.ProspectoAviva
import com.promotoresavivatunegocio_1.models.Visit
import java.util.concurrent.TimeUnit

/**
 * Worker para sincronizar datos pendientes con Firestore
 *
 * Características:
 * - Se ejecuta solo cuando hay conexión de red
 * - Sincroniza visitas, prospectos y otros datos pendientes
 * - Maneja reintentos con backoff exponencial
 * - Limpia datos antiguos ya sincronizados
 *
 * Se programa automáticamente:
 * - Cuando se pierde/recupera conexión
 * - Periódicamente cada 15 minutos (si hay datos pendientes)
 * - Manualmente desde la UI
 */
class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    private val database = AppDatabase.getInstance(context)
    private val syncQueueDao = database.syncQueueDao()
    private val visitDao = database.visitDao()
    private val prospectDao = database.prospectDao()
    private val firestore = FirebaseFirestore.getInstance()
    private val networkManager = NetworkConnectivityManager(context)
    private val gson = Gson()

    companion object {
        private const val TAG = "SyncWorker"
        const val WORK_NAME = "sync_worker"

        /**
         * Programa el worker para sincronización periódica
         */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
                15, TimeUnit.MINUTES,
                5, TimeUnit.MINUTES // Flex interval
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .addTag("sync")
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )

            Log.d(TAG, "✅ SyncWorker programado")
        }

        /**
         * Ejecuta sincronización inmediata
         */
        fun syncNow(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val syncRequest = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .addTag("sync_now")
                .build()

            WorkManager.getInstance(context).enqueue(syncRequest)

            Log.d(TAG, "▶️ Sincronización inmediata solicitada")
        }

        /**
         * Cancela sincronización periódica
         */
        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "🛑 SyncWorker cancelado")
        }
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "🔄 Iniciando sincronización...")

            // Verificar conexión
            if (!networkManager.isConnected()) {
                Log.w(TAG, "📵 Sin conexión, saltando sincronización")
                return@withContext Result.retry()
            }

            var successCount = 0
            var failCount = 0

            // Obtener items pendientes
            val pendingItems = syncQueueDao.getByStatus(SyncQueue.STATUS_PENDING) +
                    syncQueueDao.getByStatus(SyncQueue.STATUS_FAILED)

            Log.d(TAG, "📦 Items pendientes de sincronización: ${pendingItems.size}")

            // Sincronizar cada item
            for (item in pendingItems) {
                try {
                    // Verificar si aún puede reintentar
                    if (!item.canRetry()) {
                        Log.w(TAG, "⏭️ Item ${item.id} excedió intentos máximos, eliminando")
                        syncQueueDao.delete(item)
                        continue
                    }

                    // Marcar como en proceso
                    syncQueueDao.markAsSyncing(item.id)

                    // Sincronizar según tipo
                    when (item.entityType) {
                        SyncQueue.ENTITY_VISIT -> syncVisit(item)
                        SyncQueue.ENTITY_PROSPECT -> syncProspect(item)
                        else -> {
                            Log.w(TAG, "⚠️ Tipo de entidad desconocido: ${item.entityType}")
                            syncQueueDao.delete(item)
                        }
                    }

                    // Marcar como completado
                    syncQueueDao.markAsCompleted(item.id)
                    successCount++

                    Log.d(TAG, "✅ Sincronizado: ${item.entityType} ${item.entityId}")

                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error sincronizando item ${item.id}", e)

                    // Calcular próximo reintento con backoff exponencial
                    val nextRetry = System.currentTimeMillis() + item.getNextRetryDelay()

                    // Marcar como fallido
                    syncQueueDao.markAsFailed(
                        item.id,
                        error = e.message ?: "Error desconocido",
                        nextRetry = nextRetry
                    )

                    failCount++
                }
            }

            // Limpiar items completados antiguos (más de 7 días)
            val cutoffTime = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000L)
            syncQueueDao.deleteOldCompleted(cutoffTime)

            // Limpiar items que excedieron intentos
            syncQueueDao.deleteExceededAttempts()

            // Limpiar visitas antiguas sincronizadas
            visitDao.deleteOldSynced(System.currentTimeMillis() - (90 * 24 * 60 * 60 * 1000L))

            Log.d(TAG, "✅ Sincronización completada: $successCount exitosos, $failCount fallidos")

            // Retornar éxito si sincronizamos al menos algo, o si no había nada
            if (failCount == 0 || successCount > 0) {
                Result.success()
            } else {
                Result.retry()
            }

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error general en sincronización", e)
            Result.retry()
        } finally {
            networkManager.cleanup()
        }
    }

    /**
     * Sincroniza una visita con Firestore
     */
    private suspend fun syncVisit(item: SyncQueue) {
        val visit = gson.fromJson(item.dataJson, Visit::class.java)

        when (item.operation) {
            SyncQueue.OP_CREATE, SyncQueue.OP_UPDATE -> {
                firestore.collection("visits")
                    .document(visit.id)
                    .set(visit)
                    .await()

                // Marcar como sincronizado en Room
                visitDao.markAsSynced(visit.id)
            }

            SyncQueue.OP_DELETE -> {
                firestore.collection("visits")
                    .document(visit.id)
                    .delete()
                    .await()

                // Eliminar de Room
                val localVisit = visitDao.getById(visit.id)
                localVisit?.let { visitDao.delete(it) }
            }
        }
    }

    /**
     * Sincroniza un prospecto con Firestore
     */
    private suspend fun syncProspect(item: SyncQueue) {
        val prospect = gson.fromJson(item.dataJson, ProspectoAviva::class.java)

        when (item.operation) {
            SyncQueue.OP_CREATE, SyncQueue.OP_UPDATE -> {
                firestore.collection("prospectos")
                    .document(prospect.id)
                    .set(prospect)
                    .await()

                // Marcar como sincronizado en Room
                prospectDao.markAsSynced(prospect.id)
            }

            SyncQueue.OP_DELETE -> {
                firestore.collection("prospectos")
                    .document(prospect.id)
                    .delete()
                    .await()

                // Eliminar de Room
                val localProspect = prospectDao.getById(prospect.id)
                localProspect?.let { prospectDao.delete(it) }
            }
        }
    }
}
