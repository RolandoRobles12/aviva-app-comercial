package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId

/**
 * Plan de Carrera
 *
 * Define los niveles y progresión de carrera de los vendedores
 * Para agregar nuevos niveles o modificar requisitos:
 * 1. Agregar nivel en CareerLevel
 * 2. Definir requisitos en CareerLevelRequirements
 */
data class CareerPath(
    @DocumentId
    val id: String = "",

    val name: String = "",
    val description: String = "",

    // Niveles de carrera ordenados
    val levels: List<CareerLevel> = emptyList(),

    // Configuración
    val isActive: Boolean = true,
    val createdAt: Timestamp = Timestamp.now()
)

/**
 * Nivel de carrera
 */
data class CareerLevel(
    val level: Int = 0,
    val name: String = "",
    val description: String = "",
    val iconUrl: String = "",

    // Requisitos para alcanzar este nivel
    val requirements: CareerLevelRequirements = CareerLevelRequirements(),

    // Beneficios al alcanzar este nivel
    val benefits: List<CareerBenefit> = emptyList(),

    // Salario/Compensación base
    val baseSalary: Double = 0.0,
    val commissionRate: Double = 0.0,

    // Color para UI
    val colorHex: String = "#6200EE",

    val displayOrder: Int = 0
) {
    companion object {
        // Niveles predefinidos (pueden ser editados)
        val PROMOTOR_JUNIOR = 1
        val PROMOTOR = 2
        val PROMOTOR_SENIOR = 3
        val SUPERVISOR = 4
        val COORDINADOR = 5
        val GERENTE = 6
        val DIRECTOR = 7
    }
}

/**
 * Requisitos para alcanzar un nivel de carrera
 */
data class CareerLevelRequirements(
    // Ventas
    val minSalesTotal: Int = 0,
    val minSalesMonthly: Int = 0,
    val minSalesAmount: Double = 0.0,

    // Experiencia
    val minMonthsExperience: Int = 0,
    val minDaysWorked: Int = 0,

    // Desempeño
    val minAverageAttendance: Double = 0.0,
    val minConversionRate: Double = 0.0,

    // Capacitación
    val requiredCertifications: List<String> = emptyList(),
    val minTrainingsCompleted: Int = 0,

    // Ligas
    val minLeagueTier: String = "",

    // Puntos
    val minTotalPoints: Int = 0,

    // Insignias requeridas
    val requiredBadges: List<String> = emptyList()
)

/**
 * Beneficio de un nivel de carrera
 */
data class CareerBenefit(
    val type: BenefitType = BenefitType.OTRO,
    val title: String = "",
    val description: String = "",
    val value: String = ""
) {
    enum class BenefitType {
        SALARIO,
        COMISION,
        BONO,
        PRESTACION,
        CAPACITACION,
        RECONOCIMIENTO,
        OTRO
    }
}

/**
 * Progreso de carrera de un usuario
 */
data class UserCareerProgress(
    @DocumentId
    val id: String = "",

    val userId: String = "",

    // Nivel actual
    val currentLevel: Int = 1,
    val currentLevelName: String = "",

    // Fecha en que alcanzó el nivel actual
    val levelAchievedAt: Timestamp = Timestamp.now(),

    // Progreso hacia el siguiente nivel (0-100%)
    val progressToNextLevel: Double = 0.0,

    // Requisitos completados vs totales
    val requirementsCompleted: Int = 0,
    val requirementsTótal: Int = 0,

    // Histórico de niveles alcanzados
    val levelHistory: List<LevelAchievement> = emptyList(),

    // Siguiente nivel
    var nextLevel: CareerLevel? = null,

    // Nivel actual completo
    var currentLevelDetails: CareerLevel? = null,

    val lastUpdated: Timestamp = Timestamp.now()
)

/**
 * Logro de nivel de carrera
 */
data class LevelAchievement(
    val level: Int = 0,
    val levelName: String = "",
    val achievedAt: Timestamp = Timestamp.now(),
    val notes: String = ""
)
