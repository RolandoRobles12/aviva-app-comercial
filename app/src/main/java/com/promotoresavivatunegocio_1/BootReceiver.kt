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
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d(TAG, "Dispositivo reiniciado, verificando si debe iniciar el servicio")

            // Verificar si hay un usuario autenticado
            val auth = FirebaseAuth.getInstance()
            if (auth.currentUser != null) {
                Log.d(TAG, "Usuario autenticado encontrado, iniciando servicio de ubicación")

                val serviceIntent = Intent(context, LocationService::class.java)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ContextCompat.startForegroundService(context, serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } else {
                Log.d(TAG, "No hay usuario autenticado, no se inicia el servicio")
            }
        }
    }
}