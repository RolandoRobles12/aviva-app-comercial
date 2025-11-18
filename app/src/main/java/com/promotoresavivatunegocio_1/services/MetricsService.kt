package com.promotoresavivatunegocio_1.services

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.Timestamp
import kotlinx.coroutines.tasks.await
import models.MetricsReport
import models.UserMetrics
import java.util.Calendar

/**
 * Servicio para gestionar métricas de vendedores
 *
 * Responsabilidades:
 * - Obtener métricas de un usuario
 * - Generar reportes de métricas
 * - Calcular tendencias
 * - Actualizar métricas
 */
class MetricsService {
    private val db = FirebaseFirestore.getInstance()
    private val metricsCollection = db.collection("userMetrics")
    private val reportsCollection = db.collection("metricsReports")

    /**
     * Obtiene las métricas actuales de un usuario
     */
    suspend fun getCurrentUserMetrics(
        userId: String,
        period: UserMetrics.MetricsPeriod = UserMetrics.MetricsPeriod.MENSUAL
    ): UserMetrics? {
        return try {
            val calendar = Calendar.getInstance()
            val year = calendar.get(Calendar.YEAR)
            val month = calendar.get(Calendar.MONTH) + 1

            metricsCollection
                .whereEqualTo("userId", userId)
                .whereEqualTo("period", period.name)
                .whereEqualTo("year", year)
                .whereEqualTo("month", month)
                .limit(1)
                .get()
                .await()
                .toObjects(UserMetrics::class.java)
                .firstOrNull()
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Obtiene métricas de un período específico
     */
    suspend fun getUserMetricsForPeriod(
        userId: String,
        period: UserMetrics.MetricsPeriod,
        year: Int,
        month: Int? = null,
        week: Int? = null
    ): UserMetrics? {
        return try {
            var query = metricsCollection
                .whereEqualTo("userId", userId)
                .whereEqualTo("period", period.name)
                .whereEqualTo("year", year)

            if (month != null) {
                query = query.whereEqualTo("month", month)
            }
            if (week != null) {
                query = query.whereEqualTo("week", week)
            }

            query.limit(1)
                .get()
                .await()
                .toObjects(UserMetrics::class.java)
                .firstOrNull()
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Actualiza o crea métricas de un usuario
     */
    suspend fun updateUserMetrics(metrics: UserMetrics): Result<UserMetrics> {
        return try {
            val existingMetrics = metricsCollection
                .whereEqualTo("userId", metrics.userId)
                .whereEqualTo("period", metrics.period.name)
                .whereEqualTo("year", metrics.year)
                .whereEqualTo("month", metrics.month)
                .limit(1)
                .get()
                .await()

            val updatedMetrics = metrics.copy(lastUpdated = Timestamp.now())

            if (existingMetrics.isEmpty) {
                // Crear nuevo documento
                val docRef = metricsCollection.add(updatedMetrics).await()
                Result.success(updatedMetrics.copy(id = docRef.id))
            } else {
                // Actualizar documento existente
                val docId = existingMetrics.documents[0].id
                metricsCollection.document(docId).set(updatedMetrics).await()
                Result.success(updatedMetrics.copy(id = docId))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Genera un reporte de métricas con comparaciones
     */
    suspend fun generateMetricsReport(userId: String): MetricsReport? {
        return try {
            val calendar = Calendar.getInstance()
            val currentYear = calendar.get(Calendar.YEAR)
            val currentMonth = calendar.get(Calendar.MONTH) + 1

            // Obtener métricas del mes actual
            val currentMetrics = getUserMetricsForPeriod(
                userId = userId,
                period = UserMetrics.MetricsPeriod.MENSUAL,
                year = currentYear,
                month = currentMonth
            )

            // Obtener métricas del mes anterior
            val previousMonth = if (currentMonth == 1) 12 else currentMonth - 1
            val previousYear = if (currentMonth == 1) currentYear - 1 else currentYear
            val previousMetrics = getUserMetricsForPeriod(
                userId = userId,
                period = UserMetrics.MetricsPeriod.MENSUAL,
                year = previousYear,
                month = previousMonth
            )

            // Calcular tendencias
            val salesTrend = calculateTrend(
                currentMetrics?.totalSales ?: 0,
                previousMetrics?.totalSales ?: 0
            )
            val prospectsTrend = calculateTrend(
                currentMetrics?.prospectsGenerated ?: 0,
                previousMetrics?.prospectsGenerated ?: 0
            )
            val attendanceTrend = calculateTrend(
                currentMetrics?.attendanceRate ?: 0.0,
                previousMetrics?.attendanceRate ?: 0.0
            )

            val report = MetricsReport(
                userId = userId,
                generatedAt = Timestamp.now(),
                currentMetrics = currentMetrics,
                previousMetrics = previousMetrics,
                salesTrend = salesTrend,
                prospectsTrend = prospectsTrend,
                attendanceTrend = attendanceTrend,
                salesGoal = 100, // TODO: Obtener del objetivo del usuario
                salesAchieved = currentMetrics?.totalSales ?: 0,
                goalCompletionRate = calculateGoalCompletion(
                    achieved = currentMetrics?.totalSales ?: 0,
                    goal = 100
                )
            )

            // Guardar el reporte
            val docRef = reportsCollection.add(report).await()
            report.copy(id = docRef.id)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Obtiene el histórico de métricas de un usuario
     */
    suspend fun getUserMetricsHistory(
        userId: String,
        period: UserMetrics.MetricsPeriod,
        limit: Int = 12
    ): List<UserMetrics> {
        return try {
            metricsCollection
                .whereEqualTo("userId", userId)
                .whereEqualTo("period", period.name)
                .orderBy("year", Query.Direction.DESCENDING)
                .orderBy("month", Query.Direction.DESCENDING)
                .limit(limit.toLong())
                .get()
                .await()
                .toObjects(UserMetrics::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Obtiene el ranking de usuarios por métricas
     */
    suspend fun getUsersRanking(
        period: UserMetrics.MetricsPeriod = UserMetrics.MetricsPeriod.MENSUAL,
        orderBy: String = "totalPoints",
        limit: Int = 100
    ): List<UserMetrics> {
        return try {
            val calendar = Calendar.getInstance()
            val year = calendar.get(Calendar.YEAR)
            val month = calendar.get(Calendar.MONTH) + 1

            metricsCollection
                .whereEqualTo("period", period.name)
                .whereEqualTo("year", year)
                .whereEqualTo("month", month)
                .orderBy(orderBy, Query.Direction.DESCENDING)
                .limit(limit.toLong())
                .get()
                .await()
                .toObjects(UserMetrics::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    // Funciones auxiliares

    private fun calculateTrend(current: Number, previous: Number): Double {
        val currentValue = current.toDouble()
        val previousValue = previous.toDouble()

        return if (previousValue == 0.0) {
            if (currentValue > 0) 100.0 else 0.0
        } else {
            ((currentValue - previousValue) / previousValue) * 100.0
        }
    }

    private fun calculateGoalCompletion(achieved: Int, goal: Int): Double {
        return if (goal > 0) {
            (achieved.toDouble() / goal.toDouble() * 100.0).coerceIn(0.0, 100.0)
        } else {
            0.0
        }
    }
}
