package com.promotoresavivatunegocio_1

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.GeoPoint
import models.LocationConfig
import models.LocationAlert
import models.User
import models.Kiosk
import models.KioskVisit
import java.text.SimpleDateFormat
import java.util.*

class LocationService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore

    // Variables para controlar el seguimiento
    private var isTrackingActive = false
    private var lastLocationTime = 0L
    private var totalLocationsRecorded = 0
    private var lastKnownLocation: Location? = null
    private var workHoursHandler: android.os.Handler? = null
    private var workHoursRunnable: Runnable? = null
    private var serviceStartTime = 0L

    // Variables para detección de parada prolongada (≥90 min en el mismo punto)
    private var stationaryRefLocation: Location? = null
    private var stationaryStartTime = 0L
    private var stationaryNotificationSent = false

    // Configuración y datos del usuario
    private var currentUser: User? = null
    private var locationConfig: LocationConfig? = null
    private var assignedKiosk: Kiosk? = null
    private var currentVisit: KioskVisit? = null
    private var lastAlertTime = 0L // Para evitar spam de alertas

    companion object {
        private const val TAG = "LocationService"
        // ID nuevo: permite cambiar la importancia (Android no deja bajarla en un canal ya creado)
        private const val CHANNEL_ID = "location_service_silent_v2"
        private const val CHANNEL_ID_STATIONARY = "StationaryAlertChannel"
        private const val NOTIFICATION_ID = 1001
        private const val NOTIFICATION_ID_STATIONARY = 1002

        // CONFIGURACION: Cada 5 minutos
        private const val LOCATION_INTERVAL = 5 * 60 * 1000L  // 5 minutos
        private const val FASTEST_INTERVAL = 2 * 60 * 1000L   // 2 minutos mínimo

        // FILTROS DE CALIDAD
        private const val MIN_ACCURACY = 100f // Precisión mínima 100 metros (ajustado para edificios/zonas urbanas)
        private const val MIN_DISTANCE_CHANGE = 10f // Cambio mínimo 10 metros

        // HORARIO LABORAL: 9 AM a 7 PM
        private const val WORK_START_HOUR = 9  // 9 AM
        private const val WORK_END_HOUR = 19   // 7 PM (19:00)

        // ALERTAS: Intervalo mínimo entre alertas para evitar spam
        private const val ALERT_INTERVAL = 30 * 60 * 1000L // 30 minutos entre alertas

        // ALERTA DE PARADA PROLONGADA
        private const val STATIONARY_THRESHOLD_MS = 90 * 60 * 1000L // 90 minutos sin movimiento
        private const val STATIONARY_MOVE_THRESHOLD_M = 100f         // 100m para considerar que se movió

        // ACCIONES DE CONTROL
        const val ACTION_START_TRACKING = "START_TRACKING"
        const val ACTION_STOP_TRACKING = "STOP_TRACKING"
        const val ACTION_CHECK_WORK_HOURS = "CHECK_WORK_HOURS"
    }

    override fun onCreate() {
        super.onCreate()
        serviceStartTime = System.currentTimeMillis()
        Log.d(TAG, "🚀 LocationService creado - ${getCurrentTimeString()}")

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        auth = FirebaseAuth.getInstance()
        db = FirebaseFirestore.getInstance()

        createNotificationChannel()
        setupLocationCallback()

        Log.d(TAG, "✅ LocationService inicializado correctamente")
        Log.d(TAG, "📋 Configuración actual:")
        Log.d(TAG, "   - Intervalo de ubicación: ${LOCATION_INTERVAL / 1000 / 60} minutos")
        Log.d(TAG, "   - Precisión mínima: ${MIN_ACCURACY}m")
        Log.d(TAG, "   - Horario laboral: ${WORK_START_HOUR}:00 - ${WORK_END_HOUR}:00")
        Log.d(TAG, "   - Usuario autenticado: ${auth.currentUser?.email ?: "No autenticado"}")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: "DEFAULT"
        Log.d(TAG, "📨 LocationService onStartCommand - Acción: $action")

        // Llamar startForeground() inmediatamente para satisfacer el requisito de Android:
        // startForegroundService() DEBE ir seguido de startForeground() en menos de ~5 segundos.
        val immediateNotification = createNotification()
        startForeground(NOTIFICATION_ID, immediateNotification)

        when (action) {
            ACTION_STOP_TRACKING -> {
                Log.d(TAG, "🛑 Solicitud de detener tracking")
                stopLocationTracking()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_CHECK_WORK_HOURS -> {
                Log.d(TAG, "⏰ Verificación de horario laboral solicitada")
                checkWorkHoursAndManageTracking()
                return START_STICKY
            }
            ACTION_START_TRACKING -> {
                Log.d(TAG, "🎯 Inicio puntual de tracking solicitado (alarma exacta)")
                startLocationTracking()
            }
            else -> {
                Log.d(TAG, "🎯 Iniciando verificación de horario y tracking")
                if (isWithinWorkHours()) {
                    startLocationTracking()
                } else {
                    startWorkHoursMonitoring()
                }
            }
        }

        return START_STICKY // Reiniciar automáticamente si se mata
    }

    private fun setupLocationCallback() {
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)

                locationResult.lastLocation?.let { location ->
                    Log.d(TAG, "📍 Nueva ubicación recibida: ${location.latitude}, ${location.longitude} (Precisión: ${location.accuracy}m)")
                    processLocationUpdate(location)
                }
            }

            override fun onLocationAvailability(locationAvailability: LocationAvailability) {
                super.onLocationAvailability(locationAvailability)

                val isAvailable = locationAvailability.isLocationAvailable
                Log.d(TAG, "📡 GPS disponibilidad: $isAvailable")

                if (!isAvailable) {
                    Log.w(TAG, "⚠️ GPS no disponible - Ubicaciones pueden ser imprecisas")
                }
            }
        }
    }

    private fun startLocationTracking() {
        if (isTrackingActive) {
            Log.d(TAG, "⚠️ Seguimiento ya activo - Tiempo activo: ${(System.currentTimeMillis() - serviceStartTime) / 1000 / 60} min")
            return
        }

        // Verificar horario laboral ANTES de iniciar
        if (!isWithinWorkHours()) {
            Log.d(TAG, "🕐 Fuera de horario laboral - Iniciando monitoreo de horario")
            startWorkHoursMonitoring()
            return
        }

        // Verificar permisos
        if (!checkLocationPermissions()) {
            Log.w(TAG, "❌ Sin permisos de ubicación")
            stopSelf()
            return
        }

        // Verificar usuario autenticado
        val currentUser = auth.currentUser
        if (currentUser == null) {
            Log.w(TAG, "❌ Usuario no autenticado")
            stopSelf()
            return
        }

        try {
            // Detener monitoreo de horario si estaba activo
            stopWorkHoursMonitoring()

            // Actualizar la notificación de foreground (ya fue iniciada en onStartCommand)
            val notification = createNotification()
            startForeground(NOTIFICATION_ID, notification)

            // Configurar y solicitar actualizaciones
            requestLocationUpdates()

            // Cargar configuración del usuario y ubicación asignada
            loadUserConfiguration()

            // Marcar como activo
            isTrackingActive = true
            totalLocationsRecorded = 0
            lastLocationTime = System.currentTimeMillis()

            Log.d(TAG, "✅ Seguimiento iniciado correctamente - ${getCurrentTimeString()}")
            Log.d(TAG, "📊 Estado del servicio:")
            Log.d(TAG, "   - Tiempo de servicio: ${(System.currentTimeMillis() - serviceStartTime) / 1000 / 60} min")
            Log.d(TAG, "   - Usuario: ${currentUser.email}")
            Log.d(TAG, "   - Tracking activo: $isTrackingActive")

        } catch (e: Exception) {
            Log.e(TAG, "💥 Error al iniciar seguimiento: ${e.message}", e)
            stopSelf()
        }
    }

    private fun stopLocationTracking() {
        if (!isTrackingActive) {
            Log.d(TAG, "⚠️ Seguimiento ya detenido")
            return
        }

        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            isTrackingActive = false

            val sessionDuration = (System.currentTimeMillis() - lastLocationTime) / 1000 / 60

            Log.d(TAG, "🛑 Seguimiento detenido - ${getCurrentTimeString()}")
            Log.d(TAG, "📊 Estadísticas de la sesión:")
            Log.d(TAG, "   - Ubicaciones registradas: $totalLocationsRecorded")
            Log.d(TAG, "   - Duración de sesión: ${sessionDuration} min")
            Log.d(TAG, "   - Tiempo total de servicio: ${(System.currentTimeMillis() - serviceStartTime) / 1000 / 60} min")

            // Si estamos fuera de horario, iniciar monitoreo de horario
            if (!isWithinWorkHours()) {
                startWorkHoursMonitoring()
            }

        } catch (e: Exception) {
            Log.e(TAG, "💥 Error al detener seguimiento: ${e.message}", e)
        }
    }

    private fun processLocationUpdate(location: Location) {
        // Verificar horario laboral PRIMERO
        if (!isWithinWorkHours()) {
            Log.d(TAG, "🕐 Fuera de horario laboral - No registrar ubicación")
            stopLocationTracking()
            startWorkHoursMonitoring()
            return
        }

        val currentTime = System.currentTimeMillis()

        // Verificar precision (LocationRequest ya maneja el intervalo de tiempo)
        if (location.accuracy > MIN_ACCURACY) {
            Log.w(TAG, "📡 Precisión baja: ${location.accuracy}m (requerido: <${MIN_ACCURACY}m) - Descartando")
            return
        }

        // Verificar distancia minima (opcional)
        lastKnownLocation?.let { lastLoc ->
            val distance = location.distanceTo(lastLoc)
            if (distance < MIN_DISTANCE_CHANGE) {
                Log.d(TAG, "📏 Distancia pequeña: ${distance}m - Pero registrando por tiempo transcurrido")
            }
        }

        // Validar ubicación según productLine (genera alertas si es necesario)
        validateLocationForProductLine(location)

        // Ubicacion valida - Procesar
        totalLocationsRecorded++
        lastLocationTime = currentTime
        lastKnownLocation = location

        val timeStr = getCurrentTimeString()

        Log.d(TAG, "✅ Ubicación #$totalLocationsRecorded registrada:")
        Log.d(TAG, "   - Coordenadas: ${location.latitude}, ${location.longitude}")
        Log.d(TAG, "   - Precisión: ${location.accuracy}m")
        Log.d(TAG, "   - Hora: $timeStr")
        Log.d(TAG, "   - Proveedor: ${location.provider}")
        Log.d(TAG, "   - Velocidad: ${if (location.hasSpeed()) "${location.speed} m/s" else "N/A"}")

        // Mantener notificación foreground con texto neutro (sin datos de ubicación)
        // La notificación de parada prolongada se gestiona en checkStationaryAlert()

        // Verificar si lleva 90+ minutos en el mismo punto
        checkStationaryAlert(location)

        // Guardar en Firestore
        saveLocationToFirestore(location)
    }

    private fun checkLocationPermissions(): Boolean {
        val fineLocationGranted = ContextCompat.checkSelfPermission(
            this, android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val coarseLocationGranted = ContextCompat.checkSelfPermission(
            this, android.Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        Log.d(TAG, "🔐 Permisos - Fine: $fineLocationGranted, Coarse: $coarseLocationGranted")
        return fineLocationGranted && coarseLocationGranted
    }

    private fun requestLocationUpdates() {
        if (!checkLocationPermissions()) {
            Log.w(TAG, "❌ Sin permisos para solicitar ubicación")
            return
        }

        try {
            val locationRequest = LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY,
                LOCATION_INTERVAL
            ).apply {
                setMinUpdateIntervalMillis(FASTEST_INTERVAL)
                setWaitForAccurateLocation(false)
                setMaxUpdateDelayMillis(LOCATION_INTERVAL) // Evitar batching de ubicaciones
            }.build()

            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )

            Log.d(TAG, "📡 Actualizaciones de ubicación configuradas correctamente")

        } catch (e: SecurityException) {
            Log.e(TAG, "🔒 Error de seguridad: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error al configurar ubicación: ${e.message}")
        }
    }

    private fun saveLocationToFirestore(location: Location) {
        val userId = auth.currentUser?.uid
        val userEmail = auth.currentUser?.email

        if (userId == null) {
            Log.w(TAG, "❌ Usuario no autenticado - No se puede guardar")
            return
        }

        try {
            val locationData = hashMapOf(
                "userId" to userId,
                "userEmail" to userEmail,
                "location" to GeoPoint(location.latitude, location.longitude),
                "latitude" to location.latitude,
                "longitude" to location.longitude,
                "accuracy" to location.accuracy,
                "timestamp" to com.google.firebase.Timestamp.now(),
                "speed" to if (location.hasSpeed()) location.speed else null,
                "bearing" to if (location.hasBearing()) location.bearing else null,
                "altitude" to if (location.hasAltitude()) location.altitude else null,
                "provider" to (location.provider ?: "unknown"),
                "recordType" to "automatic_tracking",
                "recordedAt" to getCurrentTimeString(),
                "sessionId" to totalLocationsRecorded,
                "serviceUptime" to (System.currentTimeMillis() - serviceStartTime) / 1000 / 60 // minutos
            )

            // Usar timestamp para ID único
            val documentId = "${userId}_${System.currentTimeMillis()}"

            Log.d(TAG, "💾 Guardando en Firestore: colección 'locations', documento '$documentId'")

            db.collection("locations")
                .document(documentId)
                .set(locationData)
                .addOnSuccessListener {
                    Log.d(TAG, "✅ Ubicación guardada exitosamente: $documentId")
                    updateUserLastLocation(userId, location)
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "💥 Error al guardar ubicación: ${e.message}", e)
                }

        } catch (e: Exception) {
            Log.e(TAG, "💥 Error al procesar ubicación: ${e.message}", e)
        }
    }

    private fun updateUserLastLocation(userId: String, location: Location) {
        try {
            val userUpdate = hashMapOf(
                "lastLocation" to GeoPoint(location.latitude, location.longitude),
                "lastLocationUpdate" to com.google.firebase.Timestamp.now(),
                "lastLocationAccuracy" to location.accuracy,
                "lastLocationProvider" to location.provider,
                "isLocationActive" to true
            )

            db.collection("users").document(userId)
                .update(userUpdate as Map<String, Any>)
                .addOnSuccessListener {
                    Log.d(TAG, "👤 Usuario actualizado con última ubicación")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "💥 Error al actualizar usuario: ${e.message}", e)
                }

        } catch (e: Exception) {
            Log.e(TAG, "💥 Error al actualizar usuario: ${e.message}", e)
        }
    }

    // ============================================================================
    // DETECCIÓN DE PARADA PROLONGADA
    // ============================================================================

    /**
     * Verifica si el usuario lleva ≥90 minutos sin moverse más de 100 metros.
     * Si es así, envía una notificación. Se resetea cuando el usuario se mueve.
     */
    private fun checkStationaryAlert(location: Location) {
        val ref = stationaryRefLocation
        if (ref == null) {
            // Primera ubicación: inicializar referencia
            stationaryRefLocation = location
            stationaryStartTime = System.currentTimeMillis()
            stationaryNotificationSent = false
            return
        }

        val distance = location.distanceTo(ref)
        if (distance > STATIONARY_MOVE_THRESHOLD_M) {
            // El usuario se movió significativamente — reiniciar
            stationaryRefLocation = location
            stationaryStartTime = System.currentTimeMillis()
            stationaryNotificationSent = false
            // Cancelar notificación previa si existe
            val nm = getSystemService(NotificationManager::class.java)
            nm?.cancel(NOTIFICATION_ID_STATIONARY)
            Log.d(TAG, "📍 Usuario se movió ${distance.toInt()}m — reiniciando contador de parada")
        } else {
            val elapsedMs = System.currentTimeMillis() - stationaryStartTime
            Log.d(TAG, "⏱️ Sin movimiento significativo: ${elapsedMs / 60000} min en el mismo punto")
            if (elapsedMs >= STATIONARY_THRESHOLD_MS && !stationaryNotificationSent) {
                sendStationaryNotification()
                stationaryNotificationSent = true
            }
        }
    }

    private fun sendStationaryNotification() {
        val nm = getSystemService(NotificationManager::class.java) ?: return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && nm.getNotificationChannel(CHANNEL_ID_STATIONARY) == null
        ) {
            val channel = NotificationChannel(
                CHANNEL_ID_STATIONARY,
                "Alertas de parada prolongada",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Aviso cuando llevas más de 90 minutos en el mismo lugar"
                enableVibration(true)
            }
            nm.createNotificationChannel(channel)
        }

        val tapIntent = PendingIntent.getActivity(
            this, NOTIFICATION_ID_STATIONARY,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID_STATIONARY)
            .setSmallIcon(R.drawable.ic_notifications_24)
            .setContentTitle("¿Sigues en campo?")
            .setContentText("Llevas más de 90 minutos en el mismo punto")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(tapIntent)
            .build()

        nm.notify(NOTIFICATION_ID_STATIONARY, notification)
        Log.d(TAG, "🔔 Notificación de parada prolongada enviada")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "App Comercial Aviva",
                NotificationManager.IMPORTANCE_MIN   // Sin icono en barra de estado
            ).apply {
                description = "Servicio en segundo plano"
                setShowBadge(false)
                enableVibration(false)
                enableLights(false)
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(serviceChannel)
        }
    }

    private fun createNotification(title: String = "App Comercial Aviva", content: String = "Servicio activo"): Notification {
        // Intent para abrir la app
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(R.drawable.ic_notifications_24)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        val serviceLifetime = (System.currentTimeMillis() - serviceStartTime) / 1000 / 60
        Log.d(TAG, "🏁 LocationService destruido - Tiempo de vida: ${serviceLifetime} min")

        try {
            stopLocationTracking()
            stopWorkHoursMonitoring()

            // Marcar usuario como inactivo
            auth.currentUser?.uid?.let { userId ->
                db.collection("users").document(userId)
                    .update("isLocationActive", false)
                    .addOnSuccessListener {
                        Log.d(TAG, "👤 Usuario marcado como inactivo")
                    }
            }

        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en onDestroy: ${e.message}")
        }
    }

    // ============================================================================
    // GESTION DE HORARIO LABORAL
    // ============================================================================

    private fun isWithinWorkHours(): Boolean {
        val calendar = Calendar.getInstance()
        val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
        val currentDay = calendar.get(Calendar.DAY_OF_WEEK)

        // Verificar que sea dia laboral (Lunes a Viernes)
        val isWeekday = currentDay in Calendar.MONDAY..Calendar.FRIDAY

        // Verificar horario (9 AM a 7 PM)
        val isWorkHour = currentHour in WORK_START_HOUR until WORK_END_HOUR

        val result = isWeekday && isWorkHour

        Log.d(TAG, "⏰ Verificación horario laboral:")
        Log.d(TAG, "   - Día: ${getDayName(currentDay)} (Laboral: $isWeekday)")
        Log.d(TAG, "   - Hora: ${currentHour}:${String.format("%02d", calendar.get(Calendar.MINUTE))} (Laboral: $isWorkHour)")
        Log.d(TAG, "   - En horario: $result")

        return result
    }

    private fun getDayName(dayOfWeek: Int): String {
        return when (dayOfWeek) {
            Calendar.SUNDAY -> "Domingo"
            Calendar.MONDAY -> "Lunes"
            Calendar.TUESDAY -> "Martes"
            Calendar.WEDNESDAY -> "Miércoles"
            Calendar.THURSDAY -> "Jueves"
            Calendar.FRIDAY -> "Viernes"
            Calendar.SATURDAY -> "Sábado"
            else -> "Desconocido"
        }
    }

    private fun startWorkHoursMonitoring() {
        Log.d(TAG, "⏰ Iniciando monitoreo de horario laboral")

        // Detener seguimiento de ubicacion activo
        if (isTrackingActive) {
            stopLocationTracking()
        }

        // Iniciar como servicio foreground con notificacion de espera
        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        // Configurar verificacion con intervalo adaptativo
        setupWorkHoursChecker()
    }

    /**
     * Calcula el intervalo óptimo para verificar el horario laboral.
     * - Si faltan ≤5 minutos para la hora de inicio: verifica cada 30 segundos (puntualidad)
     * - Si faltan ≤30 minutos: verifica cada 2 minutos
     * - En otros casos: verifica cada 15 minutos
     */
    private fun getAdaptiveCheckInterval(): Long {
        val calendar = Calendar.getInstance()
        val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
        val currentMinute = calendar.get(Calendar.MINUTE)
        val currentDay = calendar.get(Calendar.DAY_OF_WEEK)

        val isWeekday = currentDay in Calendar.MONDAY..Calendar.FRIDAY

        if (!isWeekday) {
            return 30 * 60 * 1000L // 30 min en fines de semana
        }

        // Minutos restantes para las 9:00 AM
        val minutesToStart = (WORK_START_HOUR * 60) - (currentHour * 60 + currentMinute)

        return when {
            minutesToStart in 1..5 -> 30 * 1000L      // 30 seg si faltan ≤5 min
            minutesToStart in 6..30 -> 2 * 60 * 1000L  // 2 min si faltan ≤30 min
            minutesToStart > 30 -> 15 * 60 * 1000L     // 15 min si falta más
            else -> 15 * 60 * 1000L                    // 15 min después de horario
        }
    }

    private fun setupWorkHoursChecker() {
        // Cancelar checker anterior si existe
        workHoursHandler?.removeCallbacks(workHoursRunnable ?: return)

        workHoursHandler = android.os.Handler(android.os.Looper.getMainLooper())
        workHoursRunnable = Runnable {
            checkWorkHoursAndManageTracking()
        }

        val checkInterval = getAdaptiveCheckInterval()
        workHoursHandler?.postDelayed(workHoursRunnable!!, checkInterval)

        Log.d(TAG, "⏰ Checker de horario configurado (intervalo: ${checkInterval / 1000}s)")
    }

    private fun checkWorkHoursAndManageTracking() {
        Log.d(TAG, "🔄 Verificando horario laboral automáticamente...")

        if (isWithinWorkHours()) {
            Log.d(TAG, "✅ Entrando en horario laboral - Iniciando seguimiento")
            startLocationTracking()
        } else {
            val nextInterval = getAdaptiveCheckInterval()
            Log.d(TAG, "⏰ Fuera de horario laboral - Próxima verificación en ${nextInterval / 1000}s")

            val notification = createNotification()
            startForeground(NOTIFICATION_ID, notification)

            // Programar siguiente verificacion con intervalo adaptativo
            setupWorkHoursChecker()
        }
    }

    private fun stopWorkHoursMonitoring() {
        workHoursHandler?.removeCallbacks(workHoursRunnable ?: return)
        workHoursHandler = null
        workHoursRunnable = null
        Log.d(TAG, "⏰ Monitoreo de horario detenido")
    }

    private fun getCurrentTimeString(): String {
        return SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
    }

    // ============================================================================
    // VALIDACIÓN DE UBICACIÓN SEGÚN PRODUCTLINE
    // ============================================================================

    /**
     * Carga la configuración del usuario y sus datos
     */
    private fun loadUserConfiguration() {
        val userId = auth.currentUser?.uid ?: return

        // Cargar datos del usuario
        db.collection("users").document(userId)
            .get()
            .addOnSuccessListener { document ->
                if (document.exists()) {
                    currentUser = document.toObject(User::class.java)
                    Log.d(TAG, "👤 Usuario cargado: ${currentUser?.displayName} (${currentUser?.getProductLineDisplayName()})")

                    // Cargar kiosco asignado
                    currentUser?.assignedKioskId?.let { kioskId ->
                        loadAssignedKiosk(kioskId)
                    } ?: run {
                        Log.w(TAG, "⚠️ Usuario sin kiosco asignado")
                    }

                    // Cargar configuración legacy (por compatibilidad)
                    loadLocationConfig(userId)
                } else {
                    Log.w(TAG, "⚠️ Documento de usuario no encontrado")
                }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error cargando usuario: ${e.message}")
            }
    }

    /**
     * Carga el kiosco asignado al usuario
     */
    private fun loadAssignedKiosk(kioskId: String) {
        db.collection("kiosks").document(kioskId)
            .get()
            .addOnSuccessListener { document ->
                if (document.exists()) {
                    assignedKiosk = document.toObject(Kiosk::class.java)
                    Log.d(TAG, "🏪 Kiosco cargado: ${assignedKiosk?.name}")
                    Log.d(TAG, "   - Tipo: ${assignedKiosk?.productType}")
                    Log.d(TAG, "   - Radio: ${assignedKiosk?.radiusOverride}m")
                    Log.d(TAG, "   - Ciudad: ${assignedKiosk?.city}, ${assignedKiosk?.state}")
                } else {
                    Log.w(TAG, "⚠️ Kiosco no encontrado: $kioskId")
                }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error cargando kiosco: ${e.message}")
            }
    }

    /**
     * Carga la configuración de ubicación del usuario
     */
    private fun loadLocationConfig(userId: String) {
        db.collection("locationConfigs")
            .whereEqualTo("userId", userId)
            .limit(1)
            .get()
            .addOnSuccessListener { documents ->
                if (!documents.isEmpty) {
                    locationConfig = documents.documents[0].toObject(LocationConfig::class.java)
                    Log.d(TAG, "📍 Configuración de ubicación cargada:")
                    Log.d(TAG, "   - Tipo: ${locationConfig?.validationType}")
                    Log.d(TAG, "   - Radio permitido: ${locationConfig?.allowedRadius}m")
                    Log.d(TAG, "   - Ubicación asignada: ${locationConfig?.assignedLocationName ?: "No asignada"}")
                } else {
                    // Crear configuración default si no existe
                    createDefaultLocationConfig(userId)
                }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error cargando configuración: ${e.message}")
                createDefaultLocationConfig(userId)
            }
    }

    /**
     * Crea una configuración por defecto basada en el productLine del usuario
     */
    private fun createDefaultLocationConfig(userId: String) {
        val user = currentUser ?: return

        val validationType = LocationConfig.getValidationTypeForProductLine(user.productLine)

        val config = LocationConfig(
            userId = userId,
            validationType = validationType,
            allowedRadius = 150f,
            trackingInterval = LOCATION_INTERVAL,
            minAccuracy = MIN_ACCURACY
        )

        db.collection("locationConfigs")
            .add(config)
            .addOnSuccessListener { docRef ->
                locationConfig = config.copy(id = docRef.id)
                Log.d(TAG, "✅ Configuración default creada: ${validationType}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error creando configuración default: ${e.message}")
            }
    }

    /**
     * Valida la ubicación según el productLine del usuario y kiosco asignado
     * Retorna true si la ubicación es válida, false si está fuera del rango
     */
    private fun validateLocationForProductLine(location: Location): Boolean {
        val user = currentUser ?: run {
            Log.w(TAG, "⚠️ Usuario no cargado, no se puede validar ubicación")
            return true // Permitir por default si no hay datos
        }

        val config = locationConfig
        val currentGeoPoint = GeoPoint(location.latitude, location.longitude)

        // Si es vendedor de campo (AVIVA_TU_NEGOCIO, AVIVA_TU_CASA), solo rastrear ruta
        if (config?.validationType == LocationConfig.ValidationType.ROUTE_ONLY) {
            Log.d(TAG, "✅ Vendedor de campo - No requiere validación de ubicación")

            // Si tiene kiosco asignado, rastrear visitas
            assignedKiosk?.let { kiosk ->
                trackKioskVisit(user, kiosk, currentGeoPoint, location.accuracy)
            }

            return true
        }

        // Si es vendedor estático (AVIVA_TU_COMPRA, AVIVA_CONTIGO), validar kiosco asignado
        val kiosk = assignedKiosk
        if (kiosk == null) {
            Log.w(TAG, "⚠️ Vendedor estático sin kiosco asignado")
            createNoKioskAlert(user, location)
            return false
        }

        // Verificar si el kiosco tiene coordenadas configuradas
        if (kiosk.coordinates == null) {
            Log.w(TAG, "⚠️ Kiosco ${kiosk.name} sin coordenadas configuradas")
            createNoKioskConfigAlert(user, kiosk, location)
            return false
        }

        // Verificar si está dentro del radio del kiosco
        val isWithinRadius = kiosk.isWithinRadius(currentGeoPoint)
        val distance = kiosk.getDistanceFrom(currentGeoPoint)

        if (!isWithinRadius) {
            Log.w(TAG, "⚠️ Vendedor estático fuera del kiosco asignado")
            Log.w(TAG, "   - Distancia: ${distance.toInt()}m (permitido: ${kiosk.radiusOverride.toInt()}m)")
            Log.w(TAG, "   - Kiosco: ${kiosk.name}")

            createOutOfBoundsKioskAlert(user, kiosk, location, distance)
        } else {
            Log.d(TAG, "✅ Vendedor estático dentro del kiosco asignado: ${kiosk.name}")
        }

        // Rastrear visita al kiosco
        trackKioskVisit(user, kiosk, currentGeoPoint, location.accuracy)

        return isWithinRadius
    }

    /**
     * Rastrea las visitas al kiosco (check-in/check-out automático)
     */
    private fun trackKioskVisit(user: User, kiosk: Kiosk, location: GeoPoint, accuracy: Float) {
        val isAtKiosk = kiosk.coordinates?.let { coords ->
            val distance = calculateDistance(coords, location)
            distance <= kiosk.radiusOverride
        } ?: false

        if (isAtKiosk && currentVisit == null) {
            // Check-in: Usuario acaba de entrar al kiosco
            checkInToKiosk(user, kiosk, location, accuracy)
        } else if (!isAtKiosk && currentVisit != null) {
            // Check-out: Usuario salió del kiosco
            checkOutFromKiosk(location, accuracy)
        } else if (isAtKiosk && currentVisit != null) {
            Log.d(TAG, "✅ Usuario continúa en kiosco: ${kiosk.name}")
        }
    }

    /**
     * Registra el check-in cuando el usuario entra al kiosco
     */
    private fun checkInToKiosk(user: User, kiosk: Kiosk, location: GeoPoint, accuracy: Float) {
        val visit = hashMapOf(
            "userId" to user.uid,
            "userEmail" to user.email,
            "userName" to user.displayName,
            "kioskId" to kiosk.id,
            "kioskName" to kiosk.name,
            "productType" to kiosk.productType,
            "checkInLocation" to location,
            "checkInTime" to com.google.firebase.Timestamp.now(),
            "checkInAccuracy" to accuracy,
            "status" to "ACTIVE"
        )

        db.collection("kioskVisits")
            .add(visit)
            .addOnSuccessListener { docRef ->
                currentVisit = KioskVisit(
                    id = docRef.id,
                    userId = user.uid,
                    kioskId = kiosk.id,
                    kioskName = kiosk.name,
                    checkInLocation = location
                )
                Log.d(TAG, "✅ Check-in registrado en kiosco: ${kiosk.name}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error en check-in: ${e.message}")
            }
    }

    /**
     * Registra el check-out cuando el usuario sale del kiosco
     */
    private fun checkOutFromKiosk(location: GeoPoint, accuracy: Float) {
        val visit = currentVisit ?: return

        val checkInTime = System.currentTimeMillis() - (15 * 60 * 1000) // Aproximado
        val currentTime = System.currentTimeMillis()
        val durationMinutes = ((currentTime - checkInTime) / 1000 / 60).toInt()

        val updates = hashMapOf(
            "checkOutLocation" to location,
            "checkOutTime" to com.google.firebase.Timestamp.now(),
            "checkOutAccuracy" to accuracy,
            "durationMinutes" to durationMinutes,
            "status" to "COMPLETED"
        )

        db.collection("kioskVisits").document(visit.id)
            .update(updates as Map<String, Any>)
            .addOnSuccessListener {
                Log.d(TAG, "✅ Check-out registrado del kiosco: ${visit.kioskName} (${durationMinutes} min)")
                currentVisit = null
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error en check-out: ${e.message}")
            }
    }

    /**
     * Calcula distancia en metros entre dos GeoPoints
     */
    private fun calculateDistance(point1: GeoPoint, point2: GeoPoint): Float {
        val results = FloatArray(1)
        Location.distanceBetween(
            point1.latitude, point1.longitude,
            point2.latitude, point2.longitude,
            results
        )
        return results[0]
    }

    /**
     * Verifica si se debe crear una alerta (evitar spam)
     */
    private fun shouldCreateAlert(): Boolean {
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastAlertTime < ALERT_INTERVAL) {
            val waitTime = (ALERT_INTERVAL - (currentTime - lastAlertTime)) / 1000 / 60
            Log.d(TAG, "⏱️ Esperando ${waitTime} min antes de crear otra alerta")
            return false
        }
        return true
    }

    /**
     * Crea una alerta de vendedor fuera del kiosco asignado
     */
    private fun createOutOfBoundsKioskAlert(user: User, kiosk: Kiosk, location: Location, distance: Float) {
        if (!shouldCreateAlert()) return

        val alert = hashMapOf(
            "userId" to user.uid,
            "userEmail" to user.email,
            "userName" to user.displayName,
            "kioskId" to kiosk.id,
            "kioskName" to kiosk.name,
            "productType" to kiosk.productType,
            "detectedLocation" to GeoPoint(location.latitude, location.longitude),
            "detectedLocationAccuracy" to location.accuracy,
            "assignedLocation" to kiosk.coordinates!!,
            "assignedLocationName" to kiosk.name,
            "distanceFromAssigned" to distance,
            "allowedRadius" to kiosk.radiusOverride,
            "alertType" to "OUT_OF_BOUNDS",
            "severity" to if (distance > kiosk.radiusOverride * 2) "CRITICAL" else "WARNING",
            "status" to "ACTIVE",
            "detectedAt" to com.google.firebase.Timestamp.now()
        )

        db.collection("locationAlerts")
            .add(alert)
            .addOnSuccessListener { docRef ->
                lastAlertTime = System.currentTimeMillis()
                Log.d(TAG, "🚨 Alerta creada (fuera de kiosco): ${docRef.id}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error creando alerta: ${e.message}")
            }
    }

    /**
     * Crea una alerta de vendedor sin kiosco asignado
     */
    private fun createNoKioskAlert(user: User, location: Location) {
        if (!shouldCreateAlert()) return

        val alert = hashMapOf(
            "userId" to user.uid,
            "userEmail" to user.email,
            "userName" to user.displayName,
            "detectedLocation" to GeoPoint(location.latitude, location.longitude),
            "detectedLocationAccuracy" to location.accuracy,
            "assignedLocation" to GeoPoint(0.0, 0.0),
            "distanceFromAssigned" to 0f,
            "allowedRadius" to 150f,
            "alertType" to "NO_CONFIG",
            "severity" to "WARNING",
            "status" to "ACTIVE",
            "detectedAt" to com.google.firebase.Timestamp.now()
        )

        db.collection("locationAlerts")
            .add(alert)
            .addOnSuccessListener { docRef ->
                lastAlertTime = System.currentTimeMillis()
                Log.d(TAG, "🚨 Alerta creada (sin kiosco asignado): ${docRef.id}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error creando alerta: ${e.message}")
            }
    }

    /**
     * Crea una alerta de kiosco sin coordenadas configuradas
     */
    private fun createNoKioskConfigAlert(user: User, kiosk: Kiosk, location: Location) {
        if (!shouldCreateAlert()) return

        val alert = hashMapOf(
            "userId" to user.uid,
            "userEmail" to user.email,
            "userName" to user.displayName,
            "kioskId" to kiosk.id,
            "kioskName" to kiosk.name,
            "productType" to kiosk.productType,
            "detectedLocation" to GeoPoint(location.latitude, location.longitude),
            "detectedLocationAccuracy" to location.accuracy,
            "assignedLocation" to GeoPoint(0.0, 0.0),
            "distanceFromAssigned" to 0f,
            "allowedRadius" to 150f,
            "alertType" to "NO_CONFIG",
            "severity" to "CRITICAL",
            "status" to "ACTIVE",
            "detectedAt" to com.google.firebase.Timestamp.now()
        )

        db.collection("locationAlerts")
            .add(alert)
            .addOnSuccessListener { docRef ->
                lastAlertTime = System.currentTimeMillis()
                Log.d(TAG, "🚨 Alerta creada (kiosco sin coordenadas): ${docRef.id}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error creando alerta: ${e.message}")
            }
    }
}