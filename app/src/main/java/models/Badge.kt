package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId

/**
 * Modelo de datos para Insignias/Badges
 *
 * Representa los logros y hitos alcanzados por los vendedores
 *
 * Para agregar nuevas insignias:
 * 1. Crear el documento en Firestore collection "badges"
 * 2. Definir los criterios de desbloqueo en los servicios
 */
data class Badge(
    @DocumentId
    val id: String = "",

    // Información básica de la insignia
    val name: String = "",
    val description: String = "",
    val iconUrl: String = "",

    // Categoría de la insignia
    val category: BadgeCategory = BadgeCategory.VENTAS,

    // Nivel de dificultad/rareza
    val rarity: BadgeRarity = BadgeRarity.BRONCE,

    // Criterios para obtener la insignia
    val requirement: String = "",
    val requiredValue: Int = 0,

    // Puntos que otorga al obtenerla
    val points: Int = 0,

    // Orden para mostrar (menor número = mayor prioridad)
    val displayOrder: Int = 0,

    // Fecha de creación
    val createdAt: Timestamp = Timestamp.now(),

    // Estado activo/inactivo
    val isActive: Boolean = true
) {
    enum class BadgeCategory(val displayName: String) {
        VENTAS("Ventas"),
        ASISTENCIA("Asistencia"),
        CAPACITACION("Capacitación"),
        LIDERAZGO("Liderazgo"),
        ESPECIAL("Especial")
    }

    enum class BadgeRarity(val displayName: String, val colorHex: String) {
        BRONCE("Bronce", "#CD7F32"),
        PLATA("Plata", "#C0C0C0"),
        ORO("Oro", "#FFD700"),
        PLATINO("Platino", "#E5E4E2"),
        DIAMANTE("Diamante", "#B9F2FF")
    }
}

/**
 * Insignia obtenida por un usuario
 */
data class UserBadge(
    @DocumentId
    val id: String = "",

    val userId: String = "",
    val badgeId: String = "",

    // Referencia a la insignia completa
    var badge: Badge? = null,

    // Fecha en que se obtuvo
    val unlockedAt: Timestamp = Timestamp.now(),

    // Valor alcanzado al momento de desbloquear
    val achievedValue: Int = 0,

    // Notas adicionales
    val notes: String = ""
)
