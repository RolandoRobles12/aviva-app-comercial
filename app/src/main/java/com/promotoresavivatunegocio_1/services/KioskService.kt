package com.promotoresavivatunegocio_1.services

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.GeoPoint
import kotlinx.coroutines.tasks.await
import models.Kiosk

class KioskService {
    private val db = FirebaseFirestore.getInstance()
    private val kiosksCollection = db.collection("kiosks")

    companion object {
        private const val TAG = "KioskService"
    }

    // CRUD Operations
    suspend fun createKiosk(kiosk: Kiosk, createdBy: String): Result<String> {
        return try {
            val newKiosk = kiosk.copy(
                createdAt = Timestamp.now(),
                updatedAt = Timestamp.now(),
                createdBy = createdBy
            )

            val docRef = kiosksCollection.add(newKiosk).await()
            val kioskId = docRef.id

            // Update document with its own ID
            kiosksCollection.document(kioskId).update("id", kioskId).await()

            Log.d(TAG, "Kiosco creado exitosamente: ${kiosk.name}")
            Result.success(kioskId)
        } catch (e: Exception) {
            Log.e(TAG, "Error al crear kiosco", e)
            Result.failure(e)
        }
    }

    suspend fun updateKiosk(kiosk: Kiosk, updatedBy: String): Result<Boolean> {
        return try {
            val updates = kiosk.copy(
                updatedAt = Timestamp.now()
            )

            kiosksCollection.document(kiosk.id).set(updates).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al actualizar kiosco", e)
            Result.failure(e)
        }
    }

    suspend fun deleteKiosk(kioskId: String): Result<Boolean> {
        return try {
            // Soft delete - mark as inactive
            val updates = mapOf(
                "isActive" to false,
                "updatedAt" to Timestamp.now()
            )
            kiosksCollection.document(kioskId).update(updates).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al eliminar kiosco", e)
            Result.failure(e)
        }
    }

    suspend fun getKioskById(kioskId: String): Kiosk? {
        return try {
            val kioskDoc = kiosksCollection.document(kioskId).get().await()
            if (kioskDoc.exists()) {
                kioskDoc.toObject(Kiosk::class.java)?.copy(id = kioskDoc.id)
            } else null
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener kiosco por ID", e)
            null
        }
    }

    // Query Operations
    suspend fun getAllKiosks(): List<Kiosk> {
        return try {
            val snapshot = kiosksCollection
                .orderBy("name")
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(Kiosk::class.java)?.copy(id = doc.id)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener todos los kioscos", e)
            emptyList()
        }
    }

    suspend fun getActiveKiosks(): List<Kiosk> {
        return try {
            val snapshot = kiosksCollection
                .whereEqualTo("isActive", true)
                .orderBy("name")
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(Kiosk::class.java)?.copy(id = doc.id)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener kioscos activos", e)
            emptyList()
        }
    }

    suspend fun getKiosksByProductType(productType: String): List<Kiosk> {
        return try {
            val kioskProductType = Kiosk.getProductTypeFromString(productType)
            val snapshot = kiosksCollection
                .whereEqualTo("productType", kioskProductType)
                .whereEqualTo("isActive", true)
                .orderBy("name")
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(Kiosk::class.java)?.copy(id = doc.id)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener kioscos por tipo de producto", e)
            emptyList()
        }
    }

    suspend fun getKiosksByState(state: String): List<Kiosk> {
        return try {
            val snapshot = kiosksCollection
                .whereEqualTo("state", state)
                .whereEqualTo("isActive", true)
                .orderBy("name")
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(Kiosk::class.java)?.copy(id = doc.id)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener kioscos por estado", e)
            emptyList()
        }
    }

    suspend fun getKiosksByCity(city: String): List<Kiosk> {
        return try {
            val snapshot = kiosksCollection
                .whereEqualTo("city", city)
                .whereEqualTo("isActive", true)
                .orderBy("name")
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                doc.toObject(Kiosk::class.java)?.copy(id = doc.id)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener kioscos por ciudad", e)
            emptyList()
        }
    }

