package com.promotoresavivatunegocio_1.services

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.GeoPoint
import com.google.firebase.Timestamp
import com.promotoresavivatunegocio_1.R
import java.util.*

class LocationTrackingService : Service() {

    private lateinit var fusedLocationProviderClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    companion object {
        private const val TAG = "LocationTrackingService"
        private const val CHANNEL_ID = "location_tracking_channel"
        private const val NOTIFICATION_ID = 12345
        private const val LOCATION_INTERVAL = 15 * 60 * 1000L // 15 minutos
        private const val FASTEST_INTERVAL = 5 * 60 * 1000L // 5 minutos
        private const val MIN_DISPLACEMENT = 50f // 50 metros

        fun startService(context: Context) {
            val intent = Intent(context, LocationTrackingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, LocationTrackingService::class.java)
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Servicio de tracking creado")

        fusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
        createLocationCallback()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Servicio de tracking iniciado")

        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        startLocationUpdates()

        return START_STICKY // Reiniciar si el sistema mata el servicio
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Tracking de ubicación",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Servicio de tracking de ubicación para rutas"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Promotores Aviva Tu Negocio")
            .setContentText("Registrando ubicación para rutas...")
            .setSmallIcon(R.drawable.ic_notification) // Asegúrate de tener este icono
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)

                locationResult.lastLocation?.let { location ->
                    Log.d(TAG, "Nueva ubicación recibida: ${location.latitude}, ${location.longitude}")
                    saveLocationToFirebase(location)
                }
            }

            override fun onLocationAvailability(locationAvailability: LocationAvailability) {
                super.onLocationAvailability(locationAvailability)
                Log.d(TAG, "Disponibilidad de ubicación: ${locationAvailability.isLocationAvailable}")
            }
        }
    }

    private fun startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "No hay permisos de ubicación")
            stopSelf()
            return
        }

        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            LOCATION_INTERVAL
        ).apply {
            setMinUpdateDistanceMeters(MIN_DISPLACEMENT)
            setMinUpdateIntervalMillis(FASTEST_INTERVAL)
            setMaxUpdateDelayMillis(LOCATION_INTERVAL * 2)
        }.build()

        try {
            fusedLocationProviderClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
            Log.d(TAG, "Actualizaciones de ubicación iniciadas")
        } catch (e: SecurityException) {
            Log.e(TAG, "Error de seguridad al solicitar ubicaciones", e)
            stopSelf()
        }
    }

    private fun saveLocationToFirebase(location: Location) {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            Log.w(TAG, "Usuario no autenticado, no se guarda ubicación")
            return
        }

        val locationData = hashMapOf(
            "userId" to currentUser.uid,
            "location" to GeoPoint(location.latitude, location.longitude),
            "timestamp" to Timestamp.now(),
            "accuracy" to location.accuracy.toDouble(),
            "provider" to (location.provider ?: "unknown"),
            "speed" to if (location.hasSpeed()) location.speed.toDouble() else 0.0,
            "bearing" to if (location.hasBearing()) location.bearing.toDouble() else 0.0
        )

        db.collection("userLocations")
            .add(locationData)
            .addOnSuccessListener { documentReference ->
                Log.d(TAG, "Ubicación guardada: ${documentReference.id}")
                updateNotificationWithLastLocation(location)
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Error guardando ubicación", e)
            }
    }

    private fun updateNotificationWithLastLocation(location: Location) {
        val updatedNotification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Promotores Aviva Tu Negocio")
            .setContentText("Última ubicación: ${String.format("%.6f", location.latitude)}, ${String.format("%.6f", location.longitude)}")
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, updatedNotification)
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Servicio de tracking destruido")

        try {
            fusedLocationProviderClient.removeLocationUpdates(locationCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Error removiendo actualizaciones de ubicación", e)
        }
    }
}