package com.promotoresavivatunegocio_1.ui.profile

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.promotoresavivatunegocio_1.databinding.ItemCareerLevelBinding
import models.LevelAchievement
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Adapter para mostrar el historial de niveles alcanzados
 */
class CareerLevelsAdapter : RecyclerView.Adapter<CareerLevelsAdapter.ViewHolder>() {

    private var levels = listOf<LevelAchievement>()

    fun updateData(newLevels: List<LevelAchievement>) {
        levels = newLevels.sortedByDescending { it.achievedAt.toDate() }
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemCareerLevelBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(levels[position])
    }

    override fun getItemCount() = levels.size

    class ViewHolder(private val binding: ItemCareerLevelBinding) :
        RecyclerView.ViewHolder(binding.root) {

        private val dateFormat = SimpleDateFormat("dd MMM yyyy", Locale("es", "ES"))

        fun bind(level: LevelAchievement) {
            binding.tvLevelName.text = level.levelName
            binding.tvLevelNumber.text = "Nivel ${level.level}"
            binding.tvAchievedDate.text = dateFormat.format(level.achievedAt.toDate())

            if (level.notes.isNotEmpty()) {
                binding.tvNotes.text = level.notes
                binding.tvNotes.visibility = android.view.View.VISIBLE
            } else {
                binding.tvNotes.visibility = android.view.View.GONE
            }
        }
    }
}
