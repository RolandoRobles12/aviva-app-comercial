package com.promotoresavivatunegocio_1.services

import com.promotoresavivatunegocio_1.models.hubspot.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

/**
 * Interface Retrofit para comunicarse con Firebase Cloud Functions
 * Endpoints para integración con HubSpot
 */
interface HubSpotApiService {

    /**
     * Obtiene todas las métricas de HubSpot (deals, contacts, pipelines)
     */
    @POST("getHubSpotMetrics")
    suspend fun getHubSpotMetrics(
        @Header("Authorization") authToken: String,
        @Body request: MetricsRequest = MetricsRequest()
    ): Response<HubSpotApiResponse<HubSpotAnalytics>>

    /**
     * Obtiene métricas específicas de deals
     */
    @POST("getDealsMetrics")
    suspend fun getDealsMetrics(
        @Header("Authorization") authToken: String,
        @Body request: MetricsRequest = MetricsRequest()
    ): Response<HubSpotApiResponse<DealsMetrics>>

    /**
     * Obtiene métricas específicas de contactos
     */
    @POST("getContactsMetrics")
    suspend fun getContactsMetrics(
        @Header("Authorization") authToken: String,
        @Body request: MetricsRequest = MetricsRequest()
    ): Response<HubSpotApiResponse<ContactsMetrics>>

    /**
     * Obtiene métricas del pipeline
     */
    @POST("getPipelineMetrics")
    suspend fun getPipelineMetrics(
        @Header("Authorization") authToken: String
    ): Response<HubSpotApiResponse<PipelineMetrics>>

    /**
     * Sincroniza una visita individual con HubSpot
     */
    @POST("syncVisitToHubSpot")
    suspend fun syncVisitToHubSpot(
        @Header("Authorization") authToken: String,
        @Body request: SyncVisitRequest
    ): Response<HubSpotApiResponse<SyncVisitResponse>>

    /**
     * Sincroniza múltiples visitas en batch
     */
    @POST("batchSyncVisits")
    suspend fun batchSyncVisits(
        @Header("Authorization") authToken: String,
        @Body request: BatchSyncRequest
    ): Response<HubSpotApiResponse<BatchSyncResponse>>
}
