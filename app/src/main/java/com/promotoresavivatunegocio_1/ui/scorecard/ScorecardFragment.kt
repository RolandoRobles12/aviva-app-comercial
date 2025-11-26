package com.promotoresavivatunegocio_1.ui.scorecard

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.promotoresavivatunegocio_1.R
import java.text.NumberFormat
import java.util.*

/**
 * Fragment para el Scorecard de Incentivos
 * Muestra el desempeño del promotor en 4 categorías: CAC, CALIDAD, NIM, CRECIMIENTO
 */
class ScorecardFragment : Fragment() {

    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore

    // Views del scorecard
    private lateinit var tvUsuarioMes: TextView
    private lateinit var tvPuntajeTotal: TextView
    private lateinit var tvMultiplicador: TextView
    private lateinit var tvGananciaMensual: TextView
    private lateinit var tvMes: TextView

    // Views de CAC
    private lateinit var tvCacDescripcion: TextView
    private lateinit var tvCacMetricas: TextView
    private lateinit var tvCacResultado: TextView
    private lateinit var tvCacCategoria: TextView
    private lateinit var tvCacPuntaje: TextView

    // Views de CALIDAD
    private lateinit var tvCalidadDescripcion: TextView
    private lateinit var tvCalidadMetricas: TextView
    private lateinit var tvCalidadResultado: TextView
    private lateinit var tvCalidadCategoria: TextView
    private lateinit var tvCalidadPuntaje: TextView

    // Views de NIM
    private lateinit var tvNimDescripcion: TextView
    private lateinit var tvNimMetricas: TextView
    private lateinit var tvNimResultado: TextView
    private lateinit var tvNimCategoria: TextView
    private lateinit var tvNimPuntaje: TextView

    // Views de CRECIMIENTO
    private lateinit var tvCrecimientoDescripcion: TextView
    private lateinit var tvCrecimientoMetricas: TextView
    private lateinit var tvCrecimientoResultado: TextView
    private lateinit var tvCrecimientoCategoria: TextView
    private lateinit var tvCrecimientoPuntaje: TextView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_scorecard, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()
        db = FirebaseFirestore.getInstance()

