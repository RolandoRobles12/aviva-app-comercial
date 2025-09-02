package com.promotoresavivatunegocio_1.ui.home

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Typeface
import android.location.Location
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.GeoPoint
import com.google.firebase.firestore.Query
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.Timestamp
import com.promotoresavivatunegocio_1.BuildConfig
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.databinding.FragmentHomeBinding
import com.promotoresavivatunegocio_1.models.Visit
import com.promotoresavivatunegocio_1.models.ProspectoAviva
import com.promotoresavivatunegocio_1.adapters.VisitsAdapter
import com.promotoresavivatunegocio_1.services.ProspeccionService
import com.promotoresavivatunegocio_1.services.ProspectosManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.Timer
import java.text.SimpleDateFormat
import java.util.*
import kotlin.coroutines.resume

class HomeFragment : Fragment(), OnMapReadyCallback {

    // ==========================================
    // VARIABLES DE CLASE - TODAS CONSERVADAS + NUEVAS OPTIMIZACIONES
    // ==========================================

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    private lateinit var homeViewModel: HomeViewModel
    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore
    private lateinit var storage: FirebaseStorage
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var googleMap: GoogleMap
    private lateinit var visitsAdapter: VisitsAdapter

    // Variables para Aviva Tu Negocio
    private lateinit var prospeccionService: ProspeccionService
    private lateinit var prospectosManager: ProspectosManager

    // PERSISTENCIA DE PROSPECTOS - Solo se limpia con nueva búsqueda o cierre de app
    private var prospectosAviva: List<ProspectoAviva> = emptyList()
    private var ultimaBusquedaTimestamp: Long = 0
    private var busquedaEnProgreso: Boolean = false

    private var currentLocation: Location? = null
    private var photoUri: Uri? = null
    private var tempPhotoFile: File? = null

    // ==========================================
    // NUEVAS VARIABLES PARA OPTIMIZACIONES (SIN ROMPER NADA) + STATUS
    // ==========================================

    // Control de ubicación mejorado
    private var ultimaUbicacionBusqueda: Location? = null
    private var jobBusquedaActual: Job? = null
    private var jobUbicacionActual: Job? = null
    private var lastUpdateTime: Long = 0
    private var isCapturingPhoto: Boolean = false

    // NUEVAS VARIABLES PARA STATUS DE VISITAS - CORREGIDAS
    private lateinit var statusAdapter: ArrayAdapter<String>
    private var selectedStatus: String = Visit.STATUS_SOLICITUD_CREADA

    // Constantes de configuración
    companion object {
        private const val DISTANCIA_MINIMA_NUEVA_BUSQUEDA = 200.0 // metros
        private const val TIEMPO_MINIMO_ENTRE_BUSQUEDAS = 8000 // 8 segundos (menos agresivo)
        private const val TIMEOUT_UBICACION = 12000L // 12 segundos
    }

