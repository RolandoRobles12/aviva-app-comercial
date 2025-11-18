package com.promotoresavivatunegocio_1.services

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import models.User
import kotlinx.coroutines.tasks.await
import models.SystemConfig

class UserService {
    private val db = FirebaseFirestore.getInstance()
    private val usersCollection = db.collection("users")
    private val configCollection = db.collection("system_config")

    companion object {
        private const val TAG = "UserService"
    }

    // User CRUD Operations
    suspend fun createUser(user: User, createdBy: String): Result<String> {
        return try {
            val newUser = user.copy(
                createdAt = Timestamp.now(),
                updatedAt = Timestamp.now(),
                status = User.UserStatus.PENDING_ACTIVATION
            )

            val docRef = usersCollection.add(newUser).await()
            val userId = docRef.id

            // Update document with its own ID
            usersCollection.document(userId).update("id", userId).await()

            Log.d(TAG, "Usuario creado exitosamente: ${user.email}")
            Result.success(userId)
        } catch (e: Exception) {
            Log.e(TAG, "Error al crear usuario", e)
            Result.failure(e)
        }
    }

    suspend fun updateUser(user: User, updatedBy: String): Result<Boolean> {
        return try {
            val updates = user.copy(
                updatedAt = Timestamp.now()
            )

            usersCollection.document(user.id).set(updates).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al actualizar usuario", e)
            Result.failure(e)
        }
    }

    suspend fun deleteUser(userId: String): Result<Boolean> {
        return try {
            // Soft delete - just mark as inactive
            val updates = mapOf(
                "status" to User.UserStatus.INACTIVE,
                "updatedAt" to Timestamp.now()
            )
            usersCollection.document(userId).update(updates).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al eliminar usuario", e)
            Result.failure(e)
        }
    }

    suspend fun getUserById(userId: String): User? {
        return try {
            val userDoc = usersCollection.document(userId).get().await()
            if (userDoc.exists()) {
                userDoc.toObject(User::class.java)?.copy(id = userDoc.id)
            } else null
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener usuario por ID", e)
            null
        }
    }

    suspend fun getUserByEmail(email: String): User? {
        return try {
            val snapshot = usersCollection
                .whereEqualTo("email", email)
                .limit(1)
                .get()
                .await()

            if (!snapshot.isEmpty) {
                val userDoc = snapshot.documents.first()
                userDoc.toObject(User::class.java)?.copy(id = userDoc.id)
            } else null
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener usuario por email", e)
            null
        }
    }

    // User Queries
    suspend fun getAllUsers(): List<User> {
        return try {
            val snapshot = usersCollection
                .orderBy("displayName")
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(User::class.java)?.copy(id = doc.id)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener todos los usuarios", e)
            emptyList()
        }
    }

    suspend fun getActiveUsers(): List<User> {
        return try {
            val snapshot = usersCollection
                .whereEqualTo("status", User.UserStatus.ACTIVE)
                .orderBy("displayName")
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(User::class.java)?.copy(id = doc.id)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener usuarios activos", e)
            emptyList()
        }
    }

    suspend fun getUsersByRole(role: User.UserRole): List<User> {
        return try {
            val snapshot = usersCollection
                .whereEqualTo("role", role)
                .whereEqualTo("status", User.UserStatus.ACTIVE)
                .orderBy("displayName")
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(User::class.java)?.copy(id = doc.id)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener usuarios por rol", e)
            emptyList()
        }
    }

    suspend fun getUsersByProductType(productType: String): List<User> {
        return try {
            val snapshot = usersCollection
                .whereArrayContains("productTypes", productType)
                .whereEqualTo("status", User.UserStatus.ACTIVE)
                .orderBy("displayName")
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(User::class.java)?.copy(id = doc.id)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener usuarios por tipo de producto", e)
            emptyList()
        }
    }

    suspend fun getPendingUsers(): List<User> {
        return try {
            val snapshot = usersCollection
                .whereEqualTo("status", User.UserStatus.PENDING_ACTIVATION)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(User::class.java)?.copy(id = doc.id)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener usuarios pendientes", e)
            emptyList()
        }
    }

