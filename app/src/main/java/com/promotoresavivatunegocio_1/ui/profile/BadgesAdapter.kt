package com.promotoresavivatunegocio_1.ui.profile

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.promotoresavivatunegocio_1.databinding.ItemBadgeBinding
import models.UserBadge
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Adapter para mostrar insignias en un grid
 */
class BadgesAdapter : RecyclerView.Adapter<BadgesAdapter.ViewHolder>() {

    private var badges = listOf<UserBadge>()

    fun updateData(newBadges: List<UserBadge>) {
        badges = newBadges
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemBadgeBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(badges[position])
    }

    override fun getItemCount() = badges.size

    class ViewHolder(private val binding: ItemBadgeBinding) :
        RecyclerView.ViewHolder(binding.root) {

        private val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())

        fun bind(userBadge: UserBadge) {
            val badge = userBadge.badge

            binding.tvBadgeName.text = badge?.name ?: "Insignia"
            binding.tvBadgeCategory.text = badge?.category?.displayName ?: ""
            binding.tvBadgePoints.text = "+${badge?.points ?: 0} pts"
            binding.tvUnlockedDate.text = dateFormat.format(userBadge.unlockedAt.toDate())

            // Color según rareza
            val colorHex = badge?.rarity?.colorHex ?: "#6200EE"
            try {
                val color = android.graphics.Color.parseColor(colorHex)
                binding.cardBadge.setCardBackgroundColor(color)
            } catch (e: Exception) {
                // Color por defecto
            }

            // TODO: Cargar icono desde URL si existe
            // Glide.with(binding.root.context).load(badge?.iconUrl).into(binding.ivBadgeIcon)
        }
    }
}
