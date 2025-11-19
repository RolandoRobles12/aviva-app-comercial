package com.promotoresavivatunegocio_1.services

import android.content.Context
import android.util.Log
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Task
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.Timestamp
import models.User
import com.promotoresavivatunegocio_1.R
import kotlinx.coroutines.tasks.await
import models.SystemConfig

class AuthService(private val context: Context) {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()
    private val usersCollection = db.collection("users")
    private val configCollection = db.collection("system_config")

    private var googleSignInClient: GoogleSignInClient
    private var systemConfig: SystemConfig? = null

    companion object {
        private const val TAG = "AuthService"
        const val RC_SIGN_IN = 9001
    }

    init {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(context.getString(R.string.default_web_client_id))
            .requestEmail()
            .build()

        googleSignInClient = GoogleSignIn.getClient(context, gso)
    }

    // Authentication Methods
    suspend fun signInWithGoogle(idToken: String): Result<User> {
        return try {
            // Validate system configuration first
            loadSystemConfig()

            val credential = GoogleAuthProvider.getCredential(idToken, null)
            val authResult = auth.signInWithCredential(credential).await()
            val firebaseUser = authResult.user

            if (firebaseUser == null) {
                return Result.failure(Exception("Error al obtener información del usuario"))
            }

            // Validate email domain
            val email = firebaseUser.email ?: ""
            if (!isEmailDomainAllowed(email)) {
                auth.signOut()
                return Result.failure(Exception("Dominio de email no autorizado. Solo se permiten usuarios de @avivacredito.com"))
            }

            // Get or create user in Firestore
            val user = getOrCreateUser(firebaseUser)

            // Check user status
            if (user.status != User.UserStatus.ACTIVE) {
                auth.signOut()
                return Result.failure(Exception("Usuario ${user.getStatusDisplayName()}. Contacte al administrador."))
            }

            // Update last login
            updateLastLogin(user.id)

            Log.d(TAG, "Usuario autenticado exitosamente: ${user.email}")
            Result.success(user)

        } catch (e: Exception) {
            Log.e(TAG, "Error en autenticación con Google", e)
            Result.failure(e)
        }
    }

    suspend fun handleGoogleSignInResult(task: Task<GoogleSignInAccount>): Result<User> {
        return try {
            val account = task.getResult(ApiException::class.java)
            val idToken = account.idToken

            if (idToken == null) {
                return Result.failure(Exception("No se pudo obtener el token de autenticación"))
            }

            signInWithGoogle(idToken)
        } catch (e: ApiException) {
            Log.e(TAG, "Error en Google Sign In", e)
            Result.failure(Exception("Error al iniciar sesión con Google: ${e.localizedMessage}"))
        }
    }

    fun getGoogleSignInClient(): GoogleSignInClient {
        return googleSignInClient
    }

    fun getCurrentUser(): User? {
        val firebaseUser = auth.currentUser
        return if (firebaseUser != null) {
            // Note: This returns a basic user object. For full user data, use getCurrentUserFromFirestore()
            User(
                id = "",
                uid = firebaseUser.uid,
                email = firebaseUser.email ?: "",
                displayName = firebaseUser.displayName ?: "",
                photoUrl = firebaseUser.photoUrl?.toString()
            )
        } else null
    }

