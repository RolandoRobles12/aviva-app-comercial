package com.promotoresavivatunegocio_1.ui.leagues

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.promotoresavivatunegocio_1.databinding.ItemLeagueStandingBinding
import models.LeagueParticipant

/**
 * Adapter para la tabla de posiciones de la liga
 */
class LeagueStandingsAdapter : RecyclerView.Adapter<LeagueStandingsAdapter.ViewHolder>() {

    private var participants = listOf<LeagueParticipant>()
    private var currentUserId = ""

    fun updateData(newParticipants: List<LeagueParticipant>, userId: String) {
        participants = newParticipants
        currentUserId = userId
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemLeagueStandingBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(participants[position], currentUserId)
    }

    override fun getItemCount() = participants.size

    class ViewHolder(private val binding: ItemLeagueStandingBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(participant: LeagueParticipant, currentUserId: String) {
            binding.tvPosition.text = "#${participant.currentPosition}"
            binding.tvUserName.text = participant.user?.displayName ?: "Usuario ${participant.userId.take(8)}"
            binding.tvPoints.text = "${participant.currentPoints} pts"
            binding.tvSales.text = "${participant.salesInSeason} ventas"

            // Destacar al usuario actual
            if (participant.userId == currentUserId) {
                binding.root.setBackgroundColor(
                    binding.root.context.getColor(android.R.color.holo_blue_light)
                )
                binding.root.alpha = 0.3f
            } else {
                binding.root.setBackgroundColor(
                    binding.root.context.getColor(android.R.color.transparent)
                )
                binding.root.alpha = 1.0f
            }

            // Indicador de cambio de posición
            val positionChange = participant.previousPosition - participant.currentPosition
            when {
                positionChange > 0 -> {
                    binding.tvChangeIndicator.text = "↑"
                    binding.tvChangeIndicator.setTextColor(
                        binding.root.context.getColor(android.R.color.holo_green_dark)
                    )
                }
                positionChange < 0 -> {
                    binding.tvChangeIndicator.text = "↓"
                    binding.tvChangeIndicator.setTextColor(
                        binding.root.context.getColor(android.R.color.holo_red_dark)
                    )
                }
                else -> {
                    binding.tvChangeIndicator.text = "→"
                    binding.tvChangeIndicator.setTextColor(
                        binding.root.context.getColor(android.R.color.darker_gray)
                    )
                }
            }
        }
    }
}
