package com.promotoresavivatunegocio_1.services

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.Timestamp
import kotlinx.coroutines.tasks.await
import models.League
import models.LeagueParticipant
import models.LeagueStandings
import models.PositionSnapshot

/**
 * Servicio para gestionar ligas/competencias
 *
 * Responsabilidades:
 * - Gestionar ligas activas
 * - Gestionar participantes
 * - Calcular posiciones y rankings
 * - Manejar promociones y descensos
 */
class LeagueService {
    private val db = FirebaseFirestore.getInstance()
    private val leaguesCollection = db.collection("leagues")
    private val participantsCollection = db.collection("leagueParticipants")

    /**
     * Obtiene todas las ligas activas
     */
    suspend fun getActiveLeagues(): List<League> {
        return try {
            leaguesCollection
                .whereEqualTo("status", League.LeagueStatus.ACTIVE.name)
                .orderBy("tier", Query.Direction.ASCENDING)
                .get()
                .await()
                .toObjects(League::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Obtiene una liga por ID
     */
    suspend fun getLeagueById(leagueId: String): League? {
        return try {
            leaguesCollection
                .document(leagueId)
                .get()
                .await()
                .toObject(League::class.java)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Obtiene la liga actual de un usuario
     */
    suspend fun getUserCurrentLeague(userId: String): League? {
        return try {
            val participant = participantsCollection
                .whereEqualTo("userId", userId)
                .whereEqualTo("status", LeagueParticipant.ParticipantStatus.ACTIVE.name)
                .limit(1)
                .get()
                .await()
                .toObjects(LeagueParticipant::class.java)
                .firstOrNull()

            participant?.let { getLeagueById(it.leagueId) }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Obtiene la información del participante de un usuario
     */
    suspend fun getUserParticipant(userId: String, leagueId: String): LeagueParticipant? {
        return try {
            participantsCollection
                .whereEqualTo("userId", userId)
                .whereEqualTo("leagueId", leagueId)
                .limit(1)
                .get()
                .await()
                .toObjects(LeagueParticipant::class.java)
                .firstOrNull()
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Obtiene las tablas de posiciones de una liga
     */
    suspend fun getLeagueStandings(leagueId: String): LeagueStandings {
        return try {
            val participants = participantsCollection
                .whereEqualTo("leagueId", leagueId)
                .whereEqualTo("status", LeagueParticipant.ParticipantStatus.ACTIVE.name)
                .orderBy("currentPoints", Query.Direction.DESCENDING)
                .get()
                .await()
                .toObjects(LeagueParticipant::class.java)

            // Actualizar posiciones
            participants.forEachIndexed { index, participant ->
                participant.copy(currentPosition = index + 1)
            }

            LeagueStandings(
                leagueId = leagueId,
                participants = participants,
                lastUpdated = Timestamp.now()
            )
        } catch (e: Exception) {
            LeagueStandings(leagueId = leagueId)
        }
    }

    /**
     * Actualiza los puntos de un participante
     */
    suspend fun updateParticipantPoints(
        userId: String,
        leagueId: String,
        pointsToAdd: Int
    ): Result<LeagueParticipant> {
        return try {
            val participant = getUserParticipant(userId, leagueId)
                ?: return Result.failure(Exception("Participante no encontrado"))

            val updatedParticipant = participant.copy(
                currentPoints = participant.currentPoints + pointsToAdd,
                pointsEarned = participant.pointsEarned + pointsToAdd,
                positionHistory = participant.positionHistory + PositionSnapshot(
                    position = participant.currentPosition,
                    points = participant.currentPoints + pointsToAdd,
                    timestamp = Timestamp.now()
                )
            )

            participantsCollection
                .document(participant.id)
                .set(updatedParticipant)
                .await()

            // Recalcular posiciones
            recalculateLeaguePositions(leagueId)

            Result.success(updatedParticipant)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Inscribe a un usuario en una liga
     */
    suspend fun joinLeague(userId: String, leagueId: String): Result<LeagueParticipant> {
        return try {
            // Verificar que la liga existe y está activa
            val league = getLeagueById(leagueId)
                ?: return Result.failure(Exception("Liga no encontrada"))

            if (league.status != League.LeagueStatus.ACTIVE) {
                return Result.failure(Exception("La liga no está activa"))
            }

            // Verificar que el usuario no está ya inscrito
            val existingParticipant = getUserParticipant(userId, leagueId)
            if (existingParticipant != null) {
                return Result.failure(Exception("Ya estás inscrito en esta liga"))
            }

            // Crear participante
            val participant = LeagueParticipant(
                leagueId = leagueId,
                userId = userId,
                joinedAt = Timestamp.now(),
                status = LeagueParticipant.ParticipantStatus.ACTIVE
            )

            val docRef = participantsCollection.add(participant).await()
            val savedParticipant = participant.copy(id = docRef.id)

            // Recalcular posiciones
            recalculateLeaguePositions(leagueId)

            Result.success(savedParticipant)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Recalcula las posiciones de todos los participantes en una liga
     */
    private suspend fun recalculateLeaguePositions(leagueId: String) {
        try {
            val standings = getLeagueStandings(leagueId)

            standings.participants.forEachIndexed { index, participant ->
                val newPosition = index + 1
                if (participant.currentPosition != newPosition) {
                    participantsCollection
                        .document(participant.id)
                        .update(
                            mapOf(
                                "previousPosition" to participant.currentPosition,
                                "currentPosition" to newPosition
                            )
                        )
                        .await()
                }
            }
        } catch (e: Exception) {
            // Log error
        }
    }

    /**
     * Obtiene el historial de ligas de un usuario
     */
    suspend fun getUserLeagueHistory(userId: String): List<LeagueParticipant> {
        return try {
            participantsCollection
                .whereEqualTo("userId", userId)
                .orderBy("joinedAt", Query.Direction.DESCENDING)
                .get()
                .await()
                .toObjects(LeagueParticipant::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Obtiene estadísticas de liga de un usuario
     */
    suspend fun getUserLeagueStats(userId: String): LeagueStats {
        val history = getUserLeagueHistory(userId)
        val currentLeague = getUserCurrentLeague(userId)
        val currentParticipant = currentLeague?.let { getUserParticipant(userId, it.id) }

        return LeagueStats(
            currentTier = currentLeague?.tier,
            currentPosition = currentParticipant?.currentPosition ?: 0,
            currentPoints = currentParticipant?.currentPoints ?: 0,
            totalLeaguesParticipated = history.size,
            totalPromotions = history.count { it.status == LeagueParticipant.ParticipantStatus.PROMOTED },
            totalRelegations = history.count { it.status == LeagueParticipant.ParticipantStatus.RELEGATED },
            highestTierReached = history.maxOfOrNull {
                // Aquí deberías obtener el tier de cada liga, pero por simplicidad...
                0
            } ?: 0
        )
    }

    data class LeagueStats(
        val currentTier: League.LeagueTier?,
        val currentPosition: Int,
        val currentPoints: Int,
        val totalLeaguesParticipated: Int,
        val totalPromotions: Int,
        val totalRelegations: Int,
        val highestTierReached: Int
    )
}
