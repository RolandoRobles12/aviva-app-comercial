package com.promotoresavivatunegocio_1.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.models.Visit
import java.text.SimpleDateFormat
import java.util.*

class AdminVisitsAdapter(
    private val onVisitClick: (Visit) -> Unit
) : ListAdapter<Visit, AdminVisitsAdapter.VisitViewHolder>(VisitDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VisitViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_admin_visit, parent, false)
        return VisitViewHolder(view)
    }

    override fun onBindViewHolder(holder: VisitViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class VisitViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val businessNameText: TextView = itemView.findViewById(R.id.businessNameText)
        private val userNameText: TextView = itemView.findViewById(R.id.userNameText)
        private val timestampText: TextView = itemView.findViewById(R.id.timestampText)
        private val statusText: TextView = itemView.findViewById(R.id.statusText)

        fun bind(visit: Visit) {
            businessNameText.text = visit.businessName
            userNameText.text = "Por: ${visit.userName}"

            // Formatear fecha
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
            timestampText.text = visit.timestamp?.toDate()?.let { dateFormat.format(it) } ?: "Fecha no disponible"

            // Configurar estado
            statusText.text = when (visit.status) {
                "pending" -> "Pendiente"
                "approved" -> "Aprobada"
                "rejected" -> "Rechazada"
                else -> "Desconocido"
            }

            // Configurar color del estado
            val statusColor = when (visit.status) {
                "pending" -> android.R.color.holo_orange_dark
                "approved" -> android.R.color.holo_green_dark
                "rejected" -> android.R.color.holo_red_dark
                else -> android.R.color.darker_gray
            }
            statusText.setTextColor(itemView.context.getColor(statusColor))

            itemView.setOnClickListener {
                onVisitClick(visit)
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