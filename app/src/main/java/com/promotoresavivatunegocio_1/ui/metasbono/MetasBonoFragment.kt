package com.promotoresavivatunegocio_1.ui.metasbono

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.card.MaterialCardView
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.models.hubspot.UserGoal
import com.promotoresavivatunegocio_1.services.HubSpotRepository
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale

class MetasBonoFragment : Fragment() {

    companion object {
        private const val TAG = "MetasBonoFragment"
    }

    private lateinit var hubSpotRepository: HubSpotRepository

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? = inflater.inflate(R.layout.fragment_metas_bono, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        hubSpotRepository = HubSpotRepository()
        loadGoals(view)
    }

    private fun loadGoals(view: View) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val result = hubSpotRepository.getMyGoals()
                if (!isAdded) return@launch

                result.onSuccess { response ->
                    val goal = response.goals.firstOrNull()
                    if (goal != null) {
                        showGoal(view, goal)
                    } else {
                        showNoGoals(view, response.message)
                    }
                }.onFailure { error ->
                    Log.e(TAG, "Error cargando metas", error)
                    if (isAdded) showNoGoals(view, "No se pudieron cargar las metas")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Excepción cargando metas", e)
                if (isAdded) showNoGoals(view, "Error de conexión")
            }
        }
    }

    private fun showGoal(view: View, goal: UserGoal) {
        val llamadas   = goal.metrics.llamadas
        val colocacion = goal.metrics.colocacion

        // Periodo
        val period = formatPeriod(goal.startDate, goal.endDate)
        view.findViewById<TextView>(R.id.tvMetasPeriod).text = period

        // Llamadas
        val llamadasPct = llamadas.percentage.coerceIn(0, 100)
        view.findViewById<TextView>(R.id.tvLlamadasPct).apply {
            text = "${llamadas.percentage}%"
            setTextColor(colorForPct(llamadas.percentage))
        }
        view.findViewById<ProgressBar>(R.id.progressLlamadas).apply {
            progress = llamadasPct
            progressTintList = ContextCompat.getColorStateList(requireContext(), colorResForPct(llamadas.percentage))
        }
        view.findViewById<TextView>(R.id.tvLlamadasValor).text =
            "${llamadas.current} de ${llamadas.target} llamadas"

        // Colocación
        val colocacionPct = colocacion.percentage.coerceIn(0, 100)
        view.findViewById<TextView>(R.id.tvColocacionPct).apply {
            text = "${colocacion.percentage}%"
            setTextColor(colorForPct(colocacion.percentage))
        }
        view.findViewById<ProgressBar>(R.id.progressColocacion).apply {
            progress = colocacionPct
            progressTintList = ContextCompat.getColorStateList(requireContext(), colorResForPct(colocacion.percentage))
        }
        view.findViewById<TextView>(R.id.tvColocacionValor).text =
            "\$${formatMoney(colocacion.current)} de \$${formatMoney(colocacion.target)}"

        // Banner de estado
        val avgPct = (llamadas.percentage + colocacion.percentage) / 2
        val (estadoText, estadoBgRes) = when {
            avgPct >= 100 -> Pair("¡Meta cumplida!", R.color.primary_dark)
            avgPct >= 75  -> Pair("Vas por buen camino", R.color.aviva_green)
            avgPct >= 50  -> Pair("A la mitad del camino", R.color.warning_color)
            else          -> Pair("Aún hay tiempo, sigue adelante", R.color.warning_color)
        }
        view.findViewById<TextView>(R.id.tvEstado).text = estadoText
        view.findViewById<MaterialCardView>(R.id.cardEstado)
            .setCardBackgroundColor(ContextCompat.getColor(requireContext(), estadoBgRes))
        view.findViewById<TextView>(R.id.tvEstado)
            .setTextColor(ContextCompat.getColor(requireContext(), android.R.color.white))
    }

    private fun showNoGoals(view: View, message: String?) {
        view.findViewById<TextView>(R.id.tvMetasPeriod).text = ""
        view.findViewById<MaterialCardView>(R.id.cardEstado).visibility = View.GONE
        view.findViewById<MaterialCardView>(R.id.cardNoGoals).visibility = View.VISIBLE
        if (!message.isNullOrBlank()) {
            view.findViewById<TextView>(R.id.tvNoGoals).text = message
        }
    }

    private fun colorForPct(pct: Int): Int {
        val res = colorResForPct(pct)
        return ContextCompat.getColor(requireContext(), res)
    }

    private fun colorResForPct(pct: Int): Int = when {
        pct >= 100 -> R.color.primary_dark
        pct >= 75  -> R.color.aviva_green
        pct >= 50  -> R.color.warning_color
        else       -> R.color.error_color
    }

    private fun formatPeriod(start: String, end: String): String {
        return try {
            val inFmt  = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val outFmt = SimpleDateFormat("d 'de' MMM", Locale("es", "MX"))
            val s = inFmt.parse(start.take(10))
            val e = inFmt.parse(end.take(10))
            if (s != null && e != null) "${outFmt.format(s)} al ${outFmt.format(e)}"
            else "$start – $end"
        } catch (_: Exception) {
            "$start – $end"
        }
    }

    private fun formatMoney(amount: Int): String = String.format("%,d", amount)
}
