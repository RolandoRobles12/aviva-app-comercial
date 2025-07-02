package com.promotoresavivatunegocio_1.services

import android.content.Context
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.Timestamp
import com.promotoresavivatunegocio_1.models.ProspectoAviva
import com.promotoresavivatunegocio_1.models.ProspectoGuardado
import com.promotoresavivatunegocio_1.models.EstadisticasProspectos
import kotlinx.coroutines.tasks.await
import kotlin.math.*

class ProspectosManager(private val context: Context) {

    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    // Guardar prospectos detectados
    suspend fun guardarProspectosDetectados(prospectos: List<ProspectoAviva>) {
        val userId = auth.currentUser?.uid ?: return
        val batch = db.batch()

        prospectos.forEach { prospecto ->
            val prospectoGuardado = ProspectoGuardado(
                id = generarIdProspecto(prospecto),
                nombre = prospecto.nombre,
                giro = prospecto.giro,
                direccion = prospecto.direccion,
                telefono = prospecto.telefono,
                latitud = prospecto.latitud,
                longitud = prospecto.longitud,
                probabilidad = prospecto.probabilidad,
                razonProbabilidad = prospecto.razonProbabilidad,
                montoMinimoCentavos = prospecto.montoMinimoCentavos.toString(),
                montoMaximoCentavos = prospecto.montoMaximoCentavos.toString(),
                usuarioId = userId,
                estado = "detectado"
            )

            val docRef = db.collection("prospectos_detectados").document(prospectoGuardado.id)
            batch.set(docRef, prospectoGuardado)
        }

        try {
            batch.commit()
            Log.d("ProspectosManager", "Guardados ${prospectos.size} prospectos")
        } catch (e: Exception) {
            Log.e("ProspectosManager", "Error guardando prospectos: ${e.message}")
        }
    }

    // Obtener prospectos pendientes de visitar
    suspend fun obtenerProspectosPendientes(): List<ProspectoGuardado> {
        val userId = auth.currentUser?.uid ?: return emptyList()

        return try {
            val result = db.collection("prospectos_detectados")
                .whereEqualTo("usuarioId", userId)
                .whereEqualTo("estado", "detectado")
                .orderBy("fechaDeteccion", Query.Direction.DESCENDING)
                .get()
                .await()

            result.documents.mapNotNull { doc ->
                doc.toObject(ProspectoGuardado::class.java)
            }
        } catch (e: Exception) {
            Log.e("ProspectosManager", "Error obteniendo prospectos: ${e.message}")
            emptyList()
        }
    }

    // Marcar prospecto como visitado y asociar visita
    suspend fun marcarProspectoComoVisitado(prospectoId: String, visitaId: String) {
        try {
            db.collection("prospectos_detectados")
                .document(prospectoId)
                .update(
                    mapOf(
                        "estado" to "visitado",
                        "visitaId" to visitaId
                    )
                )
        } catch (e: Exception) {
            Log.e("ProspectosManager", "Error marcando prospecto como visitado: ${e.message}")
        }
    }

    // Buscar prospecto por proximidad a una visita
    suspend fun buscarProspectosCercanos(
        latitud: Double,
        longitud: Double,
        radioMetros: Double = 50.0
    ): List<ProspectoGuardado> {
        val userId = auth.currentUser?.uid ?: return emptyList()

        return try {
            val result = db.collection("prospectos_detectados")
                .whereEqualTo("usuarioId", userId)
                .whereEqualTo("estado", "detectado")
                .get()
                .await()

            result.documents.mapNotNull { doc ->
                doc.toObject(ProspectoGuardado::class.java)
            }.filter { prospecto ->
                val distancia = calcularDistancia(
                    latitud, longitud,
                    prospecto.latitud, prospecto.longitud
                )
                distancia <= radioMetros
            }
        } catch (e: Exception) {
            Log.e("ProspectosManager", "Error buscando prospectos cercanos: ${e.message}")
            emptyList()
        }
    }

    // Obtener estadísticas de prospectos
    suspend fun obtenerEstadisticasProspectos(): EstadisticasProspectos {
        val userId = auth.currentUser?.uid ?: return EstadisticasProspectos()

        return try {
            val result = db.collection("prospectos_detectados")
                .whereEqualTo("usuarioId", userId)
                .get()
                .await()

            val prospectos = result.documents.mapNotNull { doc ->
                doc.toObject(ProspectoGuardado::class.java)
            }

            EstadisticasProspectos(
                totalDetectados = prospectos.size,
                pendientes = prospectos.count { it.estado == "detectado" },
                visitados = prospectos.count { it.estado == "visitado" },
                descartados = prospectos.count { it.estado == "descartado" }
            )
        } catch (e: Exception) {
            Log.e("ProspectosManager", "Error obteniendo estadísticas: ${e.message}")
            EstadisticasProspectos()
        }
    }

    // Funciones auxiliares
    private fun generarIdProspecto(prospecto: ProspectoAviva): String {
        return "${prospecto.nombre}_${prospecto.latitud}_${prospecto.longitud}".hashCode().toString()
    }

    private fun calcularDistancia(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val radioTierra = 6371000.0 // metros
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return radioTierra * c
    }
}