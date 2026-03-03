package com.promotoresavivatunegocio_1.workers

import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.LocationService

/**
 * Worker periódico que garantiza que el LocationService esté activo.
 * Se ejecuta cada 15 minutos (mínimo permitido por WorkManager) y reinicia
 * el servicio de tracking si fue detenido por el sistema operativo.
 *
 * Esto resuelve el problema de que los promotores no abran la app y se pierda
 * el track: el servicio se mantiene vivo automáticamente aunque la app esté cerrada.
 */
class TrackingKeepaliveWorker(
    context: Context,
    workerParams: WorkerParameters
) : Worker(context, workerParams) {

    companion object {
        private const val TAG = "TrackingKeepaliveWorker"
        const val WORK_NAME = "tracking_keepalive"
    }

    override fun doWork(): Result {
        val auth = FirebaseAuth.getInstance()
        val currentUser = auth.currentUser

        if (currentUser == null) {
            Log.d(TAG, "No hay usuario autenticado, omitiendo keepalive")
            return Result.success()
        }

        Log.d(TAG, "Keepalive ejecutado para usuario: ${currentUser.email}")

        try {
            val serviceIntent = Intent(applicationContext, LocationService::class.java)
            ContextCompat.startForegroundService(applicationContext, serviceIntent)
            Log.d(TAG, "LocationService reiniciado exitosamente")
        } catch (e: Exception) {
            Log.e(TAG, "Error al reiniciar LocationService: ${e.message}", e)
            return Result.retry()
        }

        return Result.success()
    }
}
