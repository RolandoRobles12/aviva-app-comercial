package com.promotoresavivatunegocio_1.services

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.gson.GsonBuilder
import com.promotoresavivatunegocio_1.models.hubspot.*
import kotlinx.coroutines.tasks.await
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Repository para manejar las comunicaciones con Firebase Functions y HubSpot
 */
class HubSpotRepository {

    companion object {
        private const val TAG = "HubSpotRepository"

        // ⚠️ IMPORTANTE: Reemplaza con la URL de tu proyecto Firebase
        // Formato: https://REGION-PROJECT_ID.cloudfunctions.net/
        // Ejemplo: https://us-central1-aviva-app-comercial.cloudfunctions.net/
        private const val FUNCTIONS_BASE_URL = "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/"
    }

    private val auth = FirebaseAuth.getInstance()
    private val apiService: HubSpotApiService

    init {
        // Configurar logging
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        // Cliente HTTP con timeout
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        // Gson configurado
        val gson = GsonBuilder()
            .setLenient()
            .create()

        // Retrofit
        val retrofit = Retrofit.Builder()
            .baseUrl(FUNCTIONS_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()

        apiService = retrofit.create(HubSpotApiService::class.java)
    }

    /**
     * Obtiene el token de autenticación del usuario actual
     */
    private suspend fun getAuthToken(): String {
        val currentUser = auth.currentUser
            ?: throw Exception("Usuario no autenticado")

        val token = currentUser.getIdToken(false).await()
        return "Bearer ${token.token}"
    }

    /**
     * Obtiene todas las métricas de HubSpot
     */
    suspend fun getHubSpotMetrics(startDate: String? = null, endDate: String? = null): Result<HubSpotAnalytics> {
        return try {
            Log.d(TAG, "Obteniendo métricas de HubSpot...")

            val authToken = getAuthToken()
            val request = MetricsRequest(startDate, endDate)

            val response = apiService.getHubSpotMetrics(authToken, request)

            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == true && body.data != null) {
                    Log.d(TAG, "✅ Métricas obtenidas exitosamente")
                    Result.success(body.data)
                } else {
                    val errorMsg = body?.error ?: "Error desconocido"
                    Log.e(TAG, "❌ Error en respuesta: $errorMsg")
                    Result.failure(Exception(errorMsg))
                }
            } else {
                val errorMsg = "Error HTTP ${response.code()}: ${response.message()}"
                Log.e(TAG, "❌ $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Excepción obteniendo métricas", e)
            Result.failure(e)
        }
    }

    /**
     * Obtiene métricas de deals
     */
    suspend fun getDealsMetrics(startDate: String? = null, endDate: String? = null): Result<DealsMetrics> {
        return try {
            Log.d(TAG, "Obteniendo métricas de deals...")

            val authToken = getAuthToken()
            val request = MetricsRequest(startDate, endDate)

            val response = apiService.getDealsMetrics(authToken, request)

            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == true && body.data != null) {
                    Log.d(TAG, "✅ Métricas de deals obtenidas: ${body.data.totalDeals} deals")
                    Result.success(body.data)
                } else {
                    val errorMsg = body?.error ?: "Error desconocido"
                    Result.failure(Exception(errorMsg))
                }
            } else {
                Result.failure(Exception("Error HTTP ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error obteniendo métricas de deals", e)
            Result.failure(e)
        }
    }

    /**
     * Obtiene métricas de contactos
     */
    suspend fun getContactsMetrics(startDate: String? = null, endDate: String? = null): Result<ContactsMetrics> {
        return try {
            Log.d(TAG, "Obteniendo métricas de contactos...")

            val authToken = getAuthToken()
            val request = MetricsRequest(startDate, endDate)

            val response = apiService.getContactsMetrics(authToken, request)

            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == true && body.data != null) {
                    Log.d(TAG, "✅ Métricas de contactos obtenidas: ${body.data.totalContacts} contactos")
                    Result.success(body.data)
                } else {
                    Result.failure(Exception(body?.error ?: "Error desconocido"))
                }
            } else {
                Result.failure(Exception("Error HTTP ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error obteniendo métricas de contactos", e)
            Result.failure(e)
        }
    }

    /**
     * Obtiene métricas del pipeline
     */
    suspend fun getPipelineMetrics(): Result<PipelineMetrics> {
        return try {
            Log.d(TAG, "Obteniendo métricas de pipeline...")

            val authToken = getAuthToken()
            val response = apiService.getPipelineMetrics(authToken)

            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == true && body.data != null) {
                    Log.d(TAG, "✅ Métricas de pipeline obtenidas: ${body.data.totalPipelines} pipelines")
                    Result.success(body.data)
                } else {
                    Result.failure(Exception(body?.error ?: "Error desconocido"))
                }
            } else {
                Result.failure(Exception("Error HTTP ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error obteniendo métricas de pipeline", e)
            Result.failure(e)
        }
    }

    /**
     * Sincroniza una visita individual con HubSpot
     */
    suspend fun syncVisitToHubSpot(visitId: String): Result<SyncVisitResponse> {
        return try {
            Log.d(TAG, "Sincronizando visita $visitId con HubSpot...")

            val authToken = getAuthToken()
            val request = SyncVisitRequest(visitId)

            val response = apiService.syncVisitToHubSpot(authToken, request)

            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == true && body.data != null) {
                    Log.d(TAG, "✅ Visita sincronizada - Deal ID: ${body.data.dealId}")
                    Result.success(body.data)
                } else {
                    Result.failure(Exception(body?.error ?: "Error desconocido"))
                }
            } else {
                Result.failure(Exception("Error HTTP ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error sincronizando visita", e)
            Result.failure(e)
        }
    }

    /**
     * Sincroniza múltiples visitas en batch
     */
    suspend fun batchSyncVisits(visitIds: List<String>): Result<BatchSyncResponse> {
        return try {
            Log.d(TAG, "Sincronizando ${visitIds.size} visitas en batch...")

            val authToken = getAuthToken()
            val request = BatchSyncRequest(visitIds)

            val response = apiService.batchSyncVisits(authToken, request)

            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == true && body.data != null) {
                    Log.d(TAG, "✅ Batch sync completado - Success: ${body.data.success}, Failed: ${body.data.failed}")
                    Result.success(body.data)
                } else {
                    Result.failure(Exception(body?.error ?: "Error desconocido"))
                }
            } else {
                Result.failure(Exception("Error HTTP ${response.code()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error en batch sync", e)
            Result.failure(e)
        }
    }
}