    suspend fun searchUsers(query: String): List<User> {
        return try {
            val allUsers = getAllUsers()
            allUsers.filter { user ->
                user.displayName.contains(query, ignoreCase = true) ||
                user.email.contains(query, ignoreCase = true) ||
                user.employeeId?.contains(query, ignoreCase = true) == true
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al buscar usuarios", e)
            emptyList()
        }
    }

    // Role and Permission Management
    suspend fun updateUserRole(userId: String, newRole: User.UserRole, updatedBy: String): Result<Boolean> {
        return try {
            val updates = mapOf(
                "role" to newRole,
                "updatedAt" to Timestamp.now()
            )
            usersCollection.document(userId).update(updates).await()

            Log.d(TAG, "Rol actualizado para usuario $userId a $newRole")
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al actualizar rol", e)
            Result.failure(e)
        }
    }

    suspend fun updateUserStatus(userId: String, newStatus: User.UserStatus, updatedBy: String): Result<Boolean> {
        return try {
            val updates = mapOf(
                "status" to newStatus,
                "updatedAt" to Timestamp.now()
            )
            usersCollection.document(userId).update(updates).await()

            Log.d(TAG, "Estado actualizado para usuario $userId a $newStatus")
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al actualizar estado", e)
            Result.failure(e)
        }
    }

    suspend fun assignProductTypes(userId: String, productTypes: List<String>, updatedBy: String): Result<Boolean> {
        return try {
            val updates = mapOf(
                "productTypes" to productTypes,
                "updatedAt" to Timestamp.now()
            )
            usersCollection.document(userId).update(updates).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al asignar tipos de producto", e)
            Result.failure(e)
        }
    }

    suspend fun assignKiosks(userId: String, kioskIds: List<String>, updatedBy: String): Result<Boolean> {
        return try {
            val updates = mapOf(
                "kiosks" to kioskIds,
                "updatedAt" to Timestamp.now()
            )
            usersCollection.document(userId).update(updates).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al asignar kioscos", e)
            Result.failure(e)
        }
    }

    suspend fun assignPromotersToSupervisor(supervisorId: String, promoterIds: List<String>): Result<Boolean> {
        return try {
            // Update supervisor with assigned promoters
            val supervisorUpdates = mapOf(
                "assignedPromoters" to promoterIds,
                "updatedAt" to Timestamp.now()
            )
            usersCollection.document(supervisorId).update(supervisorUpdates).await()

            // Update promoters with manager ID
            promoterIds.forEach { promoterId ->
                val promoterUpdates = mapOf(
                    "managerId" to supervisorId,
                    "updatedAt" to Timestamp.now()
                )
                usersCollection.document(promoterId).update(promoterUpdates).await()
            }

            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al asignar promotores a supervisor", e)
            Result.failure(e)
        }
    }

    // Bulk Operations
    suspend fun activateMultipleUsers(userIds: List<String>, activatedBy: String): Result<Int> {
        return try {
            var successCount = 0
            val batch = db.batch()

            userIds.forEach { userId ->
                val userRef = usersCollection.document(userId)
                batch.update(userRef, mapOf(
                    "status" to User.UserStatus.ACTIVE,
                    "updatedAt" to Timestamp.now()
                ))
                successCount++
            }

            batch.commit().await()
            Result.success(successCount)
        } catch (e: Exception) {
            Log.e(TAG, "Error al activar usuarios múltiples", e)
            Result.failure(e)
        }
    }

    suspend fun updateMultipleUserRoles(userRoleMap: Map<String, User.UserRole>, updatedBy: String): Result<Int> {
        return try {
            var successCount = 0
            val batch = db.batch()

            userRoleMap.forEach { (userId, role) ->
                val userRef = usersCollection.document(userId)
                batch.update(userRef, mapOf(
                    "role" to role,
                    "updatedAt" to Timestamp.now()
                ))
                successCount++
            }

            batch.commit().await()
            Result.success(successCount)
        } catch (e: Exception) {
            Log.e(TAG, "Error al actualizar roles múltiples", e)
            Result.failure(e)
        }
    }

    // Statistics
    suspend fun getUserStatistics(): UserStatistics {
        return try {
            val allUsers = getAllUsers()

            val stats = UserStatistics(
                totalUsers = allUsers.size,
                activeUsers = allUsers.count { it.status == User.UserStatus.ACTIVE },
                pendingUsers = allUsers.count { it.status == User.UserStatus.PENDING_ACTIVATION },
                inactiveUsers = allUsers.count { it.status == User.UserStatus.INACTIVE },
                suspendedUsers = allUsers.count { it.status == User.UserStatus.SUSPENDED },
                superAdmins = allUsers.count { it.role == User.UserRole.SUPER_ADMIN },
                admins = allUsers.count { it.role == User.UserRole.ADMIN },
                supervisors = allUsers.count { it.role == User.UserRole.SUPERVISOR },
                promotors = allUsers.count { it.role == User.UserRole.PROMOTOR }
            )

            stats
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener estadísticas de usuarios", e)
            UserStatistics()
        }
    }

    // User Validation
    suspend fun validateUser(user: User): List<String> {
        val errors = mutableListOf<String>()

        if (user.email.isBlank()) {
            errors.add("Email es requerido")
        } else if (!android.util.Patterns.EMAIL_ADDRESS.matcher(user.email).matches()) {
            errors.add("Email no tiene formato válido")
        } else {
            // Check if email domain is allowed
            val config = getSystemConfig()
            if (!config.isEmailDomainAllowed(user.email)) {
                errors.add("Dominio de email no autorizado")
            }

            // Check if email is unique (exclude current user)
            val existingUser = getUserByEmail(user.email)
            if (existingUser != null && existingUser.id != user.id) {
                errors.add("Email ya está en uso")
            }
        }

        if (user.displayName.isBlank()) {
            errors.add("Nombre es requerido")
        }

        if (user.employeeId?.isNotBlank() == true) {
            // Check if employee ID is unique
            val usersWithSameEmployeeId = getAllUsers().filter {
                it.employeeId == user.employeeId && it.id != user.id
            }
            if (usersWithSameEmployeeId.isNotEmpty()) {
                errors.add("ID de empleado ya está en uso")
            }
        }

        return errors
    }

    private suspend fun getSystemConfig(): SystemConfig {
        return try {
            val configDoc = configCollection.document("system_config").get().await()
            if (configDoc.exists()) {
                configDoc.toObject(SystemConfig::class.java) ?: SystemConfig.getDefaultConfig()
            } else {
                SystemConfig.getDefaultConfig()
            }
        } catch (e: Exception) {
            SystemConfig.getDefaultConfig()
        }
    }

    data class UserStatistics(
        val totalUsers: Int = 0,
        val activeUsers: Int = 0,
        val pendingUsers: Int = 0,
        val inactiveUsers: Int = 0,
        val suspendedUsers: Int = 0,
        val superAdmins: Int = 0,
        val admins: Int = 0,
        val supervisors: Int = 0,
        val promotors: Int = 0
    ) {
        fun getActivationRate(): Double {
            return if (totalUsers > 0) (activeUsers.toDouble() / totalUsers) * 100 else 0.0
        }
    }
}