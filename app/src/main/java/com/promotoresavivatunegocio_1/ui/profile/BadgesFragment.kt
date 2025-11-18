package com.promotoresavivatunegocio_1.ui.profile

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.databinding.FragmentBadgesBinding
import com.promotoresavivatunegocio_1.services.BadgeService
import kotlinx.coroutines.launch

/**
 * Fragmento de Insignias
 *
 * Muestra:
 * - Insignias obtenidas por el usuario
 * - Estadísticas de insignias
 * - Progreso hacia nuevas insignias
 *
 * Para personalizar:
 * - Modificar layout fragment_badges.xml
 * - Ajustar grid layout (actualmente 3 columnas)
 * - Personalizar adapter
 */
class BadgesFragment : Fragment() {
    private var _binding: FragmentBadgesBinding? = null
    private val binding get() = _binding!!

    private val auth = FirebaseAuth.getInstance()
    private val badgeService = BadgeService()

    private lateinit var badgesAdapter: BadgesAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentBadgesBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        loadBadges()
    }

    private fun setupRecyclerView() {
        badgesAdapter = BadgesAdapter()
        binding.rvBadges.apply {
            layoutManager = GridLayoutManager(context, 3) // 3 columnas
            adapter = badgesAdapter
        }
    }

    private fun loadBadges() {
        val user = auth.currentUser
        if (user == null) {
            Toast.makeText(context, "Usuario no autenticado", Toast.LENGTH_SHORT).show()
            return
        }

        binding.progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                // Cargar insignias del usuario
                val userBadges = badgeService.getUserBadges(user.uid)

                // Cargar estadísticas
                val stats = badgeService.getUserBadgeStats(user.uid)

                // Mostrar estadísticas
                binding.tvTotalBadges.text = "${stats.totalUnlocked}/${stats.totalAvailable}"
                binding.tvTotalPoints.text = "${stats.totalPoints} pts"

                binding.progressBadges.max = stats.totalAvailable
                binding.progressBadges.progress = stats.totalUnlocked

                // Mostrar insignias
                badgesAdapter.updateData(userBadges)

                if (userBadges.isEmpty()) {
                    binding.emptyLayout.visibility = View.VISIBLE
                    binding.rvBadges.visibility = View.GONE
                } else {
                    binding.emptyLayout.visibility = View.GONE
                    binding.rvBadges.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                Toast.makeText(
                    context,
                    "Error al cargar insignias: ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
