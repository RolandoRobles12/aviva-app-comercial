package com.promotoresavivatunegocio_1.services

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.Timestamp
import kotlinx.coroutines.tasks.await
import models.Badge
import models.UserBadge

/**
 * Servicio para gestionar insignias/badges
 *
 * Responsabilidades:
 * - Obtener insignias disponibles
 * - Obtener insignias de un usuario
 * - Desbloquear nuevas insignias
 * - Verificar progreso hacia insignias
 */
class BadgeService {
    private val db = FirebaseFirestore.getInstance()
    private val badgesCollection = db.collection("badges")
    private val userBadgesCollection = db.collection("userBadges")

    /**
     * Obtiene todas las insignias disponibles
     */
    suspend fun getAllBadges(): List<Badge> {
        return try {
            badgesCollection
                .whereEqualTo("isActive", true)
                .orderBy("displayOrder", Query.Direction.ASCENDING)
                .get()
                .await()
                .toObjects(Badge::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Obtiene las insignias de un usuario específico
     */
    suspend fun getUserBadges(userId: String): List<UserBadge> {
        return try {
            val userBadges = userBadgesCollection
                .whereEqualTo("userId", userId)
                .orderBy("unlockedAt", Query.Direction.DESCENDING)
                .get()
                .await()
                .toObjects(UserBadge::class.java)

            // Cargar información completa de cada insignia
            userBadges.forEach { userBadge ->
                val badge = getBadgeById(userBadge.badgeId)
                userBadge.badge = badge
            }

            userBadges
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Obtiene una insignia por ID
     */
    suspend fun getBadgeById(badgeId: String): Badge? {
        return try {
            badgesCollection
                .document(badgeId)
                .get()
                .await()
                .toObject(Badge::class.java)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Desbloquea una insignia para un usuario
     */
    suspend fun unlockBadge(
        userId: String,
        badgeId: String,
        achievedValue: Int = 0,
        notes: String = ""
    ): Result<UserBadge> {
        return try {
            // Verificar que la insignia existe
            val badge = getBadgeById(badgeId)
                ?: return Result.failure(Exception("Insignia no encontrada"))

            // Verificar que el usuario no tiene ya esta insignia
            val existingBadge = userBadgesCollection
                .whereEqualTo("userId", userId)
                .whereEqualTo("badgeId", badgeId)
                .get()
                .await()

            if (!existingBadge.isEmpty) {
                return Result.failure(Exception("El usuario ya tiene esta insignia"))
            }

            // Crear la insignia de usuario
            val userBadge = UserBadge(
                userId = userId,
                badgeId = badgeId,
                badge = badge,
                unlockedAt = Timestamp.now(),
                achievedValue = achievedValue,
                notes = notes
            )

            // Guardar en Firestore
            val docRef = userBadgesCollection.add(userBadge).await()
            val savedBadge = userBadge.copy(id = docRef.id)

            Result.success(savedBadge)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Obtiene insignias por categoría
     */
    suspend fun getBadgesByCategory(category: Badge.BadgeCategory): List<Badge> {
        return try {
            badgesCollection
                .whereEqualTo("isActive", true)
                .whereEqualTo("category", category.name)
                .orderBy("displayOrder", Query.Direction.ASCENDING)
                .get()
                .await()
                .toObjects(Badge::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Calcula el progreso del usuario hacia insignias no obtenidas
     */
    suspend fun getUserBadgeProgress(
        userId: String,
        currentValue: Int,
        badgeId: String
    ): Double {
        val badge = getBadgeById(badgeId) ?: return 0.0
        val hasUserBadge = userBadgesCollection
            .whereEqualTo("userId", userId)
            .whereEqualTo("badgeId", badgeId)
            .get()
            .await()
            .isEmpty.not()

        if (hasUserBadge) return 100.0

        return if (badge.requiredValue > 0) {
            (currentValue.toDouble() / badge.requiredValue.toDouble() * 100.0).coerceIn(0.0, 100.0)
        } else {
            0.0
        }
    }

    /**
     * Obtiene estadísticas de insignias de un usuario
     */
    suspend fun getUserBadgeStats(userId: String): BadgeStats {
        val userBadges = getUserBadges(userId)
        val allBadges = getAllBadges()

        return BadgeStats(
            totalUnlocked = userBadges.size,
            totalAvailable = allBadges.size,
            totalPoints = userBadges.sumOf { it.badge?.points ?: 0 },
            byCategory = Badge.BadgeCategory.values().associateWith { category ->
                userBadges.count { it.badge?.category == category }
            },
            byRarity = Badge.BadgeRarity.values().associateWith { rarity ->
                userBadges.count { it.badge?.rarity == rarity }
            }
        )
    }

    data class BadgeStats(
        val totalUnlocked: Int,
        val totalAvailable: Int,
        val totalPoints: Int,
        val byCategory: Map<Badge.BadgeCategory, Int>,
        val byRarity: Map<Badge.BadgeRarity, Int>
    )
}
