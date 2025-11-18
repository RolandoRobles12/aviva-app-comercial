package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId

/**
 * Sistema de Ligas/Competencias
 *
 * Los vendedores compiten en ligas según su desempeño
 * Para agregar nuevas ligas o modificar el sistema:
 * 1. Agregar nuevas ligas en LeagueTier
 * 2. Ajustar los criterios de promoción/descenso en los servicios
 */
data class League(
    @DocumentId
    val id: String = "",

    // Información de la liga
    val tier: LeagueTier = LeagueTier.BRONCE,
    val season: Int = 1,
    val name: String = "",

    // Período de la temporada
    val startDate: Timestamp = Timestamp.now(),
    val endDate: Timestamp = Timestamp.now(),

    // Configuración de la liga
    val maxParticipants: Int = 50,
    val promotionSpots: Int = 10,      // Top N usuarios ascienden
    val relegationSpots: Int = 10,     // Bottom N usuarios descienden

    // Premios
    val prizes: List<LeaguePrize> = emptyList(),

    // Estado
    val status: LeagueStatus = LeagueStatus.ACTIVE,

    val createdAt: Timestamp = Timestamp.now()
) {
    enum class LeagueTier(
        val displayName: String,
        val colorHex: String,
        val minPoints: Int
    ) {
        BRONCE("Bronce", "#CD7F32", 0),
        PLATA("Plata", "#C0C0C0", 1000),
        ORO("Oro", "#FFD700", 2500),
        PLATINO("Platino", "#E5E4E2", 5000),
        DIAMANTE("Diamante", "#B9F2FF", 10000),
        MASTER("Master", "#FF1744", 20000),
        LEYENDA("Leyenda", "#9C27B0", 50000)
    }

    enum class LeagueStatus {
        PENDING,    // Aún no inicia
        ACTIVE,     // En curso
        FINISHED    // Terminada
    }
}

/**
 * Premio de liga
 */
data class LeaguePrize(
    val position: Int = 0,              // Posición requerida (1 = 1er lugar)
    val positionRange: IntRange? = null, // Rango de posiciones (ej: 2-5)
    val prizeType: PrizeType = PrizeType.PUNTOS,
    val prizeValue: String = "",
    val description: String = ""
) {
    enum class PrizeType {
        PUNTOS,
        DINERO,
        BONO,
        PRODUCTO,
        RECONOCIMIENTO
    }
}

/**
 * Participante en una liga
 */
data class LeagueParticipant(
    @DocumentId
    val id: String = "",

    val leagueId: String = "",
    val userId: String = "",

    // Referencia al usuario
    var user: User? = null,

    // Estadísticas en la liga
    val currentPoints: Int = 0,
    val currentPosition: Int = 0,
    val previousPosition: Int = 0,

    // Rendimiento
    val salesInSeason: Int = 0,
    val pointsEarned: Int = 0,

    // Histórico de posiciones (para gráficas)
    val positionHistory: List<PositionSnapshot> = emptyList(),

    // Estado
    val status: ParticipantStatus = ParticipantStatus.ACTIVE,

    val joinedAt: Timestamp = Timestamp.now()
) {
    enum class ParticipantStatus {
        ACTIVE,
        PROMOTED,
        RELEGATED,
        INACTIVE
    }
}

/**
 * Snapshot de posición en un momento del tiempo
 */
data class PositionSnapshot(
    val position: Int = 0,
    val points: Int = 0,
    val timestamp: Timestamp = Timestamp.now()
)

/**
 * Tabla de posiciones de una liga
 */
data class LeagueStandings(
    val leagueId: String = "",
    val participants: List<LeagueParticipant> = emptyList(),
    val lastUpdated: Timestamp = Timestamp.now()
)
