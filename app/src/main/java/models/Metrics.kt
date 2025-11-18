package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId

/**
 * Métricas de desempeño de un vendedor
 *
 * Almacena las estadísticas y KPIs del vendedor
 * Para agregar nuevas métricas, simplemente agregar campos aquí
 */
data class UserMetrics(
    @DocumentId
    val id: String = "",

    val userId: String = "",

    // Período de las métricas
    val period: MetricsPeriod = MetricsPeriod.MENSUAL,
    val year: Int = 0,
    val month: Int = 0,
    val week: Int = 0,

    // Métricas de ventas
    val totalSales: Int = 0,
    val salesAmount: Double = 0.0,
    val averageTicket: Double = 0.0,
    val conversionRate: Double = 0.0,

    // Métricas de prospección
    val prospectsGenerated: Int = 0,
    val prospectsContacted: Int = 0,
    val prospectsConverted: Int = 0,

    // Métricas de asistencia
    val daysWorked: Int = 0,
    val attendanceRate: Double = 0.0,
    val totalHoursWorked: Double = 0.0,

    // Métricas de actividad
    val visitsCompleted: Int = 0,
    val kiosksVisited: Int = 0,
    val citiesVisited: Int = 0,

    // Métricas de capacitación
    val trainingsCompleted: Int = 0,
    val certificationsObtained: Int = 0,

    // Posición en rankings
    val rankPosition: Int = 0,
    val leaguePosition: Int = 0,

    // Puntos acumulados
    val totalPoints: Int = 0,
    val monthlyPoints: Int = 0,

    // Fecha de última actualización
    val lastUpdated: Timestamp = Timestamp.now()
) {
    enum class MetricsPeriod {
        DIARIO,
        SEMANAL,
        MENSUAL,
        TRIMESTRAL,
        ANUAL
    }
}

/**
 * Reporte detallado de métricas
 */
data class MetricsReport(
    @DocumentId
    val id: String = "",

    val userId: String = "",
    val generatedAt: Timestamp = Timestamp.now(),

    // Métricas actuales
    val currentMetrics: UserMetrics? = null,

    // Comparación con período anterior
    val previousMetrics: UserMetrics? = null,

    // Tendencias (positivo = mejora, negativo = declive)
    val salesTrend: Double = 0.0,
    val prospectsTrend: Double = 0.0,
    val attendanceTrend: Double = 0.0,

    // Top productos vendidos
    val topProducts: List<String> = emptyList(),

    // Top ciudades trabajadas
    val topCities: List<String> = emptyList(),

    // Objetivos vs Alcanzado
    val salesGoal: Int = 0,
    val salesAchieved: Int = 0,
    val goalCompletionRate: Double = 0.0
)
