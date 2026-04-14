package com.promotoresavivatunegocio_1.workers

import android.app.ActivityManager
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
            if (isLocationServiceRunning()) {
                Log.d(TAG, "LocationService ya está activo, no se requiere reinicio")
            } else {
                Log.d(TAG, "LocationService no está activo – reiniciando")
                val serviceIntent = Intent(applicationContext, LocationService::class.java).apply {
                    action = LocationService.ACTION_START_TRACKING
                }
                ContextCompat.startForegroundService(applicationContext, serviceIntent)
                Log.d(TAG, "LocationService reiniciado exitosamente")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al reiniciar LocationService: ${e.message}", e)
            return Result.retry()
        }

        return Result.success()
    }

    @Suppress("DEPRECATION")
    private fun isLocationServiceRunning(): Boolean {
        return try {
            val activityManager =
                applicationContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            activityManager.getRunningServices(Int.MAX_VALUE)
                .any { it.service.className == LocationService::class.java.name }
        } catch (e: Exception) {
            Log.w(TAG, "No se pudo verificar estado del servicio: ${e.message}")
            false // Asumir que no está corriendo y reiniciar
        }
    }
}
