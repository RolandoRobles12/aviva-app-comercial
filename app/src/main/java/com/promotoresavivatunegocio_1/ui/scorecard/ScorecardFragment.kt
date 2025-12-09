package com.promotoresavivatunegocio_1.ui.scorecard

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
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
    private lateinit var spinnerMes: Spinner

    // Datos de meses disponibles
    private val availableMonths = mutableListOf<String>()
    private val availableMonthsDisplay = mutableListOf<String>()
    private var currentScorecardData: Map<String, Any>? = null

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
        spinnerMes = view.findViewById(R.id.spinnerMes)
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
            showNoDataMessage()
            return
        }

        val userName = currentUser.displayName ?: "USUARIO"
        tvNombreUsuario.text = userName.uppercase()

        // Cargar meses disponibles para este usuario desde Firestore
        loadAvailableMonths(currentUser.uid)
    }

    private fun loadAvailableMonths(userId: String) {
        db.collection("scorecards")
            .whereEqualTo("userId", userId)
            .get()
            .addOnSuccessListener { documents ->
                availableMonths.clear()
                availableMonthsDisplay.clear()

                if (documents.isEmpty) {
                    showNoDataMessage()
                    return@addOnSuccessListener
                }

                // Obtener todos los meses disponibles
                for (document in documents) {
                    val mes = document.getString("mes") ?: continue
                    val mesDisplay = document.getString("mesDisplay") ?: mes
                    if (!availableMonths.contains(mes)) {
                        availableMonths.add(mes)
                        availableMonthsDisplay.add(mesDisplay)
                    }
                }

                if (availableMonths.isEmpty()) {
                    showNoDataMessage()
                    return@addOnSuccessListener
                }

                // Configurar el Spinner con los meses disponibles
                setupMonthSpinner()
            }
            .addOnFailureListener { exception ->
                Log.e("ScorecardFragment", "Error loading available months", exception)
                showNoDataMessage()
            }
    }

    private fun setupMonthSpinner() {
        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            availableMonthsDisplay
        )
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerMes.adapter = adapter

        // Listener para cuando se selecciona un mes
        spinnerMes.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (position >= 0 && position < availableMonths.size) {
                    val selectedMes = availableMonths[position]
                    loadScorecardForMonth(selectedMes)
                }
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {
                // No hacer nada
            }
        }

        // Cargar el primer mes automáticamente
        if (availableMonths.isNotEmpty()) {
            loadScorecardForMonth(availableMonths[0])
        }
    }

    private fun loadScorecardForMonth(mes: String) {
        val currentUser = auth.currentUser ?: return

        db.collection("scorecards")
            .whereEqualTo("userId", currentUser.uid)
            .whereEqualTo("mes", mes)
            .limit(1)
            .get()
            .addOnSuccessListener { documents ->
                if (documents.isEmpty) {
                    showNoDataMessage()
                    return@addOnSuccessListener
                }

                val document = documents.first()
                currentScorecardData = document.data
                displayScorecardData(document.data)
            }
            .addOnFailureListener { exception ->
                Log.e("ScorecardFragment", "Error loading scorecard for month: $mes", exception)
                Toast.makeText(context, "Error al cargar datos del scorecard", Toast.LENGTH_SHORT).show()
            }
    }

    private fun displayScorecardData(data: Map<String, Any>) {
        try {
            // CAC
            tvCacDescripcion.text = "Costo Operativo / Venta Mensual"
            tvCacMetricas.text = data["cac_metricas"] as? String ?: "-"
            tvCacResultado.text = data["cac_resultado"] as? String ?: "-"
            tvCacCategoria.text = data["cac_categoria"] as? String ?: "-"
            tvCacPuntaje.text = data["cac_puntaje"] as? String ?: "-"

            // CALIDAD
            tvCalidadDescripcion.text = "Calificación entre los clientes que hacen sus primeros pagos y los clientes que no pagan."
            tvCalidadMetricas.text = data["calidad_metricas"] as? String ?: "-"
            tvCalidadResultado.text = data["calidad_resultado"] as? String ?: "-"
            tvCalidadCategoria.text = data["calidad_categoria"] as? String ?: "-"
            tvCalidadPuntaje.text = data["calidad_puntaje"] as? String ?: "-"

            // NIM
            tvNimDescripcion.text = "Pagos hechos por los clientes menos el costo de fondeo y las pérdidas de crédito."
            tvNimMetricas.text = data["nim_metricas"] as? String ?: "-"
            tvNimResultado.text = data["nim_resultado"] as? String ?: "-"
            tvNimCategoria.text = data["nim_categoria"] as? String ?: "-"
            tvNimPuntaje.text = data["nim_puntaje"] as? String ?: "-"

            // CRECIMIENTO
            tvCrecimientoDescripcion.text = "Crecimiento del portafolio contra el mes anterior."
            tvCrecimientoMetricas.text = data["crecimiento_metricas"] as? String ?: "-"
            tvCrecimientoResultado.text = data["crecimiento_resultado"] as? String ?: "-"
            tvCrecimientoCategoria.text = data["crecimiento_categoria"] as? String ?: "-"
            tvCrecimientoPuntaje.text = data["crecimiento_puntaje"] as? String ?: "-"

            // Totales
            tvPuntajeTotal.text = data["puntajeTotal"] as? String ?: "-"
            tvMultiplicador.text = data["multiplicador"] as? String ?: "-"
            tvGananciaMensual.text = data["gananciaMensual"] as? String ?: "-"

        } catch (e: Exception) {
            Log.e("ScorecardFragment", "Error displaying scorecard data", e)
            Toast.makeText(context, "Error al mostrar datos del scorecard", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showNoDataMessage() {
        tvNombreUsuario.text = auth.currentUser?.displayName?.uppercase() ?: "USUARIO"

        // Mostrar mensaje de "sin datos" en lugar de datos de ejemplo
        tvCacDescripcion.text = "Costo Operativo / Venta Mensual"
        tvCacMetricas.text = "Sin datos disponibles"
        tvCacResultado.text = "-"
        tvCacCategoria.text = "-"
        tvCacPuntaje.text = "-"

        tvCalidadDescripcion.text = "Calificación entre los clientes que hacen sus primeros pagos y los clientes que no pagan."
        tvCalidadMetricas.text = "Sin datos disponibles"
        tvCalidadResultado.text = "-"
        tvCalidadCategoria.text = "-"
        tvCalidadPuntaje.text = "-"

        tvNimDescripcion.text = "Pagos hechos por los clientes menos el costo de fondeo y las pérdidas de crédito."
        tvNimMetricas.text = "Sin datos disponibles"
        tvNimResultado.text = "-"
        tvNimCategoria.text = "-"
        tvNimPuntaje.text = "-"

        tvCrecimientoDescripcion.text = "Crecimiento del portafolio contra el mes anterior."
        tvCrecimientoMetricas.text = "Sin datos disponibles"
        tvCrecimientoResultado.text = "-"
        tvCrecimientoCategoria.text = "-"
        tvCrecimientoPuntaje.text = "-"

        tvPuntajeTotal.text = "-"
        tvMultiplicador.text = "-"
        tvGananciaMensual.text = "-"

        // Configurar spinner vacío
        val emptyAdapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            listOf("No hay meses disponibles")
        )
        emptyAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerMes.adapter = emptyAdapter
        spinnerMes.isEnabled = false

        Toast.makeText(context, "No hay datos de bonos disponibles. Contacta al administrador.", Toast.LENGTH_LONG).show()
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
