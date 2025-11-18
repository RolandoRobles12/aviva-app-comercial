package com.promotoresavivatunegocio_1.ui.attendance

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.databinding.ItemAttendanceRecordBinding
import models.AttendanceRecord

class AttendanceRecordsAdapter : RecyclerView.Adapter<AttendanceRecordsAdapter.ViewHolder>() {

    private var records = listOf<AttendanceRecord>()

    fun updateRecords(newRecords: List<AttendanceRecord>) {
        records = newRecords
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemAttendanceRecordBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(records[position])
    }

    override fun getItemCount(): Int = records.size

    class ViewHolder(private val binding: ItemAttendanceRecordBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(record: AttendanceRecord) {
            binding.apply {
                tvRecordType.text = record.getTypeDisplayName()
                tvRecordTime.text = record.getFormattedTime()

                // Set icon based on type
                val icon = when (record.type) {
                    AttendanceRecord.AttendanceType.ENTRADA -> "🚪"
                    AttendanceRecord.AttendanceType.SALIDA -> "🚪"
                    AttendanceRecord.AttendanceType.COMIDA -> "🍽️"
                }
                tvTypeIcon.text = icon

                // Show location if available
                if (record.location != null) {
                    tvLocation.text = "📍 Ubicación registrada"
                    tvLocation.visibility = android.view.View.VISIBLE
                } else {
                    tvLocation.visibility = android.view.View.GONE
                }

                // Set status badge
                val (statusText, statusColor, bgColor) = when (record.status) {
                    AttendanceRecord.AttendanceStatus.RECORDED -> {
                        Triple("Registrado", R.color.success_color, R.color.success_background)
                    }
                    AttendanceRecord.AttendanceStatus.PENDING_APPROVAL -> {
                        Triple("Pendiente", R.color.warning_color, R.color.warning_background)
                    }
                    AttendanceRecord.AttendanceStatus.APPROVED -> {
                        Triple("Aprobado", R.color.success_color, R.color.success_background)
                    }
                    AttendanceRecord.AttendanceStatus.REJECTED -> {
                        Triple("Rechazado", R.color.error_color, R.color.error_background)
                    }
                    AttendanceRecord.AttendanceStatus.FLAGGED -> {
                        Triple("Marcado", R.color.warning_color, R.color.warning_background)
                    }
                    AttendanceRecord.AttendanceStatus.AUTO_CLOSED -> {
                        Triple("Auto-cerrado", R.color.secondary, R.color.secondary_container)
                    }
                }

                tvStatus.text = statusText
                tvStatus.setTextColor(itemView.context.getColor(statusColor))

                // Update card background color based on status
                val cardView = itemView as androidx.cardview.widget.CardView
                cardView.setCardBackgroundColor(itemView.context.getColor(bgColor))
            }
        }
    }
}