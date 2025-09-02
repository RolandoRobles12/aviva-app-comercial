package com.promotoresavivatunegocio_1.services

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Handler
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
import kotlin.collections.ArrayList

class LocationTrackingService : Service() {

    private lateinit var fusedLocationProviderClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    // Cola para ubicaciones pendientes cuando no hay conexión
    private val pendingLocations = ArrayList<Map<String, Any>>()

    // Handler para verificaciones periódicas
    private val handler = Handler(Looper.getMainLooper())
    private var permissionCheckRunnable: Runnable? = null
    private var syncRunnable: Runnable? = null

    companion object {
        private const val TAG = "LocationTrackingService"
        private const val CHANNEL_ID = "location_tracking_channel"
        private const val NOTIFICATION_ID = 12345
        private const val LOCATION_INTERVAL = 15 * 60 * 1000L // 15 minutos
        private const val FASTEST_INTERVAL = 8 * 60 * 1000L // 8 minutos
        private const val MIN_DISPLACEMENT = 75f // 75 metros
        private const val MAX_RETRY_ATTEMPTS = 3
        private const val RETRY_DELAY = 30 * 1000L // 30 segundos
        private const val PERMISSION_CHECK_INTERVAL = 2 * 60 * 1000L // 2 minutos
        private const val SYNC_CHECK_INTERVAL = 5 * 60 * 1000L // 5 minutos

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
        startPeriodicChecks()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Servicio de tracking iniciado")

        if (!hasRequiredPermissions()) {
            Log.e(TAG, "Permisos insuficientes para tracking")
            showPermissionErrorNotification()
            // No detener el servicio, solo mostrar error
            return START_STICKY
        }

        if (!isUserAuthenticated()) {
            Log.e(TAG, "Usuario no autenticado")
            showAuthErrorNotification()
            return START_STICKY
        }

        val notification = createNotification("Servicio activo")
        startForeground(NOTIFICATION_ID, notification)
        startLocationUpdates()

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun hasRequiredPermissions(): Boolean {
        val fineLocation = ActivityCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val backgroundLocation = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ActivityCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // No necesario en versiones anteriores
        }

        Log.d(TAG, "Permisos - Fine: $fineLocation, Background: $backgroundLocation")
        return fineLocation && backgroundLocation
    }

    private fun isUserAuthenticated(): Boolean {
        return auth.currentUser != null
    }

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

    private fun createNotification(contentText: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Promotores Aviva Tu Negocio")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation) // Icono del sistema como respaldo
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun showPermissionErrorNotification() {
        val notification = createNotification("Configurar permisos de ubicación 'Todo el tiempo'")
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun showAuthErrorNotification() {
        val notification = createNotification("Error de autenticación - Inicia sesión")
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun updateNotification(text: String) {
        val notification = createNotification(text)
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun createLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)

                locationResult.lastLocation?.let { location ->
                    if (isValidLocation(location)) {
                        Log.d(TAG, "Nueva ubicación recibida: ${location.latitude}, ${location.longitude}")
                        saveLocationToFirebase(location)
                    } else {
                        Log.w(TAG, "Ubicación inválida recibida: ${location.latitude}, ${location.longitude}")
                    }
                }
            }

            override fun onLocationAvailability(locationAvailability: LocationAvailability) {
                super.onLocationAvailability(locationAvailability)
                Log.d(TAG, "Disponibilidad de ubicación: ${locationAvailability.isLocationAvailable}")

                if (!locationAvailability.isLocationAvailable) {
                    updateNotification("GPS no disponible")
                }
            }
        }
    }

    private fun isValidLocation(location: Location): Boolean {
        // Validar que las coordenadas estén en rangos geográficos válidos
        val lat = location.latitude
        val lng = location.longitude

        return lat != 0.0 && lng != 0.0 &&
                lat >= -90.0 && lat <= 90.0 &&
                lng >= -180.0 && lng <= 180.0 &&
                location.accuracy <= 500 // Precisión no mayor a 500 metros
    }

    private fun startLocationUpdates() {
        if (!hasRequiredPermissions()) {
            Log.e(TAG, "No hay permisos para iniciar ubicaciones")
            showPermissionErrorNotification()
            return
        }

        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY, // Balanceado para baja gama
            LOCATION_INTERVAL
        ).apply {
            setMinUpdateDistanceMeters(MIN_DISPLACEMENT)
            setMinUpdateIntervalMillis(FASTEST_INTERVAL)
            setMaxUpdateDelayMillis(LOCATION_INTERVAL * 2)
            setWaitForAccurateLocation(false) // No esperar GPS perfecto
        }.build()

