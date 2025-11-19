package com.promotoresavivatunegocio_1.ui.metrics

import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.databinding.FragmentMetricsBinding
import com.promotoresavivatunegocio_1.services.MetricsService
import kotlinx.coroutines.launch
import models.MetricsReport
import models.UserMetrics
import java.text.NumberFormat
import java.util.Locale

/**
 * Fragmento de Métricas y Reportería
 *
 * Muestra las estadísticas de desempeño del vendedor:
 * - Ventas totales y monto
 * - Prospectos generados y convertidos
 * - Asistencia y horas trabajadas
 * - Tendencias vs período anterior
 * - Ranking y posición
 *
 * LOOKER STUDIO:
 * El botón "Refresh" abre los dashboards de Looker Studio en Chrome Custom Tabs.
 * Para cambiar la URL del dashboard, modifica LOOKER_DASHBOARD_URL abajo.
 */
class MetricsFragment : Fragment() {
    private var _binding: FragmentMetricsBinding? = null
    private val binding get() = _binding!!

    private val auth = FirebaseAuth.getInstance()
    private val metricsService = MetricsService()

    private var currentPeriod = UserMetrics.MetricsPeriod.MENSUAL

    companion object {
        /**
         * URL de tu dashboard de Looker Studio
         * Para obtener la URL:
         * 1. Abre tu dashboard en Looker Studio
         * 2. Copia la URL de la barra de direcciones
         * 3. Pégala aquí
         */
        private const val LOOKER_DASHBOARD_URL = "https://lookerstudio.google.com/u/0/reporting/5f4ab63e-bea9-4726-96f3-078ffd1ff9cb/page/iWhNF"
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentMetricsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupUI()
        loadMetrics()
    }

    private fun setupUI() {
        // Botones de período
        binding.btnDaily.setOnClickListener {
            currentPeriod = UserMetrics.MetricsPeriod.DIARIO
            updatePeriodButtons()
            loadMetrics()
        }

        binding.btnWeekly.setOnClickListener {
            currentPeriod = UserMetrics.MetricsPeriod.SEMANAL
            updatePeriodButtons()
            loadMetrics()
        }

        binding.btnMonthly.setOnClickListener {
            currentPeriod = UserMetrics.MetricsPeriod.MENSUAL
            updatePeriodButtons()
            loadMetrics()
        }

        // Botón Refresh ahora abre Looker Studio
        binding.btnRefresh.setOnClickListener {
            openLookerStudio()
        }

        updatePeriodButtons()
    }

    private fun updatePeriodButtons() {
        binding.btnDaily.isSelected = currentPeriod == UserMetrics.MetricsPeriod.DIARIO
        binding.btnWeekly.isSelected = currentPeriod == UserMetrics.MetricsPeriod.SEMANAL
        binding.btnMonthly.isSelected = currentPeriod == UserMetrics.MetricsPeriod.MENSUAL
    }

