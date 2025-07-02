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

    companion object {
        private const val TAG = "MainActivity"
        private const val LOCATION_PERMISSION_REQUEST_CODE = 1001
        private const val BACKGROUND_LOCATION_REQUEST_CODE = 1002
        private const val INSTITUTIONAL_DOMAIN = "@avivacredito.com"
    }

    private val signInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            handleSignInResult(task)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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

        } catch (e: Exception) {
            Log.e(TAG, "Error en onCreate: ${e.message}", e)
            Toast.makeText(this, "Error al inicializar la aplicación", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    // ============================================================================
    // FIREBASE INITIALIZATION
    // ============================================================================

    private fun initializeFirebase() {
        try {
            FirebaseApp.initializeApp(this)
            auth = FirebaseAuth.getInstance()
            db = FirebaseFirestore.getInstance()
            storage = FirebaseStorage.getInstance()
            Log.d(TAG, "Firebase inicializado correctamente")
        } catch (e: Exception) {
            Log.e(TAG, "Error inicializando Firebase: ${e.message}", e)
        }
    }

    // ============================================================================
    // SISTEMA DE ADMINISTRADORES - CORREGIDO
    // ============================================================================

    private fun setupInitialAdminsIfNeeded() {
        val currentUser = auth.currentUser
        if (currentUser?.email == "rolando.robles@avivacredito.com") {
            Log.d(TAG, "Usuario super admin detectado, configurando administradores...")
            setupInitialAdmins()
        } else {
            Log.d(TAG, "Usuario normal, saltando configuración de admins")
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

        Log.d(TAG, "Configurando ${adminEmails.size} administradores iniciales...")
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
            Log.e(TAG, "Error en createAdminDirectly para $email: ${e.message}", e)
        }
    }

    // CORREGIDO: Verificar admin y controlar acceso al dashboard
    private fun checkAdminAccess(userId: String) {
        val currentUser = auth.currentUser
        if (currentUser?.email == null) {
            setupNormalUserAccess()
            return
        }

        val emailKey = currentUser.email!!.replace("@", "_").replace(".", "_")

        db.collection("admins").document(emailKey)
            .get()
            .addOnSuccessListener { document ->
                try {
                    if (document.exists() && document.getBoolean("isActive") == true) {
                        // Usuario es admin
                        adminPermissions = document.get("permissions") as? List<String> ?: emptyList()
                        adminLevel = document.getString("level") ?: "admin"
                        isUserAdmin = true

                        setupAdminAccess()
                        saveAdminInfo(adminPermissions, adminLevel)

                        Log.d(TAG, "✅ Admin verificado: ${currentUser.email} - Nivel: $adminLevel")
                        Toast.makeText(this, "Acceso de administrador activado", Toast.LENGTH_SHORT).show()
                    } else {
                        // Usuario normal
                        isUserAdmin = false
                        adminPermissions = emptyList()
                        adminLevel = ""

                        setupNormalUserAccess()
                        clearAdminInfo()
                        Log.d(TAG, "Usuario normal verificado: ${currentUser.email}")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error procesando datos de admin: ${e.message}", e)
                    setupNormalUserAccess()
                }
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "Error verificando acceso admin para ${currentUser.email}", e)
                setupNormalUserAccess()
            }
    }

    // NUEVO: Configurar acceso para administradores
    private fun setupAdminAccess() {
        try {
            // Mostrar menú de Dashboard para admins
            val dashboardMenuItem = binding.navView.menu.findItem(R.id.navigation_dashboard)
            dashboardMenuItem?.isVisible = true

            // Mostrar menú de Admin si existe
            val adminMenuItem = binding.navView.menu.findItem(R.id.navigation_admin)
            adminMenuItem?.isVisible = true

            Log.d(TAG, "Acceso de admin configurado - Dashboard visible")
        } catch (e: Exception) {
            Log.e(TAG, "Error configurando acceso de admin: ${e.message}", e)
        }
    }

    // NUEVO: Configurar acceso para usuarios normales
    private fun setupNormalUserAccess() {
        try {
            // Ocultar menú de Dashboard para usuarios normales
            val dashboardMenuItem = binding.navView.menu.findItem(R.id.navigation_dashboard)
            dashboardMenuItem?.isVisible = false

            // Ocultar menú de Admin
            val adminMenuItem = binding.navView.menu.findItem(R.id.navigation_admin)
            adminMenuItem?.isVisible = false

            Log.d(TAG, "Acceso de usuario normal configurado - Dashboard oculto")
        } catch (e: Exception) {
            Log.e(TAG, "Error configurando acceso de usuario normal: ${e.message}", e)
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
    }

    private fun clearAdminInfo() {
        val sharedPref = getSharedPreferences("admin_prefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            clear()
            apply()
        }
    }

    // NUEVO: Método para verificar si el usuario puede acceder al dashboard
    fun canAccessDashboard(): Boolean {
        return isUserAdmin && adminPermissions.contains("view_dashboard")
    }

    // ============================================================================
    // STORAGE TEST
    // ============================================================================

    private fun testStorageConnection() {
        try {
            val currentUser = auth.currentUser
            if (currentUser == null) {
                Log.d(TAG, "Usuario no autenticado, saltando test de Storage")
                return
            }

            Log.d(TAG, "Probando conexión a Storage...")
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
                                Log.d(TAG, "Archivo de prueba eliminado")
                            }
                            .addOnFailureListener { e ->
                                Log.w(TAG, "Error eliminando archivo de prueba: ${e.message}")
                            }
                    }, 2000)
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "❌ Error en Storage: ${e.message}", e)
                }
        } catch (e: Exception) {
            Log.e(TAG, "Error en testStorageConnection: ${e.message}", e)
        }
    }

    // ============================================================================
    // GOOGLE SIGN-IN
    // ============================================================================

    private fun setupGoogleSignIn() {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id))
            .requestEmail()
            .build()

        googleSignInClient = GoogleSignIn.getClient(this, gso)
    }

    private fun checkCurrentUser() {
        val currentUser = auth.currentUser
        if (currentUser != null) {
            if (currentUser.email?.endsWith(INSTITUTIONAL_DOMAIN) == true) {
                showMainContent()
                checkAdminAccess(currentUser.uid)
                testStorageConnection()
            } else {
                signOut()
                showLoginScreen()
            }
        } else {
            showLoginScreen()
        }
    }

    private fun showLoginScreen() {
        try {
            binding.loginContainer.visibility = View.VISIBLE
            binding.navView.visibility = View.GONE

            val navHostFragment = supportFragmentManager.findFragmentById(R.id.navHostFragment)
            navHostFragment?.view?.visibility = View.GONE

            binding.signInButton.setOnClickListener {
                signIn()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error en showLoginScreen: ${e.message}", e)
        }
    }

    private fun showMainContent() {
        try {
            binding.loginContainer.visibility = View.GONE
            binding.navView.visibility = View.VISIBLE

            val navHostFragment = supportFragmentManager.findFragmentById(R.id.navHostFragment)
            navHostFragment?.view?.visibility = View.VISIBLE

            val navView: BottomNavigationView = binding.navView
            val navController = findNavController(R.id.navHostFragment)

            // CORREGIDO: Configurar navegación con validación de acceso
            navView.setupWithNavController(navController)

            // Agregar listener para controlar acceso al dashboard
            navView.setOnItemSelectedListener { item ->
                when (item.itemId) {
                    R.id.navigation_dashboard -> {
                        if (canAccessDashboard()) {
                            navController.navigate(R.id.navigation_dashboard)
                            true
                        } else {
                            Toast.makeText(this, "No tienes permisos para acceder al Dashboard", Toast.LENGTH_SHORT).show()
                            false
                        }
                    }
                    else -> {
                        navController.navigate(item.itemId)
                        true
                    }
                }
            }

            // Inicializar tracking de ubicación
            if (::locationManager.isInitialized) {
                Log.d(TAG, "LocationManager disponible, iniciando tracking")
                requestLocationPermissionsAndStartTracking()
            } else {
                Log.e(TAG, "ERROR CRÍTICO: LocationManager no inicializado")
                locationManager = LocationManager.getInstance(this)
                requestLocationPermissionsAndStartTracking()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error en showMainContent: ${e.message}", e)
        }
    }

    private fun signIn() {
        try {
            val signInIntent = googleSignInClient.signInIntent
            signInLauncher.launch(signInIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error al iniciar sign in: ${e.message}", e)
            Toast.makeText(this, "Error al iniciar sesión", Toast.LENGTH_SHORT).show()
        }
    }

    private fun handleSignInResult(completedTask: Task<GoogleSignInAccount>) {
        try {
            val account = completedTask.getResult(ApiException::class.java)!!

            if (account.email?.endsWith(INSTITUTIONAL_DOMAIN) == true) {
                firebaseAuthWithGoogle(account.idToken!!)
            } else {
                Toast.makeText(this, "Solo se permiten correos institucionales", Toast.LENGTH_LONG).show()
                googleSignInClient.signOut()
            }
        } catch (e: ApiException) {
            Log.w(TAG, "signInResult:failed code=" + e.statusCode, e)
            Toast.makeText(this, "Error al iniciar sesión", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Log.e(TAG, "Error en handleSignInResult: ${e.message}", e)
            Toast.makeText(this, "Error inesperado", Toast.LENGTH_SHORT).show()
        }
    }

    private fun firebaseAuthWithGoogle(idToken: String) {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        auth.signInWithCredential(credential)
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    val user = auth.currentUser
                    user?.let {
                        saveUserToFirestore(it)
                        showMainContent()
                        checkAdminAccess(it.uid)
                        testStorageConnection()
                    }
                } else {
                    Log.w(TAG, "signInWithCredential:failure", task.exception)
                    Toast.makeText(this, "Autenticación fallida", Toast.LENGTH_SHORT).show()
                }
            }
    }

    private fun saveUserToFirestore(user: com.google.firebase.auth.FirebaseUser) {
        try {
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
                    Log.d(TAG, "Usuario guardado en Firestore")
                }
                .addOnFailureListener { e ->
                    Log.w(TAG, "Error al guardar usuario", e)
                }
        } catch (e: Exception) {
            Log.e(TAG, "Error en saveUserToFirestore: ${e.message}", e)
        }
    }

    private fun signOut() {
        try {
            auth.signOut()
            googleSignInClient.signOut().addOnCompleteListener(this) {
                showLoginScreen()
                clearAdminInfo()
                // Reset admin status
                isUserAdmin = false
                adminPermissions = emptyList()
                adminLevel = ""
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error en signOut: ${e.message}", e)
        }
    }

    // ============================================================================
    // LOCATION SERVICES - CORREGIDO PARA PERMITIR "TODO EL TIEMPO"
    // ============================================================================

    private fun requestLocationPermissionsAndStartTracking() {
        try {
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

            if (missingPermissions.isEmpty()) {
                startLocationTrackingIfNeeded()
            } else {
                // Solicitar permisos básicos primero
                val basicPermissions = missingPermissions.filter {
                    it != Manifest.permission.ACCESS_BACKGROUND_LOCATION
                }

                if (basicPermissions.isNotEmpty()) {
                    ActivityCompat.requestPermissions(
                        this,
                        basicPermissions.toTypedArray(),
                        LOCATION_PERMISSION_REQUEST_CODE
                    )
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
                    missingPermissions.contains(Manifest.permission.ACCESS_BACKGROUND_LOCATION)) {
                    // Solicitar permiso de background por separado
                    requestBackgroundLocationPermission()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error en requestLocationPermissionsAndStartTracking: ${e.message}", e)
        }
    }

    // NUEVO: Solicitar permiso de ubicación en background (todo el tiempo)
    private fun requestBackgroundLocationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {

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
            if (!::locationManager.isInitialized) {
                Log.e(TAG, "LocationManager no inicializado, inicializando ahora...")
                locationManager = LocationManager.getInstance(this)
            }

            if (!locationManager.isTrackingEnabled) {
                val success = locationManager.startTracking()
                if (success) {
                    Log.d(TAG, "✅ Tracking iniciado correctamente")
                    Toast.makeText(this, "Tracking de ubicación iniciado", Toast.LENGTH_SHORT).show()
                } else {
                    Log.w(TAG, "⚠️ Error al iniciar tracking")
                    startLocationService()
                }
            } else {
                Log.d(TAG, "Tracking ya está activo")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error en startLocationTrackingIfNeeded: ${e.message}", e)
            startLocationService()
        }
    }

    private fun startLocationService() {
        try {
            val fineLocationGranted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

            val coarseLocationGranted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

            if (fineLocationGranted || coarseLocationGranted) {
                val serviceIntent = Intent(this, LocationService::class.java)
                ContextCompat.startForegroundService(this, serviceIntent)
                Log.d(TAG, "LocationService iniciado correctamente")
            } else {
                Log.w(TAG, "Sin permisos de ubicación para LocationService")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al iniciar LocationService: ${e.message}", e)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        when (requestCode) {
            LOCATION_PERMISSION_REQUEST_CODE -> {
                if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                    Toast.makeText(this, "Permisos básicos de ubicación concedidos", Toast.LENGTH_SHORT).show()

                    // Ahora solicitar permiso de background si es necesario
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        requestBackgroundLocationPermission()
                    } else {
                        startLocationTrackingIfNeeded()
                    }
                } else {
                    Toast.makeText(
                        this,
                        "Se requieren permisos de ubicación para el tracking",
                        Toast.LENGTH_LONG
                    ).show()

                    val hasBasicPermissions = grantResults.any { it == PackageManager.PERMISSION_GRANTED }
                    if (hasBasicPermissions) {
                        startLocationService()
                    }
                }
            }

            BACKGROUND_LOCATION_REQUEST_CODE -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Toast.makeText(this, "Permiso de ubicación en background concedido", Toast.LENGTH_SHORT).show()
                    startLocationTrackingIfNeeded()
                } else {
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
            _binding = null
            super.onDestroy()
        } catch (e: Exception) {
            Log.e(TAG, "Error en onDestroy: ${e.message}", e)
            super.onDestroy()
        }
    }

    override fun onStop() {
        try {
            super.onStop()
        } catch (e: Exception) {
            Log.e(TAG, "Error en onStop: ${e.message}", e)
        }
    }

    override fun onPause() {
        try {
            super.onPause()
        } catch (e: Exception) {
            Log.e(TAG, "Error en onPause: ${e.message}", e)
        }
    }
}