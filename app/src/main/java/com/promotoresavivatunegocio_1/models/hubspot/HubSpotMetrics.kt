package com.promotoresavivatunegocio_1.models.hubspot

import com.google.gson.annotations.SerializedName

/**
 * Modelo principal para todas las métricas de HubSpot
 */
data class HubSpotAnalytics(
    @SerializedName("deals")
    val deals: DealsMetrics,

    @SerializedName("contacts")
    val contacts: ContactsMetrics,

    @SerializedName("pipelines")
    val pipelines: PipelineMetrics,

    @SerializedName("generatedAt")
    val generatedAt: String
)

/**
 * Métricas de Deals (Negocios/Ventas)
 */
data class DealsMetrics(
    @SerializedName("totalDeals")
    val totalDeals: Int = 0,

    @SerializedName("totalAmount")
    val totalAmount: Double = 0.0,

    @SerializedName("avgDealSize")
    val avgDealSize: Double = 0.0,

    @SerializedName("dealsByStage")
    val dealsByStage: Map<String, Int> = emptyMap(),

    @SerializedName("deals")
    val deals: List<Deal> = emptyList()
)

/**
 * Modelo de Deal individual
 */
data class Deal(
    @SerializedName("id")
    val id: String,

    @SerializedName("properties")
    val properties: DealProperties
)

data class DealProperties(
    @SerializedName("dealname")
    val dealName: String?,

    @SerializedName("amount")
    val amount: String?,

    @SerializedName("dealstage")
    val dealStage: String?,

    @SerializedName("closedate")
    val closeDate: String?,

    @SerializedName("createdate")
    val createDate: String?,

    @SerializedName("pipeline")
    val pipeline: String?,

    @SerializedName("hs_priority")
    val priority: String?
)

/**
 * Métricas de Contactos
 */
data class ContactsMetrics(
    @SerializedName("totalContacts")
    val totalContacts: Int = 0,

    @SerializedName("contactsByStage")
    val contactsByStage: Map<String, Int> = emptyMap(),

    @SerializedName("recentContacts")
    val recentContacts: List<Contact> = emptyList()
)

/**
 * Modelo de Contacto individual
 */
data class Contact(
    @SerializedName("id")
    val id: String,

    @SerializedName("properties")
    val properties: ContactProperties
)

data class ContactProperties(
    @SerializedName("firstname")
    val firstName: String?,

    @SerializedName("lastname")
    val lastName: String?,

    @SerializedName("email")
    val email: String?,

    @SerializedName("phone")
    val phone: String?,

    @SerializedName("createdate")
    val createDate: String?,

    @SerializedName("lifecyclestage")
    val lifecycleStage: String?,

    @SerializedName("hs_lead_status")
    val leadStatus: String?
)

/**
 * Métricas de Pipeline
 */
data class PipelineMetrics(
    @SerializedName("pipelines")
    val pipelines: List<Pipeline> = emptyList(),

    @SerializedName("totalPipelines")
    val totalPipelines: Int = 0
)

data class Pipeline(
    @SerializedName("pipelineId")
    val pipelineId: String,

    @SerializedName("pipelineName")
    val pipelineName: String,

    @SerializedName("totalDeals")
    val totalDeals: Int = 0,

    @SerializedName("totalValue")
    val totalValue: Double = 0.0,

    @SerializedName("stages")
    val stages: List<PipelineStage> = emptyList()
)

data class PipelineStage(
    @SerializedName("id")
    val id: String,

    @SerializedName("label")
    val label: String,

    @SerializedName("displayOrder")
    val displayOrder: Int,

    @SerializedName("metadata")
    val metadata: Map<String, Any>? = null
)

/**
 * Response wrapper para las APIs
 */
data class HubSpotApiResponse<T>(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("data")
    val data: T?,

    @SerializedName("error")
    val error: String?,

    @SerializedName("message")
    val message: String?
)

/**
 * Request para sincronizar visitas
 */
data class SyncVisitRequest(
    @SerializedName("visitId")
    val visitId: String
)

/**
 * Response de sincronización de visita
 */
data class SyncVisitResponse(
    @SerializedName("contactId")
    val contactId: String?,

    @SerializedName("dealId")
    val dealId: String
)

/**
 * Request para batch sync
 */
data class BatchSyncRequest(
    @SerializedName("visitIds")
    val visitIds: List<String>
)

/**
 * Response de batch sync
 */
data class BatchSyncResponse(
    @SerializedName("success")
    val success: Int = 0,

    @SerializedName("failed")
    val failed: Int = 0,

    @SerializedName("errors")
    val errors: List<BatchSyncError> = emptyList()
)

data class BatchSyncError(
    @SerializedName("visitId")
    val visitId: String,

    @SerializedName("error")
    val error: String
)

/**
 * Request para filtros de fecha
 */
data class MetricsRequest(
    @SerializedName("startDate")
    val startDate: String? = null,

    @SerializedName("endDate")
    val endDate: String? = null
)

/**
 * Response para /getMyGoals
 */
data class MyGoalsResponse(
    @SerializedName("goals")
    val goals: List<UserGoal> = emptyList(),

    @SerializedName("hubspotOwnerId")
    val hubspotOwnerId: String?,

    @SerializedName("message")
    val message: String? = null
)

data class UserGoal(
    @SerializedName("id")
    val id: String,

    @SerializedName("name")
    val name: String,

    @SerializedName("period")
    val period: String,

    @SerializedName("startDate")
    val startDate: String,

    @SerializedName("endDate")
    val endDate: String,

    @SerializedName("metrics")
    val metrics: GoalMetricsData,

    @SerializedName("onTrack")
    val onTrack: Boolean
)

data class GoalMetricsData(
    @SerializedName("llamadas")
    val llamadas: MetricProgress,

    @SerializedName("colocacion")
    val colocacion: MetricProgress
)

data class MetricProgress(
    @SerializedName("current")
    val current: Int,

    @SerializedName("target")
    val target: Int,

    @SerializedName("percentage")
    val percentage: Int
)

/**
 * Response para /getMyLeagueStats
 */
data class MyLeagueStatsResponse(
    @SerializedName("leagues")
    val leagues: List<LeagueStats> = emptyList(),

    @SerializedName("hubspotOwnerId")
    val hubspotOwnerId: String?,

    @SerializedName("message")
    val message: String? = null
)

data class LeagueStats(
    @SerializedName("leagueId")
    val leagueId: String,

    @SerializedName("leagueName")
    val leagueName: String,

    @SerializedName("icon")
    val icon: String?,

    @SerializedName("color")
    val color: String?,

    @SerializedName("totalMembers")
    val totalMembers: Int,

    @SerializedName("userRank")
    val userRank: Int,

    @SerializedName("userMetrics")
    val userMetrics: LeagueMetrics,

    @SerializedName("leagueAverage")
    val leagueAverage: LeagueMetrics,

    @SerializedName("period")
    val period: PeriodData
)

data class LeagueMetrics(
    @SerializedName("llamadas")
    val llamadas: Int,

    @SerializedName("colocacion")
    val colocacion: Int,

    @SerializedName("tasaCierre")
    val tasaCierre: Double
)

data class PeriodData(
    @SerializedName("startDate")
    val startDate: String,

    @SerializedName("endDate")
    val endDate: String
)
