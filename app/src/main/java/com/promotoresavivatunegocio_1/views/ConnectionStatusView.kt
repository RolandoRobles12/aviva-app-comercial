package com.promotoresavivatunegocio_1.views

import android.content.Context
import android.util.AttributeSet
import android.view.LayoutInflater
import android.view.View
import android.widget.FrameLayout
import androidx.core.content.ContextCompat
import com.google.android.material.card.MaterialCardView
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.databinding.ViewConnectionStatusBinding
import com.promotoresavivatunegocio_1.utils.ConnectionType
import com.promotoresavivatunegocio_1.utils.NetworkState

/**
 * Vista personalizada para mostrar el estado de conexión y sincronización
 *
 * Uso en XML:
 * ```xml
 * <com.promotoresavivatunegocio_1.views.ConnectionStatusView
 *     android:id="@+id/connectionStatus"
 *     android:layout_width="match_parent"
 *     android:layout_height="wrap_content" />
 * ```
 *
 * Uso en Kotlin:
 * ```kotlin
 * connectionStatus.updateNetworkState(networkState)
 * connectionStatus.updatePendingCount(5)
 * connectionStatus.showSyncing()
 * ```
 */
class ConnectionStatusView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    private val binding: ViewConnectionStatusBinding
    private var onSyncClickListener: (() -> Unit)? = null

    init {
        binding = ViewConnectionStatusBinding.inflate(
            LayoutInflater.from(context),
            this,
            true
        )

        setupListeners()
    }

    private fun setupListeners() {
        binding.btnSyncNow.setOnClickListener {
            onSyncClickListener?.invoke()
        }
    }

    /**
     * Actualiza el estado de conexión
     */
    fun updateNetworkState(state: NetworkState) {
        binding.connectionStatusCard.visibility = View.VISIBLE

        when (state) {
            is NetworkState.Available -> {
                when (state.connectionType) {
                    ConnectionType.WIFI -> {
                        binding.iconConnectionStatus.setImageResource(android.R.drawable.presence_online)
                        binding.iconConnectionStatus.setColorFilter(
                            ContextCompat.getColor(context, android.R.color.holo_green_dark)
                        )
                        binding.txtConnectionStatus.text = "⚡ Online (WiFi)"
                        binding.txtConnectionStatus.setTextColor(
                            ContextCompat.getColor(context, android.R.color.holo_green_dark)
                        )
                    }
                    ConnectionType.CELLULAR -> {
                        binding.iconConnectionStatus.setImageResource(android.R.drawable.presence_online)
                        binding.iconConnectionStatus.setColorFilter(
                            ContextCompat.getColor(context, android.R.color.holo_orange_dark)
                        )
                        binding.txtConnectionStatus.text = "📶 Online (Celular)"
                        binding.txtConnectionStatus.setTextColor(
                            ContextCompat.getColor(context, android.R.color.holo_orange_dark)
                        )
                    }
                    else -> {
                        binding.iconConnectionStatus.setImageResource(android.R.drawable.presence_online)
                        binding.iconConnectionStatus.setColorFilter(
                            ContextCompat.getColor(context, android.R.color.holo_green_dark)
                        )
                        binding.txtConnectionStatus.text = "⚡ Online"
                        binding.txtConnectionStatus.setTextColor(
                            ContextCompat.getColor(context, android.R.color.holo_green_dark)
                        )
                    }
                }

                // Cambiar color de fondo a verde claro
                binding.connectionStatusCard.setCardBackgroundColor(
                    ContextCompat.getColor(context, android.R.color.white)
                )
            }

            NetworkState.Unavailable -> {
                binding.iconConnectionStatus.setImageResource(android.R.drawable.presence_offline)
                binding.iconConnectionStatus.setColorFilter(
                    ContextCompat.getColor(context, android.R.color.holo_red_dark)
                )
                binding.txtConnectionStatus.text = "📵 Sin conexión"
                binding.txtConnectionStatus.setTextColor(
                    ContextCompat.getColor(context, android.R.color.holo_red_dark)
                )

                // Cambiar color de fondo a rojo claro
                binding.connectionStatusCard.setCardBackgroundColor(
                    ContextCompat.getColor(context, android.R.color.holo_red_light)
                )

                // Ocultar botón de sincronización si no hay conexión
                binding.progressSync.visibility = View.GONE
            }
        }
    }

    /**
     * Actualiza el contador de items pendientes
     */
    fun updatePendingCount(count: Int) {
        if (count > 0) {
            binding.txtPendingCount.visibility = View.VISIBLE
            binding.txtPendingCount.text = "$count pendiente${if (count > 1) "s" else ""}"
            binding.btnSyncNow.visibility = View.VISIBLE
        } else {
            binding.txtPendingCount.visibility = View.GONE
            binding.btnSyncNow.visibility = View.GONE
        }
    }

    /**
     * Muestra el indicador de sincronización en progreso
     */
    fun showSyncing() {
        binding.progressSync.visibility = View.VISIBLE
        binding.btnSyncNow.visibility = View.GONE
        binding.txtConnectionStatus.text = "⏳ Sincronizando..."
    }

    /**
     * Oculta el indicador de sincronización
     */
    fun hideSyncing() {
        binding.progressSync.visibility = View.GONE
    }

    /**
     * Oculta la vista completa
     */
    fun hide() {
        binding.connectionStatusCard.visibility = View.GONE
    }

    /**
     * Muestra la vista
     */
    fun show() {
        binding.connectionStatusCard.visibility = View.VISIBLE
    }

    /**
     * Establece el listener para el botón de sincronización
     */
    fun setOnSyncClickListener(listener: () -> Unit) {
        onSyncClickListener = listener
    }

    /**
     * Muestra un mensaje temporal de éxito
     */
    fun showSyncSuccess() {
        binding.txtConnectionStatus.text = "✅ Sincronizado"
        binding.progressSync.visibility = View.GONE

        // Volver al estado normal después de 2 segundos
        postDelayed({
            updatePendingCount(0)
        }, 2000)
    }

    /**
     * Muestra un mensaje temporal de error
     */
    fun showSyncError(message: String = "Error al sincronizar") {
        binding.txtConnectionStatus.text = "❌ $message"
        binding.progressSync.visibility = View.GONE
        binding.txtConnectionStatus.setTextColor(
            ContextCompat.getColor(context, android.R.color.holo_red_dark)
        )

        // Volver al estado normal después de 3 segundos
        postDelayed({
            updateNetworkState(NetworkState.Unavailable)
        }, 3000)
    }
}
