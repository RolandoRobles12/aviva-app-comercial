package com.promotoresavivatunegocio_1.ui.metasbono

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android:view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.R

/**
 * Fragment para "Metas & Bono - Front"
 * Muestra 3 módulos principales:
 * 1. Alcance de metas semanales (con proyección de bono)
 * 2. Benchmarking (comparación con grupo)
 * 3. Ligas y Premios
 */
class MetasBonoFragment : Fragment() {

    private lateinit var auth: FirebaseAuth

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_metas_bono, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()

        // Cargar datos de ejemplo (en producción vendrían de un ViewModel o API)
        loadModulo1Data(view)
        loadModulo2Data(view)
        loadModulo3Data(view)
    }

    /**
     * Módulo 1: Alcance de metas semanales
     */
    private fun loadModulo1Data(view: View) {
        // Datos de ejemplo - en producción vendrían del backend
        val llamadasRealizadas = 45
        val llamadasMeta = 60
        val llamadasPorcentaje = ((llamadasRealizadas.toFloat() / llamadasMeta) * 100).toInt()

        val colocacionRealizada = 125000
        val colocacionMeta = 150000
        val colocacionPorcentaje = ((colocacionRealizada.toFloat() / colocacionMeta) * 100).toInt()

        // Actualizar UI
        view.findViewById<TextView>(R.id.tvLlamadasValor).text = "$llamadasRealizadas / $llamadasMeta"
        view.findViewById<TextView>(R.id.tvLlamadasPorcentaje).text = "$llamadasPorcentaje%"
        view.findViewById<ProgressBar>(R.id.progressLlamadas).progress = llamadasPorcentaje

        view.findViewById<TextView>(R.id.tvColocacionValor).text =
            "$${formatMoney(colocacionRealizada)} / $${formatMoney(colocacionMeta)}"
        view.findViewById<TextView>(R.id.tvColocacionPorcentaje).text = "$colocacionPorcentaje%"
        view.findViewById<ProgressBar>(R.id.progressColocacion).progress = colocacionPorcentaje

        // Proyecciones de bono
        val bonoActual = 2500
        val colocacionB = 150000
        val bonoB = 3500
        val colocacionA = 175000
        val bonoA = 5000

        val faltanteB = colocacionB - colocacionRealizada
        val faltanteA = colocacionA - colocacionRealizada

        view.findViewById<TextView>(R.id.tvProyeccionActual).text =
            "• A esta velocidad llegas a $${formatMoney(colocacionRealizada)} de colocación y estás en bono CAC = C ($${formatMoney(bonoActual)})"

        view.findViewById<TextView>(R.id.tvProyeccionB).text =
            "• Si colocas $${formatMoney(faltanteB)} más, te llevas $${formatMoney(bonoB)} en bono (CAC = B)"

        view.findViewById<TextView>(R.id.tvProyeccionA).text =
            "• Si colocas $${formatMoney(faltanteA)} más, te llevas $${formatMoney(bonoA)} en bono (CAC = A)"
    }

    /**
     * Módulo 2: Benchmarking
     */
    private fun loadModulo2Data(view: View) {
        // Datos de ejemplo - comparación con grupo
        val tuLlamadas = 180
        val grupoLlamadas = 165
        val diffLlamadas = ((tuLlamadas - grupoLlamadas).toFloat() / grupoLlamadas * 100).toInt()

        val tuColocacion = 450000
        val grupoColocacion = 420000
        val diffColocacion = ((tuColocacion - grupoColocacion).toFloat() / grupoColocacion * 100).toInt()

        val tuCierre = 28
        val grupoCierre = 25
        val diffCierre = ((tuCierre - grupoCierre).toFloat() / grupoCierre * 100).toInt()

        // Llamadas
        view.findViewById<TextView>(R.id.tvBenchLlamadasTu).text = tuLlamadas.toString()
        view.findViewById<TextView>(R.id.tvBenchLlamadasGrupo).text = grupoLlamadas.toString()
        view.findViewById<TextView>(R.id.tvBenchLlamadasDiff).apply {
            text = if (diffLlamadas >= 0) "↑ $diffLlamadas%" else "↓ ${-diffLlamadas}%"
            setTextColor(if (diffLlamadas >= 0)
                resources.getColor(R.color.success_color, null)
                else resources.getColor(R.color.error_color, null))
        }

        // Colocación
        view.findViewById<TextView>(R.id.tvBenchColocacionTu).text = "$${formatMoneyShort(tuColocacion)}"
        view.findViewById<TextView>(R.id.tvBenchColocacionGrupo).text = "$${formatMoneyShort(grupoColocacion)}"
        view.findViewById<TextView>(R.id.tvBenchColocacionDiff).apply {
            text = if (diffColocacion >= 0) "↑ $diffColocacion%" else "↓ ${-diffColocacion}%"
            setTextColor(if (diffColocacion >= 0)
                resources.getColor(R.color.success_color, null)
                else resources.getColor(R.color.error_color, null))
        }

        // Tasa de cierre
        view.findViewById<TextView>(R.id.tvBenchCierreTu).text = "$tuCierre%"
        view.findViewById<TextView>(R.id.tvBenchCierreGrupo).text = "$grupoCierre%"
        view.findViewById<TextView>(R.id.tvBenchCierreDiff).apply {
            text = if (diffCierre >= 0) "↑ $diffCierre%" else "↓ ${-diffCierre}%"
            setTextColor(if (diffCierre >= 0)
                resources.getColor(R.color.success_color, null)
                else resources.getColor(R.color.error_color, null))
        }
    }

    /**
     * Módulo 3: Ligas y Premios
     */
    private fun loadModulo3Data(view: View) {
        // Datos de ejemplo para el ranking
        val currentUser = auth.currentUser
        val displayName = currentUser?.displayName ?: "TÚ"

        view.findViewById<TextView>(R.id.tvNombreUsuario).text = displayName
        view.findViewById<TextView>(R.id.tvPuntosUsuario).text = "1,120 pts"

        // Los datos del ranking (Juan Pérez, María García) están hardcoded en el XML
        // En producción, estos vendrían de una RecyclerView con datos del backend
    }

    /**
     * Formatea un número a formato de dinero con comas
     * Ejemplo: 125000 -> "125,000"
     */
    private fun formatMoney(amount: Int): String {
        return String.format("%,d", amount)
    }

    /**
     * Formatea un número a formato corto con K
     * Ejemplo: 450000 -> "450K"
     */
    private fun formatMoneyShort(amount: Int): String {
        return when {
            amount >= 1000000 -> String.format("%.1fM", amount / 1000000.0)
            amount >= 1000 -> "${amount / 1000}K"
            else -> amount.toString()
        }
    }
}
