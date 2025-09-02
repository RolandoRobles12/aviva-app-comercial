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

    // Estado de admin
    private var isUserAdmin = false
    private var adminPermissions: List<String> = emptyList()
    private var adminLevel: String = ""

    // Estado de gerente - NUEVO
    private var isUserManager = false
    private var managerPromoters: List<String> = emptyList()

    companion object {
        private const val TAG = "MainActivity"
        private const val LOCATION_PERMISSION_REQUEST_CODE = 1001
        private const val BACKGROUND_LOCATION_REQUEST_CODE = 1002
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

    // MODIFICADO: Verificar admin y gerente, controlar acceso según rol
    private fun checkAdminAccess(userId: String) {
        val currentUser = auth.currentUser
        if (currentUser?.email == null) {
            Log.d(TAG, "❌ No hay usuario autenticado para verificar permisos")
            setupNormalUserAccess()
            return
        }

        Log.d(TAG, "🔍 Verificando acceso de admin para: ${currentUser.email}")

        // Primero verificar si es admin
        val emailKey = currentUser.email!!.replace("@", "_").replace(".", "_")

        db.collection("admins").document(emailKey)
            .get()
            .addOnSuccessListener { adminDocument ->
                try {
                    if (adminDocument.exists() && adminDocument.getBoolean("isActive") == true) {
                        // Usuario es admin
                        adminPermissions = adminDocument.get("permissions") as? List<String> ?: emptyList()
                        adminLevel = adminDocument.getString("level") ?: "admin"
                        isUserAdmin = true
                        isUserManager = false
                        managerPromoters = emptyList()

                        setupAdminAccess()
                        saveAdminInfo(adminPermissions, adminLevel)
                        clearManagerInfo()

                        Log.d(TAG, "✅ Admin verificado: ${currentUser.email} - Nivel: $adminLevel")
                        Toast.makeText(this, "Acceso de administrador activado", Toast.LENGTH_SHORT).show()
                    } else {
                        // No es admin, verificar si es gerente
                        Log.d(TAG, "ℹ️ No es admin, verificando si es gerente...")
                        checkManagerAccess(userId)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "💥 Error procesando datos de admin: ${e.message}", e)
                    checkManagerAccess(userId)
                }
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "⚠️ Error verificando acceso admin, verificando gerente", e)
                checkManagerAccess(userId)
            }
    }

    // NUEVO: Verificar acceso de gerente
    private fun checkManagerAccess(userId: String) {
        Log.d(TAG, "🔍 Verificando acceso de gerente para userId: $userId")

        db.collection("users").document(userId)
            .get()
            .addOnSuccessListener { document ->
                try {
                    if (document.exists()) {
                        val role = document.getString("role")
                        Log.d(TAG, "📄 Documento de usuario encontrado, role: $role")

                        if (role == "gerente") {
                            // Usuario es gerente
                            isUserAdmin = false
                            isUserManager = true
                            managerPromoters = document.get("assignedPromoters") as? List<String> ?: emptyList()
                            adminPermissions = emptyList()
                            adminLevel = ""

                            setupManagerAccess()
                            saveManagerInfo(managerPromoters)
                            clearAdminInfo()

                            Log.d(TAG, "✅ Gerente verificado: ${auth.currentUser?.email}")
                            Log.d(TAG, "✅ Promotores asignados: ${managerPromoters.size}")
                            Toast.makeText(this, "Acceso de gerente activado", Toast.LENGTH_SHORT).show()
                        } else {
                            // Usuario normal (promotor o sin rol)
                            isUserAdmin = false
                            isUserManager = false
                            managerPromoters = emptyList()
                            adminPermissions = emptyList()
                            adminLevel = ""

                            setupNormalUserAccess()
                            clearManagerInfo()
                            clearAdminInfo()
                            Log.d(TAG, "👤 Usuario normal verificado: ${auth.currentUser?.email} - Rol: $role")
                        }
                    } else {
                        Log.d(TAG, "📄 Documento de usuario no existe, configurando acceso normal")
                        setupNormalUserAccess()
                        clearManagerInfo()
                        clearAdminInfo()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "💥 Error procesando datos de gerente: ${e.message}", e)
                    setupNormalUserAccess()
                }
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "⚠️ Error verificando acceso de gerente", e)
                setupNormalUserAccess()
            }
    }

    // NUEVO: Configurar acceso para administradores
    private fun setupAdminAccess() {
        try {
            Log.d(TAG, "🛡️ Configurando acceso de administrador...")

            // Mostrar menú de Dashboard para admins
            val dashboardMenuItem = binding.navView.menu.findItem(R.id.navigation_dashboard)
            dashboardMenuItem?.isVisible = true

            // Mostrar menú de Admin para admins
            val adminMenuItem = binding.navView.menu.findItem(R.id.navigation_admin)
            adminMenuItem?.isVisible = true

            Log.d(TAG, "✅ Acceso de admin configurado - Dashboard y Admin visible")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error configurando acceso de admin: ${e.message}", e)
        }
    }

    // NUEVO: Configurar acceso para gerentes
    private fun setupManagerAccess() {
        try {
            Log.d(TAG, "👔 Configurando acceso de gerente...")

            // Mostrar menú de Dashboard para gerentes
            val dashboardMenuItem = binding.navView.menu.findItem(R.id.navigation_dashboard)
            dashboardMenuItem?.isVisible = true

            // OCULTAR menú de Admin para gerentes
            val adminMenuItem = binding.navView.menu.findItem(R.id.navigation_admin)
            adminMenuItem?.isVisible = false

            Log.d(TAG, "✅ Acceso de gerente configurado - Dashboard visible, Admin oculto")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error configurando acceso de gerente: ${e.message}", e)
        }
    }

    // MODIFICADO: Configurar acceso para usuarios normales (promotores)
    private fun setupNormalUserAccess() {
        try {
            Log.d(TAG, "👤 Configurando acceso de usuario normal...")

            // Ocultar menú de Dashboard para usuarios normales (promotores)
            val dashboardMenuItem = binding.navView.menu.findItem(R.id.navigation_dashboard)
            dashboardMenuItem?.isVisible = false

            // Ocultar menú de Admin para usuarios normales
            val adminMenuItem = binding.navView.menu.findItem(R.id.navigation_admin)
            adminMenuItem?.isVisible = false

            Log.d(TAG, "✅ Acceso de usuario normal configurado - Solo Inicio y Notificaciones")
        } catch (e: Exception) {
            Log.e(TAG, "💥 Error configurando acceso de usuario normal: ${e.message}", e)
        }
    }

    private fun saveAdminInfo(permissions: List<String>, level: String) {
        val sharedPref = getSharedPreferences("admin_prefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            putStringSet("permissions", permissions.toSet())
            putString("admin_level", level)
            putBoolean("is_admin", true)
            apply()
        }
        Log.d(TAG, "💾 Info de admin guardada: level=$level, permissions=${permissions.size}")
    }

    private fun clearAdminInfo() {
        val sharedPref = getSharedPreferences("admin_prefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            clear()
            apply()
        }
        Log.d(TAG, "🗑️ Info de admin limpiada")
    }

    // NUEVO: Métodos para guardar/limpiar info de gerente
    private fun saveManagerInfo(promoters: List<String>) {
        val sharedPref = getSharedPreferences("manager_prefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            putStringSet("assigned_promoters", promoters.toSet())
            putBoolean("is_manager", true)
            apply()
        }
        Log.d(TAG, "💾 Info de gerente guardada: promoters=${promoters.size}")
    }

    private fun clearManagerInfo() {
        val sharedPref = getSharedPreferences("manager_prefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            clear()
            apply()
        }
        Log.d(TAG, "🗑️ Info de gerente limpiada")
    }

    // MODIFICADO: Método para verificar si el usuario puede acceder al dashboard
    fun canAccessDashboard(): Boolean {
        return (isUserAdmin && adminPermissions.contains("view_dashboard")) || isUserManager
    }

    // NUEVOS: Métodos para obtener info del gerente (usar en Dashboard)
    fun isManager(): Boolean {
        return isUserManager
    }

    fun getManagerPromoters(): List<String> {
        return managerPromoters
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
                checkAdminAccess(currentUser.uid)
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
            binding.navView.visibility = View.GONE

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
            binding.navView.visibility = View.VISIBLE

            val navHostFragment = supportFragmentManager.findFragmentById(R.id.navHostFragment)
            navHostFragment?.view?.visibility = View.VISIBLE

            val navView: BottomNavigationView = binding.navView
            val navController = findNavController(R.id.navHostFragment)

            // MODIFICADO: Configurar navegación con validación de acceso
            navView.setupWithNavController(navController)

            // Agregar listener para controlar acceso al dashboard y admin
            navView.setOnItemSelectedListener { item ->
                when (item.itemId) {
                    R.id.navigation_dashboard -> {
                        if (canAccessDashboard()) {
                            Log.d(TAG, "✅ Acceso a Dashboard autorizado")
                            navController.navigate(R.id.navigation_dashboard)
                            true
                        } else {
                            Log.w(TAG, "❌ Acceso a Dashboard denegado")
                            Toast.makeText(this, "No tienes permisos para acceder al Dashboard", Toast.LENGTH_SHORT).show()
                            false
                        }
                    }
                    R.id.navigation_admin -> {
                        if (isUserAdmin) {
                            Log.d(TAG, "✅ Acceso a Admin autorizado")
                            navController.navigate(R.id.navigation_admin)
                            true
                        } else {
                            Log.w(TAG, "❌ Acceso a Admin denegado")
                            Toast.makeText(this, "No tienes permisos para acceder al Panel de Admin", Toast.LENGTH_SHORT).show()
                            false
                        }
                    }
                    else -> {
                        Log.d(TAG, "🔗 Navegando a: ${item.itemId}")
                        navController.navigate(item.itemId)
                        true
                    }
                }
            }

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
                        checkAdminAccess(it.uid)
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

            auth.signOut()
            googleSignInClient.signOut().addOnCompleteListener(this) {
                Log.d(TAG, "✅ Sesión cerrada exitosamente")
                showLoginScreen()
                clearAdminInfo()
                clearManagerInfo()

                // Reset estados
                isUserAdmin = false
                isUserManager = false
                adminPermissions = emptyList()
                managerPromoters = emptyList()
                adminLevel = ""

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