package com.promotoresavivatunegocio_1.ui.admin

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.promotoresavivatunegocio_1.R
import java.text.NumberFormat
import java.util.*

/**
 * Fragment para mostrar métricas de HubSpot CRM
 * Muestra deals, contactos, pipelines y permite sincronizar visitas
 */
class HubSpotMetricsFragment : Fragment() {

    companion object {
        private const val TAG = "HubSpotMetricsFragment"
    }

    private lateinit var viewModel: HubSpotMetricsViewModel

    // Views - Cards principales
    private lateinit var dealsCard: MaterialCardView
    private lateinit var contactsCard: MaterialCardView
    private lateinit var pipelinesCard: MaterialCardView

    // Views - Deals
    private lateinit var totalDealsText: TextView
    private lateinit var totalAmountText: TextView
    private lateinit var avgDealSizeText: TextView

    // Views - Contactos
    private lateinit var totalContactsText: TextView
    private lateinit var contactsByStageText: TextView

    // Views - Pipelines
    private lateinit var totalPipelinesText: TextView
    private lateinit var pipelinesDetailsText: TextView

    // Views - Control
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var loadingIndicator: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var btnRefresh: MaterialButton
    private lateinit var lastUpdateText: TextView

    // Formatters
    private val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
    private val numberFormat = NumberFormat.getInstance(Locale("es", "MX"))

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_hubspot_metrics, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        initViewModel()
        initViews(view)
        setupObservers()
        setupListeners()

        // Cargar métricas al iniciar
        viewModel.loadMetrics()
    }

    private fun initViewModel() {
        viewModel = ViewModelProvider(this)[HubSpotMetricsViewModel::class.java]
    }

    private fun initViews(view: View) {
        // Cards
        dealsCard = view.findViewById(R.id.dealsCard)
        contactsCard = view.findViewById(R.id.contactsCard)
        pipelinesCard = view.findViewById(R.id.pipelinesCard)

        // Deals
        totalDealsText = view.findViewById(R.id.totalDealsText)
        totalAmountText = view.findViewById(R.id.totalAmountText)
        avgDealSizeText = view.findViewById(R.id.avgDealSizeText)

        // Contactos
        totalContactsText = view.findViewById(R.id.totalContactsText)
        contactsByStageText = view.findViewById(R.id.contactsByStageText)

        // Pipelines
        totalPipelinesText = view.findViewById(R.id.totalPipelinesText)
        pipelinesDetailsText = view.findViewById(R.id.pipelinesDetailsText)

        // Control
        swipeRefresh = view.findViewById(R.id.swipeRefresh)
        loadingIndicator = view.findViewById(R.id.loadingIndicator)
        errorText = view.findViewById(R.id.errorText)
        btnRefresh = view.findViewById(R.id.btnRefresh)
        lastUpdateText = view.findViewById(R.id.lastUpdateText)
    }

    private fun setupObservers() {
        // Observar analytics
        viewModel.analytics.observe(viewLifecycleOwner) { analytics ->
            if (analytics != null) {
                updateUI(analytics)
                errorText.visibility = View.GONE
            }
        }

        // Observar loading
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            loadingIndicator.visibility = if (isLoading) View.VISIBLE else View.GONE
            swipeRefresh.isRefreshing = isLoading
            btnRefresh.isEnabled = !isLoading
        }

        // Observar errores
        viewModel.error.observe(viewLifecycleOwner) { error ->
            if (!error.isNullOrBlank()) {
                errorText.text = error
                errorText.visibility = View.VISIBLE
                Toast.makeText(context, error, Toast.LENGTH_LONG).show()
                Log.e(TAG, "Error: $error")
            } else {
                errorText.visibility = View.GONE
            }
        }

        // Observar mensajes de éxito
        viewModel.successMessage.observe(viewLifecycleOwner) { message ->
            if (!message.isNullOrBlank()) {
                Toast.makeText(context, message, Toast.LENGTH_LONG).show()
                viewModel.clearSuccessMessage()
            }
        }
    }

    private fun setupListeners() {
        // Swipe to refresh
        swipeRefresh.setOnRefreshListener {
            Log.d(TAG, "🔄 Refrescando métricas...")
            viewModel.refreshMetrics()
        }

        // Botón de refresh
        btnRefresh.setOnClickListener {
            Log.d(TAG, "🔄 Botón refresh presionado")
            viewModel.refreshMetrics()
        }
    }

    private fun updateUI(analytics: com.promotoresavivatunegocio_1.models.hubspot.HubSpotAnalytics) {
        Log.d(TAG, "📊 Actualizando UI con métricas de HubSpot")

        // Actualizar deals
        updateDealsUI(analytics.deals)

        // Actualizar contactos
        updateContactsUI(analytics.contacts)

        // Actualizar pipelines
        updatePipelinesUI(analytics.pipelines)

        // Actualizar timestamp
        updateLastUpdateTime()
    }

    private fun updateDealsUI(deals: com.promotoresavivatunegocio_1.models.hubspot.DealsMetrics) {
        totalDealsText.text = numberFormat.format(deals.totalDeals)
        totalAmountText.text = currencyFormat.format(deals.totalAmount)
        avgDealSizeText.text = currencyFormat.format(deals.avgDealSize)

        Log.d(TAG, "💰 Deals - Total: ${deals.totalDeals}, Monto: ${deals.totalAmount}")
    }

    private fun updateContactsUI(contacts: com.promotoresavivatunegocio_1.models.hubspot.ContactsMetrics) {
        totalContactsText.text = numberFormat.format(contacts.totalContacts)

        // Mostrar distribución por stages
        val stagesText = buildString {
            contacts.contactsByStage.entries.forEachIndexed { index, (stage, count) ->
                if (index > 0) append("\n")
                append("• ${formatStageName(stage)}: $count")
            }
        }
        contactsByStageText.text = stagesText.ifEmpty { "Sin datos de stages" }

        Log.d(TAG, "👥 Contactos - Total: ${contacts.totalContacts}")
    }

    private fun updatePipelinesUI(pipelines: com.promotoresavivatunegocio_1.models.hubspot.PipelineMetrics) {
        totalPipelinesText.text = numberFormat.format(pipelines.totalPipelines)

        // Mostrar detalles de cada pipeline
        val pipelinesText = buildString {
            pipelines.pipelines.forEachIndexed { index, pipeline ->
                if (index > 0) append("\n\n")
                append("📊 ${pipeline.pipelineName}\n")
                append("   Deals: ${pipeline.totalDeals}\n")
                append("   Valor: ${currencyFormat.format(pipeline.totalValue)}")
            }
        }
        pipelinesDetailsText.text = pipelinesText.ifEmpty { "Sin pipelines" }

        Log.d(TAG, "📈 Pipelines - Total: ${pipelines.totalPipelines}")
    }

    private fun updateLastUpdateTime() {
        val dateFormat = java.text.SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())
        lastUpdateText.text = "Última actualización: ${dateFormat.format(Date())}"
    }

    private fun formatStageName(stage: String): String {
        return when (stage) {
            "lead" -> "Lead"
            "marketingqualifiedlead" -> "MQL"
            "salesqualifiedlead" -> "SQL"
            "opportunity" -> "Oportunidad"
            "customer" -> "Cliente"
            "evangelist" -> "Evangelista"
            "subscriber" -> "Suscriptor"
            else -> stage.capitalize()
        }
    }
}