        try {
            fusedLocationProviderClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
            Log.d(TAG, "Actualizaciones de ubicación iniciadas")
            updateNotification("Servicio activo")
        } catch (e: SecurityException) {
            Log.e(TAG, "Error de seguridad al solicitar ubicaciones", e)
            showPermissionErrorNotification()
        }
    }

    private fun saveLocationToFirebase(location: Location, retryCount: Int = 0) {
        if (!isUserAuthenticated()) {
            Log.w(TAG, "Usuario no autenticado, no se guarda ubicación")
            showAuthErrorNotification()
            return
        }

        val locationData: Map<String, Any> = mapOf(
            "userId" to auth.currentUser!!.uid,
            "location" to GeoPoint(location.latitude, location.longitude),
            "timestamp" to Timestamp.now(),
            "accuracy" to location.accuracy.toDouble(),
            "provider" to (location.provider ?: "unknown"),
            "speed" to if (location.hasSpeed()) location.speed.toDouble() else 0.0,
            "bearing" to if (location.hasBearing()) location.bearing.toDouble() else 0.0,
            "retryCount" to retryCount
        )

        if (isNetworkAvailable()) {
            // Conexión disponible - intentar guardar
            db.collection("locations")
                .add(locationData)
                .addOnSuccessListener { documentReference ->
                    Log.d(TAG, "Ubicación guardada: ${documentReference.id}")
                    updateNotification("Servicio activo")

                    // Si hay ubicaciones pendientes, sincronizar
                    if (pendingLocations.isNotEmpty()) {
                        syncPendingLocations()
                    }
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "Error guardando ubicación (intento ${retryCount + 1})", e)

                    if (retryCount < MAX_RETRY_ATTEMPTS) {
                        // Reintentar después de un delay
                        handler.postDelayed({
                            saveLocationToFirebase(location, retryCount + 1)
                        }, RETRY_DELAY)

                        updateNotification("Reintentando...")
                    } else {
                        // Máximo de intentos alcanzado, guardar localmente
                        Log.w(TAG, "Máximo de reintentos alcanzado, guardando localmente")
                        pendingLocations.add(locationData)
                        updateNotification("Sin conexión - guardando localmente")
                    }
                }
        } else {
            // Sin conexión - guardar localmente
            Log.d(TAG, "Sin conexión, guardando ubicación localmente")
            pendingLocations.add(locationData)
            updateNotification("Sin conexión - guardando localmente")
        }
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                    capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo
            networkInfo?.isConnected == true
        }
    }

    private fun syncPendingLocations() {
        if (pendingLocations.isEmpty() || !isNetworkAvailable()) {
            return
        }

        Log.d(TAG, "Sincronizando ${pendingLocations.size} ubicaciones pendientes")

        val locationsToSync = ArrayList(pendingLocations)
        pendingLocations.clear()

        for (locationData in locationsToSync) {
            db.collection("locations")
                .add(locationData)
                .addOnSuccessListener { documentReference ->
                    Log.d(TAG, "Ubicación pendiente sincronizada: ${documentReference.id}")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "Error sincronizando ubicación pendiente", e)
                    // Volver a agregar a la cola si falla
                    pendingLocations.add(locationData)
                }
        }

        if (pendingLocations.isEmpty()) {
            updateNotification("Servicio activo")
        }
    }

    private fun startPeriodicChecks() {
        // Verificación periódica de permisos
        permissionCheckRunnable = object : Runnable {
            override fun run() {
                if (!hasRequiredPermissions()) {
                    Log.w(TAG, "Permisos perdidos durante ejecución")
                    showPermissionErrorNotification()
                } else if (!isUserAuthenticated()) {
                    Log.w(TAG, "Usuario desautenticado durante ejecución")
                    showAuthErrorNotification()
                }

                handler.postDelayed(this, PERMISSION_CHECK_INTERVAL)
            }
        }

        // Verificación periódica de sincronización
        syncRunnable = object : Runnable {
            override fun run() {
                if (pendingLocations.isNotEmpty() && isNetworkAvailable()) {
                    syncPendingLocations()
                }
                handler.postDelayed(this, SYNC_CHECK_INTERVAL)
            }
        }

        handler.postDelayed(permissionCheckRunnable!!, PERMISSION_CHECK_INTERVAL)
        handler.postDelayed(syncRunnable!!, SYNC_CHECK_INTERVAL)
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Servicio de tracking destruido")

        // Detener verificaciones periódicas
        permissionCheckRunnable?.let { handler.removeCallbacks(it) }
        syncRunnable?.let { handler.removeCallbacks(it) }

        try {
            fusedLocationProviderClient.removeLocationUpdates(locationCallback)
        } catch (e: Exception) {
            Log.e(TAG, "Error removiendo actualizaciones de ubicación", e)
        }

        // Intentar sincronizar ubicaciones pendientes antes de cerrar
        if (pendingLocations.isNotEmpty() && isNetworkAvailable()) {
            Log.d(TAG, "Sincronizando ${pendingLocations.size} ubicaciones antes de cerrar")
            syncPendingLocations()
        }
    }
}