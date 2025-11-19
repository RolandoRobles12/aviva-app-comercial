package com.promotoresavivatunegocio_1.ui.metrics

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.services.MetricsService
import kotlinx.coroutines.launch
import models.MetricsReport
import models.UserMetrics

/**
 * ViewModel para la gestión de métricas de vendedor
 *
 * Maneja el estado y la lógica de negocio de las métricas
 * Proporciona LiveData para observar cambios en la UI
 */
class MetricsViewModel : ViewModel() {

    private val metricsService = MetricsService()
    private val auth = FirebaseAuth.getInstance()

    // Estados
    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _metricsReport = MutableLiveData<MetricsReport?>()
    val metricsReport: LiveData<MetricsReport?> = _metricsReport

    private val _currentMetrics = MutableLiveData<UserMetrics?>()
    val currentMetrics: LiveData<UserMetrics?> = _currentMetrics

    private val _metricsHistory = MutableLiveData<List<UserMetrics>>()
    val metricsHistory: LiveData<List<UserMetrics>> = _metricsHistory

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _currentPeriod = MutableLiveData<UserMetrics.MetricsPeriod>()
    val currentPeriod: LiveData<UserMetrics.MetricsPeriod> = _currentPeriod

    init {
        _currentPeriod.value = UserMetrics.MetricsPeriod.MENSUAL
    }

    /**
     * Carga las métricas del usuario
     */
    fun loadMetrics() {
        val user = auth.currentUser
        if (user == null) {
            _error.value = "Usuario no autenticado"
            return
        }

        _isLoading.value = true
        _error.value = null

        viewModelScope.launch {
            try {
                // Cargar reporte con comparaciones
                val report = metricsService.generateMetricsReport(user.uid)

                if (report != null) {
                    _metricsReport.value = report
                    _currentMetrics.value = report.currentMetrics
                } else {
                    // Intentar cargar métricas actuales sin comparación
                    val metrics = metricsService.getCurrentUserMetrics(
                        user.uid,
                        _currentPeriod.value ?: UserMetrics.MetricsPeriod.MENSUAL
                    )
                    _currentMetrics.value = metrics

                    if (metrics == null) {
                        _error.value = "No hay métricas disponibles"
                    }
                }

                // Cargar histórico para gráficos
                loadMetricsHistory()

            } catch (e: Exception) {
                _error.value = "Error al cargar métricas: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Carga el histórico de métricas para gráficos
     */
    private fun loadMetricsHistory() {
        val user = auth.currentUser ?: return

        viewModelScope.launch {
            try {
                val history = metricsService.getUserMetricsHistory(
                    userId = user.uid,
                    period = _currentPeriod.value ?: UserMetrics.MetricsPeriod.MENSUAL,
                    limit = 12
                )
                _metricsHistory.value = history
            } catch (e: Exception) {
                // No es crítico si falla el histórico
            }
        }
    }

    /**
     * Cambia el período de visualización
     */
    fun changePeriod(period: UserMetrics.MetricsPeriod) {
        if (_currentPeriod.value != period) {
            _currentPeriod.value = period
            loadMetrics()
        }
    }

    /**
     * Refresca las métricas
     */
    fun refresh() {
        loadMetrics()
    }

    /**
     * Limpia el error
     */
    fun clearError() {
        _error.value = null
    }
}
