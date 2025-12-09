package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId

/**
 * Sistema de Ligas/Competencias
 *
 * Los vendedores compiten en ligas según su desempeño
 * Las ligas son completamente dinámicas y personalizables desde el admin web
 */
data class League(
    @DocumentId
    val id: String = "",

    // Información de la liga (campos dinámicos)
    val name: String? = null,           // Nombre personalizado de la liga
    val description: String? = null,    // Descripción opcional
    val color: String? = null,          // Color personalizado en formato hex
    val icon: String? = null,           // Icono/emoji personalizado
    val season: Int = 1,

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
    val active: Boolean = true,

    val createdAt: Timestamp = Timestamp.now()
) {
    enum class LeagueStatus {
        PENDING,    // Aún no inicia
        ACTIVE,     // En curso
        FINISHED    // Terminada
    }
}

/**
 * Premio de liga (simplificado para compatibilidad con admin web)
 */
data class LeaguePrize(
    val position: Int = 0,              // Posición (1 = 1er lugar, 2 = 2do lugar, etc.)
    val description: String = "",       // Descripción del premio
    val amount: Int = 0                 // Monto opcional del premio
)

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
