package com.promotoresavivatunegocio_1.ui.admin

import android.util.Log
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.promotoresavivatunegocio_1.models.hubspot.HubSpotAnalytics
import com.promotoresavivatunegocio_1.services.HubSpotRepository
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class HubSpotMetricsViewModel : ViewModel() {

    companion object {
        private const val TAG = "HubSpotMetricsViewModel"
    }

    private val hubSpotRepository = HubSpotRepository()

    // LiveData para métricas
    private val _analytics = MutableLiveData<HubSpotAnalytics?>()
    val analytics: LiveData<HubSpotAnalytics?> = _analytics

    // LiveData para estado de carga
    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    // LiveData para errores
    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    // LiveData para mensajes de éxito
    private val _successMessage = MutableLiveData<String?>()
    val successMessage: LiveData<String?> = _successMessage

    /**
     * Carga las métricas de HubSpot
     */
    fun loadMetrics(startDate: Date? = null, endDate: Date? = null) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                _error.value = null

                Log.d(TAG, "📊 Cargando métricas de HubSpot...")

                // Formatear fechas si se proporcionan
                val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val startDateStr = startDate?.let { dateFormat.format(it) }
                val endDateStr = endDate?.let { dateFormat.format(it) }

                val result = hubSpotRepository.getHubSpotMetrics(startDateStr, endDateStr)

                result.onSuccess { data ->
                    _analytics.value = data
                    Log.d(TAG, "✅ Métricas cargadas exitosamente")
                    Log.d(TAG, "   - Total Deals: ${data.deals.totalDeals}")
                    Log.d(TAG, "   - Total Contactos: ${data.contacts.totalContacts}")
                    Log.d(TAG, "   - Pipelines: ${data.pipelines.totalPipelines}")
                }

                result.onFailure { exception ->
                    val errorMsg = "Error al cargar métricas: ${exception.message}"
                    _error.value = errorMsg
                    Log.e(TAG, "❌ $errorMsg", exception)
                }

            } catch (e: Exception) {
                val errorMsg = "Error inesperado: ${e.message}"
                _error.value = errorMsg
                Log.e(TAG, "❌ $errorMsg", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Sincroniza una visita individual con HubSpot
     */
    fun syncVisit(visitId: String) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                _error.value = null

                Log.d(TAG, "🔄 Sincronizando visita $visitId...")

                val result = hubSpotRepository.syncVisitToHubSpot(visitId)

                result.onSuccess { syncResponse ->
                    _successMessage.value = "✅ Visita sincronizada con HubSpot\nDeal ID: ${syncResponse.dealId}"
                    Log.d(TAG, "✅ Visita sincronizada - Deal ID: ${syncResponse.dealId}")

                    // Recargar métricas
                    loadMetrics()
                }

                result.onFailure { exception ->
                    val errorMsg = "Error al sincronizar visita: ${exception.message}"
                    _error.value = errorMsg
                    Log.e(TAG, "❌ $errorMsg", exception)
                }

            } catch (e: Exception) {
                val errorMsg = "Error inesperado: ${e.message}"
                _error.value = errorMsg
                Log.e(TAG, "❌ $errorMsg", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Sincroniza múltiples visitas en batch
     */
    fun batchSyncVisits(visitIds: List<String>) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                _error.value = null

                Log.d(TAG, "🔄 Sincronizando ${visitIds.size} visitas en batch...")

                val result = hubSpotRepository.batchSyncVisits(visitIds)

                result.onSuccess { batchResponse ->
                    _successMessage.value = "✅ Sincronización completada\n" +
                            "Exitosas: ${batchResponse.success}\n" +
                            "Fallidas: ${batchResponse.failed}"

                    Log.d(TAG, "✅ Batch sync completado - Success: ${batchResponse.success}, Failed: ${batchResponse.failed}")

                    if (batchResponse.errors.isNotEmpty()) {
                        Log.w(TAG, "⚠️ Errores en batch sync:")
                        batchResponse.errors.forEach { error ->
                            Log.w(TAG, "   - ${error.visitId}: ${error.error}")
                        }
                    }

                    // Recargar métricas
                    loadMetrics()
                }

                result.onFailure { exception ->
                    val errorMsg = "Error en sincronización batch: ${exception.message}"
                    _error.value = errorMsg
                    Log.e(TAG, "❌ $errorMsg", exception)
                }

            } catch (e: Exception) {
                val errorMsg = "Error inesperado: ${e.message}"
                _error.value = errorMsg
                Log.e(TAG, "❌ $errorMsg", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Limpia el mensaje de error
     */
    fun clearError() {
        _error.value = null
    }

    /**
     * Limpia el mensaje de éxito
     */
    fun clearSuccessMessage() {
        _successMessage.value = null
    }

    /**
     * Refresca las métricas (para pull-to-refresh)
     */
    fun refreshMetrics() {
        loadMetrics()
    }
}
