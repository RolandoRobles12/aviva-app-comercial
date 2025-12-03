package com.promotoresavivatunegocio_1.models

import com.google.firebase.Timestamp
import com.google.gson.annotations.SerializedName

/**
 * Modelo de Liga
 */
data class League(
    @SerializedName("id")
    val id: String = "",

    @SerializedName("name")
    val name: String = "",

    @SerializedName("description")
    val description: String? = null,

    @SerializedName("color")
    val color: String? = null,

    @SerializedName("icon")
    val icon: String? = null,

    @SerializedName("members")
    val members: List<String> = emptyList(),

    @SerializedName("active")
    val active: Boolean = false,

    @SerializedName("createdAt")
    val createdAt: Timestamp? = null,

    @SerializedName("updatedAt")
    val updatedAt: Timestamp? = null,

    @SerializedName("createdBy")
    val createdBy: String = ""
)

/**
 * Estadísticas de benchmarking de una liga
 */
data class LeagueBenchmark(
    @SerializedName("userId")
    val userId: String = "",

    @SerializedName("userName")
    val userName: String = "",

    @SerializedName("leagueId")
    val leagueId: String = "",

    @SerializedName("leagueName")
    val leagueName: String = "",

    @SerializedName("userMetrics")
    val userMetrics: BenchmarkMetrics = BenchmarkMetrics(),

    @SerializedName("leagueAverage")
    val leagueAverage: BenchmarkMetrics = BenchmarkMetrics(),

    @SerializedName("comparison")
    val comparison: ComparisonMetrics = ComparisonMetrics(),

    @SerializedName("rank")
    val rank: Int = 0,

    @SerializedName("totalMembers")
    val totalMembers: Int = 0,

    @SerializedName("updatedAt")
    val updatedAt: Timestamp? = null
)

/**
 * Métricas de benchmarking
 */
data class BenchmarkMetrics(
    @SerializedName("llamadas")
    val llamadas: Int = 0,

    @SerializedName("colocacion")
    val colocacion: Double = 0.0,

    @SerializedName("tasaCierre")
    val tasaCierre: Double = 0.0
)

/**
 * Comparación de métricas (% de diferencia)
 */
data class ComparisonMetrics(
    @SerializedName("llamadas")
    val llamadas: Double = 0.0,

    @SerializedName("colocacion")
    val colocacion: Double = 0.0,

    @SerializedName("tasaCierre")
    val tasaCierre: Double = 0.0
)

/**
 * Top performer de una liga
 */
data class LeagueTopPerformer(
    @SerializedName("userId")
    val userId: String = "",

    @SerializedName("userName")
    val userName: String = "",

    @SerializedName("metrics")
    val metrics: BenchmarkMetrics = BenchmarkMetrics(),

    @SerializedName("rank")
    val rank: Int = 0,

    @SerializedName("points")
    val points: Int = 0
)
