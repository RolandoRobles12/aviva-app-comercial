package com.promotoresavivatunegocio_1.adapters

import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.ImageView
import android.widget.Button
import android.widget.LinearLayout
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.models.Visit
import java.text.SimpleDateFormat
import java.util.*

class VisitsAdapter(
    private val onVisitClick: ((Visit) -> Unit)? = null,
    private val onMapClick: ((Visit) -> Unit)? = null
) : ListAdapter<Visit, VisitsAdapter.VisitViewHolder>(VisitDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VisitViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_visit, parent, false)
        return VisitViewHolder(view)
    }

    override fun onBindViewHolder(holder: VisitViewHolder, position: Int) {
        val visit = getItem(position)
        holder.bind(visit)

        // Click en el item completo
        holder.itemView.setOnClickListener {
            onVisitClick?.invoke(visit)
        }

        // Click en ver mapa
        holder.btnViewMap.setOnClickListener {
            onMapClick?.invoke(visit)
        }

        // Click en detalles
        holder.btnViewDetails.setOnClickListener {
            onVisitClick?.invoke(visit)
        }
    }

    class VisitViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val businessNameText: TextView = itemView.findViewById(R.id.businessNameText)
        private val timestampText: TextView = itemView.findViewById(R.id.timestampText)
        private val statusText: TextView = itemView.findViewById(R.id.statusText)
        private val commentsText: TextView = itemView.findViewById(R.id.commentsText)
        private val vendorText: TextView = itemView.findViewById(R.id.vendorText)
        private val locationText: TextView = itemView.findViewById(R.id.locationText)
        private val locationLayout: LinearLayout = itemView.findViewById(R.id.locationLayout)
        private val avivaIndicatorLayout: LinearLayout = itemView.findViewById(R.id.avivaIndicatorLayout)
        private val avivaIndicatorText: TextView = itemView.findViewById(R.id.avivaIndicatorText)
        private val visitImage: ImageView = itemView.findViewById(R.id.visitImage)
        val btnViewMap: Button = itemView.findViewById(R.id.btnViewMap)
        val btnViewDetails: Button = itemView.findViewById(R.id.btnViewDetails)

        fun bind(visit: Visit) {
            Log.d("VisitsAdapter", "Binding visit: ${visit.businessName} - Status: ${visit.status}")

            // Nombre del negocio
            businessNameText.text = visit.businessName

            // Formatear fecha
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
            timestampText.text = visit.timestamp?.toDate()?.let {
                dateFormat.format(it)
            } ?: "Fecha no disponible"

            // Vendedor
            vendorText.text = if (visit.userName.isNotBlank()) {
                visit.userName
            } else {
                "Usuario no especificado"
            }

            // Comentarios
            commentsText.text = if (visit.comments.isNotBlank()) {
                visit.comments
            } else {
                "Sin comentarios adicionales"
            }

            // Ubicación (mostrar si existe)
            if (visit.location != null) {
                locationLayout.visibility = View.VISIBLE
                locationText.text = "Lat: ${String.format("%.4f", visit.location.latitude)}, " +
                        "Lon: ${String.format("%.4f", visit.location.longitude)}"
            } else {
                locationLayout.visibility = View.GONE
            }

            // Configurar status con colores y backgrounds apropiados
            configureStatus(visit.status)

            // Mostrar indicador si es prospecto Aviva
            if (visit.esProspectoAviva) {
                avivaIndicatorLayout.visibility = View.VISIBLE
                avivaIndicatorText.text = "Prospecto Aviva Tu Negocio" +
                        if (visit.probabilidadOriginal != null) {
                            " (${(visit.probabilidadOriginal * 100).toInt()}% probabilidad)"
                        } else {
                            ""
                        }
            } else {
                avivaIndicatorLayout.visibility = View.GONE
            }

            // Por ahora ocultar imagen para optimizar rendimiento
            visitImage.visibility = View.GONE
        }

        private fun configureStatus(status: String) {
            val statusDisplayText = Visit.getStatusDisplayText(status)
            statusText.text = statusDisplayText

            // Configurar background según el status
            val backgroundRes = when (status) {
                Visit.STATUS_SOLICITUD_CREADA -> R.drawable.status_background_created
                Visit.STATUS_NO_INTERESADO -> R.drawable.status_background_not_interested
                Visit.STATUS_PROGRAMADA -> R.drawable.status_background_scheduled
                Visit.STATUS_NO_APLICA -> R.drawable.status_background_not_applicable
                else -> R.drawable.status_background_created // Fallback
            }

            try {
                statusText.setBackgroundResource(backgroundRes)
                statusText.setTextColor(ContextCompat.getColor(itemView.context, android.R.color.white))
            } catch (e: Exception) {
                Log.w("VisitsAdapter", "Error configurando background del status: ${e.message}")
                // Fallback - usar color directo
                val colorRes = when (status) {
                    Visit.STATUS_SOLICITUD_CREADA -> android.R.color.holo_green_dark
                    Visit.STATUS_NO_INTERESADO -> android.R.color.holo_red_dark
                    Visit.STATUS_PROGRAMADA -> android.R.color.holo_orange_dark
                    Visit.STATUS_NO_APLICA -> android.R.color.darker_gray
                    else -> android.R.color.holo_green_dark
                }
                statusText.setBackgroundColor(ContextCompat.getColor(itemView.context, colorRes))
                statusText.setTextColor(ContextCompat.getColor(itemView.context, android.R.color.white))
            }
        }
    }

    class VisitDiffCallback : DiffUtil.ItemCallback<Visit>() {
        override fun areItemsTheSame(oldItem: Visit, newItem: Visit): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Visit, newItem: Visit): Boolean {
            return oldItem == newItem
        }
    }
}