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

    // Configuración y datos del usuario
    private var currentUser: User? = null
    private var locationConfig: LocationConfig? = null
    private var lastAlertTime = 0L // Para evitar spam de alertas

    companion object {
        private const val TAG = "LocationService"
        private const val CHANNEL_ID = "LocationServiceChannel"
        private const val NOTIFICATION_ID = 1001

        // CONFIGURACION: Cada 15 minutos
        private const val LOCATION_INTERVAL = 15 * 60 * 1000L // 15 minutos
        private const val FASTEST_INTERVAL = 5 * 60 * 1000L   // 5 minutos mínimo

        // FILTROS DE CALIDAD
        private const val MIN_ACCURACY = 100f // Precisión mínima 100 metros (ajustado para edificios/zonas urbanas)
        private const val MIN_DISTANCE_CHANGE = 10f // Cambio mínimo 10 metros

        // HORARIO LABORAL: 9 AM a 7 PM
        private const val WORK_START_HOUR = 9  // 9 AM
        private const val WORK_END_HOUR = 19   // 7 PM (19:00)

        // ALERTAS: Intervalo mínimo entre alertas para evitar spam
        private const val ALERT_INTERVAL = 30 * 60 * 1000L // 30 minutos entre alertas

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

            // Iniciar como servicio foreground con notificacion neutra
            val notification = createNotification("Tracking activo", "Registrando ubicación cada 15 minutos")
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

        // Actualizar notificación con estadísticas
        val notification = createNotification(
            "Ubicación #$totalLocationsRecorded registrada",
            "Última: $timeStr • Precisión: ${location.accuracy.toInt()}m"
        )
        startForeground(NOTIFICATION_ID, notification)

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

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Servicio de Ubicación",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Servicio de seguimiento de ubicación en segundo plano"
                setShowBadge(false)
                enableVibration(false)
                enableLights(false)
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(serviceChannel)
        }
    }

    private fun createNotification(title: String = "Aviva Tu Negocio", content: String = "Servicio activo"): Notification {
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
        val notification = createNotification("Esperando horario laboral", "Monitoreo cada 30 minutos")
        startForeground(NOTIFICATION_ID, notification)

        // Configurar verificacion cada 30 minutos
        setupWorkHoursChecker()
    }

    private fun setupWorkHoursChecker() {
        // Cancelar checker anterior si existe
        workHoursHandler?.removeCallbacks(workHoursRunnable ?: return)

        workHoursHandler = android.os.Handler(android.os.Looper.getMainLooper())
        workHoursRunnable = Runnable {
            checkWorkHoursAndManageTracking()
        }

        // Verificar cada 30 minutos
        val checkInterval = 30 * 60 * 1000L // 30 minutos
        workHoursHandler?.postDelayed(workHoursRunnable!!, checkInterval)

        Log.d(TAG, "⏰ Checker de horario configurado (cada 30 min)")
    }

    private fun checkWorkHoursAndManageTracking() {
        Log.d(TAG, "🔄 Verificando horario laboral automáticamente...")

        if (isWithinWorkHours()) {
            Log.d(TAG, "✅ Entrando en horario laboral - Iniciando seguimiento")
            startLocationTracking()
        } else {
            Log.d(TAG, "⏰ Fuera de horario laboral - Manteniendo monitoreo")

            // Actualizar notificación
            val nextCheck = Calendar.getInstance()
            nextCheck.add(Calendar.MINUTE, 30)
            val nextCheckStr = SimpleDateFormat("HH:mm", Locale.getDefault()).format(nextCheck.time)

            val notification = createNotification(
                "Fuera de horario laboral",
                "Próxima verificación: $nextCheckStr"
            )
            startForeground(NOTIFICATION_ID, notification)

            // Programar siguiente verificacion
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

                    // Cargar configuración de ubicación
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
     * Valida la ubicación según el productLine del usuario
     * Retorna true si la ubicación es válida, false si está fuera del rango
     */
    private fun validateLocationForProductLine(location: Location): Boolean {
        val user = currentUser ?: run {
            Log.w(TAG, "⚠️ Usuario no cargado, no se puede validar ubicación")
            return true // Permitir por default si no hay datos
        }

        val config = locationConfig ?: run {
            Log.w(TAG, "⚠️ Configuración no cargada, no se puede validar ubicación")
            return true // Permitir por default si no hay configuración
        }

        // Si es vendedor de campo (AVIVA_TU_NEGOCIO, AVIVA_TU_CASA), no validar ubicación
        if (config.validationType == LocationConfig.ValidationType.ROUTE_ONLY) {
            Log.d(TAG, "✅ Vendedor de campo - No requiere validación de ubicación")
            return true
        }

        // Si es vendedor estático (AVIVA_TU_COMPRA, AVIVA_CONTIGO), validar ubicación asignada
        val assignedLocation = config.assignedLocation
        if (assignedLocation == null) {
            Log.w(TAG, "⚠️ Vendedor estático sin ubicación asignada")
            createNoConfigAlert(user, location)
            return false
        }

        // Verificar si está dentro del radio permitido
        val currentGeoPoint = GeoPoint(location.latitude, location.longitude)
        val isWithinRadius = config.isWithinAllowedRadius(currentGeoPoint)

        if (!isWithinRadius) {
            val distance = calculateDistance(assignedLocation, currentGeoPoint)
            Log.w(TAG, "⚠️ Vendedor estático fuera de ubicación asignada")
            Log.w(TAG, "   - Distancia: ${distance.toInt()}m (permitido: ${config.allowedRadius.toInt()}m)")
            Log.w(TAG, "   - Ubicación asignada: ${config.assignedLocationName}")

            createOutOfBoundsAlert(user, config, location, distance)
        } else {
            Log.d(TAG, "✅ Vendedor estático dentro de ubicación asignada")
        }

        return isWithinRadius
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
     * Crea una alerta de vendedor fuera de ubicación asignada
     */
    private fun createOutOfBoundsAlert(user: User, config: LocationConfig, location: Location, distance: Float) {
        if (!shouldCreateAlert()) return

        val alert = LocationAlert(
            userId = user.uid,
            userEmail = user.email,
            userName = user.displayName,
            detectedLocation = GeoPoint(location.latitude, location.longitude),
            detectedLocationAccuracy = location.accuracy,
            assignedLocation = config.assignedLocation!!,
            assignedLocationName = config.assignedLocationName,
            distanceFromAssigned = distance,
            allowedRadius = config.allowedRadius,
            alertType = LocationAlert.AlertType.OUT_OF_BOUNDS,
            severity = if (distance > config.allowedRadius * 2) {
                LocationAlert.AlertSeverity.CRITICAL
            } else {
                LocationAlert.AlertSeverity.WARNING
            },
            status = LocationAlert.AlertStatus.ACTIVE
        )

        db.collection("locationAlerts")
            .add(alert)
            .addOnSuccessListener { docRef ->
                lastAlertTime = System.currentTimeMillis()
                Log.d(TAG, "🚨 Alerta creada: ${docRef.id}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error creando alerta: ${e.message}")
            }
    }

    /**
     * Crea una alerta de vendedor sin configuración de ubicación
     */
    private fun createNoConfigAlert(user: User, location: Location) {
        if (!shouldCreateAlert()) return

        val alert = LocationAlert(
            userId = user.uid,
            userEmail = user.email,
            userName = user.displayName,
            detectedLocation = GeoPoint(location.latitude, location.longitude),
            detectedLocationAccuracy = location.accuracy,
            assignedLocation = GeoPoint(0.0, 0.0), // Placeholder
            distanceFromAssigned = 0f,
            allowedRadius = 150f,
            alertType = LocationAlert.AlertType.NO_CONFIG,
            severity = LocationAlert.AlertSeverity.WARNING,
            status = LocationAlert.AlertStatus.ACTIVE
        )

        db.collection("locationAlerts")
            .add(alert)
            .addOnSuccessListener { docRef ->
                lastAlertTime = System.currentTimeMillis()
                Log.d(TAG, "🚨 Alerta creada (sin configuración): ${docRef.id}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error creando alerta: ${e.message}")
            }
    }
}