    /**
     * Abre el dashboard de Looker Studio en Chrome Custom Tabs
     */
    private fun openLookerStudio() {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            Toast.makeText(context, "Debes iniciar sesión", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            // Configurar colores de Chrome Custom Tabs
            val colorSchemeParams = CustomTabColorSchemeParams.Builder()
                .setToolbarColor(ContextCompat.getColor(requireContext(), R.color.primary))
                .setSecondaryToolbarColor(ContextCompat.getColor(requireContext(), R.color.primary_dark))
                .setNavigationBarColor(ContextCompat.getColor(requireContext(), R.color.primary_dark))
                .build()

            // Crear Custom Tab Intent
            val customTabsIntent = CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(colorSchemeParams)
                .setShowTitle(true)
                .setUrlBarHidingEnabled(true)
                .setStartAnimations(requireContext(), android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                .setExitAnimations(requireContext(), android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                .build()

            // Abrir Looker Studio
            customTabsIntent.launchUrl(requireContext(), Uri.parse(LOOKER_DASHBOARD_URL))

            Toast.makeText(context, "Abriendo Looker Studio...", Toast.LENGTH_SHORT).show()

        } catch (e: Exception) {
            Toast.makeText(
                context,
                "Error al abrir Looker Studio. Asegúrate de tener Chrome instalado.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun loadMetrics() {
        val user = auth.currentUser
        if (user == null) {
            Toast.makeText(context, "Usuario no autenticado", Toast.LENGTH_SHORT).show()
            return
        }

        binding.progressBar.visibility = View.VISIBLE
        binding.scrollContent.visibility = View.GONE

        lifecycleScope.launch {
            try {
                // Generar reporte con comparaciones
                val report = metricsService.generateMetricsReport(user.uid)

                if (report != null) {
                    displayReport(report)
                    binding.scrollContent.visibility = View.VISIBLE
                } else {
                    // Intentar obtener métricas actuales sin comparación
                    val metrics = metricsService.getCurrentUserMetrics(user.uid, currentPeriod)
                    if (metrics != null) {
                        displayMetrics(metrics)
                        binding.scrollContent.visibility = View.VISIBLE
                    } else {
                        showEmptyState()
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(
                    context,
                    "Error al cargar métricas: ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun displayReport(report: MetricsReport) {
        report.currentMetrics?.let { metrics ->
            displayMetrics(metrics)

            // Mostrar tendencias
            displayTrend(binding.tvSalesTrend, report.salesTrend)
            displayTrend(binding.tvProspectsTrend, report.prospectsTrend)
            displayTrend(binding.tvAttendanceTrend, report.attendanceTrend)

            // Mostrar progreso de objetivo
            binding.progressGoal.progress = report.goalCompletionRate.toInt()
            binding.tvGoalProgress.text = "${report.salesAchieved} / ${report.salesGoal}"
            binding.tvGoalPercent.text = "${report.goalCompletionRate.toInt()}%"
        }
    }

    private fun displayMetrics(metrics: UserMetrics) {
        val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "MX"))

        // Ventas
        binding.tvTotalSales.text = metrics.totalSales.toString()
        binding.tvSalesAmount.text = currencyFormat.format(metrics.salesAmount)
        binding.tvAverageTicket.text = currencyFormat.format(metrics.averageTicket)
        binding.tvConversionRate.text = String.format("%.1f%%", metrics.conversionRate)

        // Prospectos
        binding.tvProspectsGenerated.text = metrics.prospectsGenerated.toString()
        binding.tvProspectsContacted.text = metrics.prospectsContacted.toString()
        binding.tvProspectsConverted.text = metrics.prospectsConverted.toString()

        // Asistencia
        binding.tvDaysWorked.text = metrics.daysWorked.toString()
        binding.tvAttendanceRate.text = String.format("%.1f%%", metrics.attendanceRate)
        binding.tvHoursWorked.text = String.format("%.1f h", metrics.totalHoursWorked)

        // Actividad
        binding.tvVisitsCompleted.text = metrics.visitsCompleted.toString()
        binding.tvKiosksVisited.text = metrics.kiosksVisited.toString()
        binding.tvCitiesVisited.text = metrics.citiesVisited.toString()

        // Ranking
        binding.tvRankPosition.text = if (metrics.rankPosition > 0) {
            "#${metrics.rankPosition}"
        } else {
            "N/A"
        }
        binding.tvLeaguePosition.text = if (metrics.leaguePosition > 0) {
            "#${metrics.leaguePosition}"
        } else {
            "N/A"
        }

        // Puntos
        binding.tvTotalPoints.text = metrics.totalPoints.toString()
        binding.tvMonthlyPoints.text = "+${metrics.monthlyPoints}"
    }

    private fun displayTrend(textView: android.widget.TextView, trend: Double) {
        val trendText = if (trend > 0) {
            "↑ +${String.format("%.1f%%", trend)}"
        } else if (trend < 0) {
            "↓ ${String.format("%.1f%%", trend)}"
        } else {
            "→ 0%"
        }

        textView.text = trendText

        // Color basado en la tendencia
        val colorRes = if (trend > 0) {
            android.R.color.holo_green_dark
        } else if (trend < 0) {
            android.R.color.holo_red_dark
        } else {
            android.R.color.darker_gray
        }

        textView.setTextColor(resources.getColor(colorRes, null))
    }

    private fun showEmptyState() {
        binding.scrollContent.visibility = View.GONE
        Toast.makeText(
            context,
            "No hay métricas disponibles para este período",
            Toast.LENGTH_LONG
        ).show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