    suspend fun getCurrentUserFromFirestore(): User? {
        val firebaseUser = auth.currentUser ?: return null

        return try {
            val userDoc = usersCollection.document(firebaseUser.uid).get().await()
            if (userDoc.exists()) {
                userDoc.toObject(User::class.java)?.copy(id = userDoc.id)
            } else {
                // User not in Firestore, create from Firebase Auth
                getOrCreateUser(firebaseUser)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener usuario de Firestore", e)
            null
        }
    }

    suspend fun signOut(): Result<Boolean> {
        return try {
            auth.signOut()
            googleSignInClient.signOut().await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al cerrar sesión", e)
            Result.failure(e)
        }
    }

    // User Management
    private suspend fun getOrCreateUser(firebaseUser: FirebaseUser): User {
        val userDoc = usersCollection.document(firebaseUser.uid).get().await()

        return if (userDoc.exists()) {
            // User exists, update basic info and return
            val existingUser = userDoc.toObject(User::class.java)!!.copy(id = userDoc.id)

            // Update basic info if changed
            val updates = mutableMapOf<String, Any>()
            if (existingUser.displayName != firebaseUser.displayName) {
                updates["displayName"] = firebaseUser.displayName ?: ""
            }
            if (existingUser.photoUrl != firebaseUser.photoUrl?.toString()) {
                updates["photoUrl"] = firebaseUser.photoUrl?.toString() ?: ""
            }

            if (updates.isNotEmpty()) {
                updates["updatedAt"] = Timestamp.now()
                usersCollection.document(firebaseUser.uid).update(updates).await()
            }

            existingUser
        } else {
            // Create new user
            val newUser = User(
                uid = firebaseUser.uid,
                email = firebaseUser.email ?: "",
                displayName = firebaseUser.displayName ?: "",
                photoUrl = firebaseUser.photoUrl?.toString(),
                role = User.UserRole.PROMOTOR_AVIVA_TU_NEGOCIO, // Default role
                productLine = User.ProductLine.AVIVA_TU_NEGOCIO, // Default product line
                status = User.UserStatus.PENDING_ACTIVATION, // Requires admin activation
                createdAt = Timestamp.now(),
                updatedAt = Timestamp.now()
            )

            usersCollection.document(firebaseUser.uid).set(newUser).await()
            newUser.copy(id = firebaseUser.uid)
        }
    }

    suspend fun updateLastLogin(userId: String) {
        try {
            val updates = mapOf(
                "lastLogin" to Timestamp.now(),
                "updatedAt" to Timestamp.now()
            )
            usersCollection.document(userId).update(updates).await()
        } catch (e: Exception) {
            Log.e(TAG, "Error al actualizar último login", e)
        }
    }

    // Domain Validation
    private suspend fun loadSystemConfig() {
        if (systemConfig == null) {
            try {
                val configDoc = configCollection.document("system_config").get().await()
                systemConfig = if (configDoc.exists()) {
                    configDoc.toObject(SystemConfig::class.java)
                } else {
                    SystemConfig.getDefaultConfig()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error al cargar configuración del sistema", e)
                systemConfig = SystemConfig.getDefaultConfig()
            }
        }
    }

    private fun isEmailDomainAllowed(email: String): Boolean {
        val config = systemConfig ?: SystemConfig.getDefaultConfig()
        return config.isEmailDomainAllowed(email)
    }

    // Permission Checking
    suspend fun hasPermission(permission: String): Boolean {
        val user = getCurrentUserFromFirestore() ?: return false
        return user.hasPermission(permission)
    }

    suspend fun requirePermission(permission: String): Boolean {
        val hasAccess = hasPermission(permission)
        if (!hasAccess) {
            Log.w(TAG, "Acceso denegado para permiso: $permission")
        }
        return hasAccess
    }

    suspend fun isAdmin(): Boolean {
        return hasPermission(User.PERMISSION_MANAGE_USERS)
    }

    suspend fun isSuperAdmin(): Boolean {
        val user = getCurrentUserFromFirestore() ?: return false
        return user.role == User.UserRole.SUPER_ADMIN
    }

    // User Status Management
    suspend fun updateUserStatus(userId: String, status: User.UserStatus, updatedBy: String): Result<Boolean> {
        return try {
            val updates = mapOf(
                "status" to status,
                "updatedAt" to Timestamp.now(),
                "updatedBy" to updatedBy
            )
            usersCollection.document(userId).update(updates).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al actualizar estado del usuario", e)
            Result.failure(e)
        }
    }

    suspend fun updateUserRole(userId: String, role: User.UserRole, updatedBy: String): Result<Boolean> {
        return try {
            val updates = mapOf(
                "role" to role,
                "updatedAt" to Timestamp.now(),
                "updatedBy" to updatedBy
            )
            usersCollection.document(userId).update(updates).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al actualizar rol del usuario", e)
            Result.failure(e)
        }
    }

    // Session Management
    fun isUserSignedIn(): Boolean {
        return auth.currentUser != null
    }

    suspend fun refreshUserSession(): Result<User> {
        val firebaseUser = auth.currentUser
        return if (firebaseUser != null) {
            try {
                firebaseUser.reload().await()
                val user = getCurrentUserFromFirestore()
                if (user != null) {
                    Result.success(user)
                } else {
                    Result.failure(Exception("No se pudo cargar la información del usuario"))
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error al refrescar sesión", e)
                Result.failure(e)
            }
        } else {
            Result.failure(Exception("Usuario no autenticado"))
        }
    }

    // Account Deletion
    suspend fun deleteUserAccount(): Result<Boolean> {
        return try {
            val firebaseUser = auth.currentUser ?: return Result.failure(Exception("Usuario no autenticado"))

            // Delete user data from Firestore
            usersCollection.document(firebaseUser.uid).delete().await()

            // Delete Firebase Auth account
            firebaseUser.delete().await()

            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al eliminar cuenta", e)
            Result.failure(e)
        }
    }

    // Error Handling
    fun getAuthErrorMessage(exception: Exception): String {
        return when (exception.message) {
            "Dominio de email no autorizado" -> "Solo se permiten usuarios con email de avivacredito.com"
            "Usuario Inactivo" -> "Su cuenta está inactiva. Contacte al administrador."
            "Usuario Suspendido" -> "Su cuenta está suspendida. Contacte al administrador."
            "Usuario Pendiente de Activación" -> "Su cuenta está pendiente de activación por un administrador."
            else -> "Error de autenticación: ${exception.localizedMessage ?: "Error desconocido"}"
        }
    }
}