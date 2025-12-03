package com.promotoresavivatunegocio_1.models

import com.google.firebase.Timestamp
import com.google.gson.annotations.SerializedName

/**
 * Modelo de Meta Comercial
 */
data class Goal(
    @SerializedName("id")
    val id: String = "",

    @SerializedName("name")
    val name: String = "",

    @SerializedName("period")
    val period: GoalPeriod = GoalPeriod.WEEKLY,

    @SerializedName("targetType")
    val targetType: GoalTargetType = GoalTargetType.ALL,

    @SerializedName("targetId")
    val targetId: String? = null,

    @SerializedName("targetName")
    val targetName: String? = null,

    @SerializedName("metrics")
    val metrics: GoalMetrics = GoalMetrics(),

    @SerializedName("startDate")
    val startDate: Timestamp? = null,

    @SerializedName("endDate")
    val endDate: Timestamp? = null,

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
 * Tipo de periodo de meta
 */
enum class GoalPeriod {
    @SerializedName("weekly")
    WEEKLY,

    @SerializedName("monthly")
    MONTHLY
}

/**
 * Tipo de objetivo de meta
 */
enum class GoalTargetType {
    @SerializedName("kiosk")
    KIOSK,

    @SerializedName("seller")
    SELLER,

    @SerializedName("all")
    ALL
}

/**
 * Métricas de una meta
 */
data class GoalMetrics(
    @SerializedName("llamadas")
    val llamadas: Int = 0,

    @SerializedName("colocacion")
    val colocacion: Double = 0.0
)

/**
 * Progreso de una meta
 */
data class GoalProgress(
    @SerializedName("goalId")
    val goalId: String = "",

    @SerializedName("userId")
    val userId: String? = null,

    @SerializedName("userName")
    val userName: String? = null,

    @SerializedName("current")
    val current: GoalMetrics = GoalMetrics(),

    @SerializedName("target")
    val target: GoalMetrics = GoalMetrics(),

    @SerializedName("percentage")
    val percentage: PercentageMetrics = PercentageMetrics(),

    @SerializedName("onTrack")
    val onTrack: Boolean = false,

    @SerializedName("updatedAt")
    val updatedAt: Timestamp? = null
)

/**
 * Porcentajes de cumplimiento
 */
data class PercentageMetrics(
    @SerializedName("llamadas")
    val llamadas: Int = 0,

    @SerializedName("colocacion")
    val colocacion: Int = 0
)
