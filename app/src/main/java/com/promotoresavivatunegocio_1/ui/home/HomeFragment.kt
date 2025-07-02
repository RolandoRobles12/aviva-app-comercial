package com.promotoresavivatunegocio_1.ui.home

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.location.Location
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.MotionEvent
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
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
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.databinding.FragmentHomeBinding
import com.promotoresavivatunegocio_1.models.Visit
import com.promotoresavivatunegocio_1.models.ProspectoAviva
import com.promotoresavivatunegocio_1.models.ProspectoGuardado
import com.promotoresavivatunegocio_1.models.EstadisticasProspectos
import com.promotoresavivatunegocio_1.adapters.VisitsAdapter
import com.promotoresavivatunegocio_1.services.ProspeccionService
import com.promotoresavivatunegocio_1.services.ProspectosManager
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

class HomeFragment : Fragment(), OnMapReadyCallback {

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
    private var prospectosAviva: List<ProspectoAviva> = emptyList()

    // Street View Manager (opcional - solo si la clase existe)
    private var streetViewManager: Any? = null

    private var currentLocation: Location? = null
    private var selectedImageUri: Uri? = null
    private var capturedImageBitmap: Bitmap? = null

    // Permission launchers
    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true) {
            getCurrentLocation()
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
        if (result.resultCode == Activity.RESULT_OK) {
            capturedImageBitmap = result.data?.extras?.getParcelable("data") as? Bitmap
            capturedImageBitmap?.let {
                binding.imagePreview.setImageBitmap(it)
                binding.imagePreview.visibility = View.VISIBLE
            }
        }
    }

    private val selectImageLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            selectedImageUri = it
            binding.imagePreview.setImageURI(it)
            binding.imagePreview.visibility = View.VISIBLE
        }
    }

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

        // FIX COMPLETO PARA MOTION EVENTS
        try {
            // 1. Desactivar split motion events en ScrollView
            binding.scrollView?.isMotionEventSplittingEnabled = false

            // 2. Configurar el contenedor principal
            (binding.root.parent as? ViewGroup)?.isMotionEventSplittingEnabled = false

            // 3. Desactivar en toda la jerarquía de vistas
            desactivarSplitMotionEventsRecursivo(binding.root)

        } catch (e: Exception) {
            Log.w("HomeFragment", "Error configurando motion events: ${e.message}")
        }

        return binding.root
    }

    // Función auxiliar para desactivar recursivamente
    private fun desactivarSplitMotionEventsRecursivo(view: View) {
        try {
            if (view is ViewGroup) {
                view.isMotionEventSplittingEnabled = false
                for (i in 0 until view.childCount) {
                    desactivarSplitMotionEventsRecursivo(view.getChildAt(i))
                }
            }
        } catch (e: Exception) {
            Log.w("HomeFragment", "Error en vista: ${e.message}")
        }
    }

    private fun initializeComponents() {
        auth = FirebaseAuth.getInstance()
        db = FirebaseFirestore.getInstance()
        storage = FirebaseStorage.getInstance()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(requireActivity())

        // Inicializar servicio de prospección
        prospeccionService = ProspeccionService(requireContext())

        // Inicializar gestor de prospectos
        prospectosManager = ProspectosManager(requireContext())

        // Simplificar StreetViewManager - ya no lo necesitamos con reflexión
        streetViewManager = null
        Log.d("HomeFragment", "Componentes inicializados - StreetView usando método directo")
    }

    private fun setupUI() {
        // Configurar botones existentes
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

        // BOTONES PARA AVIVA TU NEGOCIO
        binding.btnBuscarProspectos.setOnClickListener {
            Toast.makeText(context, "🔍 Buscando prospectos Aviva...", Toast.LENGTH_SHORT).show()
            buscarProspectosAviva()
        }

        binding.btnVerProspectos.setOnClickListener {
            Toast.makeText(context, "📋 Mostrando lista de prospectos...", Toast.LENGTH_SHORT).show()
            mostrarListaProspectos()
        }

        // Configurar RecyclerView
        visitsAdapter = VisitsAdapter()
        binding.recentVisitsRecyclerView.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = visitsAdapter
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

        // Mostrar resultado rápido
        try {
            if (prospectosAviva.isNotEmpty()) {
                binding.tvResultadosRapidos.text = "¡${prospectosAviva.size} prospectos encontrados!"
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
                    .title("🎯 ${prospecto.nombre}")
                    .snippet("${prospecto.giro} - ${(prospecto.probabilidad * 100).toInt()}% probabilidad")
            )
        }

        Log.d("HomeFragment", "Agregados ${prospectos.size} marcadores de prospectos al mapa")
    }

    private fun mostrarNotificacionProspectos(cantidad: Int) {
        val mensaje = when {
            cantidad == 1 -> "¡Se encontró 1 prospecto Aviva cerca de ti!"
            cantidad > 1 -> "¡Se encontraron $cantidad prospectos Aviva cerca de ti!"
            else -> "No hay prospectos Aviva en esta área"
        }

        Toast.makeText(context, mensaje, Toast.LENGTH_LONG).show()

        // Mostrar dialog con lista de prospectos
        if (cantidad > 0) {
            mostrarDialogProspectos()
        }
    }

    // FIX: MOSTRAR MÁS PROSPECTOS EN EL DIÁLOGO INICIAL CON BOTÓN CERRAR
    private fun mostrarDialogProspectos() {
        if (prospectosAviva.isEmpty()) return

        val prospectosLimitados = prospectosAviva.take(15)

        // MOSTRAR MÁS PROSPECTOS EN EL TEXTO INICIAL (no solo 5)
        val prospectosTexto = prospectosLimitados.take(10).map { prospecto ->
            "🏪 ${prospecto.nombre}\n📍 ${prospecto.giro}\n💰 ${prospecto.montoMinimoCentavos} - ${prospecto.montoMaximoCentavos}\n"
        }.joinToString("\n\n")

        val titulo = if (prospectosAviva.size > 15) {
            "🎯 Prospectos Aviva encontrados (Mostrando 15 de ${prospectosAviva.size})"
        } else {
            "🎯 Prospectos Aviva encontrados"
        }

        AlertDialog.Builder(requireContext())
            .setTitle(titulo)
            .setMessage(prospectosTexto)
            .setPositiveButton("🗺️ Ver en mapa") { _, _ ->
                // El mapa ya muestra los marcadores
            }
            .setNegativeButton("📷 Street View") { _, _ ->
                mostrarOpcionesStreetView()
            }
            .setNeutralButton("🚶‍♂️ Navegar") { _, _ ->
                mostrarOpcionesNavegacion()
            }
            .show()
    }

    // FUNCIONES DE NAVEGACIÓN MEJORADAS
    private fun mostrarOpcionesNavegacion() {
        if (prospectosAviva.isEmpty()) return

        val mensaje = "Elige cómo quieres navegar a los prospectos encontrados:"

        AlertDialog.Builder(requireContext())
            .setTitle("🚶‍♂️ Opciones de navegación")
            .setMessage(mensaje)
            .setPositiveButton("🗺️ Ruta completa\n(Todos los prospectos)") { _, _ ->
                navegarRutaCompleta()
            }
            .setNegativeButton("📍 Prospecto específico\n(Elegir uno)") { _, _ ->
                mostrarListaProspectosParaNavegar()
            }
            .setNeutralButton("⬅️ Atrás") { _, _ ->
                mostrarDialogProspectos()
            }
            .show()
    }

    // FIX DEFINITIVO: NAVEGACIÓN CON DEBUGGING ROBUSTO
    private fun mostrarListaProspectosParaNavegar() {
        Log.d("HomeFragment", "=== INICIO NAVEGACIÓN DEBUG ===")

        if (prospectosAviva.isEmpty()) {
            Log.e("HomeFragment", "prospectosAviva está vacía")
            Toast.makeText(context, "No hay prospectos disponibles. Busca primero usando 'Buscar Ahora'", Toast.LENGTH_LONG).show()
            return
        }

        Log.d("HomeFragment", "prospectosAviva tiene ${prospectosAviva.size} elementos")

        // Limitar a 15 prospectos máximo
        val prospectosLimitados = prospectosAviva.take(15)
        Log.d("HomeFragment", "prospectosLimitados tiene ${prospectosLimitados.size} elementos")

        // VERIFICAR QUE LA LISTA NO ESTÉ VACÍA
        if (prospectosLimitados.isEmpty()) {
            Log.e("HomeFragment", "prospectosLimitados está vacía después de take(15)")
            Toast.makeText(context, "Error: Lista de prospectos vacía", Toast.LENGTH_SHORT).show()
            return
        }

        // DEBUGGING: Imprimir cada prospecto antes de crear el array
        prospectosLimitados.forEachIndexed { index, prospecto ->
            Log.d("HomeFragment", "Prospecto navegación $index:")
            Log.d("HomeFragment", "  - Nombre: '${prospecto.nombre}'")
            Log.d("HomeFragment", "  - Giro: '${prospecto.giro}'")
        }

        // CREAR LISTA MÁS ROBUSTA SIN EMOJIS PROBLEMÁTICOS
        val opcionesProspectos = prospectosLimitados.mapIndexed { index, prospecto ->
            val nombre = if (prospecto.nombre.isNotBlank()) prospecto.nombre else "Negocio ${index + 1}"
            val giro = if (prospecto.giro.isNotBlank()) prospecto.giro else "Sin giro"
            val opcion = "$nombre - $giro"
            Log.d("HomeFragment", "Opción navegación $index creada: '$opcion'")
            opcion
        }.toTypedArray()

        Log.d("HomeFragment", "Array opcionesProspectos creado con ${opcionesProspectos.size} elementos")

        // VERIFICAR QUE EL ARRAY NO ESTÉ VACÍO
        if (opcionesProspectos.isEmpty()) {
            Log.e("HomeFragment", "opcionesProspectos está vacío después de mapear")
            Toast.makeText(context, "Error creando lista de opciones", Toast.LENGTH_SHORT).show()
            return
        }

        // DEBUGGING: Imprimir cada opción del array
        opcionesProspectos.forEachIndexed { index, opcion ->
            Log.d("HomeFragment", "Opción navegación array $index: '$opcion'")
        }

        val titulo = if (prospectosAviva.size > 15) {
            "Navegar (${prospectosLimitados.size} de ${prospectosAviva.size})"
        } else {
            "Navegar (${prospectosAviva.size} disponibles)"
        }

        Log.d("HomeFragment", "Título navegación: '$titulo'")
        Log.d("HomeFragment", "Creando AlertDialog navegación...")

        try {
            AlertDialog.Builder(requireContext())
                .setTitle(titulo)
                .setMessage("¿A cuál negocio quieres ir?")
                .setItems(opcionesProspectos) { dialog, which ->
                    Log.d("HomeFragment", "Item navegación seleccionado: índice $which")
                    try {
                        if (which >= 0 && which < prospectosLimitados.size) {
                            val prospectoSeleccionado = prospectosLimitados[which]
                            Log.d("HomeFragment", "Prospecto navegación seleccionado: ${prospectoSeleccionado.nombre}")
                            mostrarOpcionesProspecto(prospectoSeleccionado)
                        } else {
                            Log.e("HomeFragment", "Índice navegación fuera de rango: $which de ${prospectosLimitados.size}")
                            Toast.makeText(context, "Error: Índice fuera de rango", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Log.e("HomeFragment", "Error en selección navegación: ${e.message}", e)
                        Toast.makeText(context, "Error seleccionando prospecto: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
                .setNegativeButton("⬅️ Atrás") { _, _ ->
                    Log.d("HomeFragment", "Botón Atrás navegación presionado")
                    mostrarOpcionesNavegacion()
                }
                .show()

            Log.d("HomeFragment", "AlertDialog navegación mostrado exitosamente")

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error creando AlertDialog navegación: ${e.message}", e)
            Toast.makeText(context, "Error mostrando opciones: ${e.message}", Toast.LENGTH_SHORT).show()
        }

        Log.d("HomeFragment", "=== FIN NAVEGACIÓN DEBUG ===")
    }

    private fun mostrarOpcionesProspecto(prospecto: ProspectoAviva) {
        val mensaje = buildString {
            append("¿Qué quieres hacer con este negocio?\n\n")
            append("🏪 ${prospecto.nombre}\n")
            append("📍 ${prospecto.giro}\n")
            if (prospecto.telefono?.isNotBlank() == true) {
                append("📞 ${prospecto.telefono}")
            }
        }

        val builder = AlertDialog.Builder(requireContext())
            .setTitle("🎯 Opciones disponibles")
            .setMessage(mensaje)
            .setPositiveButton("🚶‍♂️ Navegar") { _, _ ->
                navegarHaciaProspecto(prospecto)
            }
            .setNegativeButton("📝 Registrar visita") { _, _ ->
                registrarVisitaProspecto(prospecto)
            }

        // Configurar tercer botón según disponibilidad de teléfono
        if (prospecto.telefono?.isNotBlank() == true) {
            builder.setNeutralButton("📞 Llamar") { _, _ ->
                Log.d("HomeFragment", "Botón llamar presionado desde opciones para: ${prospecto.telefono}")
                abrirTelefonoDirecto(prospecto.telefono!!)
            }
        } else {
            builder.setNeutralButton("📋 Detalles") { _, _ ->
                mostrarDetallesCompletos(prospecto)
            }
        }

        builder.show()
    }

    private fun registrarVisitaProspecto(prospecto: ProspectoAviva) {
        // Verificar ubicación
        if (currentLocation == null) {
            Toast.makeText(context, "📍 Obteniendo tu ubicación...", Toast.LENGTH_SHORT).show()
            getCurrentLocation()
            return
        }
        // Verificar si ya está visible el formulario
        if (binding.visitFormCard.visibility == View.VISIBLE) {
            // Si ya está abierto, solo llenar los datos
            llenarDatosProspecto(prospecto)
        } else {
            // Abrir formulario y luego llenar datos
            toggleVisitForm()

            // Esperar un poco para que se abra la animación
            binding.root.postDelayed({
                llenarDatosProspecto(prospecto)
            }, 300)
        }

        Toast.makeText(
            context,
            "📝 ¡Perfecto! Formulario listo para ${prospecto.nombre}",
            Toast.LENGTH_SHORT
        ).show()
    }

    private fun llenarDatosProspecto(prospecto: ProspectoAviva) {
        try {
            // Llenar nombre del negocio
            binding.businessNameInput.setText(prospecto.nombre)

            // Llenar comentarios con el giro y información adicional
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

            // Posicionar cursor al final para que el promotor pueda agregar más comentarios
            binding.commentsInput.setSelection(binding.commentsInput.text?.length ?: 0)

            // Scroll hacia el formulario para que sea visible
            binding.root.post {
                binding.scrollView?.smoothScrollTo(0, binding.visitFormCard.top)
            }

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error llenando datos del prospecto: ${e.message}")
            Toast.makeText(context, "Error preparando formulario", Toast.LENGTH_SHORT).show()
        }
    }

    // FIX DEFINITIVO: STREET VIEW CON DEBUGGING ROBUSTO
    private fun mostrarOpcionesStreetView() {
        Log.d("HomeFragment", "=== INICIO STREET VIEW DEBUG ===")

        if (prospectosAviva.isEmpty()) {
            Log.e("HomeFragment", "prospectosAviva está vacía")
            Toast.makeText(context, "No hay prospectos disponibles para Street View", Toast.LENGTH_SHORT).show()
            return
        }

        Log.d("HomeFragment", "prospectosAviva tiene ${prospectosAviva.size} elementos")

        // Limitar a 15 prospectos máximo
        val prospectosLimitados = prospectosAviva.take(15)
        Log.d("HomeFragment", "prospectosLimitados tiene ${prospectosLimitados.size} elementos")

        // VERIFICAR QUE LA LISTA NO ESTÉ VACÍA
        if (prospectosLimitados.isEmpty()) {
            Log.e("HomeFragment", "prospectosLimitados está vacía después de take(15)")
            Toast.makeText(context, "Error: Lista de prospectos vacía para Street View", Toast.LENGTH_SHORT).show()
            return
        }

        // DEBUGGING: Imprimir cada prospecto antes de crear el array
        prospectosLimitados.forEachIndexed { index, prospecto ->
            Log.d("HomeFragment", "Prospecto $index:")
            Log.d("HomeFragment", "  - Nombre: '${prospecto.nombre}'")
            Log.d("HomeFragment", "  - Giro: '${prospecto.giro}'")
            Log.d("HomeFragment", "  - Nombre vacío: ${prospecto.nombre.isBlank()}")
            Log.d("HomeFragment", "  - Giro vacío: ${prospecto.giro.isBlank()}")
        }

        // CREAR LISTA MÁS ROBUSTA SIN EMOJIS PROBLEMÁTICOS
        val opcionesStreetView = prospectosLimitados.mapIndexed { index, prospecto ->
            val nombre = if (prospecto.nombre.isNotBlank()) prospecto.nombre else "Negocio ${index + 1}"
            val giro = if (prospecto.giro.isNotBlank()) prospecto.giro else "Sin giro"
            val opcion = "$nombre - $giro"
            Log.d("HomeFragment", "Opción $index creada: '$opcion'")
            opcion
        }.toTypedArray()

        Log.d("HomeFragment", "Array opcionesStreetView creado con ${opcionesStreetView.size} elementos")

        // VERIFICAR QUE EL ARRAY NO ESTÉ VACÍO
        if (opcionesStreetView.isEmpty()) {
            Log.e("HomeFragment", "opcionesStreetView está vacío después de mapear")
            Toast.makeText(context, "Error creando lista de opciones", Toast.LENGTH_SHORT).show()
            return
        }

        // DEBUGGING: Imprimir cada opción del array
        opcionesStreetView.forEachIndexed { index, opcion ->
            Log.d("HomeFragment", "Opción array $index: '$opcion'")
        }

        val titulo = if (prospectosAviva.size > 15) {
            "Street View (${prospectosLimitados.size} de ${prospectosAviva.size})"
        } else {
            "Street View (${prospectosAviva.size} disponibles)"
        }

        Log.d("HomeFragment", "Título: '$titulo'")
        Log.d("HomeFragment", "Creando AlertDialog...")

        try {
            AlertDialog.Builder(requireContext())
                .setTitle(titulo)
                .setMessage("Selecciona un negocio para ver su ubicación:")
                .setItems(opcionesStreetView) { dialog, which ->
                    Log.d("HomeFragment", "Item seleccionado: índice $which")
                    try {
                        if (which >= 0 && which < prospectosLimitados.size) {
                            val prospectoSeleccionado = prospectosLimitados[which]
                            Log.d("HomeFragment", "Prospecto seleccionado: ${prospectoSeleccionado.nombre}")
                            abrirStreetViewDirecto(prospectoSeleccionado)
                            Toast.makeText(context, "Abriendo Street View de ${prospectoSeleccionado.nombre}", Toast.LENGTH_SHORT).show()
                        } else {
                            Log.e("HomeFragment", "Índice fuera de rango: $which de ${prospectosLimitados.size}")
                            Toast.makeText(context, "Error: Índice fuera de rango", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Log.e("HomeFragment", "Error en selección: ${e.message}", e)
                        Toast.makeText(context, "Error abriendo Street View: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
                .setNegativeButton("⬅️ Atrás") { _, _ ->
                    Log.d("HomeFragment", "Botón Atrás presionado")
                    mostrarDialogProspectos()
                }
                .show()

            Log.d("HomeFragment", "AlertDialog mostrado exitosamente")

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error creando AlertDialog: ${e.message}", e)
            Toast.makeText(context, "Error mostrando opciones: ${e.message}", Toast.LENGTH_SHORT).show()
        }

        Log.d("HomeFragment", "=== FIN STREET VIEW DEBUG ===")
    }

    // FUNCIÓN CORREGIDA - SIN REFERENCIAS ROTAS
    private fun mostrarStreetView(prospecto: ProspectoAviva) {
        // Ya no usar streetViewManager aquí, usar directamente el método que funciona
        abrirStreetViewDirecto(prospecto)
    }

    private fun abrirStreetViewDirecto(prospecto: ProspectoAviva) {
        try {
            Toast.makeText(context, "📷 Abriendo Street View de ${prospecto.nombre}...", Toast.LENGTH_SHORT).show()

            Log.d("HomeFragment", "Street View usando método directo")
            abrirStreetViewConIntent(prospecto)

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error general con Street View: ${e.message}")
            // Fallback a método directo
            abrirStreetViewConIntent(prospecto)
        }
    }

    // Método directo para abrir Street View sin dependencias externas
    private fun abrirStreetViewConIntent(prospecto: ProspectoAviva) {
        try {
            // Opción 1: Intentar abrir Street View en Google Maps
            val streetViewUri = Uri.parse(
                "google.streetview:cbll=${prospecto.latitud},${prospecto.longitud}&cbp=1,0,,0,1.0&mz=20"
            )
            val streetViewIntent = Intent(Intent.ACTION_VIEW, streetViewUri)
            streetViewIntent.setPackage("com.google.android.apps.maps")

            if (streetViewIntent.resolveActivity(requireActivity().packageManager) != null) {
                startActivity(streetViewIntent)
                Toast.makeText(context, "📷 Mostrando Street View de ${prospecto.nombre}", Toast.LENGTH_SHORT).show()
                Log.d("HomeFragment", "Street View abierto exitosamente")
            } else {
                // Fallback: Abrir en navegador web
                abrirStreetViewEnWeb(prospecto)
            }
        } catch (e: Exception) {
            Log.e("HomeFragment", "Error abriendo Street View: ${e.message}")
            // Último fallback: Abrir ubicación normal
            abrirUbicacionEnMapas(prospecto)
        }
    }

    // Fallback: Abrir Street View en navegador web
    private fun abrirStreetViewEnWeb(prospecto: ProspectoAviva) {
        try {
            val webStreetViewUrl = "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${prospecto.latitud},${prospecto.longitud}"
            val webIntent = Intent(Intent.ACTION_VIEW, Uri.parse(webStreetViewUrl))

            if (webIntent.resolveActivity(requireActivity().packageManager) != null) {
                startActivity(webIntent)
                Toast.makeText(context, "📷 Abriendo Street View en navegador para ${prospecto.nombre}", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(context, "❌ No se puede abrir Street View en este dispositivo", Toast.LENGTH_SHORT).show()
                // Como último recurso, abrir ubicación normal
                abrirUbicacionEnMapas(prospecto)
            }
        } catch (e: Exception) {
            Log.e("HomeFragment", "Error abriendo Street View en web: ${e.message}")
            Toast.makeText(context, "❌ Error abriendo Street View", Toast.LENGTH_SHORT).show()
        }
    }

    // FUNCIÓN DE FILTRADO
    private fun filtrarProspectosRelevantes(prospectos: List<ProspectoAviva>): List<ProspectoAviva> {
        val girosExcluidos = setOf(
            "revistas", "periódicos", "periodico", "revista",
            "puestos de revistas", "puesto de periodicos",
            "venta de revistas", "venta de periodicos",
            "comercio al por menor de revistas",
            "comercio al por menor de periódicos",
            "revistas y libros atrasados",
            "comercio al por menor de revistas y periódicos"
        )

        return prospectos.filter { prospecto ->
            val giroLower = prospecto.giro.lowercase()
            val nombreLower = prospecto.nombre.lowercase()

            // Excluir si contiene palabras clave de revistas/periódicos
            !girosExcluidos.any { palabraExcluida ->
                giroLower.contains(palabraExcluida) || nombreLower.contains(palabraExcluida)
            }
        }
    }

    private fun navegarRutaCompleta() {
        if (prospectosAviva.isEmpty()) {
            Toast.makeText(context, "No hay prospectos para crear ruta", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            // Construir URL para ruta con múltiples waypoints
            val urlRuta = construirUrlRutaCompleta()

            // Intentar abrir Google Maps con la ruta completa
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
                // Fallback: Mostrar opciones alternativas
                mostrarOpcionesRutaAlternativas()
            }

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error creando ruta completa: ${e.message}")
            mostrarOpcionesRutaAlternativas()
        }
    }

    private fun construirUrlRutaCompleta(): String {
        val origen = "${currentLocation?.latitude},${currentLocation?.longitude}"

        // Tomar los primeros 8 prospectos (límite de Google Maps)
        val prospectosParaRuta = prospectosAviva.take(8)

        // Crear waypoints intermedios
        val waypoints = prospectosParaRuta.dropLast(1).joinToString("|") { prospecto ->
            "${prospecto.latitud},${prospecto.longitud}"
        }

        // Destino final
        val destino = prospectosParaRuta.last().let { "${it.latitud},${it.longitud}" }

        // Construir URL para Google Maps con ruta optimizada
        return if (waypoints.isNotEmpty()) {
            "https://www.google.com/maps/dir/?api=1" +
                    "&origin=$origen" +
                    "&destination=$destino" +
                    "&waypoints=$waypoints" +
                    "&travelmode=walking" +
                    "&optimize=true"
        } else {
            // Si solo hay un prospecto, navegación simple
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
                // Centrar el mapa para mostrar todos los prospectos
                centrarMapaEnTodosLosProspectos()
            }
            .setNegativeButton("Cerrar", null)
            .show()
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
            val clipboard = requireContext().getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
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
            // Crear bounds que incluyan todos los prospectos
            val builder = com.google.android.gms.maps.model.LatLngBounds.Builder()

            // Agregar ubicación actual
            currentLocation?.let {
                builder.include(LatLng(it.latitude, it.longitude))
            }

            // Agregar todos los prospectos
            prospectosAviva.forEach { prospecto ->
                builder.include(LatLng(prospecto.latitud, prospecto.longitud))
            }

            val bounds = builder.build()
            val padding = 100 // padding en pixels

            googleMap.animateCamera(
                CameraUpdateFactory.newLatLngBounds(bounds, padding)
            )

            Toast.makeText(context, "Mostrando todos los ${prospectosAviva.size} prospectos", Toast.LENGTH_SHORT).show()

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error centrando mapa: ${e.message}")
        }
    }

    private fun navegarHaciaProspecto(prospecto: ProspectoAviva) {
        try {
            // Opción 1: Intentar abrir Google Maps con navegación a pie
            val uriNavegacion = Uri.parse(
                "google.navigation:q=${prospecto.latitud},${prospecto.longitud}&mode=w"
            )
            val intentNavegacion = Intent(Intent.ACTION_VIEW, uriNavegacion)
            intentNavegacion.setPackage("com.google.android.apps.maps")

            if (intentNavegacion.resolveActivity(requireActivity().packageManager) != null) {
                startActivity(intentNavegacion)
                Toast.makeText(context, "🗺️ ¡Navegando a pie hacia ${prospecto.nombre}!", Toast.LENGTH_LONG).show()
            } else {
                // Fallback: Abrir ubicación en cualquier app de mapas
                abrirUbicacionEnMapas(prospecto)
            }

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error abriendo navegación: ${e.message}")
            // Fallback si hay error
            abrirUbicacionEnMapas(prospecto)
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
                Toast.makeText(context, "📍 Abriendo ubicación de ${prospecto.nombre} en tu app de mapas", Toast.LENGTH_LONG).show()
            } else {
                // Último fallback: copiar coordenadas al portapapeles
                copiarCoordenadasAlPortapapeles(prospecto)
            }

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error abriendo ubicación: ${e.message}")
            copiarCoordenadasAlPortapapeles(prospecto)
        }
    }

    private fun copiarCoordenadasAlPortapapeles(prospecto: ProspectoAviva) {
        try {
            val clipboard = requireContext().getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
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

    // FIX: LISTA DE PROSPECTOS CON STREET VIEW Y BOTONES CORREGIDOS
    private fun mostrarListaProspectos() {
        if (prospectosAviva.isEmpty()) {
            Toast.makeText(context, "No hay prospectos. Busca primero usando 'Buscar Ahora'", Toast.LENGTH_LONG).show()
            return
        }

        // Limitar a 15 prospectos máximo
        val prospectosLimitados = prospectosAviva.take(15)

        val listaTexto = prospectosLimitados.joinToString("\n\n") { prospecto ->
            "🏪 ${prospecto.nombre}\n📍 ${prospecto.giro}\n💰 ${prospecto.montoMinimoCentavos} - ${prospecto.montoMaximoCentavos}\n📊 ${(prospecto.probabilidad * 100).toInt()}% probabilidad"
        }

        val titulo = if (prospectosAviva.size > 15) {
            "📋 Lista de prospectos (Mostrando 15 de ${prospectosAviva.size})"
        } else {
            "📋 Lista de prospectos"
        }

        // FIX: AGREGAMOS STREET VIEW Y REORDENAMOS BOTONES
        AlertDialog.Builder(requireContext())
            .setTitle(titulo)
            .setMessage(listaTexto)
            .setPositiveButton("📝 Registrar visita") { _, _ ->
                mostrarListaParaRegistrarVisita()
            }
            .setNegativeButton("🚶‍♂️ Navegar") { _, _ ->
                mostrarOpcionesNavegacion()
            }
            .setNeutralButton("📷 Street View") { _, _ ->
                mostrarOpcionesStreetView()
            }
            .show()
    }

    // TAMBIÉN ACTUALIZA LA FUNCIÓN PARA REGISTRAR VISITAS
    private fun mostrarListaParaRegistrarVisita() {
        Log.d("HomeFragment", "=== INICIO REGISTRAR VISITA DEBUG ===")

        if (prospectosAviva.isEmpty()) {
            Log.e("HomeFragment", "prospectosAviva está vacía para registrar visita")
            Toast.makeText(context, "No hay prospectos disponibles. Busca primero usando 'Buscar Ahora'", Toast.LENGTH_LONG).show()
            return
        }

        Log.d("HomeFragment", "prospectosAviva tiene ${prospectosAviva.size} elementos para registrar visita")

        // Limitar a 15 prospectos máximo
        val prospectosLimitados = prospectosAviva.take(15)
        Log.d("HomeFragment", "prospectosLimitados tiene ${prospectosLimitados.size} elementos para registrar visita")

        // VERIFICAR QUE LA LISTA NO ESTÉ VACÍA
        if (prospectosLimitados.isEmpty()) {
            Log.e("HomeFragment", "prospectosLimitados está vacía para registrar visita")
            Toast.makeText(context, "Error: Lista de prospectos vacía", Toast.LENGTH_SHORT).show()
            return
        }

        // CREAR LISTA MÁS ROBUSTA
        val nombresProspectos = prospectosLimitados.mapIndexed { index, prospecto ->
            val nombre = if (prospecto.nombre.isNotBlank()) prospecto.nombre else "Negocio ${index + 1}"
            val giro = if (prospecto.giro.isNotBlank()) prospecto.giro else "Sin giro"
            val probabilidad = "${(prospecto.probabilidad * 100).toInt()}%"
            val opcion = "$nombre - $giro ($probabilidad)"
            Log.d("HomeFragment", "Opción registrar visita $index: '$opcion'")
            opcion
        }.toTypedArray()

        Log.d("HomeFragment", "Array nombresProspectos creado con ${nombresProspectos.size} elementos")

        // VERIFICAR QUE EL ARRAY NO ESTÉ VACÍO
        if (nombresProspectos.isEmpty()) {
            Log.e("HomeFragment", "nombresProspectos está vacío")
            Toast.makeText(context, "Error creando lista de opciones", Toast.LENGTH_SHORT).show()
            return
        }

        val titulo = if (prospectosAviva.size > 15) {
            "Registrar visita (${prospectosLimitados.size} de ${prospectosAviva.size})"
        } else {
            "Registrar visita (${prospectosAviva.size} disponibles)"
        }

        Log.d("HomeFragment", "Título registrar visita: '$titulo'")

        try {
            AlertDialog.Builder(requireContext())
                .setTitle(titulo)
                .setMessage("Selecciona el negocio que visitarás:")
                .setItems(nombresProspectos) { dialog, which ->
                    Log.d("HomeFragment", "Item registrar visita seleccionado: índice $which")
                    try {
                        if (which >= 0 && which < prospectosLimitados.size) {
                            val prospectoSeleccionado = prospectosLimitados[which]
                            Log.d("HomeFragment", "Prospecto registrar visita seleccionado: ${prospectoSeleccionado.nombre}")
                            registrarVisitaProspecto(prospectoSeleccionado)
                        } else {
                            Log.e("HomeFragment", "Índice registrar visita fuera de rango: $which de ${prospectosLimitados.size}")
                            Toast.makeText(context, "Error: Índice fuera de rango", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Log.e("HomeFragment", "Error en selección registrar visita: ${e.message}", e)
                        Toast.makeText(context, "Error seleccionando prospecto: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
                .setNegativeButton("⬅️ Atrás") { _, _ ->
                    Log.d("HomeFragment", "Botón Atrás registrar visita presionado")
                    mostrarListaProspectos()
                }
                .show()

            Log.d("HomeFragment", "AlertDialog registrar visita mostrado exitosamente")

        } catch (e: Exception) {
            Log.e("HomeFragment", "Error creando AlertDialog registrar visita: ${e.message}", e)
            Toast.makeText(context, "Error mostrando opciones: ${e.message}", Toast.LENGTH_SHORT).show()
        }

        Log.d("HomeFragment", "=== FIN REGISTRAR VISITA DEBUG ===")
    }

    // FUNCIONES EXISTENTES (sin cambios en la lógica principal)

    private fun requestLocationPermissions() {
        when {
            hasLocationPermissions() -> {
                getCurrentLocation()
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
    private fun getCurrentLocation() {
        if (!hasLocationPermissions()) return

        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            location?.let {
                currentLocation = it
                updateMapLocation(it)
            } ?: run {
                Toast.makeText(context, "No se pudo obtener la ubicación. Verifica que el GPS esté activado.", Toast.LENGTH_SHORT).show()
            }
        }.addOnFailureListener {
            Toast.makeText(context, "Error al obtener ubicación: ${it.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupMap() {
        val mapFragment =
            childFragmentManager.findFragmentById(R.id.map) as? SupportMapFragment
        mapFragment?.getMapAsync(this)

        // FIX COMPLETO: Manejo seguro de touch events para el mapa
        mapFragment?.view?.let { mapView ->
            try {
                // Desactivar split motion events en el mapa
                if (mapView is ViewGroup) {
                    mapView.isMotionEventSplittingEnabled = false
                }

                // Configurar touch listener más robusto
                mapView.setOnTouchListener { v, event ->
                    try {
                        when (event.action and MotionEvent.ACTION_MASK) {
                            MotionEvent.ACTION_DOWN -> {
                                // Bloquear interceptación del ScrollView al comenzar el toque
                                binding.root.parent?.requestDisallowInterceptTouchEvent(true)
                                binding.scrollView?.requestDisallowInterceptTouchEvent(true)
                            }
                            MotionEvent.ACTION_UP,
                            MotionEvent.ACTION_CANCEL,
                            MotionEvent.ACTION_POINTER_UP -> {
                                // Restaurar interceptación del ScrollView al terminar
                                binding.root.parent?.requestDisallowInterceptTouchEvent(false)
                                binding.scrollView?.requestDisallowInterceptTouchEvent(false)
                            }
                        }
                    } catch (e: Exception) {
                        Log.w("HomeFragment", "Error en touch event: ${e.message}")
                    }
                    false // Permitir que el mapa procese el evento normalmente
                }
            } catch (e: Exception) {
                Log.w("HomeFragment", "Error configurando mapa: ${e.message}")
            }
        }
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        enableMapLocation()
        currentLocation?.let {
            updateMapLocation(it)
        }

        // Configurar click en marcadores para navegación y Street View
        googleMap.setOnMarkerClickListener { marker ->
            // Buscar el prospecto correspondiente al marcador
            val prospectoSeleccionado = prospectosAviva.find { prospecto ->
                val markerPos = marker.position
                prospecto.latitud == markerPos.latitude && prospecto.longitud == markerPos.longitude
            }

            prospectoSeleccionado?.let { prospecto ->
                mostrarInfoProspectoConNavegacion(prospecto, marker)
            }

            true // Consumir el evento
        }
    }

    // FIX: AGREGAR STREET VIEW EN MARCADORES DEL MAPA
    private fun mostrarInfoProspectoConNavegacion(prospecto: ProspectoAviva, marker: com.google.android.gms.maps.model.Marker) {
        val infoTexto = buildString {
            append("🏪 ${prospecto.nombre}\n")
            append("📍 ${prospecto.giro}\n")
            append("💰 ${prospecto.montoMinimoCentavos} - ${prospecto.montoMaximoCentavos}\n")
            append("📊 ${(prospecto.probabilidad * 100).toInt()}% probabilidad\n")
            append("📍 ${prospecto.direccion}")
        }

        // FIX: AGREGAMOS STREET VIEW AQUÍ TAMBIÉN
        AlertDialog.Builder(requireContext())
            .setTitle("🎯 Información del prospecto")
            .setMessage(infoTexto)
            .setPositiveButton("🚶‍♂️ Navegar") { _, _ ->
                navegarHaciaProspecto(prospecto)
            }
            .setNegativeButton("📝 Registrar visita") { _, _ ->
                registrarVisitaProspecto(prospecto)
            }
            .setNeutralButton("📷 Street View") { _, _ ->
                abrirStreetViewDirecto(prospecto)
            }
            .show()
    }

    private fun mostrarDetallesCompletos(prospecto: ProspectoAviva) {
        val detallesCompletos = buildString {
            append("🏪 Nombre: ${prospecto.nombre}\n\n")
            append("📍 Giro: ${prospecto.giro}\n\n")
            append("🏠 Dirección: ${prospecto.direccion}\n\n")

            if (prospecto.telefono?.isNotBlank() == true) {
                append("📞 Teléfono: ${prospecto.telefono}\n\n")
            } else {
                append("📞 Teléfono: No disponible\n\n")
            }

            append("💰 Monto: ${prospecto.montoMinimoCentavos} - ${prospecto.montoMaximoCentavos}\n\n")
            append("📊 Probabilidad: ${(prospecto.probabilidad * 100).toInt()}%\n\n")
            append("✅ Razón:\n${prospecto.razonProbabilidad}")
        }

        val builder = AlertDialog.Builder(requireContext())
            .setTitle("📋 Detalles completos")
            .setMessage(detallesCompletos)
            .setPositiveButton("🚶‍♂️ Navegar") { _, _ ->
                navegarHaciaProspecto(prospecto)
            }
            .setNegativeButton("📝 Registrar visita") { _, _ ->
                registrarVisitaProspecto(prospecto)
            }

        // Configurar tercer botón según disponibilidad de teléfono
        if (prospecto.telefono?.isNotBlank() == true) {
            builder.setNeutralButton("📞 Llamar") { _, _ ->
                Log.d("HomeFragment", "Botón llamar presionado para: ${prospecto.telefono}")
                abrirTelefonoDirecto(prospecto.telefono!!)
            }
        } else {
            builder.setNeutralButton("⬅️ Volver") { _, _ ->
                mostrarInfoProspectoInicial(prospecto)
            }
        }

        builder.show()
    }

    private fun abrirTelefonoDirecto(telefono: String) {
        try {
            Log.d("HomeFragment", "=== Iniciando llamada ===")

            // Limpiar el número más agresivamente
            val numeroLimpio = telefono
                .replace(" ", "")
                .replace("-", "")
                .replace("(", "")
                .replace(")", "")
                .replace(".", "")
                .trim()

            if (numeroLimpio.isEmpty()) {
                Toast.makeText(context, "❌ Número de teléfono no válido", Toast.LENGTH_SHORT).show()
                return
            }

            // Crear intent para el dialer
            val dialIntent = Intent(Intent.ACTION_DIAL)
            dialIntent.data = Uri.parse("tel:$numeroLimpio")

            // Verificar que hay una app que pueda manejar el intent
            if (dialIntent.resolveActivity(requireActivity().packageManager) != null) {
                startActivity(dialIntent)
                Toast.makeText(context, "📞 Abriendo marcador para llamar a $numeroLimpio", Toast.LENGTH_LONG).show()
                Log.d("HomeFragment", "=== Llamada iniciada exitosamente ===")
            } else {
                Toast.makeText(context, "❌ No hay aplicación de teléfono instalada en este dispositivo", Toast.LENGTH_LONG).show()
            }

        } catch (e: Exception) {
            Log.e("HomeFragment", "=== Error en llamada ===", e)
            Toast.makeText(context, "❌ Error abriendo marcador: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    // Nueva función para mostrar la información inicial
    private fun mostrarInfoProspectoInicial(prospecto: ProspectoAviva) {
        val infoTexto = buildString {
            append("🏪 ${prospecto.nombre}\n")
            append("📍 ${prospecto.giro}\n")
            append("💰 ${prospecto.montoMinimoCentavos} - ${prospecto.montoMaximoCentavos}\n")
            append("📊 ${(prospecto.probabilidad * 100).toInt()}% probabilidad\n")
            append("📍 ${prospecto.direccion}")
        }

        AlertDialog.Builder(requireContext())
            .setTitle("🎯 Información del prospecto")
            .setMessage(infoTexto)
            .setPositiveButton("🚶‍♂️ Navegar") { _, _ ->
                navegarHaciaProspecto(prospecto)
            }
            .setNegativeButton("📝 Registrar visita") { _, _ ->
                registrarVisitaProspecto(prospecto)
            }
            .setNeutralButton("📋 Detalles") { _, _ ->
                mostrarDetallesCompletos(prospecto)
            }
            .show()
    }

    @SuppressLint("MissingPermission")
    private fun enableMapLocation() {
        if (hasLocationPermissions() && ::googleMap.isInitialized) {
            try {
                googleMap.isMyLocationEnabled = true
            } catch (e: SecurityException) {
                // Handle permission error
            }
        }
    }

    private fun updateMapLocation(location: Location) {
        if (::googleMap.isInitialized) {
            val latLng = LatLng(location.latitude, location.longitude)
            googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, 15f))
        }
    }

    private fun toggleVisitForm() {
        if (binding.visitFormCard.visibility == View.VISIBLE) {
            binding.visitFormCard.visibility = View.GONE
            binding.btnRegisterVisit.text = "Registrar Visita"
        } else {
            binding.visitFormCard.visibility = View.VISIBLE
            binding.btnRegisterVisit.text = "Cancelar"
        }
    }

    private fun requestCameraPermissionAndTakePhoto() {
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
        val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (takePictureIntent.resolveActivity(requireActivity().packageManager) != null) {
            takePictureLauncher.launch(takePictureIntent)
        } else {
            Toast.makeText(context, "No se encontró una aplicación de cámara", Toast.LENGTH_SHORT).show()
        }
    }

    private fun selectImage() {
        selectImageLauncher.launch("image/*")
    }

    private fun submitVisit() {
        val businessName = binding.businessNameInput.text.toString().trim()
        val comments = binding.commentsInput.text.toString().trim()

        // Validaciones
        when {
            businessName.isEmpty() -> {
                binding.businessNameInput.error = "Por favor ingresa el nombre del negocio"
                return
            }
            currentLocation == null -> {
                Toast.makeText(context, "No se pudo obtener la ubicación actual", Toast.LENGTH_SHORT).show()
                getCurrentLocation()
                return
            }
        }

        binding.progressBar.visibility = View.VISIBLE
        binding.btnSubmitVisit.isEnabled = false

        // Subir imagen si existe
        if (selectedImageUri != null || capturedImageBitmap != null) {
            uploadImage { imageUrl ->
                saveVisit(businessName, comments, imageUrl)
            }
        } else {
            saveVisit(businessName, comments, null)
        }
    }

    private fun uploadImage(onSuccess: (String) -> Unit) {
        val userId = auth.currentUser?.uid ?: return
        val timestamp = System.currentTimeMillis()
        val imageName = "visit_${userId}_$timestamp.jpg"
        val imageRef = storage.reference.child("visits/$imageName")

        val uploadTask = when {
            selectedImageUri != null -> imageRef.putFile(selectedImageUri!!)
            capturedImageBitmap != null -> {
                val baos = ByteArrayOutputStream()
                capturedImageBitmap!!.compress(Bitmap.CompressFormat.JPEG, 85, baos)
                val data = baos.toByteArray()
                imageRef.putBytes(data)
            }
            else -> return
        }

        uploadTask.addOnSuccessListener {
            imageRef.downloadUrl.addOnSuccessListener { uri ->
                onSuccess(uri.toString())
            }.addOnFailureListener { e ->
                handleUploadError(e)
            }
        }.addOnFailureListener { e ->
            handleUploadError(e)
        }
    }

    private fun handleUploadError(exception: Exception) {
        Toast.makeText(context, "Error al subir imagen: ${exception.message}", Toast.LENGTH_SHORT).show()
        binding.progressBar.visibility = View.GONE
        binding.btnSubmitVisit.isEnabled = true
    }

    private fun saveVisit(businessName: String, comments: String, imageUrl: String?) {
        val userId = auth.currentUser?.uid ?: return
        val userName = auth.currentUser?.displayName ?: auth.currentUser?.email ?: "Usuario"

        lifecycleScope.launch {
            // Buscar si hay prospectos cercanos a esta visita
            val prospectosCercanos = prospectosManager.buscarProspectosCercanos(
                currentLocation!!.latitude,
                currentLocation!!.longitude,
                50.0 // 50 metros de radio
            )

            val prospectoCoincidente = prospectosCercanos.find { prospecto ->
                businessName.contains(prospecto.nombre, ignoreCase = true) ||
                        prospecto.nombre.contains(businessName, ignoreCase = true)
            }

            val visit = hashMapOf(
                "userId" to userId,
                "userName" to userName,
                "businessName" to businessName,
                "comments" to comments,
                "imageUrl" to imageUrl,
                "location" to GeoPoint(currentLocation!!.latitude, currentLocation!!.longitude),
                "accuracy" to currentLocation!!.accuracy,
                "timestamp" to Timestamp.now(),
                "status" to "pending",

                // Campos de emparejamiento
                "prospectoId" to prospectoCoincidente?.id,
                "esProspectoAviva" to (prospectoCoincidente != null),
                "probabilidadOriginal" to prospectoCoincidente?.probabilidad
            )

            db.collection("visits")
                .add(visit)
                .addOnSuccessListener { documentReference ->
                    val visitaId = documentReference.id

                    // Si hay prospecto coincidente, marcarlo como visitado
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
                        Toast.makeText(context, "Visita registrada exitosamente", Toast.LENGTH_SHORT).show()
                    }

                    clearForm()
                    toggleVisitForm()
                    loadRecentVisits()

                    if (::googleMap.isInitialized) {
                        val latLng = LatLng(currentLocation!!.latitude, currentLocation!!.longitude)
                        val markerTitle = if (prospectoCoincidente != null) {
                            "Visitado ${businessName}"
                        } else {
                            "Visita ${businessName}"
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
                    Toast.makeText(context, "Error al registrar visita: ${e.message}", Toast.LENGTH_SHORT).show()
                }
                .addOnCompleteListener {
                    binding.progressBar.visibility = View.GONE
                    binding.btnSubmitVisit.isEnabled = true
                }
        }
    }

    private fun clearForm() {
        binding.businessNameInput.text?.clear()
        binding.businessNameInput.error = null
        binding.commentsInput.text?.clear()
        binding.imagePreview.setImageDrawable(null)
        binding.imagePreview.visibility = View.GONE
        selectedImageUri = null
        capturedImageBitmap = null
    }

    private fun loadRecentVisits() {
        val userId = auth.currentUser?.uid ?: return

        db.collection("visits")
            .whereEqualTo("userId", userId)
            .orderBy("timestamp", Query.Direction.DESCENDING)
            .limit(10)
            .get()
            .addOnSuccessListener { documents ->
                val visits = documents.mapNotNull { doc ->
                    try {
                        doc.toObject(Visit::class.java).copy(id = doc.id)
                    } catch (e: Exception) {
                        null
                    }
                }
                visitsAdapter.submitList(visits)
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Error al cargar visitas: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    // FUNCIÓN PRINCIPAL QUE USA LA API REAL DE DENUE CON FILTRADO Y GUARDADO
    private fun buscarProspectosAviva() {
        if (currentLocation == null) {
            Toast.makeText(context, "Obteniendo ubicación...", Toast.LENGTH_SHORT).show()
            getCurrentLocation()
            return
        }

        lifecycleScope.launch {
            try {
                Log.d("HomeFragment", "Iniciando búsqueda de prospectos Aviva usando API DENUE...")

                // Mostrar indicador de carga
                try {
                    binding.progressBarProspectos.visibility = View.VISIBLE
                } catch (e: Exception) {
                    Log.w("HomeFragment", "ProgressBar no encontrado: ${e.message}")
                }

                // USAR LA API REAL DE DENUE
                val prospectosRaw = prospeccionService.buscarProspectosEnArea(
                    latitud = currentLocation!!.latitude,
                    longitud = currentLocation!!.longitude
                )

                // FILTRAR PUESTOS DE REVISTAS/PERIÓDICOS
                val prospectosFiltrados = filtrarProspectosRelevantes(prospectosRaw)

                // ASIGNAR A LA VARIABLE GLOBAL - MUY IMPORTANTE
                prospectosAviva = prospectosFiltrados

                Log.d("HomeFragment", "=== Estado después de filtrado ===")
                Log.d("HomeFragment", "API DENUE devolvió: ${prospectosRaw.size} prospectos")
                Log.d("HomeFragment", "Filtrados: ${prospectosFiltrados.size} prospectos")
                Log.d("HomeFragment", "Variable prospectosAviva tiene: ${prospectosAviva.size} elementos")
                Log.d("HomeFragment", "¿prospectosAviva está vacía? ${prospectosAviva.isEmpty()}")

                prospectosAviva.forEachIndexed { index, prospecto ->
                    Log.d("HomeFragment", "Prospecto $index: ${prospecto.nombre} (${prospecto.giro})")
                }

                // GUARDAR PROSPECTOS DETECTADOS
                if (prospectosAviva.isNotEmpty()) {
                    prospectosManager.guardarProspectosDetectados(prospectosAviva)
                    Log.d("HomeFragment", "Prospectos guardados en Firebase")
                }

                // Actualizar UI
                actualizarContadoresAviva()

                // Mostrar resultados
                if (prospectosAviva.isNotEmpty()) {
                    mostrarProspectosEnMapa(prospectosAviva)
                    mostrarNotificacionProspectos(prospectosAviva.size)
                    Log.d("HomeFragment", "Resultados mostrados correctamente")
                } else {
                    val mensajeFiltrado = if (prospectosRaw.size > prospectosAviva.size) {
                        "Se encontraron ${prospectosRaw.size} negocios, pero se filtraron puestos de revistas/periódicos. No hay prospectos relevantes en esta área."
                    } else {
                        "No se encontraron prospectos Aviva en esta área. Intenta en otra ubicación."
                    }
                    Toast.makeText(context, mensajeFiltrado, Toast.LENGTH_LONG).show()
                    Log.d("HomeFragment", "No hay prospectos para mostrar")
                }

            } catch (e: Exception) {
                Log.e("HomeFragment", "Error consultando API DENUE: ${e.message}", e)

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

            } finally {
                try {
                    binding.progressBarProspectos.visibility = View.GONE
                } catch (e: Exception) {
                    Log.w("HomeFragment", "ProgressBar no encontrado: ${e.message}")
                }
            }
        }
    }
}