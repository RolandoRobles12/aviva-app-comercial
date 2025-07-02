package com.promotoresavivatunegocio_1.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.models.Notification
import java.text.SimpleDateFormat
import java.util.*

class NotificationsAdapter(
    private val onNotificationClick: (Notification) -> Unit = {}
) : ListAdapter<Notification, NotificationsAdapter.NotificationViewHolder>(NotificationDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): NotificationViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_notification, parent, false)
        return NotificationViewHolder(view)
    }

    override fun onBindViewHolder(holder: NotificationViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class NotificationViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val titleText: TextView = itemView.findViewById(R.id.titleText)
        private val messageText: TextView = itemView.findViewById(R.id.messageText)
        private val timestampText: TextView = itemView.findViewById(R.id.timestampText)

        fun bind(notification: Notification) {
            titleText.text = notification.title
            messageText.text = notification.message

            // Formatear fecha
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
            timestampText.text = notification.timestamp?.toDate()?.let { dateFormat.format(it) } ?: "Fecha no disponible"

            // Aplicar estilo según si está leída o no
            if (!notification.isRead) {
                // No leída: texto en negrita y más opaco
                itemView.alpha = 1.0f
                titleText.setTypeface(null, android.graphics.Typeface.BOLD)
                messageText.setTypeface(null, android.graphics.Typeface.NORMAL)
            } else {
                // Leída: texto normal y más transparente
                itemView.alpha = 0.7f
                titleText.setTypeface(null, android.graphics.Typeface.NORMAL)
                messageText.setTypeface(null, android.graphics.Typeface.NORMAL)
            }

            // Configurar colores según el tipo de notificación
            val titleColor = when (notification.type) {
                "visit_approved" -> android.R.color.holo_green_dark
                "visit_rejected" -> android.R.color.holo_red_dark
                "system" -> android.R.color.holo_blue_dark
                else -> android.R.color.black
            }
            titleText.setTextColor(itemView.context.getColor(titleColor))

            // Click listener
            itemView.setOnClickListener {
                onNotificationClick(notification)
            }
        }
    }

    class NotificationDiffCallback : DiffUtil.ItemCallback<Notification>() {
        override fun areItemsTheSame(oldItem: Notification, newItem: Notification): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Notification, newItem: Notification): Boolean {
            return oldItem == newItem
        }
    }
}