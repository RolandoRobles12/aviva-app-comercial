package com.promotoresavivatunegocio_1.ui.dashboard

import android.Manifest
import android.app.AlertDialog
import android.app.DatePickerDialog
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.core.app.ActivityCompat
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.gms.maps.*
import com.google.android.gms.maps.model.*
import com.google.android.material.switchmaterial.SwitchMaterial
import com.google.android.material.button.MaterialButton
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.*
import com.google.firebase.Timestamp
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.adapters.VisitsAdapter
import com.promotoresavivatunegocio_1.models.Visit
import com.promotoresavivatunegocio_1.MainActivity
import com.bumptech.glide.Glide
import com.bumptech.glide.load.engine.DiskCacheStrategy
import java.text.SimpleDateFormat
import java.util.*

class DashboardFragment : Fragment(), OnMapReadyCallback {

    // Views
    private lateinit var activeUsersText: TextView
    private lateinit var totalVisitsText: TextView
    private lateinit var userSpinner: Spinner
    private lateinit var showAllUsersSwitch: SwitchMaterial
    private lateinit var realtimeSwitch: SwitchMaterial
    private lateinit var dateFilterSpinner: Spinner
    private lateinit var selectedRangeText: TextView
    private lateinit var visitsRecyclerView: RecyclerView
    private lateinit var adminRouteControls: View
    private lateinit var routeViewSwitch: SwitchMaterial
    private lateinit var routeControlsPanel: View
    private lateinit var btnShowDayRoute: MaterialButton
    private lateinit var btnClearRoutes: MaterialButton
    private lateinit var btnShowAllRoutes: MaterialButton
    private lateinit var btnResetFilters: MaterialButton

    // Map
    private var googleMap: GoogleMap? = null
    private var mapFragment: SupportMapFragment? = null

    // Firebase
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private var visitListener: ListenerRegistration? = null
    private var realtimeListener: ListenerRegistration? = null

    // Data
    private val visits = mutableListOf<Visit>()
    private val allUsers = mutableListOf<String>()
    private val userIdMap = mutableMapOf<String, String>()
    private lateinit var visitAdapter: VisitsAdapter

    // Date Range Variables
    private var startDate: Calendar = Calendar.getInstance()
    private var endDate: Calendar = Calendar.getInstance()
    private var isSelectingStartDate = true
    private var isCustomDateRange = false
    private var isAdminUser = false

    // VARIABLES PARA GERENTES
    private var isManagerUser = false
    private var managerPromoters: List<String> = emptyList()

    companion object {
        private const val TAG = "DashboardFragment"
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_dashboard, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        initViews(view)
        setupRecyclerView()
        setupSpinners()
        setupSwitches()
        setupMap()
        setupRouteControls()
        checkAdminAccess()
        loadUsers()
        setToday() // Inicializar con hoy
        loadVisits()
    }

    private fun initViews(view: View) {
        activeUsersText = view.findViewById(R.id.activeUsersText)
        totalVisitsText = view.findViewById(R.id.totalVisitsText)
        userSpinner = view.findViewById(R.id.userSpinner)
        showAllUsersSwitch = view.findViewById(R.id.showAllUsersSwitch)
        realtimeSwitch = view.findViewById(R.id.realtimeSwitch)
        dateFilterSpinner = view.findViewById(R.id.dateFilterSpinner)
        selectedRangeText = view.findViewById(R.id.selectedRangeText)
        visitsRecyclerView = view.findViewById(R.id.visitsRecyclerView)
        adminRouteControls = view.findViewById(R.id.adminRouteControls)
        routeViewSwitch = view.findViewById(R.id.routeViewSwitch)
        routeControlsPanel = view.findViewById(R.id.routeControlsPanel)
        btnShowDayRoute = view.findViewById(R.id.btnShowDayRoute)
        btnClearRoutes = view.findViewById(R.id.btnClearRoutes)
        btnShowAllRoutes = view.findViewById(R.id.btnShowAllRoutes)
        btnResetFilters = view.findViewById(R.id.btnResetFilters)
    }

    private fun setupRecyclerView() {
        visitAdapter = VisitsAdapter { visit ->
            // Al hacer click en una visita en la lista, mostrar detalles
            showVisitDetails(visit)
        }
        visitsRecyclerView.layoutManager = LinearLayoutManager(context)
        visitsRecyclerView.adapter = visitAdapter
    }

    private fun setupSpinners() {
        // Spinner de filtro de fecha
        val dateFilters = arrayOf(
            "Hoy",
            "Ayer",
            "Esta semana",
            "Último mes",
            "Seleccionar rango..."
        )
        val dateAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, dateFilters)
        dateAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        dateFilterSpinner.adapter = dateAdapter

        dateFilterSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                Log.d(TAG, "📅 Filtro de fecha seleccionado: posición $position")

                when (position) {
                    0 -> { // Hoy
                        setToday()
                        loadVisits()
                    }
                    1 -> { // Ayer
                        setYesterday()
                        loadVisits()
                    }
                    2 -> { // Esta semana
                        setThisWeek()
                        loadVisits()
                    }
                    3 -> { // Último mes
                        setLastMonth()
                        loadVisits()
                    }
                    4 -> { // Seleccionar rango...
                        Log.d(TAG, "📅 Abriendo selector de rango de fechas")
                        showDateRangePicker()
                    }
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        // Spinner de usuarios - inicializar vacío
        val emptyAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, listOf("Cargando usuarios..."))
        emptyAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        userSpinner.adapter = emptyAdapter

        userSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (allUsers.isNotEmpty() && !showAllUsersSwitch.isChecked) {
                    Log.d(TAG, "👤 Usuario seleccionado: posición $position")
                    loadVisits()
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    // ============================================================================
    // MÉTODOS DE FECHA
    // ============================================================================

    private fun setToday() {
        startDate = Calendar.getInstance()
        endDate = Calendar.getInstance()

        startDate.set(Calendar.HOUR_OF_DAY, 0)
        startDate.set(Calendar.MINUTE, 0)
        startDate.set(Calendar.SECOND, 0)
        startDate.set(Calendar.MILLISECOND, 0)

        endDate.set(Calendar.HOUR_OF_DAY, 23)
        endDate.set(Calendar.MINUTE, 59)
        endDate.set(Calendar.SECOND, 59)
        endDate.set(Calendar.MILLISECOND, 999)

        isCustomDateRange = false
        updateRangeDisplay()
        Log.d(TAG, "📅 Configurado: HOY")
    }

    private fun setYesterday() {
        startDate = Calendar.getInstance()
        endDate = Calendar.getInstance()

        startDate.add(Calendar.DAY_OF_YEAR, -1)
        endDate.add(Calendar.DAY_OF_YEAR, -1)

        startDate.set(Calendar.HOUR_OF_DAY, 0)
        startDate.set(Calendar.MINUTE, 0)
        startDate.set(Calendar.SECOND, 0)
        startDate.set(Calendar.MILLISECOND, 0)

        endDate.set(Calendar.HOUR_OF_DAY, 23)
        endDate.set(Calendar.MINUTE, 59)
        endDate.set(Calendar.SECOND, 59)
        endDate.set(Calendar.MILLISECOND, 999)

        isCustomDateRange = false
        updateRangeDisplay()
        Log.d(TAG, "📅 Configurado: AYER")
    }

    private fun setThisWeek() {
        startDate = Calendar.getInstance()
        endDate = Calendar.getInstance()

        // Inicio de semana (lunes)
        startDate.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)
        startDate.set(Calendar.HOUR_OF_DAY, 0)
        startDate.set(Calendar.MINUTE, 0)
        startDate.set(Calendar.SECOND, 0)
        startDate.set(Calendar.MILLISECOND, 0)

        // Fin de semana (domingo)
        endDate.set(Calendar.DAY_OF_WEEK, Calendar.SUNDAY)
        endDate.add(Calendar.WEEK_OF_YEAR, 1) // Para que sea el domingo de esta semana
        endDate.set(Calendar.HOUR_OF_DAY, 23)
        endDate.set(Calendar.MINUTE, 59)
        endDate.set(Calendar.SECOND, 59)
        endDate.set(Calendar.MILLISECOND, 999)

        isCustomDateRange = false
        updateRangeDisplay()
        Log.d(TAG, "📅 Configurado: ESTA SEMANA")
    }

    private fun setLastMonth() {
        startDate = Calendar.getInstance()
        endDate = Calendar.getInstance()

        // Primer día del mes pasado
        startDate.add(Calendar.MONTH, -1)
        startDate.set(Calendar.DAY_OF_MONTH, 1)
        startDate.set(Calendar.HOUR_OF_DAY, 0)
        startDate.set(Calendar.MINUTE, 0)
        startDate.set(Calendar.SECOND, 0)
        startDate.set(Calendar.MILLISECOND, 0)

        // Último día del mes pasado
        endDate.add(Calendar.MONTH, -1)
        endDate.set(Calendar.DAY_OF_MONTH, endDate.getActualMaximum(Calendar.DAY_OF_MONTH))
        endDate.set(Calendar.HOUR_OF_DAY, 23)
        endDate.set(Calendar.MINUTE, 59)
        endDate.set(Calendar.SECOND, 59)
        endDate.set(Calendar.MILLISECOND, 999)

        isCustomDateRange = false
        updateRangeDisplay()
        Log.d(TAG, "📅 Configurado: ÚLTIMO MES")
    }

    private fun showDateRangePicker() {
        if (isSelectingStartDate) {
            // Seleccionar fecha de inicio
            val datePickerDialog = DatePickerDialog(
                requireContext(),
                { _, year, month, dayOfMonth ->
                    startDate = Calendar.getInstance()
                    startDate.set(year, month, dayOfMonth, 0, 0, 0)
                    startDate.set(Calendar.MILLISECOND, 0)

                    Log.d(TAG, "📅 Fecha INICIO seleccionada: $dayOfMonth/${month+1}/$year")

                    // Ahora seleccionar fecha de fin
                    isSelectingStartDate = false
                    Toast.makeText(context, "Ahora selecciona la fecha de FIN", Toast.LENGTH_SHORT).show()
                    showDateRangePicker()
                },
                startDate.get(Calendar.YEAR),
                startDate.get(Calendar.MONTH),
                startDate.get(Calendar.DAY_OF_MONTH)
            )

            datePickerDialog.setTitle("Selecciona fecha de INICIO")
            datePickerDialog.datePicker.maxDate = System.currentTimeMillis()
            datePickerDialog.show()

        } else {
            // Seleccionar fecha de fin
            val datePickerDialog = DatePickerDialog(
                requireContext(),
                { _, year, month, dayOfMonth ->
                    endDate = Calendar.getInstance()
                    endDate.set(year, month, dayOfMonth, 23, 59, 59)
                    endDate.set(Calendar.MILLISECOND, 999)

                    Log.d(TAG, "📅 Fecha FIN seleccionada: $dayOfMonth/${month+1}/$year")

                    // Verificar que la fecha de fin sea posterior a la de inicio
                    if (endDate.before(startDate)) {
                        Toast.makeText(context, "La fecha de fin debe ser posterior a la de inicio", Toast.LENGTH_LONG).show()
                        isSelectingStartDate = true
                        return@DatePickerDialog
                    }

                    // Configurar como rango personalizado
                    isCustomDateRange = true
                    isSelectingStartDate = true // Reset para próxima vez

                    // Actualizar spinner con el rango personalizado
                    updateSpinnerWithCustomRange()
                    updateRangeDisplay()

                    // Cargar visitas para el rango seleccionado
                    loadVisits()

                    val startFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
                    val endFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
                    Toast.makeText(context,
                        "Rango seleccionado: ${startFormat.format(startDate.time)} - ${endFormat.format(endDate.time)}",
                        Toast.LENGTH_LONG).show()
                },
                endDate.get(Calendar.YEAR),
                endDate.get(Calendar.MONTH),
                endDate.get(Calendar.DAY_OF_MONTH)
            )

            datePickerDialog.setTitle("Selecciona fecha de FIN")
            datePickerDialog.datePicker.minDate = startDate.timeInMillis
            datePickerDialog.datePicker.maxDate = System.currentTimeMillis()
            datePickerDialog.show()
        }
    }

    private fun updateSpinnerWithCustomRange() {
        val startFormat = SimpleDateFormat("dd/MM", Locale.getDefault())
        val endFormat = SimpleDateFormat("dd/MM", Locale.getDefault())
        val rangeText = "${startFormat.format(startDate.time)} - ${endFormat.format(endDate.time)}"

        val updatedFilters = arrayOf(
            "Hoy",
            "Ayer",
            "Esta semana",
            "Último mes",
            rangeText
        )

        val dateAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, updatedFilters)
        dateAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        dateFilterSpinner.adapter = dateAdapter
        dateFilterSpinner.setSelection(4) // Seleccionar el rango personalizado