    // ==========================================
    // PERMISSION LAUNCHERS (CONSERVADOS)
    // ==========================================

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true) {
            // MEJORADO: Forzar actualización de ubicación
            forzarActualizacionUbicacion()
            enableMapLocation()
        } else {
            Toast.makeText(context, "Los permisos de ubicación son necesarios para registrar visitas", Toast.LENGTH_LONG).show()
        }
    }

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            takePhoto()
        } else {
            Toast.makeText(context, "Permiso de cámara necesario para tomar fotos", Toast.LENGTH_SHORT).show()
        }
    }

    private val takePictureLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        // MEJORADO: Control de estado de captura
        isCapturingPhoto = false
        if (result.resultCode == Activity.RESULT_OK && photoUri != null) {
            displayCapturedPhoto()
        } else {
            clearTempPhotoFile()
        }
    }

    private val selectImageLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            photoUri = it
            binding.imagePreview.setImageURI(it)
            binding.imagePreview.visibility = View.VISIBLE
            updatePhotoButtonText()
        }
    }

    // ==========================================
    // LIFECYCLE METHODS (CONSERVADOS + MEJORADOS)
    // ==========================================

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        homeViewModel = ViewModelProvider(this)[HomeViewModel::class.java]
        _binding = FragmentHomeBinding.inflate(inflater, container, false)

        initializeComponents()
        setupUI()
        loadUserInfo()
        requestLocationPermissions()
        setupMap()
        loadRecentVisits()

        // Restaurar prospectos si existen en memoria
        restaurarProspectosEnMemoria()

        return binding.root
    }

    override fun onResume() {
        super.onResume()
        // NUEVO: Verificar ubicación al volver a la pantalla
        if (currentLocation == null) {
            forzarActualizacionUbicacion()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        // MEJORADO: Cancelar operaciones en progreso
        jobBusquedaActual?.cancel()
        jobUbicacionActual?.cancel()
        clearTempPhotoFile()
        // NO limpiar prospectosAviva aquí - mantener durante la sesión
        _binding = null
    }

    // ==========================================
    // PERSISTENCIA DE PROSPECTOS (CONSERVADA COMPLETA)
    // ==========================================

    private fun restaurarProspectosEnMemoria() {
        Log.d("PERSISTENCIA", "Restaurando prospectos en memoria: ${prospectosAviva.size}")
        if (prospectosAviva.isNotEmpty()) {
            actualizarContadoresAviva()
            mostrarProspectosEnMapa(prospectosAviva)
            Log.d("PERSISTENCIA", "✓ Prospectos restaurados exitosamente")
        }
    }

    private fun limpiarProspectosAnterior() {
        Log.d("PERSISTENCIA", "Limpiando prospectos anteriores...")
        prospectosAviva = emptyList()
        ultimaBusquedaTimestamp = 0
        ultimaUbicacionBusqueda = null // NUEVO: También limpiar ubicación de búsqueda

        // Limpiar marcadores del mapa
        if (::googleMap.isInitialized) {
            googleMap.clear()
        }

        // Actualizar UI
        actualizarContadoresAviva()
        Log.d("PERSISTENCIA", "✓ Prospectos limpiados")
    }

    private fun guardarProspectosEnMemoria(prospectos: List<ProspectoAviva>) {
        prospectosAviva = prospectos.toList() // Crear copia para evitar referencias
        ultimaBusquedaTimestamp = System.currentTimeMillis()
        ultimaUbicacionBusqueda = currentLocation // NUEVO: Guardar ubicación de búsqueda
        Log.d("PERSISTENCIA", "Prospectos guardados en memoria: ${prospectosAviva.size} elementos")
        Log.d("PERSISTENCIA", "Timestamp: $ultimaBusquedaTimestamp")
        Log.d("PERSISTENCIA", "Ubicación búsqueda: ${ultimaUbicacionBusqueda?.latitude}, ${ultimaUbicacionBusqueda?.longitude}")
    }

    // ==========================================
    // NUEVA FUNCIÓN: GESTIÓN OPTIMIZADA DE UBICACIÓN
    // ==========================================

    private fun forzarActualizacionUbicacion() {
        Log.d("HomeFragment", "🌍 Forzando actualización de ubicación...")

        // Cancelar job anterior si existe
        jobUbicacionActual?.cancel()

        if (!hasLocationPermissions()) {
            Log.w("HomeFragment", "⚠️ No hay permisos de ubicación")
            return
        }

        jobUbicacionActual = lifecycleScope.launch {
            try {
                val nuevaUbicacion = withTimeoutOrNull(TIMEOUT_UBICACION) {
                    obtenerUbicacionFresca()
                }

                if (nuevaUbicacion != null) {
                    val ubicacionAnterior = currentLocation
                    currentLocation = nuevaUbicacion

                    Log.d("HomeFragment", "✅ Nueva ubicación obtenida: ${nuevaUbicacion.latitude}, ${nuevaUbicacion.longitude}")

                    // Verificar si hay cambio significativo
                    val huboMovimiento = ubicacionAnterior?.let { anterior ->
                        anterior.distanceTo(nuevaUbicacion) > 100.0 // 100 metros
                    } ?: true

                    if (huboMovimiento) {
                        Log.d("HomeFragment", "📍 Detectado movimiento significativo")
                        // NO limpiar automáticamente, solo invalidar la referencia
                        ultimaUbicacionBusqueda = null
                    }

                    updateMapLocation(nuevaUbicacion)
                } else {
                    Log.w("HomeFragment", "⚠️ No se pudo obtener ubicación fresca, usando última conocida")
                    requestCurrentLocation() // Fallback al método original
                }
            } catch (e: Exception) {
                Log.e("HomeFragment", "❌ Error actualizando ubicación: ${e.message}", e)
                requestCurrentLocation() // Fallback al método original
            }
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun obtenerUbicacionFresca(): Location? = withContext(Dispatchers.IO) {
        return@withContext suspendCancellableCoroutine { continuation ->
            try {
                fusedLocationClient.getCurrentLocation(
                    com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY,
                    null
                ).addOnSuccessListener { location ->
                    if (continuation.isActive) {
                        continuation.resume(location) {}
                    }
                }.addOnFailureListener { e ->
                    if (continuation.isActive) {
                        Log.e("HomeFragment", "Error getCurrentLocation: ${e.message}")
                        continuation.resume(null) {}
                    }
                }
            } catch (e: SecurityException) {
                if (continuation.isActive) {
                    Log.e("HomeFragment", "SecurityException: ${e.message}")
                    continuation.resume(null) {}
                }
            }
        }
    }

    private fun necesitaNuevaUbicacion(): Boolean {
        val ubicacionBusquedaAnterior = ultimaUbicacionBusqueda ?: return true
        val ubicacionActual = currentLocation ?: return true

        val distancia = ubicacionBusquedaAnterior.distanceTo(ubicacionActual)
        return distancia > DISTANCIA_MINIMA_NUEVA_BUSQUEDA
    }

    // ==========================================
    // DIÁLOGOS PERSONALIZADOS - CONSERVADOS COMPLETOS
    // ==========================================

    private fun crearDialogoConLista(
        titulo: String,
        mensaje: String? = null,
        opciones: List<String>,
        onItemClick: (Int) -> Unit,
        botonesExtras: Map<String, (() -> Unit)?> = emptyMap()
    ) {
        Log.d("DIALOGO_CUSTOM", "Creando diálogo personalizado: '$titulo' con ${opciones.size} opciones")

        // Crear layout principal con mejor diseño
        val scrollView = ScrollView(requireContext())
        val layout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
            setBackgroundColor(ContextCompat.getColor(requireContext(), android.R.color.white))
        }

        // Título mejorado
        val titleView = TextView(requireContext()).apply {
            text = titulo
            textSize = 20f
            setTypeface(null, Typeface.BOLD)
            setPadding(0, 0, 0, 24)
            gravity = Gravity.CENTER
            setTextColor(ContextCompat.getColor(requireContext(), android.R.color.black))
        }
        layout.addView(titleView)

        // Mensaje opcional mejorado
        mensaje?.let {
            val messageView = TextView(requireContext()).apply {
                text = it
                setPadding(0, 0, 0, 20)
                textSize = 16f
                setTextColor(ContextCompat.getColor(requireContext(), android.R.color.darker_gray))
                gravity = Gravity.CENTER
            }
            layout.addView(messageView)
        }

        // Lista mejorada con más espacio
        val listView = ListView(requireContext()).apply {
            adapter = object : ArrayAdapter<String>(requireContext(), 0, opciones) {
                override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                    val cardLayout = LinearLayout(requireContext()).apply {
                        orientation = LinearLayout.VERTICAL
                        setPadding(20, 16, 20, 16)
                        setBackgroundColor(ContextCompat.getColor(context, android.R.color.white))

                        // Agregar borde sutil
                        background = ContextCompat.getDrawable(context, android.R.drawable.list_selector_background)
                    }

                    val opcion = opciones[position]
                    val lineas = opcion.split("\n")

                    // Nombre del negocio (línea principal)
                    val nombreNegocio = lineas.getOrNull(0) ?: "Negocio"
                    val nombreView = TextView(requireContext()).apply {
                        text = "🏪  $nombreNegocio"
                        textSize = 18f
                        setTypeface(null, Typeface.BOLD)
                        setTextColor(ContextCompat.getColor(context, android.R.color.black))
                        setPadding(0, 0, 0, 8)
                    }
                    cardLayout.addView(nombreView)

                    // Giro del negocio
                    val giroNegocio = lineas.getOrNull(1) ?: "Sin giro"
                    val giroView = TextView(requireContext()).apply {
                        text = "📋  $giroNegocio"
                        textSize = 15f
                        setTextColor(ContextCompat.getColor(context, android.R.color.darker_gray))
                        setPadding(0, 0, 0, 8)
                    }
                    cardLayout.addView(giroView)

                    // Probabilidad
                    val probabilidadTexto = lineas.getOrNull(2) ?: "Probabilidad: N/A"
                    val probabilidadView = TextView(requireContext()).apply {
                        text = "📊  $probabilidadTexto"
                        textSize = 14f
                        setTextColor(ContextCompat.getColor(context, android.R.color.holo_green_dark))
                        setTypeface(null, Typeface.BOLD)
                    }
                    cardLayout.addView(probabilidadView)

                    // Configurar click
                    cardLayout.setOnClickListener {
                        Log.d("DIALOGO_CUSTOM", "Item clickeado: $position")
                        onItemClick(position)
                    }

                    return cardLayout
                }
            }

            // Configurar altura generosa
            val displayMetrics = resources.displayMetrics
            val screenHeight = displayMetrics.heightPixels
            val maxHeight = (screenHeight * 0.6).toInt() // 60% de la pantalla

            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                maxHeight
            ).apply {
                topMargin = 16
                bottomMargin = 16
            }
            layoutParams = params

            // Divisores más visibles
            divider = ContextCompat.getDrawable(requireContext(), android.R.drawable.divider_horizontal_dark)
            dividerHeight = 2
        }
        layout.addView(listView)

        scrollView.addView(layout)

        // Crear diálogo con mejor tamaño
        val dialogBuilder = AlertDialog.Builder(requireContext())
            .setView(scrollView)
            .setCancelable(true)

        // Agregar botones con texto visible
        val buttonTexts = botonesExtras.keys.toList()
        when (buttonTexts.size) {
            1 -> {
                dialogBuilder.setPositiveButton("   ${buttonTexts[0]}   ") { dialog, _ ->
                    dialog.dismiss()
                    botonesExtras[buttonTexts[0]]?.invoke()
                }
            }
            2 -> {
                dialogBuilder.setPositiveButton("   ${buttonTexts[0]}   ") { dialog, _ ->
                    dialog.dismiss()
                    botonesExtras[buttonTexts[0]]?.invoke()
                }
                dialogBuilder.setNegativeButton("   ${buttonTexts[1]}   ") { dialog, _ ->
                    dialog.dismiss()
                    botonesExtras[buttonTexts[1]]?.invoke()
                }
            }
            3 -> {
                dialogBuilder.setPositiveButton("   ${buttonTexts[0]}   ") { dialog, _ ->
                    dialog.dismiss()
                    botonesExtras[buttonTexts[0]]?.invoke()
                }
                dialogBuilder.setNegativeButton("   ${buttonTexts[1]}   ") { dialog, _ ->
                    dialog.dismiss()
                    botonesExtras[buttonTexts[1]]?.invoke()
                }
                dialogBuilder.setNeutralButton("   ${buttonTexts[2]}   ") { dialog, _ ->
                    dialog.dismiss()
                    botonesExtras[buttonTexts[2]]?.invoke()
                }
            }
        }

        val dialog = dialogBuilder.create()

        // Personalizar botones al mostrar
        dialog.setOnShowListener {
            // Hacer ventana más grande
            val window = dialog.window
            val displayMetrics = resources.displayMetrics
            val width = (displayMetrics.widthPixels * 0.95).toInt()
            val height = (displayMetrics.heightPixels * 0.85).toInt()
            window?.setLayout(width, height)

            // Personalizar colores de botones
            dialog.getButton(AlertDialog.BUTTON_POSITIVE)?.let { button ->
                button.setTextColor(ContextCompat.getColor(requireContext(), android.R.color.holo_blue_dark))
                button.textSize = 16f
            }
            dialog.getButton(AlertDialog.BUTTON_NEGATIVE)?.let { button ->
                button.setTextColor(ContextCompat.getColor(requireContext(), android.R.color.darker_gray))
                button.textSize = 16f
            }
            dialog.getButton(AlertDialog.BUTTON_NEUTRAL)?.let { button ->
                button.setTextColor(ContextCompat.getColor(requireContext(), android.R.color.holo_orange_dark))
                button.textSize = 16f
            }
        }

        Log.d("DIALOGO_CUSTOM", "Mostrando diálogo personalizado...")
        dialog.show()
        Log.d("DIALOGO_CUSTOM", "✓ Diálogo personalizado mostrado exitosamente")
    }

    // Función para diálogos simples mejorada
    private fun crearDialogoSimple(
        titulo: String,
        mensaje: String? = null,
        opciones: List<String>,
        onItemClick: (Int) -> Unit,
        botonesExtras: Map<String, (() -> Unit)?> = emptyMap()
    ) {
        Log.d("DIALOGO_SIMPLE", "Creando diálogo simple: '$titulo' con ${opciones.size} opciones")

        val scrollView = ScrollView(requireContext())
        val layout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
            setBackgroundColor(ContextCompat.getColor(requireContext(), android.R.color.white))
        }

        // Título
        val titleView = TextView(requireContext()).apply {
            text = titulo
            textSize = 20f
            setTypeface(null, Typeface.BOLD)
            setPadding(0, 0, 0, 24)
            gravity = Gravity.CENTER
            setTextColor(ContextCompat.getColor(requireContext(), android.R.color.black))
        }
        layout.addView(titleView)

        // Mensaje opcional
        mensaje?.let {
            val messageView = TextView(requireContext()).apply {
                text = it
                setPadding(0, 0, 0, 20)
                textSize = 16f
                setTextColor(ContextCompat.getColor(requireContext(), android.R.color.darker_gray))
                gravity = Gravity.CENTER
            }
            layout.addView(messageView)
        }

        // Lista simplificada pero más grande
        val listView = ListView(requireContext()).apply {
            adapter = object : ArrayAdapter<String>(requireContext(), 0, opciones) {
                override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                    val cardLayout = LinearLayout(requireContext()).apply {
                        orientation = LinearLayout.VERTICAL
                        setPadding(24, 20, 24, 20)
                        setBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
                        background = ContextCompat.getDrawable(context, android.R.drawable.list_selector_background)
                    }

                    val opcion = opciones[position]
                    val lineas = opcion.split("\n")

                    // Nombre principal
                    val nombre = lineas.getOrNull(0) ?: "Negocio"
                    val nombreView = TextView(requireContext()).apply {
                        text = "🏪  $nombre"
                        textSize = 18f
                        setTypeface(null, Typeface.BOLD)
                        setTextColor(ContextCompat.getColor(context, android.R.color.black))
                        setPadding(0, 0, 0, 8)
                    }
                    cardLayout.addView(nombreView)

                    // Giro (si existe)
                    val giro = lineas.getOrNull(1) ?: ""
                    if (giro.isNotEmpty()) {
                        val giroView = TextView(requireContext()).apply {
                            text = "📋  $giro"
                            textSize = 15f
                            setTextColor(ContextCompat.getColor(context, android.R.color.darker_gray))
                        }
                        cardLayout.addView(giroView)
                    }

                    cardLayout.setOnClickListener {
                        Log.d("DIALOGO_SIMPLE", "Item clickeado: $position")
                        onItemClick(position)
                    }

                    return cardLayout
                }
            }

            // Altura generosa
            val displayMetrics = resources.displayMetrics
            val screenHeight = displayMetrics.heightPixels
            val maxHeight = (screenHeight * 0.6).toInt()

            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                maxHeight
            ).apply {
                topMargin = 16
                bottomMargin = 16
            }
            layoutParams = params

            divider = ContextCompat.getDrawable(requireContext(), android.R.drawable.divider_horizontal_dark)
            dividerHeight = 2
        }
        layout.addView(listView)

        scrollView.addView(layout)

        val dialogBuilder = AlertDialog.Builder(requireContext())
            .setView(scrollView)
            .setCancelable(true)

        // Agregar botones con espaciado
        val buttonTexts = botonesExtras.keys.toList()
        when (buttonTexts.size) {
            1 -> {
                dialogBuilder.setPositiveButton("   ${buttonTexts[0]}   ") { dialog, _ ->
                    dialog.dismiss()
                    botonesExtras[buttonTexts[0]]?.invoke()
                }
            }
            2 -> {
                dialogBuilder.setPositiveButton("   ${buttonTexts[0]}   ") { dialog, _ ->
                    dialog.dismiss()
                    botonesExtras[buttonTexts[0]]?.invoke()
                }
                dialogBuilder.setNegativeButton("   ${buttonTexts[1]}   ") { dialog, _ ->
                    dialog.dismiss()
                    botonesExtras[buttonTexts[1]]?.invoke()
                }
            }
        }

        val dialog = dialogBuilder.create()

        dialog.setOnShowListener {
            // Hacer ventana más grande
            val window = dialog.window
            val displayMetrics = resources.displayMetrics
            val width = (displayMetrics.widthPixels * 0.95).toInt()
            val height = (displayMetrics.heightPixels * 0.8).toInt()
            window?.setLayout(width, height)

            dialog.getButton(AlertDialog.BUTTON_POSITIVE)?.let { button ->
                button.setTextColor(ContextCompat.getColor(requireContext(), android.R.color.holo_blue_dark))
                button.textSize = 16f
            }
            dialog.getButton(AlertDialog.BUTTON_NEGATIVE)?.let { button ->
                button.setTextColor(ContextCompat.getColor(requireContext(), android.R.color.darker_gray))
                button.textSize = 16f
            }
        }

        Log.d("DIALOGO_SIMPLE", "Mostrando diálogo simple...")
        dialog.show()
        Log.d("DIALOGO_SIMPLE", "✓ Diálogo simple mostrado exitosamente")
    }

    // ==========================================
    // INICIALIZACIÓN Y CONFIGURACIÓN (CONSERVADAS + MEJORADAS)
    // ==========================================

    private fun initializeComponents() {
        auth = FirebaseAuth.getInstance()
        db = FirebaseFirestore.getInstance()
        storage = FirebaseStorage.getInstance()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(requireActivity())

        // Inicializar servicios
        prospeccionService = ProspeccionService(requireContext())
        prospectosManager = ProspectosManager(requireContext())

        Log.d("HomeFragment", "Componentes inicializados")
    }

    private fun setupUI() {
        // Configurar botones de visitas existentes
        binding.btnRegisterVisit.setOnClickListener {
            toggleVisitForm()
        }

        binding.btnTakePhoto.setOnClickListener {
            requestCameraPermissionAndTakePhoto()
        }

        binding.btnSelectPhoto.setOnClickListener {
            selectImage()
        }

        binding.btnSubmitVisit.setOnClickListener {
            submitVisit()
        }

        binding.btnCancelVisit.setOnClickListener {
            toggleVisitForm()
            clearForm()
        }

        // Botones para Aviva Tu Negocio - OPTIMIZADOS
        binding.btnBuscarProspectos.setOnClickListener {
            // MEJORADO: Verificar throttling primero
            if (debeEsperarAntesDeNuevaBusqueda()) {
                return@setOnClickListener
            }

            // Siempre limpiar y hacer nueva búsqueda
            limpiarProspectosAnterior()
            buscarProspectosAvivaOptimizado() // FUNCIÓN MEJORADA
        }

        binding.btnVerProspectos.setOnClickListener {
            Log.d("DEBUG_ESTADO", "btnVerProspectos clickeado")
            verificarEstadoProspectos()
            mostrarListaProspectos()
        }

        // NUEVO: Botón para abrir AOS (ambos botones)
        try {
            binding.btnCrearSolicitudAOS.setOnClickListener {
                abrirSolicitudAOS()
            }
            binding.btnCrearSolicitudAOSForm.setOnClickListener {
                abrirSolicitudAOS()
            }
        } catch (e: Exception) {
            Log.w("HomeFragment", "Botón AOS no encontrado: ${e.message}")
        }

        // NUEVO: Configurar spinner de status
        setupStatusSpinner()

        // Configurar RecyclerView - MEJORADO CON DEBUGGING
        visitsAdapter = VisitsAdapter(
            onVisitClick = { visit -> showVisitDetails(visit) },
            onMapClick = { visit -> showVisitOnMap(visit) }
        )

        binding.recentVisitsRecyclerView.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = visitsAdapter
            visibility = View.VISIBLE // Asegurar que sea visible

            // Debugging
            Log.d("VisitasDebug", "RecyclerView configurado")
            Log.d("VisitasDebug", "LayoutManager: ${layoutManager}")
            Log.d("VisitasDebug", "Adapter: ${adapter}")
        }
    }

    // ==========================================
    // NUEVAS FUNCIONES PARA STATUS Y AOS
    // ==========================================

    // ==========================================
    // CLASE PARA ADAPTER PERSONALIZADO DEL SPINNER
    // ==========================================

    inner class StatusSpinnerAdapter(
        context: Context,
        private val statusList: List<Pair<String, String>>
    ) : ArrayAdapter<Pair<String, String>>(context, 0, statusList) {

        override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
            return createView(position, convertView, parent, R.layout.spinner_item_status)
        }

        override fun getDropDownView(position: Int, convertView: View?, parent: ViewGroup): View {
            return createView(position, convertView, parent, R.layout.spinner_dropdown_status)
        }

        private fun createView(position: Int, convertView: View?, parent: ViewGroup, layoutRes: Int): View {
            val view = convertView ?: LayoutInflater.from(context).inflate(layoutRes, parent, false)

            val statusPair = statusList[position]
            val statusKey = statusPair.first
            val statusText = statusPair.second

            val colorIndicator = view.findViewById<View>(R.id.statusColorIndicator)
            val textView = view.findViewById<TextView>(R.id.statusText)

            textView.text = statusText

            // Configurar color del indicador
            val backgroundRes = when (statusKey) {
                Visit.STATUS_SOLICITUD_CREADA -> R.drawable.status_background_created
                Visit.STATUS_NO_INTERESADO -> R.drawable.status_background_not_interested
                Visit.STATUS_PROGRAMADA -> R.drawable.status_background_scheduled
                Visit.STATUS_NO_APLICA -> R.drawable.status_background_not_applicable
                else -> R.drawable.status_background_created
            }

            colorIndicator.setBackgroundResource(backgroundRes)

            return view
        }
    }

    private fun setupStatusSpinner() {
        try {
            val statusOptions = Visit.getAllStatusOptions()
            val customAdapter = StatusSpinnerAdapter(requireContext(), statusOptions)

            binding.statusSpinner.adapter = customAdapter

            // Establecer valor por defecto (índice 0 = "Solicitud creada")
            binding.statusSpinner.setSelection(0)
            selectedStatus = Visit.STATUS_SOLICITUD_CREADA

            // Manejar selección
            binding.statusSpinner.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: android.view.View?, position: Int, id: Long) {
                    val statusPair = statusOptions[position]
                    selectedStatus = statusPair.first
                    Log.d("HomeFragment", "Status seleccionado: $selectedStatus (${statusPair.second})")
                }

                override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {
                    // No hacer nada
                }
            }

            Log.d("HomeFragment", "Status spinner personalizado configurado correctamente")
        } catch (e: Exception) {
            Log.e("HomeFragment", "Error configurando status spinner: ${e.message}")
            // Fallback - usar status por defecto
            selectedStatus = Visit.STATUS_SOLICITUD_CREADA
        }
    }

    private fun abrirSolicitudAOS() {
        val aosUrl = "https://aos.cloudaviva.com/auth/azure/sign-in?returnTo=%2Fdashboard%2Fcustomer"

        try {
            // Método 1: Intent implícito básico
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(aosUrl))
            intent.addCategory(Intent.CATEGORY_BROWSABLE)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK

            Log.d("HomeFragment", "Intentando abrir URL: $aosUrl")

            if (intent.resolveActivity(requireActivity().packageManager) != null) {
                startActivity(intent)
                Toast.makeText(context, "Abriendo AOS en navegador...", Toast.LENGTH_SHORT).show()
                Log.d("HomeFragment", "✅ Intent resuelto correctamente")
                return
            } else {
                Log.w("HomeFragment", "⚠️ Intent no se pudo resolver")
            }

        } catch (e: Exception) {
            Log.e("HomeFragment", "❌ Error con Intent básico: ${e.message}")
        }

        try {
            // Método 2: Intent con chooser
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(aosUrl))
            val chooser = Intent.createChooser(intent, "Abrir AOS con:")
            chooser.flags = Intent.FLAG_ACTIVITY_NEW_TASK

            Log.d("HomeFragment", "Intentando con chooser...")
            startActivity(chooser)
            Toast.makeText(context, "Selecciona tu navegador para abrir AOS", Toast.LENGTH_SHORT).show()
            Log.d("HomeFragment", "✅ Chooser abierto correctamente")
            return

        } catch (e: Exception) {
            Log.e("HomeFragment", "❌ Error con chooser: ${e.message}")
        }

        // Método 3: Fallback - copiar al portapapeles y avisar
        Log.w("HomeFragment", "⚠️ No se pudo abrir navegador, usando fallback")
        copiarUrlAlPortapapeles(aosUrl)

        AlertDialog.Builder(requireContext())
            .setTitle("Abrir AOS")
            .setMessage("No se pudo abrir automáticamente el navegador.\n\nLa URL ha sido copiada al portapapeles:\n\n$aosUrl\n\nPégala en tu navegador para acceder a AOS.")
            .setPositiveButton("Entendido") { _, _ -> }
            .setNeutralButton("Copiar de nuevo") { _, _ ->
                copiarUrlAlPortapapeles(aosUrl)
            }
            .show()
    }

    private fun copiarUrlAlPortapapeles(url: String) {
        try {
            val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("URL AOS", url)
            clipboard.setPrimaryClip(clip)

            Log.d("HomeFragment", "✅ URL copiada al portapapeles: $url")
            Toast.makeText(context, "URL copiada: Pégala en tu navegador", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Log.e("HomeFragment", "❌ Error copiando URL: ${e.message}")
            Toast.makeText(context, "Error copiando URL", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showVisitDetails(visit: Visit) {
        val details = buildString {
            append("Negocio: ${visit.businessName}\n\n")
            append("Estado: ${Visit.getStatusDisplayText(visit.status)}\n\n")
            append("Fecha: ")
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
            append(visit.timestamp?.toDate()?.let { dateFormat.format(it) } ?: "No disponible")
            append("\n\n")

            append("Vendedor: ${visit.userName}\n\n")

            if (visit.comments.isNotBlank()) {
                append("Comentarios:\n${visit.comments}\n\n")
            }

            if (visit.esProspectoAviva) {
                append("📋 Prospecto Aviva Tu Negocio\n")
                append("Probabilidad: ${(visit.probabilidadOriginal?.times(100))?.toInt() ?: "N/A"}%\n\n")
            }

            if (visit.location != null) {
                append("Ubicación: ${visit.location.latitude}, ${visit.location.longitude}")
            }
        }

        AlertDialog.Builder(requireContext())
            .setTitle("Detalles de la visita")
            .setMessage(details)
            .setPositiveButton("Cerrar", null)
            .show()
    }

    private fun showVisitOnMap(visit: Visit) {
        if (visit.location != null && ::googleMap.isInitialized) {
            val latLng = LatLng(visit.location.latitude, visit.location.longitude)
            googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, 16f))

            // Agregar marcador temporal
            googleMap.addMarker(
                MarkerOptions()
                    .position(latLng)
                    .title(visit.businessName)
                    .snippet("Visita registrada - ${Visit.getStatusDisplayText(visit.status)}")
            )

            Toast.makeText(context, "Mostrando ${visit.businessName} en el mapa", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(context, "Ubicación no disponible para esta visita", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadUserInfo() {
        val user = auth.currentUser
        user?.let {
            val nombreUsuario = it.displayName ?: it.email ?: "Promotor"
            binding.welcomeText.text = "Bienvenido, $nombreUsuario"
        } ?: run {
            binding.welcomeText.text = "Bienvenido, Promotor"
        }
    }

    // ==========================================
    // FUNCIÓN PRINCIPAL OPTIMIZADA DE BÚSQUEDA (CONSERVADA COMPLETA)
    // ==========================================

    private fun debeEsperarAntesDeNuevaBusqueda(): Boolean {
        val tiempoActual = System.currentTimeMillis()

        if (busquedaEnProgreso) {
            Toast.makeText(context, "Búsqueda en progreso, espera un momento...", Toast.LENGTH_SHORT).show()
            return true
        }

        if (tiempoActual - lastUpdateTime < TIEMPO_MINIMO_ENTRE_BUSQUEDAS) {
            val tiempoRestante = (TIEMPO_MINIMO_ENTRE_BUSQUEDAS - (tiempoActual - lastUpdateTime)) / 1000
            Toast.makeText(context, "Espera $tiempoRestante segundos antes de buscar nuevamente", Toast.LENGTH_SHORT).show()
            return true
        }

        return false
    }

    private fun buscarProspectosAvivaOptimizado() {
        // Cancelar búsqueda anterior
        jobBusquedaActual?.cancel()

        if (currentLocation == null) {
            Toast.makeText(context, "Obteniendo ubicación...", Toast.LENGTH_SHORT).show()
            forzarActualizacionUbicacion()

            // Reintentar después de obtener ubicación
            lifecycleScope.launch {
                delay(3000)
                if (currentLocation != null && !busquedaEnProgreso) {
                    ejecutarBusquedaConUbicacionFresca()
                }
            }
            return
        }

        // Verificar si necesitamos ubicación fresca
        if (necesitaNuevaUbicacion()) {
            Log.d("HomeFragment", "🌍 Necesitamos ubicación más fresca, actualizando...")
            forzarActualizacionUbicacion()

            lifecycleScope.launch {
                delay(2000) // Esperar actualización de ubicación
                if (currentLocation != null) {
                    ejecutarBusquedaConUbicacionFresca()
                }
            }
        } else {
            ejecutarBusquedaConUbicacionFresca()
        }
    }

    private fun ejecutarBusquedaConUbicacionFresca() {
        jobBusquedaActual = lifecycleScope.launch {
            try {
                busquedaEnProgreso = true
                lastUpdateTime = System.currentTimeMillis()
                mostrarIndicadorCarga(true)

                Log.d("HomeFragment", "=== NUEVA BÚSQUEDA OPTIMIZADA DE PROSPECTOS ===")
                Log.d("HomeFragment", "Ubicación actual: ${currentLocation!!.latitude}, ${currentLocation!!.longitude}")

                // Realizar consulta en background thread
                val prospectosRaw = withContext(Dispatchers.IO) {
                    prospeccionService.buscarProspectosEnArea(
                        latitud = currentLocation!!.latitude,
                        longitud = currentLocation!!.longitude
                    )
                }

                Log.d("HomeFragment", "Prospectos RAW recibidos: ${prospectosRaw.size}")

                // Filtrar en background thread
                val prospectosFiltrados = withContext(Dispatchers.Default) {
                    filtrarProspectosRelevantesConLogs(prospectosRaw)
                }

                Log.d("HomeFragment", "Después de filtrado optimizado: ${prospectosFiltrados.size}")

                // Actualizar UI en main thread
                withContext(Dispatchers.Main) {
                    procesarResultadosOptimizados(prospectosFiltrados, prospectosRaw.size)
                }

            } catch (e: Exception) {
                Log.e("HomeFragment", "❌ Error consulta optimizada: ${e.message}", e)
                withContext(Dispatchers.Main) {
                    mostrarErrorBusqueda(e)
                }
            } finally {
                withContext(Dispatchers.Main) {
                    mostrarIndicadorCarga(false)
                    busquedaEnProgreso = false
                }
            }
        }
    }

    private fun procesarResultadosOptimizados(prospectos: List<ProspectoAviva>, prospectosRawCount: Int) {
        // GUARDAR EN MEMORIA PARA PERSISTENCIA
        guardarProspectosEnMemoria(prospectos)
        Log.d("HomeFragment", "Prospectos guardados en memoria optimizada. Size: ${prospectosAviva.size}")

        // VALIDAR QUE LA ASIGNACIÓN FUNCIONÓ
        if (prospectosAviva.isNotEmpty()) {
            Log.d("HomeFragment", "✅ prospectosAviva contiene datos:")
            prospectosAviva.take(3).forEachIndexed { index, prospecto ->
                Log.d("HomeFragment", "  [$index] ${prospecto.nombre} - ${prospecto.giro}")
            }

            // Guardar en Firebase en background
            lifecycleScope.launch {
                try {
                    prospectosManager.guardarProspectosDetectados(prospectosAviva)
                    Log.d("HomeFragment", "✅ Prospectos guardados en Firebase")
                } catch (e: Exception) {
                    Log.w("HomeFragment", "⚠️ No se pudieron guardar en Firebase: ${e.message}")
                }
            }
        } else {
            Log.w("HomeFragment", "⚠️ prospectosAviva está vacío después de filtrado")
        }

        actualizarContadoresAviva()

        // MOSTRAR RESULTADOS
        when {
            prospectosAviva.isNotEmpty() -> {
                mostrarProspectosEnMapa(prospectosAviva)
                mostrarNotificacionProspectos(prospectosAviva.size)
                Log.d("HomeFragment", "✅ Búsqueda optimizada completada exitosamente")
            }
            prospectosRawCount > 0 -> {
                mostrarMensajeNoProspectos(prospectosRawCount)
                Log.w("HomeFragment", "⚠️ Todos los prospectos fueron filtrados")
            }
            else -> {
                mostrarMensajeNoProspectos(0)
                Log.w("HomeFragment", "⚠️ No se encontraron prospectos en la API")
            }
        }
    }

    private fun filtrarProspectosRelevantesConLogs(prospectos: List<ProspectoAviva>): List<ProspectoAviva> {
        Log.d("HomeFragment", "=== INICIANDO FILTRADO OPTIMIZADO ===")

        val girosExcluidos = setOf(
            "revistas", "periódicos", "periodico", "revista",
            "puestos de revistas", "puesto de periodicos",
            "venta de revistas", "venta de periodicos",
            "comercio al por menor de revistas",
            "comercio al por menor de periódicos",
            "revistas y libros atrasados",
            "comercio al por menor de revistas y periódicos"
        )

        val prospectosFiltrados = mutableListOf<ProspectoAviva>()

        prospectos.forEachIndexed { index, prospecto ->
            val giroLower = prospecto.giro.lowercase().trim()
            val nombreLower = prospecto.nombre.lowercase().trim()

            val esExcluido = girosExcluidos.any { palabraExcluida ->
                giroLower.contains(palabraExcluida) || nombreLower.contains(palabraExcluida)
            }

            if (!esExcluido) {
                // VALIDAR DATOS MÍNIMOS
                if (prospecto.nombre.isNotBlank() &&
                    prospecto.giro.isNotBlank() &&
                    prospecto.latitud != 0.0 &&
                    prospecto.longitud != 0.0) {

                    prospectosFiltrados.add(prospecto)
                    Log.d("HomeFragment", "✅ Prospecto $index INCLUIDO: ${prospecto.nombre}")
                } else {
                    Log.w("HomeFragment", "⚠️ Prospecto $index EXCLUIDO por datos incompletos")
                }
            } else {
                Log.d("HomeFragment", "⚠️ Prospecto $index EXCLUIDO por filtro: ${prospecto.nombre}")
            }
        }

        Log.d("HomeFragment", "=== FILTRADO OPTIMIZADO COMPLETADO: ${prospectosFiltrados.size}/${prospectos.size} ===")
        return prospectosFiltrados
    }

    // ==========================================
    // FUNCIONES DE DEBUGGING ESPECÍFICO (CONSERVADAS)
    // ==========================================

    private fun verificarEstadoProspectos() {
        Log.d("DEBUG_ESTADO", "=== VERIFICANDO ESTADO PROSPECTOS ===")
        Log.d("DEBUG_ESTADO", "prospectosAviva.size: ${prospectosAviva.size}")
        Log.d("DEBUG_ESTADO", "prospectosAviva.isEmpty(): ${prospectosAviva.isEmpty()}")
        Log.d("DEBUG_ESTADO", "ultimaBusquedaTimestamp: $ultimaBusquedaTimestamp")
        Log.d("DEBUG_ESTADO", "busquedaEnProgreso: $busquedaEnProgreso")
        Log.d("DEBUG_ESTADO", "ultimaUbicacionBusqueda: ${ultimaUbicacionBusqueda?.latitude}, ${ultimaUbicacionBusqueda?.longitude}")

        if (prospectosAviva.isNotEmpty()) {
            Log.d("DEBUG_ESTADO", "Primer prospecto:")
            val primero = prospectosAviva[0]
            Log.d("DEBUG_ESTADO", "  - nombre: '${primero.nombre}' (length: ${primero.nombre.length})")
            Log.d("DEBUG_ESTADO", "  - giro: '${primero.giro}' (length: ${primero.giro.length})")
            Log.d("DEBUG_ESTADO", "  - latitud: ${primero.latitud}")
            Log.d("DEBUG_ESTADO", "  - longitud: ${primero.longitud}")
            Log.d("DEBUG_ESTADO", "  - probabilidad: ${primero.probabilidad}")
        }

        // Verificar si todos los nombres están vacíos
        val nombresVacios = prospectosAviva.count { it.nombre.isBlank() }
        val girosVacios = prospectosAviva.count { it.giro.isBlank() }

        Log.d("DEBUG_ESTADO", "Nombres vacíos: $nombresVacios de ${prospectosAviva.size}")
        Log.d("DEBUG_ESTADO", "Giros vacíos: $girosVacios de ${prospectosAviva.size}")
    }

    // ==========================================
    // FUNCIONES DE LISTA CORREGIDAS CON DIÁLOGOS PERSONALIZADOS (CONSERVADAS COMPLETAS)
    // ==========================================

    private fun mostrarListaProspectos() {
        Log.d("DEBUG_LISTA", "=== INICIO mostrarListaProspectos() VERSIÓN PERSONALIZADA ===")
        Log.d("DEBUG_LISTA", "prospectosAviva.size = ${prospectosAviva.size}")

        if (prospectosAviva.isEmpty()) {
            Log.w("DEBUG_LISTA", "⚠️ Lista vacía - mostrando mensaje de error")
            Toast.makeText(context, "No hay prospectos. Busca primero usando 'Buscar Ahora'", Toast.LENGTH_LONG).show()
            return
        }

        try {
            val prospectosLimitados = prospectosAviva.take(15)
            Log.d("DEBUG_LISTA", "Prospectos limitados: ${prospectosLimitados.size}")

            // Generar opciones
            val opcionesProspectos = mutableListOf<String>()

            prospectosLimitados.forEachIndexed { index, prospecto ->
                val nombre = prospecto.nombre.takeIf { it.isNotBlank() } ?: "Negocio ${index + 1}"
                val giro = prospecto.giro.takeIf { it.isNotBlank() } ?: "Sin giro especificado"
                val probabilidad = "${(prospecto.probabilidad * 100).toInt()}%"

                val opcionTexto = "$nombre\n$giro\nProbabilidad: $probabilidad"
                opcionesProspectos.add(opcionTexto)
                Log.d("DEBUG_LISTA", "Opción $index: '$opcionTexto'")
            }

            val titulo = if (prospectosAviva.size > 15) {
                "Lista de prospectos (${prospectosLimitados.size} de ${prospectosAviva.size})"
            } else {
                "Lista de prospectos (${prospectosAviva.size} encontrados)"
            }

            val botonesExtras = mapOf(
                "Todas las rutas" to { mostrarOpcionesNavegacion() },
                "Cerrar" to { /* Cerrar diálogo */ }
            )

            crearDialogoConLista(
                titulo = titulo,
                mensaje = "Selecciona un prospecto para ver opciones:",
                opciones = opcionesProspectos,
                onItemClick = { which ->
                    Log.d("DEBUG_LISTA", "Diálogo personalizado: seleccionado índice: $which")
                    if (which >= 0 && which < prospectosLimitados.size) {
                        val prospectoSeleccionado = prospectosLimitados[which]
                        Log.d("DEBUG_LISTA", "Prospecto seleccionado: ${prospectoSeleccionado.nombre}")
                        mostrarOpcionesProspecto(prospectoSeleccionado)
                    }
                },
                botonesExtras = botonesExtras
            )

        } catch (e: Exception) {
            Log.e("DEBUG_LISTA", "❌ Excepción en mostrarListaProspectos: ${e.message}", e)
            Toast.makeText(context, "Error mostrando lista: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun mostrarOpcionesStreetView() {
        Log.d("DEBUG_STREETVIEW", "=== INICIO mostrarOpcionesStreetView() VERSIÓN PERSONALIZADA ===")
        Log.d("DEBUG_STREETVIEW", "prospectosAviva.size = ${prospectosAviva.size}")

        if (prospectosAviva.isEmpty()) {
            Log.w("DEBUG_STREETVIEW", "⚠️ prospectosAviva vacío para Street View")
            Toast.makeText(context, "No hay prospectos disponibles para Street View", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            val prospectosLimitados = prospectosAviva.take(15)
            Log.d("DEBUG_STREETVIEW", "Procesando ${prospectosLimitados.size} prospectos para Street View")

            val opcionesStreetView = mutableListOf<String>()

            prospectosLimitados.forEachIndexed { index, prospecto ->
                val nombre = prospecto.nombre.takeIf { it.isNotBlank() } ?: "Negocio ${index + 1}"
                val giro = prospecto.giro.takeIf { it.isNotBlank() } ?: "Sin giro especificado"

                val opcionTexto = "$nombre\n$giro"
                opcionesStreetView.add(opcionTexto)
                Log.d("DEBUG_STREETVIEW", "Street View opción $index: '$opcionTexto'")
            }

            val titulo = if (prospectosAviva.size > 15) {
                "Street View (${prospectosLimitados.size} de ${prospectosAviva.size})"
            } else {
                "Street View (${prospectosAviva.size} disponibles)"
            }

            val botonesExtras = mapOf(
                "Atrás" to { mostrarDialogProspectos() }
            )

            crearDialogoSimple(
                titulo = titulo,
                mensaje = "Selecciona un negocio para ver su ubicación:",
                opciones = opcionesStreetView,
                onItemClick = { which ->
                    Log.d("DEBUG_STREETVIEW", "Street View seleccionado índice: $which")
                    if (which >= 0 && which < prospectosLimitados.size) {
                        val prospectoSeleccionado = prospectosLimitados[which]
                        abrirStreetViewDirecto(prospectoSeleccionado)
                        Toast.makeText(context, "Abriendo Street View de ${prospectoSeleccionado.nombre}", Toast.LENGTH_SHORT).show()
                    }
                },
                botonesExtras = botonesExtras
            )

            Log.d("DEBUG_STREETVIEW", "✅ Diálogo Street View personalizado creado")

        } catch (e: Exception) {
            Log.e("DEBUG_STREETVIEW", "❌ Error en mostrarOpcionesStreetView: ${e.message}", e)
            Toast.makeText(context, "Error mostrando opciones de Street View", Toast.LENGTH_SHORT).show()
        }
    }

    private fun mostrarListaProspectosParaNavegar() {
        Log.d("DEBUG_NAVEGACION", "=== mostrarListaProspectosParaNavegar() VERSIÓN PERSONALIZADA ===")

        if (prospectosAviva.isEmpty()) {
            Toast.makeText(context, "No hay prospectos disponibles. Busca primero usando 'Buscar Ahora'", Toast.LENGTH_LONG).show()
            return
        }

        try {
            val prospectosLimitados = prospectosAviva.take(15)
            val opcionesProspectos = mutableListOf<String>()

            prospectosLimitados.forEachIndexed { index, prospecto ->
                val nombre = prospecto.nombre.takeIf { it.isNotBlank() } ?: "Negocio ${index + 1}"
                val giro = prospecto.giro.takeIf { it.isNotBlank() } ?: "Sin giro especificado"

                opcionesProspectos.add("$nombre\n$giro")
            }

            val titulo = if (prospectosAviva.size > 15) {
                "Navegar (${prospectosLimitados.size} de ${prospectosAviva.size})"
            } else {
                "Navegar (${prospectosAviva.size} disponibles)"
            }

            val botonesExtras = mapOf(
                "Atrás" to { mostrarOpcionesNavegacion() }
            )

            crearDialogoSimple(
                titulo = titulo,
                mensaje = "¿A cuál negocio quieres ir?",
                opciones = opcionesProspectos,
                onItemClick = { which ->
                    if (which >= 0 && which < prospectosLimitados.size) {
                        val prospectoSeleccionado = prospectosLimitados[which]
                        mostrarOpcionesProspecto(prospectoSeleccionado)
                    }
                },
                botonesExtras = botonesExtras
            )

        } catch (e: Exception) {
            Log.e("DEBUG_NAVEGACION", "❌ Error en mostrarListaProspectosParaNavegar: ${e.message}", e)
            Toast.makeText(context, "Error mostrando lista de navegación", Toast.LENGTH_SHORT).show()
        }
    }

    private fun mostrarListaParaRegistrarVisita() {
        Log.d("DEBUG_VISITA", "=== mostrarListaParaRegistrarVisita() VERSIÓN PERSONALIZADA ===")

        if (prospectosAviva.isEmpty()) {
            Toast.makeText(context, "No hay prospectos disponibles. Busca primero usando 'Buscar Ahora'", Toast.LENGTH_LONG).show()
            return
        }

        try {
            val prospectosLimitados = prospectosAviva.take(15)
            val opcionesProspectos = mutableListOf<String>()

            prospectosLimitados.forEachIndexed { index, prospecto ->
                val nombre = prospecto.nombre.takeIf { it.isNotBlank() } ?: "Negocio ${index + 1}"
                val giro = prospecto.giro.takeIf { it.isNotBlank() } ?: "Sin giro especificado"
                val probabilidad = "${(prospecto.probabilidad * 100).toInt()}%"

                val opcionTexto = "$nombre\n$giro (Prob: $probabilidad)"
                opcionesProspectos.add(opcionTexto)
                Log.d("DEBUG_VISITA", "Registrar visita opción $index: '$opcionTexto'")
            }

            val titulo = if (prospectosAviva.size > 15) {
                "Registrar visita (${prospectosLimitados.size} de ${prospectosAviva.size})"
            } else {
                "Registrar visita (${prospectosAviva.size} disponibles)"
            }

            val botonesExtras = mapOf(
                "Atrás" to { mostrarListaProspectos() }
            )

            crearDialogoConLista(
                titulo = titulo,
                mensaje = "Selecciona el negocio que visitarás:",
                opciones = opcionesProspectos,
                onItemClick = { which ->
                    Log.d("DEBUG_VISITA", "Registrar visita seleccionado índice: $which")
                    if (which >= 0 && which < prospectosLimitados.size) {
                        val prospectoSeleccionado = prospectosLimitados[which]
                        Log.d("DEBUG_VISITA", "Registrando visita para: ${prospectoSeleccionado.nombre}")
                        registrarVisitaProspecto(prospectoSeleccionado)
                    }
                },
                botonesExtras = botonesExtras
            )

        } catch (e: Exception) {
            Log.e("DEBUG_VISITA", "❌ Error en mostrarListaParaRegistrarVisita: ${e.message}", e)
            Toast.makeText(context, "Error mostrando lista para registrar visita", Toast.LENGTH_SHORT).show()
        }
    }

    // ==========================================
    // RESTO DE FUNCIONES (TODAS CONSERVADAS)
    // ==========================================

    private fun mostrarIndicadorCarga(mostrar: Boolean) {
        try {
            binding.progressBarProspectos.visibility = if (mostrar) View.VISIBLE else View.GONE
        } catch (e: Exception) {
            Log.w("HomeFragment", "ProgressBar no encontrado: ${e.message}")
        }
    }

    private fun mostrarMensajeNoProspectos(prospectosRaw: Int) {
        val mensaje = if (prospectosRaw > prospectosAviva.size) {
            "Se encontraron $prospectosRaw negocios, pero se filtraron puestos de revistas/periódicos. No hay prospectos relevantes en esta área."
        } else {
            "No se encontraron prospectos Aviva en esta área. Intenta en otra ubicación."
        }
        Toast.makeText(context, mensaje, Toast.LENGTH_LONG).show()
    }

    private fun mostrarErrorBusqueda(e: Exception) {
        val mensajeError = when {
            e.message?.contains("timeout", true) == true ->
                "La consulta está tardando mucho. Revisa tu conexión a internet."
            e.message?.contains("network", true) == true ->
                "Error de red. Verifica tu conexión a internet."
            e.message?.contains("401", true) == true ->
                "Error de autenticación con la API DENUE."
            e.message?.contains("429", true) == true ->
                "Has excedido el límite de consultas. Intenta más tarde."
            e.message?.contains("500", true) == true ->
                "Error del servidor DENUE. Intenta más tarde."
            else -> "Error buscando prospectos: ${e.message}"
        }
        Toast.makeText(context, mensajeError, Toast.LENGTH_LONG).show()
    }

    private fun actualizarContadoresAviva() {
        try {
            binding.tvProspectosHoy.text = prospectosAviva.size.toString()
        } catch (e: Exception) {
            Log.w("HomeFragment", "tvProspectosHoy no encontrado: ${e.message}")
        }

        try {
            binding.tvLlamadasHoy.text = "0"
        } catch (e: Exception) {
            Log.w("HomeFragment", "tvLlamadasHoy no encontrado: ${e.message}")
        }

        try {
            if (prospectosAviva.isNotEmpty()) {
                binding.tvResultadosRapidos.text = "${prospectosAviva.size} prospectos encontrados"
                binding.tvResultadosRapidos.visibility = View.VISIBLE
            } else {
                binding.tvResultadosRapidos.visibility = View.GONE
            }
        } catch (e: Exception) {
            Log.w("HomeFragment", "tvResultadosRapidos no encontrado: ${e.message}")
        }
    }

    private fun mostrarProspectosEnMapa(prospectos: List<ProspectoAviva>) {
        if (!::googleMap.isInitialized) return

        prospectos.forEach { prospecto ->
            val latLng = LatLng(prospecto.latitud, prospecto.longitud)
            googleMap.addMarker(
                MarkerOptions()
                    .position(latLng)
                    .title(prospecto.nombre)
                    .snippet("${prospecto.giro} - ${(prospecto.probabilidad * 100).toInt()}% probabilidad")
            )
        }

        Log.d("HomeFragment", "Agregados ${prospectos.size} marcadores de prospectos al mapa")
    }

    private fun mostrarNotificacionProspectos(cantidad: Int) {
        val mensaje = when {
            cantidad == 1 -> "Se encontró 1 prospecto Aviva cerca de ti"
            cantidad > 1 -> "Se encontraron $cantidad prospectos Aviva cerca de ti"
            else -> "No hay prospectos Aviva en esta área"
        }

        Toast.makeText(context, mensaje, Toast.LENGTH_LONG).show()

        if (cantidad > 0) {
            mostrarDialogProspectos()
        }
    }

    private fun mostrarDialogProspectos() {
        if (prospectosAviva.isEmpty()) return

        val prospectosLimitados = prospectosAviva.take(15)

        val prospectosTexto = prospectosLimitados.take(10).map { prospecto ->
            "${prospecto.nombre}\n${prospecto.giro}\n${prospecto.montoMinimoCentavos} - ${prospecto.montoMaximoCentavos}\n"
        }.joinToString("\n\n")

        val titulo = if (prospectosAviva.size > 15) {
            "Prospectos Aviva encontrados (Mostrando 15 de ${prospectosAviva.size})"
        } else {
            "Prospectos Aviva encontrados"
        }

        AlertDialog.Builder(requireContext())
            .setTitle(titulo)
            .setMessage(prospectosTexto)
            .setPositiveButton("Ver en mapa") { _, _ ->
                // El mapa ya muestra los marcadores
            }
            .setNegativeButton("Street View") { _, _ ->
                mostrarOpcionesStreetView()
            }
            .setNeutralButton("Navegar") { _, _ ->
                mostrarOpcionesNavegacion()
            }
            .show()
    }

    // ==========================================
    // FUNCIONES DE NAVEGACIÓN (CONSERVADAS COMPLETAS)
    // ==========================================

    private fun mostrarOpcionesNavegacion() {
        if (prospectosAviva.isEmpty()) return

        val mensaje = "Elige cómo quieres navegar a los prospectos encontrados:"

        AlertDialog.Builder(requireContext())
            .setTitle("Opciones de navegación")
            .setMessage(mensaje)
            .setPositiveButton("Ruta completa\n(Todos los prospectos)") { _, _ ->
                navegarRutaCompleta()
            }
            .setNegativeButton("Prospecto específico\n(Elegir uno)") { _, _ ->
                mostrarListaProspectosParaNavegar()
            }
            .setNeutralButton("Atrás") { _, _ ->
                mostrarDialogProspectos()
            }
            .show()
    }

    private fun mostrarOpcionesProspecto(prospecto: ProspectoAviva) {
        val mensaje = buildString {
            append("¿Qué quieres hacer con este negocio?\n\n")
            append("${prospecto.nombre}\n")
            append("${prospecto.giro}\n")
            append("${prospecto.direccion}\n")
            if (prospecto.telefono?.isNotBlank() == true) {
                append("${prospecto.telefono}")
            }
        }

        val builder = AlertDialog.Builder(requireContext())
            .setTitle("Opciones disponibles")
            .setMessage(mensaje)
            .setPositiveButton("Navegar") { _, _ ->
                navegarHaciaProspecto(prospecto)
            }
            .setNegativeButton("Registrar visita") { _, _ ->
                registrarVisitaProspecto(prospecto)
            }

        if (prospecto.telefono?.isNotBlank() == true) {
            builder.setNeutralButton("Llamar") { _, _ ->
                abrirTelefonoDirecto(prospecto.telefono!!)
            }
        } else {
            builder.setNeutralButton("Detalles") { _, _ ->
                mostrarDetallesCompletos(prospecto)
            }
        }

        builder.show()
    }

    private fun navegarRutaCompleta() {
        if (prospectosAviva.isEmpty()) {
            Toast.makeText(context, "No hay prospectos para crear ruta", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            val urlRuta = construirUrlRutaCompleta()
            val intentRuta = Intent(Intent.ACTION_VIEW, Uri.parse(urlRuta))
            intentRuta.setPackage("com.google.android.apps.maps")

            if (intentRuta.resolveActivity(requireActivity().packageManager) != null) {
                startActivity(intentRuta)
                Toast.makeText(
                    context,
                    "Abriendo ruta completa con ${prospectosAviva.size} prospectos",
                    Toast.LENGTH_LONG
                ).show()
            } else {
                mostrarOpcionesRutaAlternativas()
            }

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error creando ruta completa: ${e.message}")
            mostrarOpcionesRutaAlternativas()
        }
    }

    private fun construirUrlRutaCompleta(): String {
        val origen = "${currentLocation?.latitude},${currentLocation?.longitude}"
        val prospectosParaRuta = prospectosAviva.take(8)

        val waypoints = prospectosParaRuta.dropLast(1).joinToString("|") { prospecto ->
            "${prospecto.latitud},${prospecto.longitud}"
        }

        val destino = prospectosParaRuta.last().let { "${it.latitud},${it.longitud}" }

        return if (waypoints.isNotEmpty()) {
            "https://www.google.com/maps/dir/?api=1" +
                    "&origin=$origen" +
                    "&destination=$destino" +
                    "&waypoints=$waypoints" +
                    "&travelmode=walking" +
                    "&optimize=true"
        } else {
            "google.navigation:q=${prospectosParaRuta.first().latitud},${prospectosParaRuta.first().longitud}&mode=w"
        }
    }

    private fun mostrarOpcionesRutaAlternativas() {
        val mensaje = buildString {
            append("Ruta completa de prospectos\n\n")
            append("Desde tu ubicación actual:\n\n")

            prospectosAviva.forEachIndexed { index, prospecto ->
                append("${index + 1}. ${prospecto.nombre}\n")
                append("   ${prospecto.giro}\n")
                append("   ${prospecto.direccion}\n\n")
            }

            append("Abre tu app de mapas preferida y agrega estos destinos manualmente.")
        }

        AlertDialog.Builder(requireContext())
            .setTitle("Ruta de ${prospectosAviva.size} prospectos")
            .setMessage(mensaje)
            .setPositiveButton("Copiar lista") { _, _ ->
                copiarListaProspectosAlPortapapeles()
            }
            .setNeutralButton("Ver en mapa") { _, _ ->
                centrarMapaEnTodosLosProspectos()
            }
            .setNegativeButton("Cerrar", null)
            .show()
    }

    private fun navegarHaciaProspecto(prospecto: ProspectoAviva) {
        try {
            val uriNavegacion = Uri.parse(
                "google.navigation:q=${prospecto.latitud},${prospecto.longitud}&mode=w"
            )
            val intentNavegacion = Intent(Intent.ACTION_VIEW, uriNavegacion)
            intentNavegacion.setPackage("com.google.android.apps.maps")

            if (intentNavegacion.resolveActivity(requireActivity().packageManager) != null) {
                startActivity(intentNavegacion)
                Toast.makeText(context, "Navegando a pie hacia ${prospecto.nombre}", Toast.LENGTH_LONG).show()
            } else {
                abrirUbicacionEnMapas(prospecto)
            }

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error abriendo navegación: ${e.message}")
            abrirUbicacionEnMapas(prospecto)
        }
    }

    // ==========================================
    // FUNCIONES DE STREET VIEW (CONSERVADAS COMPLETAS)
    // ==========================================

    private fun abrirStreetViewDirecto(prospecto: ProspectoAviva) {
        try {
            Toast.makeText(context, "Abriendo Street View de ${prospecto.nombre}...", Toast.LENGTH_SHORT).show()
            abrirStreetViewConIntent(prospecto)
        } catch (e: Exception) {
            Log.e("HomeFragment", "Error general con Street View: ${e.message}")
            abrirStreetViewConIntent(prospecto)
        }
    }

    private fun abrirStreetViewConIntent(prospecto: ProspectoAviva) {
        try {
            val streetViewUri = Uri.parse(
                "google.streetview:cbll=${prospecto.latitud},${prospecto.longitud}&cbp=1,0,,0,1.0&mz=20"
            )
            val streetViewIntent = Intent(Intent.ACTION_VIEW, streetViewUri)
            streetViewIntent.setPackage("com.google.android.apps.maps")

            if (streetViewIntent.resolveActivity(requireActivity().packageManager) != null) {
                startActivity(streetViewIntent)
                Toast.makeText(context, "Mostrando Street View de ${prospecto.nombre}", Toast.LENGTH_SHORT).show()
            } else {
                abrirStreetViewEnWeb(prospecto)
            }
        } catch (e: Exception) {
            Log.e("HomeFragment", "Error abriendo Street View: ${e.message}")
            abrirUbicacionEnMapas(prospecto)
        }
    }

    private fun abrirStreetViewEnWeb(prospecto: ProspectoAviva) {
        try {
            val webStreetViewUrl = "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${prospecto.latitud},${prospecto.longitud}"
            val webIntent = Intent(Intent.ACTION_VIEW, Uri.parse(webStreetViewUrl))

            if (webIntent.resolveActivity(requireActivity().packageManager) != null) {
                startActivity(webIntent)
                Toast.makeText(context, "Abriendo Street View en navegador para ${prospecto.nombre}", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(context, "No se puede abrir Street View en este dispositivo", Toast.LENGTH_SHORT).show()
                abrirUbicacionEnMapas(prospecto)
            }
        } catch (e: Exception) {
            Log.e("HomeFragment", "Error abriendo Street View en web: ${e.message}")
            Toast.makeText(context, "Error abriendo Street View", Toast.LENGTH_SHORT).show()
        }
    }

    // ==========================================
    // FUNCIONES DE REGISTRO DE VISITAS (CONSERVADAS COMPLETAS + CORREGIDAS)
    // ==========================================

    private fun registrarVisitaProspecto(prospecto: ProspectoAviva) {
        if (currentLocation == null) {
            Toast.makeText(context, "Obteniendo tu ubicación...", Toast.LENGTH_SHORT).show()
            forzarActualizacionUbicacion() // MEJORADO: Usar función optimizada
            return
        }

        if (binding.visitFormCard.visibility == View.VISIBLE) {
            llenarDatosProspecto(prospecto)
        } else {
            toggleVisitForm()
            binding.root.postDelayed({
                llenarDatosProspecto(prospecto)
            }, 300)
        }

        Toast.makeText(
            context,
            "Formulario listo para ${prospecto.nombre}",
            Toast.LENGTH_SHORT
        ).show()
    }

    private fun llenarDatosProspecto(prospecto: ProspectoAviva) {
        try {
            binding.businessNameInput.setText(prospecto.nombre)

            val comentarioAutomatico = buildString {
                append("Giro: ${prospecto.giro}\n")
                append("Probabilidad: ${(prospecto.probabilidad * 100).toInt()}%\n")
                append("Dirección: ${prospecto.direccion}\n")
                if (prospecto.telefono?.isNotBlank() == true) {
                    append("Teléfono: ${prospecto.telefono}\n")
                }
                append("\nComentarios adicionales:\n")
            }

            binding.commentsInput.setText(comentarioAutomatico)
            binding.commentsInput.setSelection(binding.commentsInput.text?.length ?: 0)

            binding.root.post {
                binding.scrollView?.smoothScrollTo(0, binding.visitFormCard.top)
            }

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error llenando datos del prospecto: ${e.message}")
            Toast.makeText(context, "Error preparando formulario", Toast.LENGTH_SHORT).show()
        }
    }

    private fun mostrarDetallesCompletos(prospecto: ProspectoAviva) {
        val detallesCompletos = buildString {
            append("Nombre: ${prospecto.nombre}\n\n")
            append("Giro: ${prospecto.giro}\n\n")
            append("Dirección: ${prospecto.direccion}\n\n")

            if (prospecto.telefono?.isNotBlank() == true) {
                append("Teléfono: ${prospecto.telefono}\n\n")
            } else {
                append("Teléfono: No disponible\n\n")
            }

            append("Monto: ${prospecto.montoMinimoCentavos} - ${prospecto.montoMaximoCentavos}\n\n")
            append("Probabilidad: ${(prospecto.probabilidad * 100).toInt()}%\n\n")
            append("Razón:\n${prospecto.razonProbabilidad}")
        }

        val builder = AlertDialog.Builder(requireContext())
            .setTitle("Detalles completos")
            .setMessage(detallesCompletos)
            .setPositiveButton("Navegar") { _, _ ->
                navegarHaciaProspecto(prospecto)
            }
            .setNegativeButton("Registrar visita") { _, _ ->
                registrarVisitaProspecto(prospecto)
            }

        if (prospecto.telefono?.isNotBlank() == true) {
            builder.setNeutralButton("Llamar") { _, _ ->
                abrirTelefonoDirecto(prospecto.telefono!!)
            }
        } else {
            builder.setNeutralButton("Volver") { _, _ ->
                mostrarOpcionesProspecto(prospecto)
            }
        }

        builder.show()
    }

    // ==========================================
    // FUNCIONES DE UTILIDAD (CONSERVADAS COMPLETAS)
    // ==========================================

    private fun abrirTelefonoDirecto(telefono: String) {
        try {
            val numeroLimpio = telefono
                .replace(" ", "")
                .replace("-", "")
                .replace("(", "")
                .replace(")", "")
                .replace(".", "")
                .trim()

            if (numeroLimpio.isEmpty()) {
                Toast.makeText(context, "Número de teléfono no válido", Toast.LENGTH_SHORT).show()
                return
            }

            val dialIntent = Intent(Intent.ACTION_DIAL)
            dialIntent.data = Uri.parse("tel:$numeroLimpio")

            if (dialIntent.resolveActivity(requireActivity().packageManager) != null) {
                startActivity(dialIntent)
                Toast.makeText(context, "Abriendo marcador para llamar a $numeroLimpio", Toast.LENGTH_LONG).show()
            } else {
                Toast.makeText(context, "No hay aplicación de teléfono instalada en este dispositivo", Toast.LENGTH_LONG).show()
            }

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error en llamada", e)
            Toast.makeText(context, "Error abriendo marcador: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun abrirUbicacionEnMapas(prospecto: ProspectoAviva) {
        try {
            val uriGenerico = Uri.parse(
                "geo:${prospecto.latitud},${prospecto.longitud}?q=${prospecto.latitud},${prospecto.longitud}(${Uri.encode(prospecto.nombre)})"
            )
            val intentGenerico = Intent(Intent.ACTION_VIEW, uriGenerico)

            if (intentGenerico.resolveActivity(requireActivity().packageManager) != null) {
                startActivity(intentGenerico)
                Toast.makeText(context, "Abriendo ubicación de ${prospecto.nombre} en tu app de mapas", Toast.LENGTH_LONG).show()
            } else {
                copiarCoordenadasAlPortapapeles(prospecto)
            }

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error abriendo ubicación: ${e.message}")
            copiarCoordenadasAlPortapapeles(prospecto)
        }
    }

    private fun copiarCoordenadasAlPortapapeles(prospecto: ProspectoAviva) {
        try {
            val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText(
                "Coordenadas ${prospecto.nombre}",
                "${prospecto.latitud},${prospecto.longitud}"
            )
            clipboard.setPrimaryClip(clip)

            Toast.makeText(
                context,
                "Coordenadas de ${prospecto.nombre} copiadas al portapapeles\n${prospecto.latitud},${prospecto.longitud}",
                Toast.LENGTH_LONG
            ).show()

        } catch (e: Exception) {
            Toast.makeText(context, "No se pudo abrir navegación para ${prospecto.nombre}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun copiarListaProspectosAlPortapapeles() {
        val listaTexto = buildString {
            append("Ruta prospectos Aviva Tu Negocio\n\n")
            prospectosAviva.forEachIndexed { index, prospecto ->
                append("${index + 1}. ${prospecto.nombre} - ${prospecto.giro}\n")
                append("${prospecto.direccion}\n")
                append("${prospecto.latitud},${prospecto.longitud}\n\n")
            }
        }

        try {
            val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("Ruta Prospectos Aviva", listaTexto)
            clipboard.setPrimaryClip(clip)

            Toast.makeText(context, "Lista de prospectos copiada al portapapeles", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(context, "Error copiando lista", Toast.LENGTH_SHORT).show()
        }
    }

    private fun centrarMapaEnTodosLosProspectos() {
        if (!::googleMap.isInitialized || prospectosAviva.isEmpty()) return

        try {
            val builder = com.google.android.gms.maps.model.LatLngBounds.Builder()

            currentLocation?.let {
                builder.include(LatLng(it.latitude, it.longitude))
            }

            prospectosAviva.forEach { prospecto ->
                builder.include(LatLng(prospecto.latitud, prospecto.longitud))
            }

            val bounds = builder.build()
            val padding = 100

            googleMap.animateCamera(
                CameraUpdateFactory.newLatLngBounds(bounds, padding)
            )

            Toast.makeText(context, "Mostrando todos los ${prospectosAviva.size} prospectos", Toast.LENGTH_SHORT).show()

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error centrando mapa: ${e.message}")
        }
    }

    private fun mostrarInfoProspectoConNavegacion(prospecto: ProspectoAviva, marker: com.google.android.gms.maps.model.Marker) {
        val infoTexto = buildString {
            append("${prospecto.nombre}\n")
            append("${prospecto.giro}\n")
            append("${prospecto.montoMinimoCentavos} - ${prospecto.montoMaximoCentavos}\n")
            append("${(prospecto.probabilidad * 100).toInt()}% probabilidad\n")
            append("${prospecto.direccion}")
        }

        AlertDialog.Builder(requireContext())
            .setTitle("Información del prospecto")
            .setMessage(infoTexto)
            .setPositiveButton("Navegar") { _, _ ->
                navegarHaciaProspecto(prospecto)
            }
            .setNegativeButton("Registrar visita") { _, _ ->
                registrarVisitaProspecto(prospecto)
            }
            .setNeutralButton("Street View") { _, _ ->
                abrirStreetViewDirecto(prospecto)
            }
            .show()
    }

    // ==========================================
    // FUNCIONES DE UBICACIÓN Y MAPA (CONSERVADAS + MEJORADAS)
    // ==========================================

    private fun requestLocationPermissions() {
        when {
            hasLocationPermissions() -> {
                forzarActualizacionUbicacion() // MEJORADO
            }
            else -> {
                locationPermissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                )
            }
        }
    }

    private fun hasLocationPermissions(): Boolean {
        return ContextCompat.checkSelfPermission(
            requireContext(),
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(
                    requireContext(),
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("MissingPermission")
    private fun requestCurrentLocation() {
        if (!hasLocationPermissions()) return

        try {
            fusedLocationClient.getCurrentLocation(
                com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY,
                null
            ).addOnSuccessListener { location ->
                location?.let {
                    currentLocation = it
                    updateMapLocation(it)
                    Log.d("HomeFragment", "Ubicación actualizada: ${it.latitude}, ${it.longitude}")
                } ?: run {
                    getLastKnownLocation()
                }
            }.addOnFailureListener { e ->
                Log.e("HomeFragment", "Error obteniendo ubicación actual: ${e.message}")
                getLastKnownLocation()
            }
        } catch (e: SecurityException) {
            Log.e("HomeFragment", "Error de permisos obteniendo ubicación: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    private fun getLastKnownLocation() {
        if (!hasLocationPermissions()) return

        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            location?.let {
                currentLocation = it
                updateMapLocation(it)
                Log.d("HomeFragment", "Usando última ubicación conocida: ${it.latitude}, ${it.longitude}")
            } ?: run {
                Toast.makeText(context, "No se pudo obtener la ubicación. Verifica que el GPS esté activado.", Toast.LENGTH_SHORT).show()
            }
        }.addOnFailureListener { e ->
            Log.e("HomeFragment", "Error al obtener última ubicación: ${e.message}")
            Toast.makeText(context, "Error al obtener ubicación: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupMap() {
        val mapFragment = childFragmentManager.findFragmentById(R.id.map) as? SupportMapFragment
        mapFragment?.getMapAsync(this)
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        enableMapLocation()
        currentLocation?.let {
            updateMapLocation(it)
        }

        googleMap.setOnMarkerClickListener { marker ->
            val prospectoSeleccionado = prospectosAviva.find { prospecto ->
                val markerPos = marker.position
                kotlin.math.abs(prospecto.latitud - markerPos.latitude) < 0.0001 &&
                        kotlin.math.abs(prospecto.longitud - markerPos.longitude) < 0.0001
            }

            prospectoSeleccionado?.let { prospecto ->
                mostrarInfoProspectoConNavegacion(prospecto, marker)
            }

            true
        }

        try {
            map.uiSettings.apply {
                isZoomControlsEnabled = true
                isCompassEnabled = true
                isMyLocationButtonEnabled = true
                isMapToolbarEnabled = false // MEJORADO: Evitar gestos problemáticos
                isTiltGesturesEnabled = false // MEJORADO: Reducir gestos que causan problemas
            }
        } catch (e: Exception) {
            Log.w("HomeFragment", "Error configurando UI del mapa: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    private fun enableMapLocation() {
        if (hasLocationPermissions() && ::googleMap.isInitialized) {
            try {
                googleMap.isMyLocationEnabled = true
            } catch (e: SecurityException) {
                Log.e("HomeFragment", "Error habilitando ubicación en mapa: ${e.message}")
            }
        }
    }

    private fun updateMapLocation(location: Location) {
        if (::googleMap.isInitialized) {
            val latLng = LatLng(location.latitude, location.longitude)
            googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, 15f))
        }
    }

    // ==========================================
    // FUNCIONES DE CÁMARA (CONSERVADAS + MEJORADAS)
    // ==========================================

    private fun createTempPhotoFile(): File {
        val timestamp = System.currentTimeMillis()
        val fileName = "photo_${timestamp}.jpg"
        return File(requireContext().cacheDir, fileName)
    }

    private fun clearTempPhotoFile() {
        tempPhotoFile?.let { file ->
            if (file.exists()) {
                file.delete()
            }
        }
        tempPhotoFile = null
    }

    private fun requestCameraPermissionAndTakePhoto() {
        // MEJORADO: Control de estado de captura
        if (isCapturingPhoto) {
            Toast.makeText(context, "Ya se está capturando una foto, espera...", Toast.LENGTH_SHORT).show()
            return
        }

        when {
            ContextCompat.checkSelfPermission(
                requireContext(),
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED -> {
                takePhoto()
            }
            else -> {
                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            }
        }
    }

    private fun takePhoto() {
        try {
            isCapturingPhoto = true // NUEVO: Marcar que estamos capturando

            val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)

            if (takePictureIntent.resolveActivity(requireActivity().packageManager) == null) {
                Toast.makeText(context, "No se encontró una aplicación de cámara", Toast.LENGTH_SHORT).show()
                isCapturingPhoto = false
                return
            }

            tempPhotoFile = createTempPhotoFile()

            photoUri = FileProvider.getUriForFile(
                requireContext(),
                "${BuildConfig.APPLICATION_ID}.fileprovider",
                tempPhotoFile!!
            )

            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
            takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)

            takePictureLauncher.launch(takePictureIntent)

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error configurando cámara: ${e.message}", e)
            Toast.makeText(context, "Error al abrir la cámara", Toast.LENGTH_SHORT).show()
            isCapturingPhoto = false
            clearTempPhotoFile()
        }
    }

    private fun selectImage() {
        selectImageLauncher.launch("image/*")
    }

    private fun displayCapturedPhoto() {
        photoUri?.let { uri ->
            binding.imagePreview.setImageURI(uri)
            binding.imagePreview.visibility = View.VISIBLE
            updatePhotoButtonText()
        }
    }

    private fun updatePhotoButtonText() {
        if (photoUri != null) {
            binding.btnTakePhoto.text = "Cambiar Foto"
        } else {
            binding.btnTakePhoto.text = "Tomar Foto"
        }
    }

    // ==========================================
    // FUNCIONES DE VISITAS (CONSERVADAS COMPLETAS + CORREGIDAS)
    // ==========================================

    private fun toggleVisitForm() {
        if (binding.visitFormCard.visibility == View.VISIBLE) {
            binding.visitFormCard.visibility = View.GONE
            binding.btnRegisterVisit.text = "Registrar Visita"
        } else {
            binding.visitFormCard.visibility = View.VISIBLE
            binding.btnRegisterVisit.text = "Cancelar"
            if (currentLocation == null) {
                forzarActualizacionUbicacion() // MEJORADO
            }
        }
    }

    private fun submitVisit() {
        val businessName = binding.businessNameInput.text.toString().trim()
        val comments = binding.commentsInput.text.toString().trim()

        when {
            businessName.isEmpty() -> {
                binding.businessNameInput.error = "Por favor ingresa el nombre del negocio"
                binding.businessNameInput.requestFocus()
                return
            }
            photoUri == null -> {
                showPhotoRequiredDialog()
                return
            }
            currentLocation == null -> {
                Toast.makeText(context, "Obteniendo ubicación actual...", Toast.LENGTH_SHORT).show()
                forzarActualizacionUbicacion() // MEJORADO
                return
            }
        }

        binding.progressBar.visibility = View.VISIBLE
        binding.btnSubmitVisit.isEnabled = false

        uploadImageWithQuality { imageUrl ->
            saveVisit(businessName, comments, imageUrl)
        }
    }

    private fun showPhotoRequiredDialog() {
        AlertDialog.Builder(requireContext())
            .setTitle("Foto Obligatoria")
            .setMessage("Es necesario tomar una foto para registrar la visita.\n¿Quieres tomar una foto ahora?")
            .setPositiveButton("Tomar Foto") { _, _ ->
                requestCameraPermissionAndTakePhoto()
            }
            .setNegativeButton("Seleccionar de Galería") { _, _ ->
                selectImage()
            }
            .setNeutralButton("Cancelar", null)
            .show()
    }

    private fun uploadImageWithQuality(onSuccess: (String) -> Unit) {
        val userId = auth.currentUser?.uid ?: return
        val timestamp = System.currentTimeMillis()
        val imageName = "visit_${userId}_$timestamp.jpg"
        val imageRef = storage.reference.child("visits/$imageName")

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val compressedData = compressImageFromUri(photoUri!!)

                withContext(Dispatchers.Main) {
                    imageRef.putBytes(compressedData)
                        .addOnSuccessListener {
                            imageRef.downloadUrl.addOnSuccessListener { uri ->
                                onSuccess(uri.toString())
                            }.addOnFailureListener { e ->
                                handleUploadError(e)
                            }
                        }.addOnFailureListener { e ->
                            handleUploadError(e)
                        }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    handleUploadError(e)
                }
            }
        }
    }

    private suspend fun compressImageFromUri(uri: Uri): ByteArray = withContext(Dispatchers.IO) {
        val inputStream = requireContext().contentResolver.openInputStream(uri)
        val originalBitmap = BitmapFactory.decodeStream(inputStream)
        inputStream?.close()

        val scaledBitmap = if (originalBitmap.width > 2048 || originalBitmap.height > 2048) {
            val ratio = minOf(2048f / originalBitmap.width, 2048f / originalBitmap.height)
            val scaledWidth = (originalBitmap.width * ratio).toInt()
            val scaledHeight = (originalBitmap.height * ratio).toInt()
            Bitmap.createScaledBitmap(originalBitmap, scaledWidth, scaledHeight, true)
        } else {
            originalBitmap
        }

        val outputStream = ByteArrayOutputStream()
        val quality = when {
            scaledBitmap.width > 1500 -> 85
            scaledBitmap.width > 1000 -> 90
            else -> 95
        }

        scaledBitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)

        if (scaledBitmap != originalBitmap) {
            scaledBitmap.recycle()
        }
        originalBitmap.recycle()

        outputStream.toByteArray()
    }

    private fun handleUploadError(exception: Exception) {
        Log.e("HomeFragment", "Error subiendo imagen: ${exception.message}", exception)
        Toast.makeText(context, "Error al subir imagen: ${exception.message}", Toast.LENGTH_SHORT).show()
        binding.progressBar.visibility = View.GONE
        binding.btnSubmitVisit.isEnabled = true
    }

    // ==========================================
    // FUNCIÓN saveVisit CORREGIDA PARA USAR STATUS SELECCIONADO
    // ==========================================
    private fun saveVisit(businessName: String, comments: String, imageUrl: String?) {
        val userId = auth.currentUser?.uid ?: return
        val userName = auth.currentUser?.displayName ?: auth.currentUser?.email ?: "Usuario"

        lifecycleScope.launch {
            try {
                val prospectosCercanos = prospectosManager.buscarProspectosCercanos(
                    currentLocation!!.latitude,
                    currentLocation!!.longitude,
                    50.0
                )

                val prospectoCoincidente = prospectosCercanos.find { prospecto ->
                    businessName.contains(prospecto.nombre, ignoreCase = true) ||
                            prospecto.nombre.contains(businessName, ignoreCase = true)
                }

                // CORRECCIÓN: USAR EL STATUS SELECCIONADO POR EL USUARIO
                val visit = hashMapOf(
                    "userId" to userId,
                    "userName" to userName,
                    "businessName" to businessName,
                    "comments" to comments,
                    "imageUrl" to imageUrl,
                    "location" to GeoPoint(currentLocation!!.latitude, currentLocation!!.longitude),
                    "accuracy" to currentLocation!!.accuracy,
                    "timestamp" to Timestamp.now(),
                    "status" to selectedStatus, // CAMBIO: Usar el status seleccionado en lugar de "pending"
                    "prospectoId" to prospectoCoincidente?.id,
                    "esProspectoAviva" to (prospectoCoincidente != null),
                    "probabilidadOriginal" to prospectoCoincidente?.probabilidad
                )

                db.collection("visits")
                    .add(visit)
                    .addOnSuccessListener { documentReference ->
                        val visitaId = documentReference.id

                        prospectoCoincidente?.let { prospecto ->
                            lifecycleScope.launch {
                                prospectosManager.marcarProspectoComoVisitado(prospecto.id, visitaId)
                            }

                            Toast.makeText(
                                context,
                                "Visita registrada y asociada con prospecto Aviva: ${prospecto.nombre}",
                                Toast.LENGTH_LONG
                            ).show()
                        } ?: run {
                            val statusText = Visit.getStatusDisplayText(selectedStatus)
                            Toast.makeText(context, "Visita registrada con estado: $statusText", Toast.LENGTH_SHORT).show()
                        }

                        clearForm()
                        toggleVisitForm()
                        loadRecentVisits()

                        if (::googleMap.isInitialized) {
                            val latLng = LatLng(currentLocation!!.latitude, currentLocation!!.longitude)
                            val markerTitle = if (prospectoCoincidente != null) {
                                "Visitado: $businessName"
                            } else {
                                "Visita: $businessName"
                            }
                            googleMap.addMarker(
                                MarkerOptions()
                                    .position(latLng)
                                    .title(markerTitle)
                                    .snippet("Visita registrada")
                            )
                        }
                    }
                    .addOnFailureListener { e ->
                        Log.e("HomeFragment", "Error guardando visita: ${e.message}", e)
                        Toast.makeText(context, "Error al registrar visita: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                    .addOnCompleteListener {
                        binding.progressBar.visibility = View.GONE
                        binding.btnSubmitVisit.isEnabled = true
                    }
            } catch (e: Exception) {
                Log.e("HomeFragment", "Error en saveVisit: ${e.message}", e)
                Toast.makeText(context, "Error inesperado al registrar visita", Toast.LENGTH_SHORT).show()
                binding.progressBar.visibility = View.GONE
                binding.btnSubmitVisit.isEnabled = true
            }
        }
    }

    // ==========================================
    // FUNCIÓN clearForm CORREGIDA PARA RESETEAR STATUS
    // ==========================================
    private fun clearForm() {
        binding.businessNameInput.text?.clear()
        binding.businessNameInput.error = null
        binding.commentsInput.text?.clear()
        binding.imagePreview.setImageDrawable(null)
        binding.imagePreview.visibility = View.GONE

        // NUEVO: Resetear status spinner (índice 0 = "Solicitud creada")
        try {
            binding.statusSpinner.setSelection(0)
            selectedStatus = Visit.STATUS_SOLICITUD_CREADA
        } catch (e: Exception) {
            Log.w("HomeFragment", "Error reseteando status spinner: ${e.message}")
            selectedStatus = Visit.STATUS_SOLICITUD_CREADA
        }

        photoUri = null
        clearTempPhotoFile()
        updatePhotoButtonText()
    }

    // ==========================================
    // FUNCIÓN loadRecentVisits CORREGIDA - CRÍTICA PARA MOSTRAR VISITAS
    // ==========================================
    private fun loadRecentVisits() {
        val userId = auth.currentUser?.uid ?: run {
            Log.e("VisitasDebug", "No hay usuario autenticado")
            return
        }

        Log.d("VisitasDebug", "Iniciando carga de visitas para usuario: $userId")

        db.collection("visits")
            .whereEqualTo("userId", userId)
            .orderBy("timestamp", Query.Direction.DESCENDING)
            .limit(10)
            .get()
            .addOnSuccessListener { documents ->
                Log.d("VisitasDebug", "Documentos obtenidos: ${documents.size()}")

                if (documents.isEmpty()) {
                    Log.w("VisitasDebug", "No hay documentos en la colección 'visits' para este usuario")
                    showNoVisitsMessage()
                    return@addOnSuccessListener
                }

                val visits = mutableListOf<Visit>()

                documents.forEachIndexed { index, doc ->
                    try {
                        Log.d("VisitasDebug", "Procesando documento $index: ${doc.id}")
                        Log.d("VisitasDebug", "Datos del documento: ${doc.data}")

                        // CORRECCIÓN CRÍTICA: Crear visita manualmente para mejor control
                        val data = doc.data
                        val visit = Visit(
                            id = doc.id, // CRÍTICO: Asignar manualmente el ID
                            userId = data["userId"] as? String ?: "",
                            userName = data["userName"] as? String ?: "",
                            businessName = data["businessName"] as? String ?: "",
                            comments = data["comments"] as? String ?: "",
                            imageUrl = data["imageUrl"] as? String,
                            location = data["location"] as? GeoPoint,
                            accuracy = (data["accuracy"] as? Number)?.toFloat() ?: 0f,
                            timestamp = data["timestamp"] as? Timestamp,
                            status = data["status"] as? String ?: Visit.STATUS_SOLICITUD_CREADA,
                            prospectoId = data["prospectoId"] as? String,
                            esProspectoAviva = data["esProspectoAviva"] as? Boolean ?: false,
                            probabilidadOriginal = data["probabilidadOriginal"] as? Double
                        )

                        visits.add(visit)
                        Log.d("VisitasDebug", "✅ Visita $index procesada: ${visit.businessName} - Status: ${visit.status}")

                    } catch (e: Exception) {
                        Log.e("VisitasDebug", "❌ Error procesando documento $index: ${e.message}", e)
                    }
                }

                Log.d("VisitasDebug", "Total visitas procesadas correctamente: ${visits.size}")

                if (visits.isNotEmpty()) {
                    visitsAdapter.submitList(visits)
                    binding.recentVisitsRecyclerView.visibility = View.VISIBLE
                    Log.d("VisitasDebug", "✅ Lista de visitas actualizada en el adapter")
                } else {
                    showNoVisitsMessage()
                }
            }
            .addOnFailureListener { e ->
                Log.e("VisitasDebug", "❌ Error cargando visitas: ${e.message}", e)
                Toast.makeText(context, "Error al cargar visitas: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    // ==========================================
    // NUEVA FUNCIÓN PARA MOSTRAR MENSAJE CUANDO NO HAY VISITAS
    // ==========================================
    private fun showNoVisitsMessage() {
        try {
            // Ocultar RecyclerView y mostrar mensaje
            binding.recentVisitsRecyclerView.visibility = View.GONE
            Toast.makeText(context, "No tienes visitas registradas aún", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Log.w("VisitasDebug", "Error mostrando mensaje de no visitas: ${e.message}")
        }
    }
}