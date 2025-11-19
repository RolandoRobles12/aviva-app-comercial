package com.promotoresavivatunegocio_1.database.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Caché de métricas para modo offline
 * Permite mostrar métricas aunque no haya conexión
 */
@Entity(tableName = "metrics_cache")
data class MetricsCache(
    @PrimaryKey
    val id: String, // Formato: "userId_period_date"

    // Identificadores
    val userId: String,
    val period: String, // "daily", "weekly", "monthly", "quarterly", "yearly"
    val periodStart: Long,
    val periodEnd: Long,

    // Métricas de ventas
    val totalSales: Int = 0,
    val salesAmount: Double = 0.0,
    val averageTicket: Double = 0.0,
    val conversionRate: Double = 0.0,

    // Métricas de prospectos
    val prospectsGenerated: Int = 0,
    val prospectsContacted: Int = 0,
    val prospectsConverted: Int = 0,

    // Métricas de asistencia
    val daysWorked: Int = 0,
    val attendanceRate: Double = 0.0,
    val hoursWorked: Double = 0.0,

    // Métricas de actividad
    val visitsCompleted: Int = 0,
    val kiosksVisited: Int = 0,
    val citiesVisited: Int = 0,

    // Métricas de competencia
    val totalPoints: Int = 0,
    val monthlyPoints: Int = 0,
    val rankPosition: Int = 0,
    val leaguePosition: Int = 0,
    val leagueName: String? = null,

    // Objetivo
    val goalTarget: Int = 0,
    val goalProgress: Int = 0,
    val goalPercentage: Double = 0.0,

    // Tendencias
    val salesTrend: Double = 0.0,
    val prospectsTrend: Double = 0.0,
    val attendanceTrend: Double = 0.0,

    // Cache metadata
    val cachedAt: Long = System.currentTimeMillis(),
    val expiresAt: Long = System.currentTimeMillis() + (1000 * 60 * 60), // 1 hora por defecto
    val isStale: Boolean = false
) {
    companion object {
        const val PERIOD_DAILY = "daily"
        const val PERIOD_WEEKLY = "weekly"
        const val PERIOD_MONTHLY = "monthly"
        const val PERIOD_QUARTERLY = "quarterly"
        const val PERIOD_YEARLY = "yearly"

        /**
         * Genera un ID único para las métricas
         */
        fun generateId(userId: String, period: String, timestamp: Long): String {
            return "${userId}_${period}_${timestamp}"
        }
    }

    /**
     * Verifica si el caché ha expirado
     */
    fun isExpired(): Boolean = System.currentTimeMillis() > expiresAt || isStale
}
