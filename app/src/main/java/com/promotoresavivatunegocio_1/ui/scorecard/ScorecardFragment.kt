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
 * Muestra el desempeño del promotor en formato de tabla con 4 métricas:
 * CAC, CALIDAD, NIM, CRECIMIENTO
 *
 * Diseñado para tablets en orientación horizontal
 */
class ScorecardFragment : Fragment() {

    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore

    // Views del encabezado
    private lateinit var tvNombreUsuario: TextView
    private lateinit var tvMultiplicador: TextView
    private lateinit var tvGananciaMensual: TextView
    private lateinit var tvMes: TextView

    // Views de la tabla
    private lateinit var tvPuntajeTotal: TextView

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
        // Encabezado
        tvNombreUsuario = view.findViewById(R.id.tvNombreUsuario)
        tvMultiplicador = view.findViewById(R.id.tvMultiplicador)
        tvGananciaMensual = view.findViewById(R.id.tvGananciaMensual)
        tvMes = view.findViewById(R.id.tvMes)
        tvPuntajeTotal = view.findViewById(R.id.tvPuntajeTotal)

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
        // Por ahora mostramos los datos exactos de la especificación
        // TODO: Implementar carga desde Firestore (colección 'scorecards')

        val userName = currentUser.displayName ?: "USUARIO"
        val currentMonth = "Octubre 2025"

        tvNombreUsuario.text = userName.uppercase()
        tvMes.text = "MES: $currentMonth"

        // Datos exactos de la especificación
        loadExampleData()
    }

    private fun loadExampleData() {
        // CAC - Datos exactos de la especificación
        tvCacDescripcion.text = "Costo Operativo / Venta Mensual"
        tvCacMetricas.text = "$68,520/\n$553,000"
        tvCacResultado.text = "12.4%"
        tvCacCategoria.text = "B"
        tvCacPuntaje.text = "25"

        // CALIDAD - Datos exactos de la especificación
        tvCalidadDescripcion.text = "Calificación entre los clientes que hacen sus primeros pagos y los clientes que no pagan."
        tvCalidadMetricas.text = "Pagos completados: 73%\nPrimeros pagos no hechos: 7.6%"
        tvCalidadResultado.text = "8.0"
        tvCalidadCategoria.text = "B"
        tvCalidadPuntaje.text = "15"

        // NIM - Datos exactos de la especificación
        tvNimDescripcion.text = "Pagos hechos por los clientes menos el costo de fondeo y las pérdidas de crédito."
        tvNimMetricas.text = "Ingresos: $382,111\nPérdidas: $143,041\nFondeo: $70,766"
        tvNimResultado.text = "44%"
        tvNimCategoria.text = "B"
        tvNimPuntaje.text = "5"

        // CRECIMIENTO - Datos exactos de la especificación
        tvCrecimientoDescripcion.text = "Crecimiento del portafolio contra el mes anterior."
        tvCrecimientoMetricas.text = "Portafolio Sep: 4.5M\nPortafolio Oct: 4.9M"
        tvCrecimientoResultado.text = "9.0%"
        tvCrecimientoCategoria.text = "2"
        tvCrecimientoPuntaje.text = "5"

        // Totales - Datos exactos de la especificación
        tvPuntajeTotal.text = "50"
        tvMultiplicador.text = "0.5X"
        tvGananciaMensual.text = "$6,768"
    }

    private fun showDefaultData() {
        tvNombreUsuario.text = "[NOMBRE_DEL_USUARIO]"
        tvMes.text = "MES: Octubre 2025"
        loadExampleData()
    }

    companion object {
        /**
         * Modelo de datos para el scorecard (para implementación futura con Firestore)
         */
        data class ScorecardData(
            val userId: String = "",
            val nombreUsuario: String = "",
            val mes: String = "",

            // CAC
            val cacCostoOperativo: Int = 0,
            val cacVentaMensual: Int = 0,
            val cacResultado: String = "",
            val cacCategoria: String = "",
            val cacPuntaje: Int = 0,

            // CALIDAD
            val calidadPagosCompletados: Double = 0.0,
            val calidadPrimerosPagosNoHechos: Double = 0.0,
            val calidadResultado: String = "",
            val calidadCategoria: String = "",
            val calidadPuntaje: Int = 0,

            // NIM
            val nimIngresos: Int = 0,
            val nimPerdidas: Int = 0,
            val nimFondeo: Int = 0,
            val nimResultado: String = "",
            val nimCategoria: String = "",
            val nimPuntaje: Int = 0,

            // CRECIMIENTO
            val crecimientoPortafolioAnterior: String = "",
            val crecimientoPortafolioActual: String = "",
            val crecimientoResultado: String = "",
            val crecimientoCategoria: String = "",
            val crecimientoPuntaje: Int = 0,

            // Totales
            val puntajeTotal: Int = 0,
            val multiplicador: String = "",
            val gananciaMensual: String = ""
        )
    }
}
