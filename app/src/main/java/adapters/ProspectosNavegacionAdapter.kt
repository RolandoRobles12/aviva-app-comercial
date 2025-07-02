package com.promotoresavivatunegocio_1.adapters

import android.location.Location
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.models.ProspectoAviva
import kotlin.math.*

class ProspectosNavegacionAdapter(
    private val onProspectoClick: (ProspectoAviva) -> Unit,
    private val currentLocation: Location? = null
) : ListAdapter<ProspectoAviva, ProspectosNavegacionAdapter.ProspectoViewHolder>(ProspectoDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProspectoViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_prospecto_navegacion, parent, false)
        return ProspectoViewHolder(view)
    }

    override fun onBindViewHolder(holder: ProspectoViewHolder, position: Int) {
        val prospecto = getItem(position)
        holder.bind(prospecto, currentLocation, onProspectoClick)
    }

    class ProspectoViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvIconoProspecto: TextView = itemView.findViewById(R.id.tvIconoProspecto)
        private val tvNombreProspecto: TextView = itemView.findViewById(R.id.tvNombreProspecto)
        private val tvGiroProspecto: TextView = itemView.findViewById(R.id.tvGiroProspecto)
        private val tvProbabilidad: TextView = itemView.findViewById(R.id.tvProbabilidad)
        private val tvDistancia: TextView = itemView.findViewById(R.id.tvDistancia)

        fun bind(
            prospecto: ProspectoAviva,
            currentLocation: Location?,
            onProspectoClick: (ProspectoAviva) -> Unit
        ) {
            // Configurar información básica
            tvNombreProspecto.text = prospecto.nombre
            tvGiroProspecto.text = prospecto.giro
            tvProbabilidad.text = "📊 ${(prospecto.probabilidad * 100).toInt()}%"

            // Configurar ícono según el giro
            tvIconoProspecto.text = obtenerIconoGiro(prospecto.giro)

            // Calcular y mostrar distancia
            currentLocation?.let { ubicacionActual ->
                val distancia = calcularDistancia(
                    ubicacionActual.latitude,
                    ubicacionActual.longitude,
                    prospecto.latitud,
                    prospecto.longitud
                )
                tvDistancia.text = "📍 ${formatearDistancia(distancia)}"
            } ?: run {
                tvDistancia.text = "📍 --"
            }

            // Configurar color de probabilidad
            val colorProbabilidad = when {
                prospecto.probabilidad >= 0.8 -> R.color.success_color
                prospecto.probabilidad >= 0.6 -> android.R.color.holo_orange_light
                else -> android.R.color.darker_gray
            }
            tvProbabilidad.setTextColor(itemView.context.getColor(colorProbabilidad))

            // Click listener
            itemView.setOnClickListener {
                onProspectoClick(prospecto)
            }
        }

        private fun obtenerIconoGiro(giro: String): String {
            val giroLower = giro.lowercase()
            return when {
                giroLower.contains("supermercado") || giroLower.contains("abarrotes") -> "🛒"
                giroLower.contains("farmacia") || giroLower.contains("medicamento") -> "💊"
                giroLower.contains("panadería") || giroLower.contains("panaderia") -> "🍞"
                giroLower.contains("restaurante") || giroLower.contains("comida") -> "🍽️"
                giroLower.contains("taller") || giroLower.contains("mecánico") -> "🔧"
                giroLower.contains("papelería") || giroLower.contains("papeleria") -> "📚"
                giroLower.contains("ferretería") || giroLower.contains("ferreteria") -> "🔨"
                giroLower.contains("ropa") || giroLower.contains("textil") -> "👕"
                giroLower.contains("belleza") || giroLower.contains("estética") -> "💄"
                giroLower.contains("electrónico") || giroLower.contains("electronico") -> "📱"
                giroLower.contains("mueble") || giroLower.contains("hogar") -> "🛋️"
                giroLower.contains("auto") || giroLower.contains("refaccion") -> "🚗"
                giroLower.contains("tienda") -> "🏪"
                giroLower.contains("comercio") -> "🏬"
                else -> "🏪"
            }
        }

        private fun calcularDistancia(
            lat1: Double, lon1: Double,
            lat2: Double, lon2: Double
        ): Double {
            val earthRadius = 6371000.0 // Radio de la Tierra en metros

            val dLat = Math.toRadians(lat2 - lat1)
            val dLon = Math.toRadians(lon2 - lon1)

            val a = sin(dLat / 2).pow(2.0) +
                    cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                    sin(dLon / 2).pow(2.0)

            val c = 2 * atan2(sqrt(a), sqrt(1 - a))

            return earthRadius * c
        }

        private fun formatearDistancia(distanciaMetros: Double): String {
            return when {
                distanciaMetros < 1000 -> "${distanciaMetros.toInt()}m"
                distanciaMetros < 10000 -> "${"%.1f".format(distanciaMetros / 1000)}km"
                else -> "${"%.0f".format(distanciaMetros / 1000)}km"
            }
        }
    }

    class ProspectoDiffCallback : DiffUtil.ItemCallback<ProspectoAviva>() {
        override fun areItemsTheSame(oldItem: ProspectoAviva, newItem: ProspectoAviva): Boolean {
            return oldItem.nombre == newItem.nombre &&
                    oldItem.latitud == newItem.latitud &&
                    oldItem.longitud == newItem.longitud
        }

        override fun areContentsTheSame(oldItem: ProspectoAviva, newItem: ProspectoAviva): Boolean {
            return oldItem == newItem
        }
    }
}