    suspend fun searchKiosks(query: String): List<Kiosk> {
        return try {
            val allKiosks = getActiveKiosks()
            allKiosks.filter { kiosk ->
                kiosk.name.contains(query, ignoreCase = true) ||
                kiosk.address.contains(query, ignoreCase = true) ||
                kiosk.city.contains(query, ignoreCase = true) ||
                kiosk.state.contains(query, ignoreCase = true) ||
                kiosk.description.contains(query, ignoreCase = true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al buscar kioscos", e)
            emptyList()
        }
    }

    // Location-based Operations
    suspend fun getKiosksNearLocation(
        userLocation: GeoPoint,
        radiusKm: Double = 10.0
    ): List<Kiosk> {
        return try {
            // Get all active kiosks and filter by distance
            val allKiosks = getActiveKiosks()
            allKiosks.filter { kiosk ->
                kiosk.location?.let { kioskLocation ->
                    calculateDistance(
                        userLocation.latitude, userLocation.longitude,
                        kioskLocation.latitude, kioskLocation.longitude
                    ) <= radiusKm
                } ?: false
            }.sortedBy { kiosk ->
                kiosk.location?.let { kioskLocation ->
                    calculateDistance(
                        userLocation.latitude, userLocation.longitude,
                        kioskLocation.latitude, kioskLocation.longitude
                    )
                } ?: Double.MAX_VALUE
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener kioscos cercanos", e)
            emptyList()
        }
    }

    suspend fun validateUserLocation(
        userLocation: GeoPoint,
        kioskId: String
    ): LocationValidationResult {
        return try {
            val kiosk = getKioskById(kioskId)

            if (kiosk == null) {
                return LocationValidationResult(
                    isValid = false,
                    message = "Kiosco no encontrado",
                    distance = null
                )
            }

            if (kiosk.location == null) {
                return LocationValidationResult(
                    isValid = false,
                    message = "Kiosco no tiene ubicación configurada",
                    distance = null
                )
            }

            val distance = calculateDistance(
                userLocation.latitude, userLocation.longitude,
                kiosk.location!!.latitude, kiosk.location!!.longitude
            ) * 1000 // Convert to meters

            val isValid = distance <= kiosk.radiusMeters

            LocationValidationResult(
                isValid = isValid,
                message = if (isValid) {
                    "Ubicación válida (${distance.toInt()}m del kiosco)"
                } else {
                    "Debe estar dentro de ${kiosk.radiusMeters}m del kiosco (actual: ${distance.toInt()}m)"
                },
                distance = distance,
                allowedRadius = kiosk.radiusMeters
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error al validar ubicación", e)
            LocationValidationResult(
                isValid = false,
                message = "Error al validar ubicación: ${e.message}",
                distance = null
            )
        }
    }

    // Bulk Operations
    suspend fun createMultipleKiosks(kiosks: List<Kiosk>, createdBy: String): Result<Int> {
        return try {
            var successCount = 0
            val batch = db.batch()

            kiosks.forEach { kiosk ->
                val newKiosk = kiosk.copy(
                    createdAt = Timestamp.now(),
                    updatedAt = Timestamp.now(),
                    createdBy = createdBy
                )
                val docRef = kiosksCollection.document()
                batch.set(docRef, newKiosk.copy(id = docRef.id))
                successCount++
            }

            batch.commit().await()
            Result.success(successCount)
        } catch (e: Exception) {
            Log.e(TAG, "Error al crear múltiples kioscos", e)
            Result.failure(e)
        }
    }

    suspend fun updateKioskStatus(kioskId: String, isActive: Boolean): Result<Boolean> {
        return try {
            val updates = mapOf(
                "isActive" to isActive,
                "updatedAt" to Timestamp.now()
            )
            kiosksCollection.document(kioskId).update(updates).await()
            Result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error al actualizar estado del kiosco", e)
            Result.failure(e)
        }
    }

    // Statistics and Analytics
    suspend fun getKioskStatistics(): KioskStatistics {
        return try {
            val allKiosks = getAllKiosks()

            KioskStatistics(
                totalKiosks = allKiosks.size,
                activeKiosks = allKiosks.count { it.isActive },
                inactiveKiosks = allKiosks.count { !it.isActive },
                kiosksByProductType = mapOf(
                    "bodega_aurrera" to allKiosks.count { it.productType == Kiosk.ProductType.BODEGA_AURRERA },
                    "aviva_contigo" to allKiosks.count { it.productType == Kiosk.ProductType.AVIVA_CONTIGO },
                    "construrama" to allKiosks.count { it.productType == Kiosk.ProductType.CONSTRURAMA }
                ),
                kiosksByState = allKiosks.groupingBy { it.state }.eachCount(),
                averageCheckInsPerDay = allKiosks.map { it.averageCheckInsPerDay }.average().takeIf { !it.isNaN() } ?: 0.0
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error al obtener estadísticas de kioscos", e)
            KioskStatistics()
        }
    }

    // Utility Methods
    private fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val R = 6371.0 // Earth's radius in kilometers
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    // Validation
    suspend fun validateKiosk(kiosk: Kiosk): List<String> {
        val errors = mutableListOf<String>()

        if (kiosk.name.isBlank()) {
            errors.add("Nombre del kiosco es requerido")
        }

        if (kiosk.address.isBlank()) {
            errors.add("Dirección es requerida")
        }

        if (kiosk.state.isBlank()) {
            errors.add("Estado es requerido")
        } else if (!Kiosk.MEXICAN_STATES.contains(kiosk.state)) {
            errors.add("Estado no es válido")
        }

        if (kiosk.city.isBlank()) {
            errors.add("Ciudad es requerida")
        }

        if (kiosk.radiusMeters < 10 || kiosk.radiusMeters > 1000) {
            errors.add("Radio debe estar entre 10 y 1000 metros")
        }

        // Check for duplicate names
        val existingKiosks = getAllKiosks()
        val duplicateName = existingKiosks.any {
            it.name.equals(kiosk.name, ignoreCase = true) && it.id != kiosk.id
        }
        if (duplicateName) {
            errors.add("Ya existe un kiosco con este nombre")
        }

        return errors
    }

    data class LocationValidationResult(
        val isValid: Boolean,
        val message: String,
        val distance: Double?,
        val allowedRadius: Int = 100
    )

    data class KioskStatistics(
        val totalKiosks: Int = 0,
        val activeKiosks: Int = 0,
        val inactiveKiosks: Int = 0,
        val kiosksByProductType: Map<String, Int> = emptyMap(),
        val kiosksByState: Map<String, Int> = emptyMap(),
        val averageCheckInsPerDay: Double = 0.0
    )
}