package com.promotoresavivatunegocio_1.services

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.Timestamp
import kotlinx.coroutines.tasks.await
import models.CareerLevel
import models.CareerPath
import models.LevelAchievement
import models.UserCareerProgress

/**
 * Servicio para gestionar el plan de carrera
 *
 * Responsabilidades:
 * - Gestionar niveles de carrera
 * - Calcular progreso hacia siguiente nivel
 * - Verificar requisitos de promoción
 * - Actualizar nivel de usuario
 */
class CareerService {
    private val db = FirebaseFirestore.getInstance()
    private val careerPathsCollection = db.collection("careerPaths")
    private val userProgressCollection = db.collection("userCareerProgress")

    /**
     * Obtiene el plan de carrera activo
     */
    suspend fun getActiveCareerPath(): CareerPath? {
        return try {
            careerPathsCollection
                .whereEqualTo("isActive", true)
                .limit(1)
                .get()
                .await()
                .toObjects(CareerPath::class.java)
                .firstOrNull()
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Obtiene el progreso de carrera de un usuario
     */
    suspend fun getUserProgress(userId: String): UserCareerProgress? {
        return try {
            val progress = userProgressCollection
                .whereEqualTo("userId", userId)
                .limit(1)
                .get()
                .await()
                .toObjects(UserCareerProgress::class.java)
                .firstOrNull()

            // Cargar detalles del nivel actual y siguiente
            progress?.let { updateProgressWithLevelDetails(it) }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Actualiza el progreso con los detalles de los niveles
     */
    private suspend fun updateProgressWithLevelDetails(progress: UserCareerProgress): UserCareerProgress {
        val careerPath = getActiveCareerPath()
        val currentLevel = careerPath?.levels?.find { it.level == progress.currentLevel }
        val nextLevel = careerPath?.levels?.find { it.level == progress.currentLevel + 1 }

        return progress.copy(
            currentLevelDetails = currentLevel,
            nextLevel = nextLevel
        )
    }

    /**
     * Calcula el progreso hacia el siguiente nivel
     */
    suspend fun calculateProgressToNextLevel(
        userId: String,
        userMetrics: models.UserMetrics?,
        userBadges: List<models.UserBadge>
    ): Double {
        val progress = getUserProgress(userId) ?: return 0.0
        val nextLevel = progress.nextLevel ?: return 100.0

        val requirements = nextLevel.requirements
        var completedRequirements = 0
        var totalRequirements = 0

        // Verificar requisitos de ventas
        if (requirements.minSalesTotal > 0) {
            totalRequirements++
            if ((userMetrics?.totalSales ?: 0) >= requirements.minSalesTotal) {
                completedRequirements++
            }
        }

        // Verificar requisitos de asistencia
        if (requirements.minAverageAttendance > 0) {
            totalRequirements++
            if ((userMetrics?.attendanceRate ?: 0.0) >= requirements.minAverageAttendance) {
                completedRequirements++
            }
        }

        // Verificar requisitos de puntos
        if (requirements.minTotalPoints > 0) {
            totalRequirements++
            if ((userMetrics?.totalPoints ?: 0) >= requirements.minTotalPoints) {
                completedRequirements++
            }
        }

        // Verificar insignias requeridas
        if (requirements.requiredBadges.isNotEmpty()) {
            totalRequirements++
            val userBadgeIds = userBadges.map { it.badgeId }
            val hasAllBadges = requirements.requiredBadges.all { it in userBadgeIds }
            if (hasAllBadges) {
                completedRequirements++
            }
        }

        return if (totalRequirements > 0) {
            (completedRequirements.toDouble() / totalRequirements.toDouble()) * 100.0
        } else {
            0.0
        }
    }

    /**
     * Promueve a un usuario al siguiente nivel
     */
    suspend fun promoteUser(userId: String): Result<UserCareerProgress> {
        return try {
            val progress = getUserProgress(userId)
                ?: return Result.failure(Exception("Progreso de usuario no encontrado"))

            val nextLevel = progress.nextLevel
                ?: return Result.failure(Exception("No hay siguiente nivel disponible"))

            val updatedProgress = progress.copy(
                currentLevel = nextLevel.level,
                currentLevelName = nextLevel.name,
                levelAchievedAt = Timestamp.now(),
                progressToNextLevel = 0.0,
                requirementsCompleted = 0,
                levelHistory = progress.levelHistory + LevelAchievement(
                    level = nextLevel.level,
                    levelName = nextLevel.name,
                    achievedAt = Timestamp.now()
                ),
                lastUpdated = Timestamp.now()
            )

            userProgressCollection
                .document(progress.id)
                .set(updatedProgress)
                .await()

            Result.success(updateProgressWithLevelDetails(updatedProgress))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Actualiza el progreso de carrera de un usuario
     */
    suspend fun updateUserProgress(userId: String): Result<UserCareerProgress> {
        return try {
            // Obtener métricas y badges del usuario
            val metricsService = MetricsService()
            val badgeService = BadgeService()

            val userMetrics = metricsService.getCurrentUserMetrics(userId)
            val userBadges = badgeService.getUserBadges(userId)

            val progress = getUserProgress(userId)
                ?: createInitialProgress(userId)

            // Calcular nuevo progreso
            val progressPercent = calculateProgressToNextLevel(userId, userMetrics, userBadges)

            // Contar requisitos completados
            val nextLevel = progress.nextLevel
            val requirements = nextLevel?.requirements
            var completed = 0
            var total = 0

            if (requirements != null) {
                if (requirements.minSalesTotal > 0) {
                    total++
                    if ((userMetrics?.totalSales ?: 0) >= requirements.minSalesTotal) completed++
                }
                if (requirements.minAverageAttendance > 0) {
                    total++
                    if ((userMetrics?.attendanceRate ?: 0.0) >= requirements.minAverageAttendance) completed++
                }
                if (requirements.minTotalPoints > 0) {
                    total++
                    if ((userMetrics?.totalPoints ?: 0) >= requirements.minTotalPoints) completed++
                }
            }

            val updatedProgress = progress.copy(
                progressToNextLevel = progressPercent,
                requirementsCompleted = completed,
                requirementsTótal = total,
                lastUpdated = Timestamp.now()
            )

            userProgressCollection
                .document(progress.id)
                .set(updatedProgress)
                .await()

            Result.success(updateProgressWithLevelDetails(updatedProgress))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Crea el progreso inicial para un usuario nuevo
     */
    private suspend fun createInitialProgress(userId: String): UserCareerProgress {
        val careerPath = getActiveCareerPath()
        val initialLevel = careerPath?.levels?.minByOrNull { it.level }

        val progress = UserCareerProgress(
            userId = userId,
            currentLevel = initialLevel?.level ?: 1,
            currentLevelName = initialLevel?.name ?: "Promotor Junior",
            levelAchievedAt = Timestamp.now()
        )

        val docRef = userProgressCollection.add(progress).await()
        return progress.copy(id = docRef.id)
    }

    /**
     * Obtiene todos los niveles de carrera disponibles
     */
    suspend fun getAllCareerLevels(): List<CareerLevel> {
        val careerPath = getActiveCareerPath()
        return careerPath?.levels?.sortedBy { it.level } ?: emptyList()
    }

    /**
     * Obtiene un nivel de carrera específico
     */
    suspend fun getCareerLevel(level: Int): CareerLevel? {
        val careerPath = getActiveCareerPath()
        return careerPath?.levels?.find { it.level == level }
    }
}
