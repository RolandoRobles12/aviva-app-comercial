package com.promotoresavivatunegocio_1.ui.micarrera

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.google.android.material.card.MaterialCardView
import com.promotoresavivatunegocio_1.R

/**
 * Fragment que muestra la pantalla "Mi Carrera → Front"
 *
 * Muestra:
 * - El plan de carrera con todos los rangos (Promotor I, II, III, etc.)
 * - Las insignias completadas y pendientes para cada rango
 * - Un informe detallado de métricas para cada insignia
 * - Una tabla con tabuladores, gerentes y porcentajes de cambio
 */
class MiCarreraFragment : Fragment() {

    // Datos del usuario actual
    private var nivelActual = 2 // Promotor II (índice basado en 1)

    // Data classes para el modelo de datos
    data class Insignia(
        val nombre: String,
        val icono: String,
        val completada: Boolean,
        val meta: String,
        val alcance: String,
        val porcentaje: Int
    )

    data class Rango(
        val nivel: Int,
        val nombre: String,
        val sueldoBase: Int,
        val insignias: List<Insignia>
    )

    data class FilaTabulador(
        val nivel: Int,
        val promotorBA: String,
        val tabuladorPromotor: String,
        val gerente: String,
        val tabuladorGerente: String,
        val porcentajeCambio: String,
        val antesMerito: String,
        val despuesMerito: String,
        val esNivelActual: Boolean = false,
        val esGerente: Boolean = false
    )

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_mi_carrera, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Cargar datos dinámicamente
        loadCareerData(view)
    }

    private fun loadCareerData(view: View) {
        // Obtener datos de rangos
        val rangos = getRangosData()

        // Renderizar cards de rangos
        renderRangosCards(view, rangos)

        // Ya no necesitamos modificar el módulo de insignias porque está estático
        // pero podríamos hacerlo dinámico en el futuro

        // La tabla también está estática pero funcional
    }

    private fun getRangosData(): List<Rango> {
        return listOf(
            Rango(
                nivel = 3,
                nombre = "Promotor III",
                sueldoBase = 12000,
                insignias = listOf(
                    Insignia("Meta 1", "🏆", false, "", "", 0),
                    Insignia("Meta 2", "🎯", false, "", "", 0),
                    Insignia("Meta 3", "⭐", false, "", "", 0)
                )
            ),
            Rango(
                nivel = 2,
                nombre = "Promotor II",
                sueldoBase = 10000,
                insignias = listOf(
                    Insignia("Ventas", "✓", true, "$150,000 en ventas", "$125,000 (83%)", 83),
                    Insignia("Llamadas", "✓", true, "60 llamadas semanales", "45 llamadas (75%)", 75),
                    Insignia("Cierre", "⭐", false, "35% de cierre", "28% (pendiente)", 28)
                )
            ),
            Rango(
                nivel = 1,
                nombre = "Promotor I",
                sueldoBase = 8000,
                insignias = listOf(
                    Insignia("Inicio", "✓", true, "", "", 100),
                    Insignia("Básico", "✓", true, "", "", 100)
                )
            )
        )
    }

    private fun renderRangosCards(view: View, rangos: List<Rango>) {
        val container = view.findViewById<LinearLayout>(R.id.containerRangos)
        container.removeAllViews()

        for (rango in rangos) {
            val cardView = createRangoCard(rango, rango.nivel == nivelActual)
            container.addView(cardView)
        }
    }

    private fun createRangoCard(rango: Rango, esNivelActual: Boolean): View {
        val context = requireContext()
        val inflater = LayoutInflater.from(context)

        // Crear la card principal
        val cardView = MaterialCardView(context).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dpToPx(16)
            }
            radius = dpToPx(20).toFloat()
            cardElevation = if (esNivelActual) dpToPx(8).toFloat() else dpToPx(6).toFloat()
            setCardBackgroundColor(context.getColor(android.R.color.white))

            if (esNivelActual) {
                strokeColor = context.getColor(R.color.primary)
                strokeWidth = dpToPx(3)
            }
        }

        // Crear el contenedor principal
        val mainLayout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(dpToPx(20), dpToPx(20), dpToPx(20), dpToPx(20))
        }

        // Si es el nivel actual, agregar badge "Estás aquí"
        if (esNivelActual) {
            val badgeCard = MaterialCardView(context).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = dpToPx(12)
                }
                radius = dpToPx(15).toFloat()
                cardElevation = dpToPx(2).toFloat()
                setCardBackgroundColor(context.getColor(R.color.primary))
            }

            val badgeText = TextView(context).apply {
                text = "📍 Estás aquí"
                setTextColor(context.getColor(android.R.color.white))
                textSize = 12f
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                setPadding(dpToPx(12), dpToPx(6), dpToPx(12), dpToPx(6))
            }

            badgeCard.addView(badgeText)
            mainLayout.addView(badgeCard)
        }

        // Header con nombre y sueldo
        val headerLayout = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dpToPx(12)
            }
        }

        val nombreText = TextView(context).apply {
            text = rango.nombre
            setTextColor(context.getColor(R.color.secondary))
            textSize = 20f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            layoutParams = LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
            )
        }

        val sueldoText = TextView(context).apply {
            text = "Sueldo base ${formatMoney(rango.sueldoBase)}"
            setTextColor(context.getColor(android.R.color.darker_gray))
            textSize = 14f
        }

        headerLayout.addView(nombreText)
        headerLayout.addView(sueldoText)
        mainLayout.addView(headerLayout)

        // Fila de insignias
        val insigniasLayout = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dpToPx(8)
            }
        }

        for (insignia in rango.insignias) {
            val insigniaView = createInsigniaView(insignia, esNivelActual)
            insigniasLayout.addView(insigniaView)
        }

        mainLayout.addView(insigniasLayout)
        cardView.addView(mainLayout)

        return cardView
    }

    private fun createInsigniaView(insignia: Insignia, enNivelActual: Boolean): View {
        val context = requireContext()

        val container = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                marginEnd = dpToPx(16)
            }
        }

        // Card circular para la insignia
        val insigniaCard = MaterialCardView(context).apply {
            layoutParams = LinearLayout.LayoutParams(dpToPx(50), dpToPx(50))
            radius = dpToPx(25).toFloat()
            cardElevation = if (insignia.completada) dpToPx(4).toFloat() else dpToPx(2).toFloat()
            setCardBackgroundColor(
                if (insignia.completada) {
                    context.getColor(R.color.primary)
                } else {
                    context.getColor(android.R.color.darker_gray).let { color ->
                        // Make it lighter
                        android.graphics.Color.argb(
                            255,
                            224,
                            224,
                            224
                        )
                    }
                }
            )
        }

        val insigniaIcon = TextView(context).apply {
            text = if (insignia.completada && insignia.icono == "✓") "✓" else insignia.icono
            textSize = if (insignia.completada && insignia.icono == "✓") 28f else 24f
            setTextColor(
                if (insignia.completada) {
                    context.getColor(android.R.color.white)
                } else {
                    context.getColor(android.R.color.darker_gray)
                }
            )
            if (insignia.completada && insignia.icono == "✓") {
                typeface = android.graphics.Typeface.DEFAULT_BOLD
            }
            gravity = android.view.Gravity.CENTER
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            if (!insignia.completada) {
                alpha = 0.5f
            }
        }

        insigniaCard.addView(insigniaIcon)
        container.addView(insigniaCard)

        // Nombre de la insignia
        val nombreText = TextView(context).apply {
            text = insignia.nombre
            textSize = 10f
            setTextColor(
                if (insignia.completada) {
                    if (enNivelActual) context.getColor(R.color.primary)
                    else context.getColor(R.color.primary)
                } else {
                    context.getColor(android.R.color.darker_gray)
                }
            )
            if (insignia.completada) {
                typeface = android.graphics.Typeface.DEFAULT_BOLD
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dpToPx(4)
            }
        }

        container.addView(nombreText)

        return container
    }

    private fun formatMoney(amount: Int): String {
        return "$${String.format("%,d", amount)}"
    }

    private fun dpToPx(dp: Int): Int {
        val density = resources.displayMetrics.density
        return (dp * density).toInt()
    }
}
