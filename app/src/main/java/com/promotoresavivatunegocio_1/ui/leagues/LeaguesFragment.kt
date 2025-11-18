package com.promotoresavivatunegocio_1.ui.leagues

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.databinding.FragmentLeaguesBinding
import com.promotoresavivatunegocio_1.services.LeagueService
import kotlinx.coroutines.launch
import models.League
import models.LeagueParticipant

/**
 * Fragmento de Ligas y Competencias
 *
 * Muestra:
 * - Liga actual del usuario
 * - Posición en la tabla
 * - Tabla de posiciones completa
 * - Estadísticas de la liga
 * - Premios y recompensas
 *
 * Para personalizar:
 * - Modificar layout fragment_leagues.xml
 * - Ajustar cálculos en LeagueService
 * - Personalizar sistema de promoción/descenso
 */
class LeaguesFragment : Fragment() {
    private var _binding: FragmentLeaguesBinding? = null
    private val binding get() = _binding!!

    private val auth = FirebaseAuth.getInstance()
    private val leagueService = LeagueService()

    private lateinit var standingsAdapter: LeagueStandingsAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentLeaguesBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupUI()
        setupRecyclerView()
        loadLeagueData()
    }

    private fun setupUI() {
        binding.btnRefresh.setOnClickListener {
            loadLeagueData()
        }
    }

    private fun setupRecyclerView() {
        standingsAdapter = LeagueStandingsAdapter()
        binding.rvStandings.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = standingsAdapter
        }
    }

    private fun loadLeagueData() {
        val user = auth.currentUser
        if (user == null) {
            Toast.makeText(context, "Usuario no autenticado", Toast.LENGTH_SHORT).show()
            return
        }

        binding.progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                // Obtener liga actual del usuario
                val currentLeague = leagueService.getUserCurrentLeague(user.uid)

                if (currentLeague != null) {
                    displayLeagueInfo(currentLeague)

                    // Obtener información del participante
                    val participant = leagueService.getUserParticipant(user.uid, currentLeague.id)
                    if (participant != null) {
                        displayUserStats(participant)
                    }

                    // Cargar tabla de posiciones
                    val standings = leagueService.getLeagueStandings(currentLeague.id)
                    standingsAdapter.updateData(standings.participants, user.uid)

                    binding.contentLayout.visibility = View.VISIBLE
                    binding.emptyLayout.visibility = View.GONE
                } else {
                    showEmptyState()
                }
            } catch (e: Exception) {
                Toast.makeText(
                    context,
                    "Error al cargar liga: ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
                showEmptyState()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun displayLeagueInfo(league: League) {
        binding.tvLeagueName.text = league.tier.displayName
        binding.tvSeason.text = "Temporada ${league.season}"

        // Color según el tier
        val colorHex = league.tier.colorHex
        try {
            val color = android.graphics.Color.parseColor(colorHex)
            binding.cardLeagueHeader.setCardBackgroundColor(color)
        } catch (e: Exception) {
            // Color por defecto
        }

        // Mostrar información de la liga
        binding.tvMaxParticipants.text = "${league.maxParticipants} participantes"
        binding.tvPromotionSpots.text = "Top ${league.promotionSpots} ascienden"
        binding.tvRelegationSpots.text = "Bottom ${league.relegationSpots} descienden"
    }

    private fun displayUserStats(participant: LeagueParticipant) {
        binding.tvUserPosition.text = "#${participant.currentPosition}"
        binding.tvUserPoints.text = "${participant.currentPoints} pts"
        binding.tvSalesInSeason.text = "${participant.salesInSeason} ventas"

        // Indicador de cambio de posición
        val positionChange = participant.previousPosition - participant.currentPosition
        when {
            positionChange > 0 -> {
                binding.tvPositionChange.text = "↑ +$positionChange"
                binding.tvPositionChange.setTextColor(
                    resources.getColor(android.R.color.holo_green_dark, null)
                )
            }
            positionChange < 0 -> {
                binding.tvPositionChange.text = "↓ $positionChange"
                binding.tvPositionChange.setTextColor(
                    resources.getColor(android.R.color.holo_red_dark, null)
                )
            }
            else -> {
                binding.tvPositionChange.text = "→ 0"
                binding.tvPositionChange.setTextColor(
                    resources.getColor(android.R.color.darker_gray, null)
                )
            }
        }
    }

    private fun showEmptyState() {
        binding.contentLayout.visibility = View.GONE
        binding.emptyLayout.visibility = View.VISIBLE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
