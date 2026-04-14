package com.promotoresavivatunegocio_1

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.firebase.auth.FirebaseAuth

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val trigger = when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED -> "reinicio del dispositivo"
            Intent.ACTION_MY_PACKAGE_REPLACED -> "actualización de la app"
            else -> return
        }

        Log.d(TAG, "Evento recibido: $trigger – verificando si debe iniciar el servicio")

        val auth = FirebaseAuth.getInstance()
        if (auth.currentUser != null) {
            Log.d(TAG, "Usuario autenticado encontrado, iniciando servicio de ubicación tras $trigger")

            val serviceIntent = Intent(context, LocationService::class.java).apply {
                action = LocationService.ACTION_START_TRACKING
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, serviceIntent)
            } else {
                context.startService(serviceIntent)
            }

            // Reprogramar alarmas de recordatorio de asistencia
            AttendanceAlarmScheduler.scheduleAll(context)
            Log.d(TAG, "Alarmas de recordatorio reprogramadas")
        } else {
            Log.d(TAG, "No hay usuario autenticado, no se inicia el servicio")
        }
    }
}