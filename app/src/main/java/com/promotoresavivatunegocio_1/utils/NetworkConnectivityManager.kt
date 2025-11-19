package com.promotoresavivatunegocio_1.utils

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Manager para monitorear el estado de conectividad de red
 *
 * Características:
 * - Detecta cambios de conectividad en tiempo real
 * - Distingue entre WiFi, Celular y sin conexión
 * - Proporciona Flow observable del estado
 * - Compatible con Android 7.0+
 *
 * Uso:
 * ```kotlin
 * val networkManager = NetworkConnectivityManager(context)
 * networkManager.networkState.collect { state ->
 *     when (state) {
 *         is NetworkState.Available -> // Online
 *         is NetworkState.Unavailable -> // Offline
 *     }
 * }
 * ```
 */
class NetworkConnectivityManager(private val context: Context) {

    private val connectivityManager =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private val _networkState = MutableStateFlow<NetworkState>(NetworkState.Unavailable)
    val networkState: StateFlow<NetworkState> = _networkState.asStateFlow()

    private val _isOnline = MutableStateFlow(false)
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()

    private val _connectionType = MutableStateFlow(ConnectionType.NONE)
    val connectionType: StateFlow<ConnectionType> = _connectionType.asStateFlow()

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            super.onAvailable(network)
            updateNetworkState(network)
        }

        override fun onLost(network: Network) {
            super.onLost(network)
            _networkState.value = NetworkState.Unavailable
            _isOnline.value = false
            _connectionType.value = ConnectionType.NONE
        }

        override fun onCapabilitiesChanged(
            network: Network,
            networkCapabilities: NetworkCapabilities
        ) {
            super.onCapabilitiesChanged(network, networkCapabilities)
            updateNetworkState(network, networkCapabilities)
        }
    }

    init {
        registerNetworkCallback()
        // Verificar estado inicial
        checkInitialState()
    }

    /**
     * Registra el callback para monitorear cambios de red
     */
    private fun registerNetworkCallback() {
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            .build()

        connectivityManager.registerNetworkCallback(networkRequest, networkCallback)
    }

    /**
     * Verifica el estado inicial de la conexión
     */
    private fun checkInitialState() {
        val activeNetwork = connectivityManager.activeNetwork
        if (activeNetwork != null) {
            updateNetworkState(activeNetwork)
        } else {
            _networkState.value = NetworkState.Unavailable
            _isOnline.value = false
            _connectionType.value = ConnectionType.NONE
        }
    }

    /**
     * Actualiza el estado de la red
     */
    private fun updateNetworkState(
        network: Network,
        capabilities: NetworkCapabilities? = null
    ) {
        val networkCapabilities = capabilities
            ?: connectivityManager.getNetworkCapabilities(network)

        if (networkCapabilities != null) {
            val isConnected = networkCapabilities.hasCapability(
                NetworkCapabilities.NET_CAPABILITY_INTERNET
            ) && networkCapabilities.hasCapability(
                NetworkCapabilities.NET_CAPABILITY_VALIDATED
            )

            if (isConnected) {
                val type = when {
                    networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ->
                        ConnectionType.WIFI

                    networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ->
                        ConnectionType.CELLULAR

                    networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) ->
                        ConnectionType.ETHERNET

                    else -> ConnectionType.OTHER
                }

                _networkState.value = NetworkState.Available(type)
                _isOnline.value = true
                _connectionType.value = type
            } else {
                _networkState.value = NetworkState.Unavailable
                _isOnline.value = false
                _connectionType.value = ConnectionType.NONE
            }
        } else {
            _networkState.value = NetworkState.Unavailable
            _isOnline.value = false
            _connectionType.value = ConnectionType.NONE
        }
    }

    /**
     * Verifica si hay conexión activa (método síncrono)
     */
    fun isConnected(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false

        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    /**
     * Verifica si está conectado a WiFi
     */
    fun isWiFiConnected(): Boolean {
        return connectionType.value == ConnectionType.WIFI
    }

    /**
     * Verifica si está conectado a datos móviles
     */
    fun isCellularConnected(): Boolean {
        return connectionType.value == ConnectionType.CELLULAR
    }

    /**
     * Limpia los recursos
     */
    fun cleanup() {
        try {
            connectivityManager.unregisterNetworkCallback(networkCallback)
        } catch (e: Exception) {
            // Callback ya no registrado
        }
    }
}

/**
 * Estados posibles de la red
 */
sealed class NetworkState {
    data class Available(val connectionType: ConnectionType) : NetworkState()
    object Unavailable : NetworkState()
}

/**
 * Tipos de conexión
 */
enum class ConnectionType {
    WIFI,
    CELLULAR,
    ETHERNET,
    OTHER,
    NONE
}
