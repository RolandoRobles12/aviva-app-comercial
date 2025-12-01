package com.promotoresavivatunegocio_1

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat

class LocationManager private constructor(private val context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val TAG = "LocationManager"
        private const val KEY_TRACKING_ENABLED = "tracking_enabled"

        @Volatile
        private var INSTANCE: LocationManager? = null

        fun getInstance(context: Context): LocationManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: LocationManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    var isTrackingEnabled: Boolean
        get() = prefs.getBoolean(KEY_TRACKING_ENABLED, false)
        private set(value) = prefs.edit().putBoolean(KEY_TRACKING_ENABLED, value).apply()

    fun startTracking(): Boolean {
        if (!hasLocationPermissions()) {
            Log.w(TAG, "No hay permisos de ubicación para iniciar tracking")
            return false
        }

        if (isTrackingEnabled) {
            Log.d(TAG, "Tracking ya está activo")
            return true
        }

        try {
            // CORREGIDO: Usar LocationService en lugar de LocationTrackingService
            val intent = Intent(context, LocationService::class.java).apply {
                action = LocationService.ACTION_START_TRACKING
            }
            ContextCompat.startForegroundService(context, intent)

            isTrackingEnabled = true
            Log.d(TAG, "✅ Tracking iniciado exitosamente")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error iniciando tracking", e)
            return false
        }
    }

    fun stopTracking() {
        if (!isTrackingEnabled) {
            Log.d(TAG, "Tracking ya está inactivo")
            return
        }

        try {
            // CORREGIDO: Usar LocationService en lugar de LocationTrackingService
            val intent = Intent(context, LocationService::class.java).apply {
                action = LocationService.ACTION_STOP_TRACKING
            }
            context.startService(intent)

            isTrackingEnabled = false
            Log.d(TAG, "✅ Tracking detenido exitosamente")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error deteniendo tracking", e)
        }
    }

    fun hasLocationPermissions(): Boolean {
        val fineLocationGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val coarseLocationGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        Log.d(TAG, "📍 Permisos - Fine: $fineLocationGranted, Coarse: $coarseLocationGranted")
        return fineLocationGranted && coarseLocationGranted
    }

    fun hasBackgroundLocationPermission(): Boolean {
        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            val backgroundGranted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

            Log.d(TAG, "🔙 Permiso background: $backgroundGranted")
            backgroundGranted
        } else {
            true // No se requiere en versiones anteriores a Android 10
        }
    }

    fun getAllRequiredPermissions(): Array<String> {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            permissions.add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        Log.d(TAG, "📋 Permisos requeridos: ${permissions.joinToString(", ")}")
        return permissions.toTypedArray()
    }

    fun getTrackingStatus(): String {
        return when {
            !hasLocationPermissions() -> "❌ Sin permisos de ubicación"
            !hasBackgroundLocationPermission() -> "⚠️ Sin permiso de ubicación en segundo plano"
            isTrackingEnabled -> "✅ Tracking activo"
            else -> "⏸️ Tracking inactivo"
        }
    }

    fun forceStopTracking() {
        try {
            val intent = Intent(context, LocationService::class.java).apply {
                action = LocationService.ACTION_STOP_TRACKING
            }
            context.stopService(intent)
            isTrackingEnabled = false
            Log.d(TAG, "🛑 Tracking forzadamente detenido")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error en force stop", e)
        }
    }

    fun restartTracking(): Boolean {
        Log.d(TAG, "🔄 Reiniciando tracking...")
        forceStopTracking()

        // Esperar un momento antes de reiniciar (sin bloquear el hilo principal)
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            startTracking()
        }, 1000)

        return true
    }
}