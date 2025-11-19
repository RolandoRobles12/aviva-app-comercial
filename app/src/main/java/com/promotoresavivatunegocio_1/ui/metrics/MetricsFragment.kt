package com.promotoresavivatunegocio_1.ui.metrics

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.Toast
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.github.mikephil.charting.animation.Easing
import com.github.mikephil.charting.charts.BarChart
import com.github.mikephil.charting.charts.LineChart
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.*
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter
import com.github.mikephil.charting.formatter.ValueFormatter
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.databinding.FragmentMetricsBinding
import models.MetricsReport
import models.UserMetrics
import java.text.NumberFormat
import java.util.Locale

/**
 * Fragmento de Métricas - Versión Moderna
 *
 * Dashboard completo de métricas del vendedor con:
 * - Gráficos interactivos de tendencias
 * - Visualización moderna de KPIs
 * - Pull-to-refresh
 * - Animaciones fluidas
 * - Integración con Looker Studio
 */
class MetricsFragment : Fragment() {

    private var _binding: FragmentMetricsBinding? = null
    private val binding get() = _binding!!

    private val viewModel: MetricsViewModel by viewModels()

    private val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "MX"))

    companion object {
        private const val LOOKER_DASHBOARD_URL =
            "https://lookerstudio.google.com/u/0/reporting/5f4ab63e-bea9-4726-96f3-078ffd1ff9cb/page/iWhNF"
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
        setupObservers()

        // Cargar métricas iniciales
        viewModel.loadMetrics()
    }

    private fun setupUI() {
        // Configurar pull-to-refresh
        binding.swipeRefresh?.setOnRefreshListener {
            viewModel.refresh()
        }

        // Configurar botones de período
        binding.btnDaily.setOnClickListener {
            viewModel.changePeriod(UserMetrics.MetricsPeriod.DIARIO)
            updatePeriodButtons(UserMetrics.MetricsPeriod.DIARIO)
        }

        binding.btnWeekly.setOnClickListener {
            viewModel.changePeriod(UserMetrics.MetricsPeriod.SEMANAL)
            updatePeriodButtons(UserMetrics.MetricsPeriod.SEMANAL)
        }

        binding.btnMonthly.setOnClickListener {
            viewModel.changePeriod(UserMetrics.MetricsPeriod.MENSUAL)
            updatePeriodButtons(UserMetrics.MetricsPeriod.MENSUAL)
        }

        // Botón Dashboard (Looker Studio)
        binding.btnRefresh.setOnClickListener {
            openLookerStudio()
        }

        // Inicializar botón mensual como seleccionado
        updatePeriodButtons(UserMetrics.MetricsPeriod.MENSUAL)

        // Configurar charts
        setupCharts()
    }

    private fun setupObservers() {
        // Observar estado de carga
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.swipeRefresh?.isRefreshing = isLoading
            binding.loadingOverlay?.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        // Observar reporte de métricas
        viewModel.metricsReport.observe(viewLifecycleOwner) { report ->
            report?.let {
                displayReport(it)
                animateViews()
            }
        }

        // Observar métricas actuales (fallback si no hay reporte)
        viewModel.currentMetrics.observe(viewLifecycleOwner) { metrics ->
            metrics?.let {
                if (viewModel.metricsReport.value == null) {
                    displayMetrics(it)
                    animateViews()
                }
            }
        }

        // Observar histórico para gráficos
        viewModel.metricsHistory.observe(viewLifecycleOwner) { history ->
            if (history.isNotEmpty()) {
                updateSalesChart(history)
            }
        }

        // Observar errores
        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Toast.makeText(context, it, Toast.LENGTH_LONG).show()
                viewModel.clearError()
            }
        }
    }

    private fun setupCharts() {
        // Configurar Line Chart (Ventas)
        binding.salesChart?.apply {
            description.isEnabled = false
            setTouchEnabled(true)
            setDrawGridBackground(false)
            setPinchZoom(false)
            setScaleEnabled(false)
            legend.isEnabled = false

            // Eje X
            xAxis.apply {
                position = XAxis.XAxisPosition.BOTTOM
                setDrawGridLines(false)
                textColor = ContextCompat.getColor(requireContext(), R.color.gray)
                textSize = 10f
            }

            // Eje Y izquierdo
            axisLeft.apply {
                setDrawGridLines(true)
                gridColor = ContextCompat.getColor(requireContext(), R.color.divider)
                textColor = ContextCompat.getColor(requireContext(), R.color.gray)
                textSize = 10f
            }

            // Eje Y derecho (deshabilitado)
            axisRight.isEnabled = false
        }

        // Configurar Bar Chart (Prospectos)
        binding.prospectsChart?.apply {
            description.isEnabled = false
            setTouchEnabled(false)
            setDrawGridBackground(false)
            setPinchZoom(false)
            setScaleEnabled(false)
            legend.isEnabled = false

            // Eje X
            xAxis.apply {
                position = XAxis.XAxisPosition.BOTTOM
                setDrawGridLines(false)
                textColor = ContextCompat.getColor(requireContext(), R.color.gray)
                textSize = 10f
                valueFormatter = IndexAxisValueFormatter(arrayOf("Generados", "Contactados", "Convertidos"))
            }

            // Eje Y izquierdo
            axisLeft.apply {
                setDrawGridLines(true)
                gridColor = ContextCompat.getColor(requireContext(), R.color.divider)
                textColor = ContextCompat.getColor(requireContext(), R.color.gray)
                textSize = 10f
                axisMinimum = 0f
            }

            // Eje Y derecho (deshabilitado)
            axisRight.isEnabled = false
        }
    }

    private fun updatePeriodButtons(period: UserMetrics.MetricsPeriod) {
        binding.btnDaily.isSelected = period == UserMetrics.MetricsPeriod.DIARIO
        binding.btnWeekly.isSelected = period == UserMetrics.MetricsPeriod.SEMANAL
        binding.btnMonthly.isSelected = period == UserMetrics.MetricsPeriod.MENSUAL
    }

    private fun displayReport(report: MetricsReport) {
        report.currentMetrics?.let { metrics ->
            displayMetrics(metrics)

            // Mostrar tendencias
            displayTrend(binding.tvSalesTrend, report.salesTrend)
            displayTrend(binding.tvProspectsTrend, report.prospectsTrend)
            displayTrend(binding.tvAttendanceTrend, report.attendanceTrend)

            // Mostrar progreso de objetivo
            animateProgress(binding.progressGoal, report.goalCompletionRate.toInt())
            binding.tvGoalProgress.text = "${report.salesAchieved} de ${report.salesGoal} ventas"
            binding.tvGoalPercent.text = "${report.goalCompletionRate.toInt()}%"

            // Actualizar gráfico de prospectos
            updateProspectsChart(
                metrics.prospectsGenerated,
                metrics.prospectsContacted,
                metrics.prospectsConverted
            )
        }
    }

    private fun displayMetrics(metrics: UserMetrics) {
        // Ventas
        binding.tvTotalSales.text = metrics.totalSales.toString()
        binding.tvSalesAmount.text = currencyFormat.format(metrics.salesAmount)
        binding.tvAverageTicket.text = "Prom: ${currencyFormat.format(metrics.averageTicket)}"
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
        val trendText = when {
            trend > 0 -> "↑ +${String.format("%.1f%%", trend)}"
            trend < 0 -> "↓ ${String.format("%.1f%%", trend)}"
            else -> "→ 0%"
        }

        textView.text = trendText

        // Color basado en la tendencia
        val colorRes = when {
            trend > 0 -> android.R.color.holo_green_dark
            trend < 0 -> android.R.color.holo_red_dark
            else -> android.R.color.darker_gray
        }

        textView.setTextColor(resources.getColor(colorRes, null))
    }

    private fun updateSalesChart(history: List<UserMetrics>) {
        val entries = mutableListOf<Entry>()
        val labels = mutableListOf<String>()

        // Ordenar por mes (más reciente a más antiguo)
        val sortedHistory = history.sortedBy { it.year * 100 + it.month }

        sortedHistory.forEachIndexed { index, metrics ->
            entries.add(Entry(index.toFloat(), metrics.totalSales.toFloat()))
            labels.add("${metrics.month}/${metrics.year % 100}")
        }

        val dataSet = LineDataSet(entries, "Ventas").apply {
            color = ContextCompat.getColor(requireContext(), R.color.primary)
            lineWidth = 3f
            setCircleColor(ContextCompat.getColor(requireContext(), R.color.primary))
            circleRadius = 5f
            setDrawCircleHole(true)
            circleHoleRadius = 3f
            setDrawValues(true)
            valueTextSize = 10f
            valueTextColor = ContextCompat.getColor(requireContext(), R.color.primary_text)
            mode = LineDataSet.Mode.CUBIC_BEZIER
            setDrawFilled(true)
            fillColor = ContextCompat.getColor(requireContext(), R.color.primary)
            fillAlpha = 30
        }

        binding.salesChart?.apply {
            data = LineData(dataSet)
            xAxis.valueFormatter = IndexAxisValueFormatter(labels)
            xAxis.granularity = 1f
            animateX(1000, Easing.EaseInOutQuad)
            invalidate()
        }
    }

    private fun updateProspectsChart(generated: Int, contacted: Int, converted: Int) {
        val entries = listOf(
            BarEntry(0f, generated.toFloat()),
            BarEntry(1f, contacted.toFloat()),
            BarEntry(2f, converted.toFloat())
        )

        val colors = listOf(
            ContextCompat.getColor(requireContext(), R.color.primary),
            ContextCompat.getColor(requireContext(), R.color.primary_dark),
            ContextCompat.getColor(requireContext(), R.color.secondary)
        )

        val dataSet = BarDataSet(entries, "Prospectos").apply {
            setColors(colors)
            valueTextSize = 12f
            valueTextColor = ContextCompat.getColor(requireContext(), R.color.primary_text)
        }

        binding.prospectsChart?.apply {
            data = BarData(dataSet)
            xAxis.granularity = 1f
            animateY(1000, Easing.EaseInOutQuad)
            invalidate()
        }
    }

    private fun animateProgress(progressBar: android.widget.ProgressBar, targetProgress: Int) {
        val animator = ValueAnimator.ofInt(0, targetProgress)
        animator.duration = 1500
        animator.interpolator = AccelerateDecelerateInterpolator()
        animator.addUpdateListener { animation ->
            progressBar.progress = animation.animatedValue as Int
        }
        animator.start()
    }

    private fun animateViews() {
        // Animar cards principales con fade in
        val views = listOfNotNull(
            binding.cardSalesChart,
            binding.cardProspectsChart
        )

        views.forEachIndexed { index, view ->
            view?.alpha = 0f
            view?.translationY = 50f
            view?.animate()
                ?.alpha(1f)
                ?.translationY(0f)
                ?.setDuration(500)
                ?.setStartDelay((index * 100).toLong())
                ?.setInterpolator(AccelerateDecelerateInterpolator())
                ?.start()
        }
    }

    private fun openLookerStudio() {
        try {
            val colorSchemeParams = CustomTabColorSchemeParams.Builder()
                .setToolbarColor(ContextCompat.getColor(requireContext(), R.color.primary))
                .setSecondaryToolbarColor(ContextCompat.getColor(requireContext(), R.color.primary_dark))
                .setNavigationBarColor(ContextCompat.getColor(requireContext(), R.color.primary_dark))
                .build()

            val customTabsIntent = CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(colorSchemeParams)
                .setShowTitle(true)
                .setUrlBarHidingEnabled(true)
                .setStartAnimations(requireContext(), android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                .setExitAnimations(requireContext(), android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                .build()

            customTabsIntent.launchUrl(requireContext(), Uri.parse(LOOKER_DASHBOARD_URL))

            Toast.makeText(context, "Abriendo Dashboard...", Toast.LENGTH_SHORT).show()

        } catch (e: Exception) {
            Toast.makeText(
                context,
                "Error al abrir Dashboard. Asegúrate de tener Chrome instalado.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