        Log.d(TAG, "📅 Spinner actualizado con rango: $rangeText")
    }

    private fun updateRangeDisplay() {
        val startFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
        val endFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())

        if (isCustomDateRange) {
            val rangeText = "📅 Período: ${startFormat.format(startDate.time)} - ${endFormat.format(endDate.time)}"
            selectedRangeText.text = rangeText
            selectedRangeText.visibility = View.VISIBLE
        } else {
            val selectedPosition = dateFilterSpinner.selectedItemPosition
            val periodName = when (selectedPosition) {
                0 -> "HOY (${startFormat.format(startDate.time)})"
                1 -> "AYER (${startFormat.format(startDate.time)})"
                2 -> "ESTA SEMANA (${startFormat.format(startDate.time)} - ${endFormat.format(endDate.time)})"
                3 -> "ÚLTIMO MES (${startFormat.format(startDate.time)} - ${endFormat.format(endDate.time)})"
                else -> "Período personalizado"
            }
            selectedRangeText.text = "📅 $periodName"
            selectedRangeText.visibility = View.VISIBLE
        }
    }

    private fun resetToToday() {
        // Reset a valores por defecto
        isCustomDateRange = false
        isSelectingStartDate = true

        // Restablecer spinner original
        val originalFilters = arrayOf("Hoy", "Ayer", "Esta semana", "Último mes", "Seleccionar rango...")
        val dateAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, originalFilters)
        dateAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        dateFilterSpinner.adapter = dateAdapter
        dateFilterSpinner.setSelection(0) // Seleccionar "Hoy"

        // Configurar fechas a hoy
        setToday()

        // Cargar visitas
        loadVisits()

        val userType = if (isManagerUser) "✅ Filtros reseteados a HOY (Mis Promotores)" else "✅ Filtros reseteados a HOY"
        Toast.makeText(context, userType, Toast.LENGTH_SHORT).show()
        Log.d(TAG, "🔄 Filtros reseteados a HOY")
    }

    private fun getDateRange(): Pair<Timestamp, Timestamp> {
        val startTimestamp = Timestamp(startDate.time)
        val endTimestamp = Timestamp(endDate.time)

        val formatDateTime = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
        Log.d(TAG, "📅 Rango utilizado: ${formatDateTime.format(startTimestamp.toDate())} - ${formatDateTime.format(endTimestamp.toDate())}")

        return Pair(startTimestamp, endTimestamp)
    }

    // ============================================================================
    // SETUP METHODS
    // ============================================================================

    private fun setupSwitches() {
        showAllUsersSwitch.setOnCheckedChangeListener { _, isChecked ->
            userSpinner.isEnabled = !isChecked
            if (isChecked) {
                // Si está marcado "mostrar todos", cargar todas las visitas (filtradas por gerente si aplica)
                loadVisits()
            }
        }

        realtimeSwitch.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                startRealtimeUpdates()
                Toast.makeText(context, "Actualizaciones en tiempo real activadas", Toast.LENGTH_SHORT).show()
            } else {
                stopRealtimeUpdates()
                Toast.makeText(context, "Actualizaciones en tiempo real desactivadas", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setupRouteControls() {
        routeViewSwitch.setOnCheckedChangeListener { _, isChecked ->
            routeControlsPanel.visibility = if (isChecked) View.VISIBLE else View.GONE
            if (!isChecked) {
                clearAllRoutes()
            }
        }

        btnShowDayRoute.setOnClickListener {
            showDayRoute()
        }

        btnClearRoutes.setOnClickListener {
            clearAllRoutes()
        }

        btnShowAllRoutes.setOnClickListener {
            showAllUsersRoutes()
        }

        btnResetFilters.setOnClickListener {
            resetToToday()
        }
    }

    private fun setupMap() {
        mapFragment = childFragmentManager.findFragmentById(R.id.dashboardMap) as? SupportMapFragment
        mapFragment?.getMapAsync(this)
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map

        // Configuración del mapa
        if (ActivityCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            map.isMyLocationEnabled = true
        }

        // Centrar en Ciudad de México
        val mexicoCity = LatLng(19.4326, -99.1332)
        map.moveCamera(CameraUpdateFactory.newLatLngZoom(mexicoCity, 10f))

        // Configurar UI del mapa
        map.uiSettings.apply {
            isZoomControlsEnabled = true
            isCompassEnabled = true
            isMyLocationButtonEnabled = true
            isMapToolbarEnabled = true
        }

        // Configurar click en marcadores para mostrar detalles
        map.setOnMarkerClickListener { marker ->
            val visit = marker.tag as? Visit
            if (visit != null) {
                Log.d(TAG, "🔍 Click en marcador - Visita: ${visit.businessName}")
                showVisitDetails(visit)
                true // Consume el evento
            } else {
                false // Deja que el comportamiento por defecto maneje el click
            }
        }

        // Cargar marcadores iniciales
        loadVisitMarkers()
    }

    // ============================================================================
    // VERIFICACIÓN DE ACCESO ADMIN/GERENTE
    // ============================================================================

    private fun checkAdminAccess() {
        val mainActivity = activity as? MainActivity
        if (mainActivity != null) {
            // Verificar si es admin
            if (mainActivity.canAccessDashboard() && !mainActivity.isManager()) {
                Log.d(TAG, "✅ Usuario admin - Mostrando controles completos")
                isAdminUser = true
                isManagerUser = false
                managerPromoters = emptyList()
                adminRouteControls.visibility = View.VISIBLE

                // Texto normal para admins
                btnResetFilters.text = "Resetear Filtros"

                // Verificar si es gerente
            } else if (mainActivity.isManager()) {
                Log.d(TAG, "✅ Usuario gerente - Mostrando dashboard filtrado")
                isAdminUser = false
                isManagerUser = true
                managerPromoters = mainActivity.getManagerPromoters()

                // Mostrar controles de rutas para gerentes también
                adminRouteControls.visibility = View.VISIBLE

                // Cambiar texto del botón para gerentes
                btnResetFilters.text = "Resetear (Mis Promotores)"

                Log.d(TAG, "✅ Gerente configurado - Promotores asignados: ${managerPromoters.size}")

            } else {
                Log.d(TAG, "❌ Usuario sin permisos de dashboard")
                isAdminUser = false
                isManagerUser = false
                managerPromoters = emptyList()
                adminRouteControls.visibility = View.GONE
            }
        } else {
            Log.e(TAG, "❌ No se pudo obtener MainActivity")
            isAdminUser = false
            isManagerUser = false
            managerPromoters = emptyList()
            adminRouteControls.visibility = View.GONE
        }
    }

    // ============================================================================
    // CARGA DE USUARIOS CON FILTRADO PARA GERENTES
    // ============================================================================

    private fun loadUsers() {
        // Si es gerente, solo cargar sus promotores asignados
        if (isManagerUser && managerPromoters.isNotEmpty()) {
            Log.d(TAG, "🔍 Gerente - Cargando solo promotores asignados: ${managerPromoters.size}")
            loadManagerPromoters()
        } else {
            // Admin o gerente sin promotores - cargar todos los usuarios
            loadAllUsers()
        }
    }

    private fun loadManagerPromoters() {
        allUsers.clear()
        userIdMap.clear()
        allUsers.add("Todos mis promotores")

        Log.d(TAG, "🔍 Cargando promotores del gerente: ${managerPromoters}")

        // Como máximo tendrá 5 promotores, usar directamente whereIn con el document ID
        db.collection("users")
            .get() // Obtener todos y filtrar manualmente para evitar problemas
            .addOnSuccessListener { documents ->
                for (document in documents) {
                    try {
                        // Verificar si este documento está en la lista de promotores del gerente
                        if (managerPromoters.contains(document.id)) {
                            val userName = document.getString("name")
                                ?: document.getString("displayName")
                                ?: document.getString("username")
                                ?: document.getString("email")?.substringBefore("@")
                                ?: "Promotor ${document.id.take(8)}"

                            val userId = document.id

                            allUsers.add(userName)
                            userIdMap[userName] = userId

                            Log.d(TAG, "Promotor cargado - ID: $userId, Nombre: $userName")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error al convertir promotor: ${document.id}", e)
                    }
                }

                updateUserSpinner()
                Log.d(TAG, "✅ Promotores del gerente cargados: ${allUsers.size - 1}")

                // Si solo tiene un promotor, seleccionarlo automáticamente
                if (allUsers.size == 2) {
                    userSpinner.setSelection(1)
                    showAllUsersSwitch.isChecked = false
                }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Error cargando promotores del gerente", e)
                Toast.makeText(context, "Error al cargar promotores", Toast.LENGTH_SHORT).show()
            }
    }

    private fun loadAllUsers() {
        Log.d(TAG, "🔄 Cargando todos los usuarios...")

        db.collection("users")
            .get() // REMOVIDO: .orderBy que causaba problemas
            .addOnSuccessListener { documents ->
                allUsers.clear()
                userIdMap.clear()
                allUsers.add("Todos los usuarios")

                Log.d(TAG, "📄 Documentos encontrados: ${documents.size()}")

                for (document in documents) {
                    try {
                        val userName = document.getString("name")
                            ?: document.getString("displayName")
                            ?: document.getString("username")
                            ?: document.getString("email")?.substringBefore("@")
                            ?: "Usuario ${document.id.take(8)}"

                        val userId = document.id

                        allUsers.add(userName)
                        userIdMap[userName] = userId

                        Log.d(TAG, "Usuario cargado - ID: $userId, Nombre: $userName, Email: ${document.getString("email")}")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error al convertir usuario: ${document.id}", e)
                    }
                }

                updateUserSpinner()
                Log.d(TAG, "✅ Todos los usuarios cargados: ${allUsers.size - 1}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Error cargando usuarios", e)
                Toast.makeText(context, "Error al cargar usuarios", Toast.LENGTH_SHORT).show()
            }
    }

    private fun updateUserSpinner() {
        val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, allUsers)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        userSpinner.adapter = adapter
    }

    // ============================================================================
    // CARGA DE VISITAS CON FILTRADO PARA GERENTES
    // ============================================================================

    private fun loadVisits() {
        val (startTime, endTime) = getDateRange()

        var query: Query = db.collection("visits")
            .whereGreaterThanOrEqualTo("timestamp", startTime)
            .whereLessThanOrEqualTo("timestamp", endTime)
            .orderBy("timestamp", Query.Direction.DESCENDING)

        // FILTRADO PARA GERENTES
        if (isManagerUser) {
            // Si es gerente, solo mostrar visitas de sus promotores asignados
            if (managerPromoters.isNotEmpty()) {
                if (!showAllUsersSwitch.isChecked && userSpinner.selectedItemPosition > 0 && allUsers.isNotEmpty()) {
                    // Filtro por promotor específico
                    val selectedUserName = allUsers[userSpinner.selectedItemPosition]
                    val selectedUserId = userIdMap[selectedUserName]

                    if (selectedUserId != null && managerPromoters.contains(selectedUserId)) {
                        query = query.whereEqualTo("userId", selectedUserId)
                        Log.d(TAG, "🔍 Gerente - Filtrando por promotor: $selectedUserName ($selectedUserId)")
                    } else {
                        Log.w(TAG, "⚠️ Gerente intentando acceder a promotor no asignado")
                        return // No cargar visitas si intenta acceder a promotor no asignado
                    }
                } else {
                    // Mostrar todos los promotores del gerente (máximo 5, así que funciona con whereIn)
                    query = query.whereIn("userId", managerPromoters)
                    Log.d(TAG, "🔍 Gerente - Mostrando todos sus promotores: ${managerPromoters.size}")
                }
            } else {
                Log.w(TAG, "⚠️ Gerente sin promotores asignados")
                // No cargar visitas si no tiene promotores asignados
                visitAdapter.submitList(emptyList())
                updateStatistics()
                googleMap?.clear()
                return
            }
        } else {
            // FILTRADO NORMAL PARA ADMINS (código original)
            if (!showAllUsersSwitch.isChecked && userSpinner.selectedItemPosition > 0 && allUsers.isNotEmpty()) {
                val selectedUserName = allUsers[userSpinner.selectedItemPosition]
                val selectedUserId = userIdMap[selectedUserName]

                if (selectedUserId != null) {
                    query = query.whereEqualTo("userId", selectedUserId)
                    Log.d(TAG, "🔍 Admin - Filtrando por usuario: $selectedUserName ($selectedUserId)")
                }
            }
        }

        visitListener?.remove()
        visitListener = query.addSnapshotListener { snapshots, e ->
            if (e != null) {
                Log.w(TAG, "Error al cargar visitas", e)
                Toast.makeText(context, "Error al cargar visitas: ${e.message}", Toast.LENGTH_SHORT).show()
                return@addSnapshotListener
            }

            visits.clear()
            snapshots?.documents?.forEach { document ->
                try {
                    val visit = document.toObject(Visit::class.java)
                    visit?.let {
                        // Verificación adicional para gerentes
                        if (isManagerUser && !managerPromoters.contains(it.userId)) {
                            return@forEach // Saltar visitas de promotores no asignados
                        }

                        val visitWithId = it.copy(id = document.id)
                        visits.add(visitWithId)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error al convertir visita: ${document.id}", e)
                }
            }

            visitAdapter.submitList(visits.toList())
            updateStatistics()
            loadVisitMarkers()

            val userType = if (isManagerUser) "gerente" else "admin"
            Log.d(TAG, "✅ Visitas cargadas ($userType): ${visits.size}")
        }
    }

    // ============================================================================
    // MÉTODOS PARA MOSTRAR DETALLES DE VISITAS
    // ============================================================================

    private fun showVisitDetails(visit: Visit) {
        Log.d(TAG, "📋 Mostrando detalles de visita: ${visit.businessName}")

        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_visit_details, null)

        // Referencias a las vistas
        val businessNameText = dialogView.findViewById<TextView>(R.id.businessNameText)
        val statusText = dialogView.findViewById<TextView>(R.id.statusText)
        val dateText = dialogView.findViewById<TextView>(R.id.dateText)
        val timeText = dialogView.findViewById<TextView>(R.id.timeText)
        val sellerText = dialogView.findViewById<TextView>(R.id.sellerText)
        val addressText = dialogView.findViewById<TextView>(R.id.addressText)
        val commentsCard = dialogView.findViewById<View>(R.id.commentsCard)
        val commentsText = dialogView.findViewById<TextView>(R.id.commentsText)
        val photosCard = dialogView.findViewById<View>(R.id.photosCard)
        val photoImageView = dialogView.findViewById<ImageView>(R.id.photoImageView)
        val btnViewOnMap = dialogView.findViewById<MaterialButton>(R.id.btnViewOnMap)
        val btnClose = dialogView.findViewById<MaterialButton>(R.id.btnClose)

        // Llenar información básica
        businessNameText.text = visit.businessName.ifEmpty { "Negocio sin nombre" }

        // Colorear estado
        statusText.text = visit.status
        when (visit.status.lowercase()) {
            "aprobada", "exitosa", "completada" -> statusText.setTextColor(Color.parseColor("#4CAF50"))
            "pendiente", "en proceso" -> statusText.setTextColor(Color.parseColor("#FF9800"))
            "rechazada", "fallida" -> statusText.setTextColor(Color.parseColor("#F44336"))
            else -> statusText.setTextColor(Color.parseColor("#2196F3"))
        }

        // Formatear fecha y hora
        val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
        val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        dateText.text = dateFormat.format(Date(visit.timestamp))
        timeText.text = timeFormat.format(Date(visit.timestamp))

        // Vendedor
        val sellerName = if (visit.userName.isNotEmpty()) {
            visit.userName
        } else {
            getUserNameById(visit.userId)
        }
        sellerText.text = sellerName

        // Dirección aproximada
        visit.location?.let { geoPoint ->
            addressText.text = "Lat: ${String.format("%.4f", geoPoint.latitude)}, Lon: ${String.format("%.4f", geoPoint.longitude)}"
        } ?: run {
            addressText.text = "Ubicación no disponible"
        }

        // Comentarios
        if (visit.notes.isNotBlank()) {
            commentsCard.visibility = View.VISIBLE
            commentsText.text = visit.notes
        } else {
            commentsCard.visibility = View.GONE
        }

        // Foto
        loadVisitPhoto(visit, photosCard, photoImageView)

        // Crear y mostrar dialog
        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .create()

        // Configurar botones
        btnViewOnMap.setOnClickListener {
            visit.location?.let { geoPoint ->
                val position = LatLng(geoPoint.latitude, geoPoint.longitude)
                googleMap?.animateCamera(CameraUpdateFactory.newLatLngZoom(position, 18f))
                dialog.dismiss()
            }
        }

        btnClose.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()

        // Ajustar tamaño del dialog
        dialog.window?.let { window ->
            val displayMetrics = resources.displayMetrics
            val width = (displayMetrics.widthPixels * 0.9).toInt()
            val height = (displayMetrics.heightPixels * 0.8).toInt()
            window.setLayout(width, height)
        }
    }

    private fun loadVisitPhoto(visit: Visit, photosCard: View, photoImageView: ImageView) {
        // Si la visita tiene imagen en el modelo
        if (visit.photoUrl.isNotBlank()) {
            Log.d(TAG, "📸 Cargando imagen desde el modelo de visita")

            photosCard.visibility = View.VISIBLE

            // Cargar imagen con Glide
            Glide.with(this)
                .load(visit.photoUrl)
                .diskCacheStrategy(DiskCacheStrategy.ALL)
                .placeholder(android.R.drawable.ic_menu_camera)
                .error(android.R.drawable.ic_menu_close_clear_cancel)
                .centerCrop()
                .into(photoImageView)

            // Click para ver en pantalla completa
            photoImageView.setOnClickListener {
                showFullScreenPhoto(visit.photoUrl)
            }

        } else {
            // Si no hay imagen en el modelo, intentar cargar desde Firebase
            loadPhotoFromFirebase(visit.id, photosCard, photoImageView)
        }
    }

    private fun loadPhotoFromFirebase(visitId: String, photosCard: View, photoImageView: ImageView) {
        if (visitId.isEmpty()) {
            Log.d(TAG, "📸 ID de visita vacío, ocultando sección de foto")
            photosCard.visibility = View.GONE
            return
        }

        Log.d(TAG, "🔍 Buscando foto en Firebase para visita: $visitId")

        db.collection("visits").document(visitId)
            .get()
            .addOnSuccessListener { document ->
                val imageUrl = document.getString("imageUrl")

                if (!imageUrl.isNullOrEmpty()) {
                    Log.d(TAG, "📸 Encontrada imagen en Firebase")

                    photosCard.visibility = View.VISIBLE

                    // Cargar imagen con Glide
                    Glide.with(this)
                        .load(imageUrl)
                        .diskCacheStrategy(DiskCacheStrategy.ALL)
                        .placeholder(android.R.drawable.ic_menu_camera)
                        .error(android.R.drawable.ic_menu_close_clear_cancel)
                        .centerCrop()
                        .into(photoImageView)

                    // Click para ver en pantalla completa
                    photoImageView.setOnClickListener {
                        showFullScreenPhoto(imageUrl)
                    }

                } else {
                    Log.d(TAG, "📸 No se encontró imagen para esta visita")
                    photosCard.visibility = View.GONE
                }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "❌ Error cargando imagen desde Firebase", e)
                photosCard.visibility = View.GONE
            }
    }

    private fun showFullScreenPhoto(photoUrl: String) {
        Log.d(TAG, "📸 Mostrando foto en pantalla completa: $photoUrl")

        val imageView = ImageView(requireContext())
        imageView.scaleType = ImageView.ScaleType.FIT_CENTER
        imageView.setBackgroundColor(Color.BLACK)

        // Cargar imagen con Glide
        Glide.with(this)
            .load(photoUrl)
            .diskCacheStrategy(DiskCacheStrategy.ALL)
            .placeholder(android.R.drawable.ic_menu_camera)
            .error(android.R.drawable.ic_menu_close_clear_cancel)
            .into(imageView)

        // Crear dialog de pantalla completa
        val dialog = AlertDialog.Builder(requireContext())
            .setView(imageView)
            .create()

        // Click para cerrar
        imageView.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()

        // Hacer pantalla completa
        dialog.window?.let { window ->
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        }
    }

    private fun loadVisitMarkers() {
        googleMap?.let { map ->
            // Solo limpiar marcadores de visitas si las rutas no están activas
            if (!routeViewSwitch.isChecked) {
                map.clear()
            } else {
                // Si las rutas están activas, solo limpiar marcadores, no las rutas
                clearVisitMarkers()
            }

            visits.forEach { visit ->
                visit.location?.let { geoPoint ->
                    val position = LatLng(geoPoint.latitude, geoPoint.longitude)
                    val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                    val dateFormat = SimpleDateFormat("dd/MM", Locale.getDefault())
                    val time = timeFormat.format(Date(visit.timestamp))
                    val date = dateFormat.format(Date(visit.timestamp))

                    val userName = if (visit.userName.isNotEmpty()) visit.userName else getUserNameById(visit.userId)

                    val marker = map.addMarker(
                        MarkerOptions()
                            .position(position)
                            .title("🏪 ${visit.businessName}")
                            .snippet("📅 $date ⏰ $time\n👤 $userName\n📋 ${visit.status}")
                            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED))
                    )

                    // IMPORTANTE: Asignar la visita como tag del marcador
                    marker?.tag = visit
                }
            }

            // Ajustar cámara si hay visitas
            if (visits.isNotEmpty()) {
                val validVisits = visits.filter { it.location != null }
                if (validVisits.isNotEmpty()) {
                    val builder = LatLngBounds.Builder()
                    validVisits.forEach { visit ->
                        visit.location?.let { geoPoint ->
                            builder.include(LatLng(geoPoint.latitude, geoPoint.longitude))
                        }
                    }
                    try {
                        val bounds = builder.build()
                        val padding = 100
                        map.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, padding))
                    } catch (e: Exception) {
                        Log.e(TAG, "Error ajustando cámara", e)
                    }
                }
            }
        }
    }

    private fun clearVisitMarkers() {
        // Esta función se implementaría para limpiar solo los marcadores de visitas
        // manteniendo las rutas. Por simplicidad, usaremos clear() y re-dibujaremos las rutas
    }

    private fun getUserNameById(userId: String): String {
        if (userId.isEmpty()) return "Usuario desconocido"

        // Buscar en el mapa de usuarios cargados
        val foundName = userIdMap.entries.find { it.value == userId }?.key
        if (foundName != null && foundName != "Todos los usuarios" && foundName != "Todos mis promotores") {
            return foundName
        }

        // Si no se encuentra, cargar desde Firebase (cache local)
        db.collection("users").document(userId)
            .get()
            .addOnSuccessListener { document ->
                if (document.exists()) {
                    val userName = document.getString("name")
                        ?: document.getString("displayName")
                        ?: document.getString("username")
                        ?: document.getString("email")?.substringBefore("@")
                        ?: "Usuario ${userId.take(8)}"

                    // Actualizar el mapa local
                    userIdMap[userName] = userId

                    // Recargar marcadores para actualizar nombres
                    loadVisitMarkers()
                }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Error obteniendo nombre de usuario $userId", e)
            }

        return "Usuario ${userId.take(8)}"
    }

    // ============================================================================
    // ESTADÍSTICAS CON CONTEXTO DE GERENTE
    // ============================================================================

    private fun updateStatistics() {
        val uniqueUsers = visits.map { it.userId }.filter { it.isNotEmpty() }.toSet()

        val periodText = if (isCustomDateRange) {
            "período seleccionado"
        } else {
            when (dateFilterSpinner.selectedItemPosition) {
                0 -> "hoy"
                1 -> "ayer"
                2 -> "esta semana"
                3 -> "último mes"
                else -> "período seleccionado"
            }
        }

        val userTypeText = if (isManagerUser) "Mis promotores activos" else "Usuarios activos"
        val visitTypeText = if (isManagerUser) "Visitas de mis promotores" else "Visitas en"

        activeUsersText.text = "$userTypeText $periodText: ${uniqueUsers.size}"
        totalVisitsText.text = "$visitTypeText $periodText: ${visits.size}"
    }

    // ============================================================================
    // MÉTODOS DE RUTAS CON FILTRADO PARA GERENTES
    // ============================================================================

    private fun showDayRoute() {
        if (!routeViewSwitch.isChecked) {
            Toast.makeText(context, "Activa la vista de rutas primero", Toast.LENGTH_SHORT).show()
            return
        }

        val selectedUserName = if (showAllUsersSwitch.isChecked || userSpinner.selectedItemPosition == 0) {
            val userType = if (isManagerUser) "promotor" else "usuario"
            Toast.makeText(context, "Selecciona un $userType específico para ver su ruta", Toast.LENGTH_SHORT).show()
            return
        } else {
            allUsers[userSpinner.selectedItemPosition]
        }

        val selectedUserId = userIdMap[selectedUserName]
        if (selectedUserId == null) {
            Toast.makeText(context, "Usuario no válido", Toast.LENGTH_SHORT).show()
            return
        }

        // VERIFICACIÓN ADICIONAL PARA GERENTES
        if (isManagerUser && !managerPromoters.contains(selectedUserId)) {
            Toast.makeText(context, "No tienes permisos para ver la ruta de este promotor", Toast.LENGTH_LONG).show()
            return
        }

        val (startTime, endTime) = getDateRange()

        Log.d(TAG, "🔍 Buscando ruta para usuario: $selectedUserName ($selectedUserId)")

        db.collection("locations")
            .whereEqualTo("userId", selectedUserId)
            .whereGreaterThanOrEqualTo("timestamp", startTime)
            .whereLessThanOrEqualTo("timestamp", endTime)
            .orderBy("timestamp", Query.Direction.ASCENDING)
            .get()
            .addOnSuccessListener { documents ->
                Log.d(TAG, "✅ Consulta exitosa - Documentos encontrados: ${documents.size()}")

                if (documents.isEmpty) {
                    Toast.makeText(context, "No hay datos de ubicación para el período seleccionado", Toast.LENGTH_SHORT).show()
                    return@addOnSuccessListener
                }

                Log.d(TAG, "✅ Se encontraron ${documents.size()} ubicaciones para $selectedUserName")
                drawUserRoute(documents, selectedUserName)
                Toast.makeText(context, "Ruta cargada para $selectedUserName (${documents.size()} puntos)", Toast.LENGTH_SHORT).show()
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "❌ Error cargando ruta del usuario", e)
                Toast.makeText(context, "Error al cargar ruta del usuario: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun showAllUsersRoutes() {
        if (!routeViewSwitch.isChecked) {
            Toast.makeText(context, "Activa la vista de rutas primero", Toast.LENGTH_SHORT).show()
            return
        }

        val (startTime, endTime) = getDateRange()

        var query = db.collection("locations")
            .whereGreaterThanOrEqualTo("timestamp", startTime)
            .whereLessThanOrEqualTo("timestamp", endTime)
            .orderBy("timestamp", Query.Direction.ASCENDING)

        // FILTRADO PARA GERENTES (como máximo 5 promotores, así que funciona con whereIn)
        if (isManagerUser && managerPromoters.isNotEmpty()) {
            query = query.whereIn("userId", managerPromoters)
            Log.d(TAG, "🔍 Gerente - Buscando rutas de sus promotores: ${managerPromoters.size}")
        } else {
            Log.d(TAG, "🔍 Admin - Buscando rutas de todos los usuarios")
        }

        query.get()
            .addOnSuccessListener { documents ->
                Log.d(TAG, "✅ Consulta exitosa - Documentos encontrados: ${documents.size()}")

                if (documents.isEmpty) {
                    val userType = if (isManagerUser) "tus promotores" else "usuarios"
                    Toast.makeText(context, "No hay datos de ubicación para $userType en el período seleccionado", Toast.LENGTH_SHORT).show()
                    return@addOnSuccessListener
                }

                // Agrupar por usuario
                val locationsByUser = documents.groupBy { it.getString("userId") ?: "" }

                googleMap?.clear()

                val colors = listOf(
                    BitmapDescriptorFactory.HUE_RED,
                    BitmapDescriptorFactory.HUE_BLUE,
                    BitmapDescriptorFactory.HUE_GREEN,
                    BitmapDescriptorFactory.HUE_YELLOW,
                    BitmapDescriptorFactory.HUE_MAGENTA,
                    BitmapDescriptorFactory.HUE_CYAN
                )

                locationsByUser.entries.forEachIndexed { index, (userId, userLocations) ->
                    // Verificación adicional para gerentes
                    if (isManagerUser && !managerPromoters.contains(userId)) {
                        return@forEachIndexed // Saltar usuarios no asignados
                    }

                    val userName = getUserNameById(userId)
                    val color = colors[index % colors.size]
                    Log.d(TAG, "🎨 Dibujando ruta para $userName: ${userLocations.size} puntos")
                    drawUserRouteWithColor(userLocations, userName, color)
                }

                // Recargar marcadores de visitas
                loadVisitMarkers()

                val userType = if (isManagerUser) "promotores asignados" else "usuarios"
                Log.d(TAG, "✅ Rutas cargadas para ${locationsByUser.size} $userType (${documents.size()} puntos total)")
                Toast.makeText(context, "Rutas cargadas para ${locationsByUser.size} $userType", Toast.LENGTH_SHORT).show()
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "❌ Error cargando rutas", e)
                Toast.makeText(context, "Error al cargar rutas: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun drawUserRoute(documents: QuerySnapshot, userName: String) {
        googleMap?.let { map ->
            val points = mutableListOf<LatLng>()
            val bounds = LatLngBounds.Builder()

            Log.d(TAG, "🎨 Iniciando dibujo de ruta para $userName con ${documents.size()} puntos")

            // Crear lista de puntos de la ruta
            documents.forEach { document ->
                val geoPoint = document.getGeoPoint("location")
                geoPoint?.let {
                    val point = LatLng(it.latitude, it.longitude)
                    points.add(point)
                    bounds.include(point)
                }
            }

            if (points.isNotEmpty()) {
                Log.d(TAG, "✅ Dibujando ruta con ${points.size} puntos válidos")

                // LÍNEA MEJORADA - No se corta en zoom
                val polyline = map.addPolyline(
                    PolylineOptions()
                        .addAll(points)
                        .color(Color.BLUE)
                        .width(12f) // Línea más gruesa
                        .geodesic(true) // Seguir la curvatura de la Tierra
                        .clickable(true)
                )

                // Marcador de inicio (verde)
                map.addMarker(
                    MarkerOptions()
                        .position(points.first())
                        .title("🚩 Inicio - $userName")
                        .snippet("Hora: ${getTimeFromDocument(documents.documents.first())}")
                        .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN))
                )

                // Marcador de fin (rojo)
                if (points.size > 1) {
                    map.addMarker(
                        MarkerOptions()
                            .position(points.last())
                            .title("🏁 Fin - $userName")
                            .snippet("Hora: ${getTimeFromDocument(documents.documents.last())}")
                            .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED))
                    )
                }

                // Marcadores de paradas largas
                addLongStopMarkers(documents, map, userName)

                // Ajustar cámara
                try {
                    val boundsRect = bounds.build()
                    map.animateCamera(CameraUpdateFactory.newLatLngBounds(boundsRect, 150))
                    Log.d(TAG, "✅ Cámara ajustada para mostrar ruta completa")
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error ajustando cámara para ruta", e)
                }
            } else {
                Log.w(TAG, "❌ No se pudieron crear puntos válidos para la ruta")
                Toast.makeText(context, "No se pudieron procesar las coordenadas de la ruta", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun drawUserRouteWithColor(documents: List<DocumentSnapshot>, userName: String, color: Float) {
        googleMap?.let { map ->
            val points = mutableListOf<LatLng>()

            Log.d(TAG, "🎨 Dibujando ruta con color para $userName: ${documents.size} puntos")

            documents.forEach { document ->
                val geoPoint = document.getGeoPoint("location")
                geoPoint?.let {
                    points.add(LatLng(it.latitude, it.longitude))
                }
            }

            if (points.isNotEmpty()) {
                // LÍNEA MEJORADA con color
                val colorInt = when (color) {
                    BitmapDescriptorFactory.HUE_RED -> Color.RED
                    BitmapDescriptorFactory.HUE_BLUE -> Color.BLUE
                    BitmapDescriptorFactory.HUE_GREEN -> Color.GREEN
                    BitmapDescriptorFactory.HUE_YELLOW -> Color.YELLOW
                    BitmapDescriptorFactory.HUE_MAGENTA -> Color.MAGENTA
                    BitmapDescriptorFactory.HUE_CYAN -> Color.CYAN
                    else -> Color.BLUE
                }

                map.addPolyline(
                    PolylineOptions()
                        .addAll(points)
                        .color(colorInt)
                        .width(10f) // Línea gruesa
                        .geodesic(true) // No se corta en zoom
                        .clickable(true)
                )

                // Marcador de inicio
                map.addMarker(
                    MarkerOptions()
                        .position(points.first())
                        .title("🚩 $userName")
                        .snippet("Inicio de ruta - ${points.size} puntos")
                        .icon(BitmapDescriptorFactory.defaultMarker(color))
                )

                Log.d(TAG, "✅ Ruta dibujada para $userName con ${points.size} puntos")
            } else {
                Log.w(TAG, "❌ No se pudieron crear puntos válidos para $userName")
            }
        }
    }

    private fun addLongStopMarkers(documents: QuerySnapshot, map: GoogleMap, userName: String) {
        val docs = documents.documents
        val longStops = mutableListOf<Pair<LatLng, String>>()

        for (i in 0 until docs.size - 1) {
            val currentDoc = docs[i]
            val nextDoc = docs[i + 1]

            val currentGeoPoint = currentDoc.getGeoPoint("location")
            val nextGeoPoint = nextDoc.getGeoPoint("location")
            val currentTime = currentDoc.getTimestamp("timestamp")
            val nextTime = nextDoc.getTimestamp("timestamp")

            if (currentGeoPoint != null && nextGeoPoint != null && currentTime != null && nextTime != null) {
                val currentLatLng = LatLng(currentGeoPoint.latitude, currentGeoPoint.longitude)
                val nextLatLng = LatLng(nextGeoPoint.latitude, nextGeoPoint.longitude)

                // Calcular distancia (aproximada)
                val distance = calculateDistance(currentLatLng, nextLatLng)
                val timeDiff = (nextTime.seconds - currentTime.seconds) / 60 // minutos

                // Si estuvo más de 15 minutos en un radio de 100 metros
                if (distance < 100 && timeDiff > 15) {
                    val timeStr = SimpleDateFormat("HH:mm", Locale.getDefault()).format(currentTime.toDate())
                    longStops.add(Pair(currentLatLng, "⏰ Parada larga\n$timeStr - ${timeDiff}min"))
                }
            }
        }

        // Agregar marcadores de paradas largas
        longStops.forEach { (position, snippet) ->
            map.addMarker(
                MarkerOptions()
                    .position(position)
                    .title("🛑 $userName")
                    .snippet(snippet)
                    .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ORANGE))
            )
        }

        Log.d(TAG, "🛑 Paradas largas detectadas para $userName: ${longStops.size}")
    }

    private fun calculateDistance(point1: LatLng, point2: LatLng): Double {
        val earthRadius = 6371000.0 // metros
        val dLat = Math.toRadians(point2.latitude - point1.latitude)
        val dLng = Math.toRadians(point2.longitude - point1.longitude)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(point1.latitude)) * Math.cos(Math.toRadians(point2.latitude)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return earthRadius * c
    }

    private fun getTimeFromDocument(document: DocumentSnapshot): String {
        val timestamp = document.getTimestamp("timestamp")
        return if (timestamp != null) {
            SimpleDateFormat("HH:mm", Locale.getDefault()).format(timestamp.toDate())
        } else {
            "Hora desconocida"
        }
    }

    private fun clearAllRoutes() {
        googleMap?.clear()
        loadVisitMarkers()
        Toast.makeText(context, "Rutas limpiadas", Toast.LENGTH_SHORT).show()
        Log.d(TAG, "🧹 Rutas limpiadas del mapa")
    }

    // ============================================================================
    // REALTIME METHODS
    // ============================================================================

    private fun startRealtimeUpdates() {
        stopRealtimeUpdates()

        if (isCustomDateRange || dateFilterSpinner.selectedItemPosition != 0) {
            Toast.makeText(context, "Tiempo real solo disponible para 'Hoy'", Toast.LENGTH_SHORT).show()
            realtimeSwitch.isChecked = false
            return
        }

        val startOfDay = Calendar.getInstance()
        startOfDay.set(Calendar.HOUR_OF_DAY, 0)
        startOfDay.set(Calendar.MINUTE, 0)
        startOfDay.set(Calendar.SECOND, 0)
        startOfDay.set(Calendar.MILLISECOND, 0)

        var query = db.collection("visits")
            .whereGreaterThanOrEqualTo("timestamp", Timestamp(startOfDay.time))
            .orderBy("timestamp", Query.Direction.DESCENDING)

        // Filtrar por gerente en tiempo real
        if (isManagerUser && managerPromoters.isNotEmpty()) {
            query = query.whereIn("userId", managerPromoters)
        }

        realtimeListener = query.addSnapshotListener { snapshots, e ->
            if (e != null) {
                Log.w(TAG, "Error en actualizaciones en tiempo real", e)
                return@addSnapshotListener
            }

            if (!isCustomDateRange && dateFilterSpinner.selectedItemPosition == 0) {
                Log.d(TAG, "📡 Actualización en tiempo real recibida")
                // La carga se maneja por el listener principal
            }
        }
    }

    private fun stopRealtimeUpdates() {
        realtimeListener?.remove()
        realtimeListener = null
    }

    override fun onResume() {
        super.onResume()
        if (::visitAdapter.isInitialized) {
            loadVisits()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        visitListener?.remove()
        stopRealtimeUpdates()
    }
}