        initializeViews(view)
        loadScorecardData()
    }

    private fun initializeViews(view: View) {
        // Usuario y mes
        tvUsuarioMes = view.findViewById(R.id.tvUsuarioMes)
        tvPuntajeTotal = view.findViewById(R.id.tvPuntajeTotal)
        tvMultiplicador = view.findViewById(R.id.tvMultiplicador)
        tvGananciaMensual = view.findViewById(R.id.tvGananciaMensual)
        tvMes = view.findViewById(R.id.tvMes)

        // CAC
        tvCacDescripcion = view.findViewById(R.id.tvCacDescripcion)
        tvCacMetricas = view.findViewById(R.id.tvCacMetricas)
        tvCacResultado = view.findViewById(R.id.tvCacResultado)
        tvCacCategoria = view.findViewById(R.id.tvCacCategoria)
        tvCacPuntaje = view.findViewById(R.id.tvCacPuntaje)

        // CALIDAD
        tvCalidadDescripcion = view.findViewById(R.id.tvCalidadDescripcion)
        tvCalidadMetricas = view.findViewById(R.id.tvCalidadMetricas)
        tvCalidadResultado = view.findViewById(R.id.tvCalidadResultado)
        tvCalidadCategoria = view.findViewById(R.id.tvCalidadCategoria)
        tvCalidadPuntaje = view.findViewById(R.id.tvCalidadPuntaje)

        // NIM
        tvNimDescripcion = view.findViewById(R.id.tvNimDescripcion)
        tvNimMetricas = view.findViewById(R.id.tvNimMetricas)
        tvNimResultado = view.findViewById(R.id.tvNimResultado)
        tvNimCategoria = view.findViewById(R.id.tvNimCategoria)
        tvNimPuntaje = view.findViewById(R.id.tvNimPuntaje)

        // CRECIMIENTO
        tvCrecimientoDescripcion = view.findViewById(R.id.tvCrecimientoDescripcion)
        tvCrecimientoMetricas = view.findViewById(R.id.tvCrecimientoMetricas)
        tvCrecimientoResultado = view.findViewById(R.id.tvCrecimientoResultado)
        tvCrecimientoCategoria = view.findViewById(R.id.tvCrecimientoCategoria)
        tvCrecimientoPuntaje = view.findViewById(R.id.tvCrecimientoPuntaje)
    }

    private fun loadScorecardData() {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            showDefaultData()
            return
        }

        // En producción, estos datos vendrían de Firestore
        // Por ahora mostramos datos de ejemplo
        // TODO: Implementar carga desde Firestore (colección 'scorecards')

        val userName = currentUser.displayName ?: "Usuario"
        val currentMonth = getCurrentMonth()

        tvUsuarioMes.text = "$userName - MES: $currentMonth"
        tvMes.text = "Mes: $currentMonth"

        // Datos de ejemplo
        loadExampleData()
    }

    private fun loadExampleData() {
        // CAC
        tvCacDescripcion.text = "Descripción: Costo de adquisición de cliente"
        tvCacMetricas.text = "- Colocación: ${formatCurrency(150000)}\n- Llamadas: 60\n- Tasa de cierre: 25%"
        tvCacResultado.text = formatCurrency(2500)
        tvCacCategoria.text = "CAC B"
        tvCacPuntaje.text = "15"

        // CALIDAD
        tvCalidadDescripcion.text = "Descripción: Calidad de las visitas y seguimiento"
        tvCalidadMetricas.text = "- Visitas completadas: 45\n- Seguimientos efectivos: 38\n- Prospectos calificados: 28"
        tvCalidadResultado.text = "84%"
        tvCalidadCategoria.text = "Excelente"
        tvCalidadPuntaje.text = "15"

        // NIM
        tvNimDescripcion.text = "Descripción: Número de interacciones mensuales"
        tvNimMetricas.text = "- Llamadas realizadas: 180\n- Emails enviados: 95\n- Reuniones: 32"
        tvNimResultado.text = "307 interacciones"
        tvNimCategoria.text = "Alto"
        tvNimPuntaje.text = "10"

        // CRECIMIENTO
        tvCrecimientoDescripcion.text = "Descripción: Crecimiento vs mes anterior"
        tvCrecimientoMetricas.text = "- Ventas mes anterior: ${formatCurrency(120000)}\n- Ventas mes actual: ${formatCurrency(150000)}\n- Nuevos clientes: +12"
        tvCrecimientoResultado.text = "+25%"
        tvCrecimientoCategoria.text = "Destacado"
        tvCrecimientoPuntaje.text = "10"

        // Totales
        val puntajeTotal = 15 + 15 + 10 + 10 // CAC + CALIDAD + NIM + CRECIMIENTO
        val multiplicador = 0.5
        val gananciaMensual = (puntajeTotal * multiplicador * 270.72).toInt() // Fórmula de ejemplo

        tvPuntajeTotal.text = puntajeTotal.toString()
        tvMultiplicador.text = "${multiplicador}x"
        tvGananciaMensual.text = formatCurrency(gananciaMensual)
    }

    private fun showDefaultData() {
        tvUsuarioMes.text = "Usuario - MES: ${getCurrentMonth()}"
        tvMes.text = "Mes: ${getCurrentMonth()}"
        loadExampleData()
    }

    private fun getCurrentMonth(): String {
        val calendar = Calendar.getInstance()
        val months = arrayOf(
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        )
        val month = months[calendar.get(Calendar.MONTH)]
        val year = calendar.get(Calendar.YEAR)
        return "$month $year"
    }

    private fun formatCurrency(amount: Int): String {
        val format = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
        return format.format(amount)
    }

    companion object {
        /**
         * Modelo de datos para el scorecard (para implementación futura con Firestore)
         */
        data class ScorecardData(
            val userId: String = "",
            val mes: String = "",

            // CAC
            val cacColocacion: Int = 0,
            val cacLlamadas: Int = 0,
            val cacTasaCierre: Double = 0.0,
            val cacResultado: Int = 0,
            val cacCategoria: String = "",
            val cacPuntaje: Int = 0,

            // CALIDAD
            val calidadVisitas: Int = 0,
            val calidadSeguimientos: Int = 0,
            val calidadProspectos: Int = 0,
            val calidadResultado: Double = 0.0,
            val calidadCategoria: String = "",
            val calidadPuntaje: Int = 0,

            // NIM
            val nimLlamadas: Int = 0,
            val nimEmails: Int = 0,
            val nimReuniones: Int = 0,
            val nimResultado: Int = 0,
            val nimCategoria: String = "",
            val nimPuntaje: Int = 0,

            // CRECIMIENTO
            val crecimientoMesAnterior: Int = 0,
            val crecimientoMesActual: Int = 0,
            val crecimientoNuevosClientes: Int = 0,
            val crecimientoResultado: Double = 0.0,
            val crecimientoCategoria: String = "",
            val crecimientoPuntaje: Int = 0,

            // Totales
            val puntajeTotal: Int = 0,
            val multiplicador: Double = 0.0,
            val gananciaMensual: Int = 0
        )
    }
}
