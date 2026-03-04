package com.promotoresavivatunegocio_1

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.navigation.findNavController
import androidx.navigation.ui.setupWithNavController
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Task
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import com.promotoresavivatunegocio_1.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private var _binding: ActivityMainBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private lateinit var googleSignInClient: GoogleSignInClient
    private lateinit var db: FirebaseFirestore
    private lateinit var storage: FirebaseStorage
    private lateinit var locationManager: LocationManager

    // Sistema de roles basado en User model
    internal var currentUser: models.User? = null // Accessible by fragments
    private var navigationManager: com.promotoresavivatunegocio_1.services.RoleBasedNavigationManager? = null

    companion object {
        private const val TAG = "MainActivity"
        private const val LOCATION_PERMISSION_REQUEST_CODE = 1001
        private const val BACKGROUND_LOCATION_REQUEST_CODE = 1002
        private const val NOTIF_PERMISSION_REQUEST_CODE = 1003
        private const val INSTITUTIONAL_DOMAIN = "@avivacredito.com"
    }

    private val signInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        Log.d(TAG, "🔄 signInLauncher result: resultCode=${result.resultCode}, data=${result.data}")

        when (result.resultCode) {
            RESULT_OK -> {
                Log.d(TAG, "✅ Result OK - procesando autenticación...")
                val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
                handleSignInResult(task)
            }
            RESULT_CANCELED -> {
                Log.w(TAG, "❌ Usuario canceló el sign-in o error en configuración")
                Log.d(TAG, "🔍 Intentando obtener detalles del error...")
                // Intentar obtener el error específico
                try {
                    val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
                    handleSignInResult(task) // Esto debería mostrar el error específico
                } catch (e: Exception) {
                    Log.e(TAG, "💥 Error al obtener detalles: ${e.message}", e)
                    Toast.makeText(this, "Error de configuración OAuth. Verifica SHA-1 y Client ID.", Toast.LENGTH_LONG).show()
                }
            }
            else -> {
                Log.w(TAG, "⚠️ Resultado inesperado: ${result.resultCode}")
                Toast.makeText(this, "Error inesperado en autenticación", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "🚀 MainActivity onCreate iniciado")

        try {
            _binding = ActivityMainBinding.inflate(layoutInflater)
            setContentView(binding.root)

            initializeFirebase()
            setupGoogleSignIn()
            checkCurrentUser()

            // Inicializar LocationManager
            locationManager = LocationManager.getInstance(this)

            // Solo ejecutar setup de admins si el usuario actual es el super admin
            setupInitialAdminsIfNeeded()

            Log.d(TAG, "✅ MainActivity onCreate completado exitosamente")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en onCreate: ${e.message}", e)
            Toast.makeText(this, "Error al inicializar la aplicación", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    // ============================================================================
    // FIREBASE INITIALIZATION
    // ============================================================================

    private fun initializeFirebase() {
        try {
            Log.d(TAG, "🔥 Inicializando Firebase...")
            FirebaseApp.initializeApp(this)
            auth = FirebaseAuth.getInstance()
            db = FirebaseFirestore.getInstance()
            storage = FirebaseStorage.getInstance()
            Log.d(TAG, "✅ Firebase inicializado correctamente")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error inicializando Firebase: ${e.message}", e)
        }
    }

    // ============================================================================
    // SISTEMA DE ADMINISTRADORES - CORREGIDO
    // ============================================================================

    private fun setupInitialAdminsIfNeeded() {
        val currentUser = auth.currentUser
        if (currentUser?.email == "rolando.robles@avivacredito.com") {
            Log.d(TAG, "👑 Usuario super admin detectado, configurando administradores...")
            setupInitialAdmins()
        } else {
            Log.d(TAG, "👤 Usuario normal, saltando configuración de admins")
        }
    }

    private fun setupInitialAdmins() {
        val adminEmails = listOf(
            "rolando.robles@avivacredito.com",
            "amran@avivacredito.com",
            "noel.hernandez@avivacredito.com",
            "andres.rizo@avivacredito.com",
            "fernando.avelar@avivacredito.com",
            "filiberto@avivacredito.com",
            "rafael.barrera@avivacredito.com"
        )

        Log.d(TAG, "👥 Configurando ${adminEmails.size} administradores iniciales...")
        adminEmails.forEach { email ->
            createAdminDirectly(email)
        }
    }

    private fun createAdminDirectly(email: String) {
        try {
            val adminData = hashMapOf(
                "email" to email,
                "role" to "admin",
                "permissions" to listOf(
                    "view_dashboard",
                    "manage_users",
                    "view_reports",
                    "manage_locations",
                    "manage_visits"
                ),
                "addedAt" to com.google.firebase.Timestamp.now(),
                "addedBy" to "sistema_inicial",
                "isActive" to true,
                "level" to if (email == "rolando.robles@avivacredito.com") "super_admin" else "admin"
            )

            val emailKey = email.replace("@", "_").replace(".", "_")
            db.collection("admins").document(emailKey)
                .set(adminData)
                .addOnSuccessListener {
                    Log.d(TAG, "✅ Admin creado: $email")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "❌ Error creando admin $email: ${e.message}", e)
                }
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en createAdminDirectly para $email: ${e.message}", e)
        }
    }

    /**
     * Cargar usuario desde Firestore y configurar navegación basada en roles
     * Reemplaza el sistema legacy de admin/gerente con el nuevo sistema de User model
     */
    private fun loadUserAndSetupNavigation(userId: String) {
        val firebaseUser = auth.currentUser
        if (firebaseUser?.email == null) {
            Log.d(TAG, "❌ No hay usuario autenticado para cargar")
            setupDefaultNavigation()
            return
        }

        Log.d(TAG, "🔍 Cargando usuario desde Firestore: $userId")

        db.collection("users").document(userId)
            .get()
            .addOnSuccessListener { document ->
                try {
                    if (document.exists()) {
                        // Convertir documento a User model
                        currentUser = document.toObject(models.User::class.java)

                        if (currentUser != null) {
                            // Crear navigation manager
                            navigationManager = com.promotoresavivatunegocio_1.services.RoleBasedNavigationManager.create(currentUser!!)

                            // Actualizar título del toolbar con la línea de producto real
                            binding.toolbar.title = currentUser!!.getProductLineDisplayName()

                            // Configurar navegación según el rol
                            setupRoleBasedNavigation()

                            val roleDisplay = currentUser!!.getRoleDisplayName()
                            val productDisplay = currentUser!!.getProductLineDisplayName()
                            Log.d(TAG, "✅ Usuario cargado: ${firebaseUser.email}")
                            Log.d(TAG, "✅ Rol: $roleDisplay")
                            Log.d(TAG, "✅ Línea de producto: $productDisplay")

                            Toast.makeText(
                                this,
                                "Bienvenido: $roleDisplay",
                                Toast.LENGTH_SHORT
                            ).show()
                        } else {
                            Log.w(TAG, "⚠️ No se pudo convertir el documento a User model")
                            setupDefaultNavigation()
                        }
                    } else {
                        Log.w(TAG, "⚠️ Documento de usuario no existe, creando usuario con rol por defecto")
                        // Crear usuario con rol por defecto
                        createDefaultUser(userId, firebaseUser.email!!, firebaseUser.displayName ?: "")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "💥 Error cargando usuario: ${e.message}", e)
                    setupDefaultNavigation()
                }
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "⚠️ Error al obtener usuario de Firestore", e)
                setupDefaultNavigation()
            }
    }

    /**
     * Crear usuario con valores por defecto cuando no existe en Firestore
     */
    private fun createDefaultUser(uid: String, email: String, displayName: String) {
        val newUser = models.User(
            id = uid,
            uid = uid,
            email = email,
            displayName = displayName,
            role = models.User.UserRole.PROMOTOR_AVIVA_TU_NEGOCIO,
            productLine = models.User.ProductLine.AVIVA_TU_NEGOCIO,
            status = models.User.UserStatus.PENDING_ACTIVATION
        )

        db.collection("users").document(uid)
            .set(newUser)
            .addOnSuccessListener {
                Log.d(TAG, "✅ Usuario creado en Firestore con rol por defecto")
                currentUser = newUser
                navigationManager = com.promotoresavivatunegocio_1.services.RoleBasedNavigationManager.create(newUser)
                setupRoleBasedNavigation()
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "💥 Error creando usuario en Firestore: ${e.message}", e)
                setupDefaultNavigation()
            }
    }

    /**
     * Configurar navegación basada en el rol del usuario
     * Bottom navigation eliminada - navegación ahora a través de la pantalla de inicio
     */
    private fun setupRoleBasedNavigation() {
        try {
            if (navigationManager == null || currentUser == null) {
                Log.w(TAG, "⚠️ NavigationManager o currentUser es null")
                return
            }

            Log.d(TAG, "🎯 Usuario configurado con rol: ${currentUser!!.getRoleDisplayName()}")
            Log.d(TAG, "✅ Navegación configurada - usar Home screen para navegar")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error configurando navegación basada en rol: ${e.message}", e)
        }
    }

    /**
     * Configurar navegación por defecto cuando no hay usuario o hay error
     * Bottom navigation eliminada - ya no se usa
     */
    private fun setupDefaultNavigation() {
        try {
            Log.d(TAG, "🔧 Navegación por defecto - usar Home screen")
            Log.d(TAG, "✅ Navegación por defecto configurada")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error configurando navegación por defecto: ${e.message}", e)
        }
    }

    /**
     * Verificar si el usuario puede acceder al dashboard
     * Usa el sistema de permisos del User model
     */
    fun canAccessDashboard(): Boolean {
        return currentUser?.canAccessTeamDashboard() == true || currentUser?.isAdmin() == true
    }

    /**
     * Verificar si el usuario es gerente
     */
    fun isManager(): Boolean {
        return currentUser?.isManager() == true
    }

    /**
     * Obtener los promotores asignados al gerente
     */
    fun getManagerPromoters(): List<String> {
        return currentUser?.assignedPromoters ?: emptyList()
    }

    /**
     * Obtener el usuario actual (para uso en fragments)
     */
    fun getCurrentUser(): models.User? {
        return currentUser
    }

    /**
     * Obtener el navigation manager (para uso en fragments)
     */
    fun getNavigationManager(): com.promotoresavivatunegocio_1.services.RoleBasedNavigationManager? {
        return navigationManager
    }

    // ============================================================================
    // STORAGE TEST
    // ============================================================================

    private fun testStorageConnection() {
        try {
            val currentUser = auth.currentUser
            if (currentUser == null) {
                Log.d(TAG, "📦 Usuario no autenticado, saltando test de Storage")
                return
            }

            Log.d(TAG, "📦 Probando conexión a Storage...")
            val storageRef = storage.reference
            val testRef = storageRef.child("test/connection_test_${System.currentTimeMillis()}.txt")
            val testData = "Firebase Storage test - ${System.currentTimeMillis()}"

            testRef.putBytes(testData.toByteArray())
                .addOnSuccessListener {
                    Log.d(TAG, "✅ Storage conectado correctamente")

                    // Limpiar archivo de prueba
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                        testRef.delete()
                            .addOnSuccessListener {
                                Log.d(TAG, "🗑️ Archivo de prueba eliminado")
                            }
                            .addOnFailureListener { e ->
                                Log.w(TAG, "⚠️ Error eliminando archivo de prueba: ${e.message}")
                            }
                    }, 2000)
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "❌ Error en Storage: ${e.message}", e)
                }
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en testStorageConnection: ${e.message}", e)
        }
    }

    // ============================================================================
    // GOOGLE SIGN-IN
    // ============================================================================

    private fun setupGoogleSignIn() {
        try {
            Log.d(TAG, "🔑 Configurando Google Sign-In...")

            val webClientId = getString(R.string.default_web_client_id)
            Log.d(TAG, "🔑 Web Client ID actual: $webClientId")

            val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(webClientId)
                .requestEmail()
                .build()

            googleSignInClient = GoogleSignIn.getClient(this, gso)
            Log.d(TAG, "✅ Google Sign-In configurado correctamente")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error configurando Google Sign-In: ${e.message}", e)
        }
    }

    private fun checkCurrentUser() {
        Log.d(TAG, "👤 Verificando usuario actual...")

        val currentUser = auth.currentUser
        if (currentUser != null) {
            Log.d(TAG, "✅ Usuario encontrado: ${currentUser.email}")
            Log.d(TAG, "🔍 Verificando dominio institucional...")

            if (currentUser.email?.endsWith(INSTITUTIONAL_DOMAIN) == true) {
                Log.d(TAG, "✅ Email autorizado, mostrando contenido principal")
                showMainContent()
                loadUserAndSetupNavigation(currentUser.uid)
                testStorageConnection()
            } else {
                Log.w(TAG, "❌ Email no autorizado: ${currentUser.email}")
                signOut()
                showLoginScreen()
            }
        } else {
            Log.d(TAG, "❌ No hay usuario autenticado, mostrando pantalla de login")
            showLoginScreen()
        }
    }

    private fun showLoginScreen() {
        try {
            Log.d(TAG, "🔐 Mostrando pantalla de login...")

            binding.loginContainer.visibility = View.VISIBLE

            val navHostFragment = supportFragmentManager.findFragmentById(R.id.navHostFragment)
            navHostFragment?.view?.visibility = View.GONE

            binding.signInButton.setOnClickListener {
                Log.d(TAG, "🔘 Botón de sign-in presionado")
                signIn()
            }

            Log.d(TAG, "✅ Pantalla de login configurada")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en showLoginScreen: ${e.message}", e)
        }
    }

    private fun showMainContent() {
        try {
            Log.d(TAG, "🏠 Mostrando contenido principal...")

            binding.loginContainer.visibility = View.GONE
            // toolbar remains GONE – HomeFragment has its own header

            val navHostFragment = supportFragmentManager.findFragmentById(R.id.navHostFragment)
            navHostFragment?.view?.visibility = View.VISIBLE

            // Configurar toolbar y botón de logout
            setupToolbar()

            // Solicitar permisos de notificación y alarma exacta, luego programar alarmas
            requestNotificationPermissions()

            // Bottom navigation eliminada - navegación a través de Home screen
            Log.d(TAG, "📱 Navegación configurada a través de Home screen")

            // Inicializar tracking de ubicación
            if (::locationManager.isInitialized) {
                Log.d(TAG, "📍 LocationManager disponible, iniciando tracking")
                requestLocationPermissionsAndStartTracking()
            } else {
                Log.e(TAG, "💥 ERROR CRÍTICO: LocationManager no inicializado")
                locationManager = LocationManager.getInstance(this)
                requestLocationPermissionsAndStartTracking()
            }

            Log.d(TAG, "✅ Contenido principal configurado")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en showMainContent: ${e.message}", e)
        }
    }

    /**
     * Configurar toolbar y botón de logout
     */
    private fun setupToolbar() {
        try {
            // Registrar como ActionBar para evitar el doble toolbar del sistema
            setSupportActionBar(binding.toolbar)
            supportActionBar?.setDisplayShowTitleEnabled(true)

            // Título según la línea de producto del usuario
            binding.toolbar.title = currentUser?.getProductLineDisplayName()
                ?: getString(R.string.app_name)

            // Configurar botón de logout
            binding.btnToolbarLogout.setOnClickListener {
                showLogoutConfirmationDialog()
            }

            Log.d(TAG, "✅ Toolbar configurado con botón de logout")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error configurando toolbar: ${e.message}", e)
        }
    }

    /**
     * Solicita POST_NOTIFICATIONS (Android 13+) y verifica SCHEDULE_EXACT_ALARM
     * (Android 12+) antes de programar las alarmas de asistencia.
     */
    private fun requestNotificationPermissions() {
        // 1. POST_NOTIFICATIONS – runtime en API 33+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIF_PERMISSION_REQUEST_CODE
                )
                return // Las alarmas se programan en onRequestPermissionsResult
            }
        }
        scheduleAlarmsAfterPermissions()
    }

    private fun scheduleAlarmsAfterPermissions() {
        // 2. SCHEDULE_EXACT_ALARM – en Android 12+ hay que verificar permiso especial
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = getSystemService(android.app.AlarmManager::class.java)
            if (!alarmManager.canScheduleExactAlarms()) {
                Log.w(TAG, "Sin permiso de alarma exacta; redirigiendo a Ajustes")
                val intent = android.content.Intent(
                    android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
                )
                startActivity(intent)
                // scheduleAll usa fallback inexacto si sigue sin permiso
            }
        }
        AttendanceAlarmScheduler.scheduleAll(this)
        Log.d(TAG, "✅ Alarmas de asistencia programadas (9 AM / 6 PM)")
    }

    /**
     * Muestra diálogo de confirmación para cerrar sesión
     */
    fun showLogoutConfirmationDialog() {
        try {
            android.app.AlertDialog.Builder(this)
                .setTitle("Cerrar Sesión")
                .setMessage("¿Estás seguro de que deseas cerrar sesión?")
                .setPositiveButton("Sí, salir") { _, _ ->
                    performLogout()
                }
                .setNegativeButton("Cancelar", null)
                .show()
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error mostrando diálogo de logout: ${e.message}", e)
        }
    }

    /**
     * Ejecuta el cierre de sesión
     */
    private fun performLogout() {
        try {
            Log.d(TAG, "🚪 Cerrando sesión...")
            Toast.makeText(this, "Cerrando sesión...", Toast.LENGTH_SHORT).show()

            // Ocultar toolbar
            binding.toolbar.visibility = View.GONE

            // Llamar al método signOut existente
            signOut()

            Log.d(TAG, "✅ Logout completado exitosamente")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en performLogout: ${e.message}", e)
            Toast.makeText(this, "Error al cerrar sesión", Toast.LENGTH_SHORT).show()
        }
    }

    private fun signIn() {
        try {
            Log.d(TAG, "🔑 Iniciando proceso de sign-in...")
            val signInIntent = googleSignInClient.signInIntent
            signInLauncher.launch(signInIntent)
            Log.d(TAG, "🔑 Intent de sign-in lanzado")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error al iniciar sign in: ${e.message}", e)
            Toast.makeText(this, "Error al iniciar sesión", Toast.LENGTH_SHORT).show()
        }
    }

    private fun handleSignInResult(completedTask: Task<GoogleSignInAccount>) {
        try {
            Log.d(TAG, "🔄 Procesando resultado de sign-in...")

            val account = completedTask.getResult(ApiException::class.java)!!
            Log.d(TAG, "✅ Sign-in exitoso para: ${account.email}")
            Log.d(TAG, "🔍 ID Token presente: ${account.idToken != null}")
            Log.d(TAG, "🔍 Display Name: ${account.displayName}")

            if (account.email?.endsWith(INSTITUTIONAL_DOMAIN) == true) {
                Log.d(TAG, "✅ Email autorizado: ${account.email}")
                Log.d(TAG, "🔑 Procediendo con autenticación de Firebase...")
                firebaseAuthWithGoogle(account.idToken!!)
            } else {
                Log.w(TAG, "❌ Email no autorizado: ${account.email}")
                Log.w(TAG, "❌ Dominio requerido: $INSTITUTIONAL_DOMAIN")
                Toast.makeText(this, "Solo se permiten correos institucionales (@avivacredito.com)", Toast.LENGTH_LONG).show()
                googleSignInClient.signOut()
            }
        } catch (e: ApiException) {
            Log.e(TAG, "💥 Error en sign-in: code=${e.statusCode}, message=${e.message}", e)

            // Agregar mensaje específico del error
            val errorMessage = when (e.statusCode) {
                12501 -> "Error de configuración OAuth. Verifica la configuración en Google Cloud Console."
                12500 -> "Error interno de Google Services"
                12502 -> "Error de red. Verifica tu conexión a internet."
                7 -> "Error de red o configuración"
                10 -> "Error del desarrollador. Verifica SHA-1 y client ID."
                else -> "Error de autenticación: ${e.statusCode}"
            }

            Log.e(TAG, "❌ Error específico: $errorMessage")
            Toast.makeText(this, errorMessage, Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error inesperado en handleSignInResult: ${e.message}", e)
            Toast.makeText(this, "Error inesperado durante la autenticación", Toast.LENGTH_SHORT).show()
        }
    }

    private fun firebaseAuthWithGoogle(idToken: String) {
        Log.d(TAG, "🔥 Iniciando autenticación con Firebase...")
        Log.d(TAG, "🔑 ID Token recibido (primeros 20 chars): ${idToken.take(20)}...")

        val credential = GoogleAuthProvider.getCredential(idToken, null)
        auth.signInWithCredential(credential)
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    val user = auth.currentUser
                    Log.d(TAG, "✅ Autenticación con Firebase exitosa")
                    Log.d(TAG, "👤 Usuario Firebase: ${user?.email}")
                    Log.d(TAG, "🆔 UID: ${user?.uid}")

                    user?.let {
                        saveUserToFirestore(it)
                        showMainContent()
                        loadUserAndSetupNavigation(it.uid)
                        testStorageConnection()
                    }
                } else {
                    Log.e(TAG, "❌ Error en autenticación con Firebase", task.exception)
                    Log.e(TAG, "❌ Detalles del error: ${task.exception?.message}")
                    Toast.makeText(this, "Autenticación con Firebase fallida: ${task.exception?.message}", Toast.LENGTH_LONG).show()
                }
            }
    }

    private fun saveUserToFirestore(user: com.google.firebase.auth.FirebaseUser) {
        try {
            Log.d(TAG, "💾 Guardando usuario en Firestore...")

            val userData = hashMapOf(
                "uid" to user.uid,
                "email" to user.email,
                "displayName" to user.displayName,
                "photoUrl" to user.photoUrl?.toString(),
                "lastLogin" to com.google.firebase.Timestamp.now(),
                "isActive" to true
            )

            db.collection("users").document(user.uid)
                .set(userData)
                .addOnSuccessListener {
                    Log.d(TAG, "✅ Usuario guardado en Firestore exitosamente")
                }
                .addOnFailureListener { e ->
                    Log.w(TAG, "⚠️ Error al guardar usuario en Firestore", e)
                }
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en saveUserToFirestore: ${e.message}", e)
        }
    }

    // MODIFICADO: Actualizar signOut para limpiar info de gerente
    private fun signOut() {
        try {
            Log.d(TAG, "🚪 Cerrando sesión...")

            // Cancelar alarmas de recordatorio al cerrar sesión
            AttendanceAlarmScheduler.cancelAll(this)

            auth.signOut()
            googleSignInClient.signOut().addOnCompleteListener(this) {
                Log.d(TAG, "✅ Sesión cerrada exitosamente")
                showLoginScreen()

                // Reset estados del usuario
                currentUser = null
                navigationManager = null

                Log.d(TAG, "🔄 Estados de usuario reseteados")
            }
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en signOut: ${e.message}", e)
        }
    }

    // ============================================================================
    // LOCATION SERVICES - CORREGIDO PARA PERMITIR "TODO EL TIEMPO"
    // ============================================================================

    private fun requestLocationPermissionsAndStartTracking() {
        try {
            Log.d(TAG, "📍 Solicitando permisos de ubicación...")

            val permissions = mutableListOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )

            // Para Android 10+ agregar permiso de background location
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                permissions.add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            }

            val missingPermissions = permissions.filter {
                ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
            }

            Log.d(TAG, "📍 Permisos faltantes: ${missingPermissions.size}")

            if (missingPermissions.isEmpty()) {
                Log.d(TAG, "✅ Todos los permisos de ubicación concedidos")
                startLocationTrackingIfNeeded()
            } else {
                // Solicitar permisos básicos primero
                val basicPermissions = missingPermissions.filter {
                    it != Manifest.permission.ACCESS_BACKGROUND_LOCATION
                }

                if (basicPermissions.isNotEmpty()) {
                    Log.d(TAG, "📍 Solicitando permisos básicos: ${basicPermissions.size}")
                    ActivityCompat.requestPermissions(
                        this,
                        basicPermissions.toTypedArray(),
                        LOCATION_PERMISSION_REQUEST_CODE
                    )
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
                    missingPermissions.contains(Manifest.permission.ACCESS_BACKGROUND_LOCATION)) {
                    // Solicitar permiso de background por separado
                    Log.d(TAG, "📍 Solicitando permiso de background...")
                    requestBackgroundLocationPermission()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en requestLocationPermissionsAndStartTracking: ${e.message}", e)
        }
    }

    // NUEVO: Solicitar permiso de ubicación en background (todo el tiempo)
    private fun requestBackgroundLocationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {

                Log.d(TAG, "📍 Explicando permiso de background al usuario...")
                // Explicar al usuario por qué necesitamos este permiso
                Toast.makeText(
                    this,
                    "Para un tracking preciso, permite el acceso a ubicación 'Todo el tiempo' en la siguiente pantalla",
                    Toast.LENGTH_LONG
                ).show()

                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
                    BACKGROUND_LOCATION_REQUEST_CODE
                )
            }
        }
    }

    private fun startLocationTrackingIfNeeded() {
        try {
            Log.d(TAG, "📍 Iniciando tracking de ubicación...")

            if (!::locationManager.isInitialized) {
                Log.e(TAG, "💥 LocationManager no inicializado, inicializando ahora...")
                locationManager = LocationManager.getInstance(this)
            }

            if (!locationManager.isTrackingEnabled) {
                val success = locationManager.startTracking()
                if (success) {
                    Log.d(TAG, "✅ Tracking iniciado correctamente")
                    Toast.makeText(this, "Tracking de ubicación iniciado", Toast.LENGTH_SHORT).show()
                } else {
                    Log.w(TAG, "⚠️ Error al iniciar tracking, intentando con servicio...")
                    startLocationService()
                }
            } else {
                Log.d(TAG, "ℹ️ Tracking ya está activo")
            }
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en startLocationTrackingIfNeeded: ${e.message}", e)
            startLocationService()
        }
    }

    private fun startLocationService() {
        try {
            Log.d(TAG, "🚀 Iniciando LocationService...")

            val fineLocationGranted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

            val coarseLocationGranted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

            Log.d(TAG, "📍 Fine location: $fineLocationGranted, Coarse location: $coarseLocationGranted")

            if (fineLocationGranted || coarseLocationGranted) {
                val serviceIntent = Intent(this, LocationService::class.java)
                ContextCompat.startForegroundService(this, serviceIntent)
                Log.d(TAG, "✅ LocationService iniciado correctamente")
            } else {
                Log.w(TAG, "❌ Sin permisos de ubicación para LocationService")
            }
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error al iniciar LocationService: ${e.message}", e)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        Log.d(TAG, "📍 Resultado de permisos: requestCode=$requestCode, results=${grantResults.contentToString()}")

        when (requestCode) {
            NOTIF_PERMISSION_REQUEST_CODE -> {
                // POST_NOTIFICATIONS respondido – programar alarmas independientemente del resultado
                scheduleAlarmsAfterPermissions()
            }
            LOCATION_PERMISSION_REQUEST_CODE -> {
                if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                    Log.d(TAG, "✅ Permisos básicos de ubicación concedidos")
                    Toast.makeText(this, "Permisos básicos de ubicación concedidos", Toast.LENGTH_SHORT).show()

                    // Ahora solicitar permiso de background si es necesario
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        requestBackgroundLocationPermission()
                    } else {
                        startLocationTrackingIfNeeded()
                    }
                } else {
                    Log.w(TAG, "❌ Algunos permisos básicos denegados")
                    Toast.makeText(
                        this,
                        "Se requieren permisos de ubicación para el tracking",
                        Toast.LENGTH_LONG
                    ).show()

                    val hasBasicPermissions = grantResults.any { it == PackageManager.PERMISSION_GRANTED }
                    if (hasBasicPermissions) {
                        Log.d(TAG, "ℹ️ Al menos algunos permisos concedidos, iniciando servicio...")
                        startLocationService()
                    }
                }
            }

            BACKGROUND_LOCATION_REQUEST_CODE -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Log.d(TAG, "✅ Permiso de ubicación en background concedido")
                    Toast.makeText(this, "Permiso de ubicación en background concedido", Toast.LENGTH_SHORT).show()
                    startLocationTrackingIfNeeded()
                } else {
                    Log.w(TAG, "❌ Permiso de background denegado")
                    Toast.makeText(
                        this,
                        "Sin permiso de background. El tracking funcionará solo cuando la app esté abierta",
                        Toast.LENGTH_LONG
                    ).show()
                    startLocationTrackingIfNeeded()
                }
            }
        }
    }

    // ============================================================================
    // LIFECYCLE METHODS
    // ============================================================================

    override fun onDestroy() {
        try {
            Log.d(TAG, "🔚 MainActivity onDestroy")
            _binding = null
            super.onDestroy()
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en onDestroy: ${e.message}", e)
            super.onDestroy()
        }
    }

    override fun onStop() {
        try {
            Log.d(TAG, "⏸️ MainActivity onStop")
            super.onStop()
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en onStop: ${e.message}", e)
        }
    }

    override fun onPause() {
        try {
            Log.d(TAG, "⏸️ MainActivity onPause")
            super.onPause()
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en onPause: ${e.message}", e)
        }
    }

    override fun onResume() {
        try {
            Log.d(TAG, "▶️ MainActivity onResume")
            super.onResume()
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error en onResume: ${e.message}", e)
        }
    }
}