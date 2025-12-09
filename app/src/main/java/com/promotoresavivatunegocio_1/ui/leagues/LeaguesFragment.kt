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
import com.promotoresavivatunegocio_1.R
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
            Toast.makeText(
                context,
                getString(R.string.league_error_not_authenticated),
                Toast.LENGTH_SHORT
            ).show()
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
                    getString(R.string.league_error_loading, e.message ?: ""),
                    Toast.LENGTH_LONG
                ).show()
                showEmptyState()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun displayLeagueInfo(league: League) {
        // Usar nombre dinámico de la liga (con fallback)
        val leagueName = league.name?.takeIf { it.isNotEmpty() }
            ?: getString(R.string.league_default_name)

        // Mostrar icono + nombre
        val displayName = league.icon?.takeIf { it.isNotEmpty() }?.let {
            "$it $leagueName"
        } ?: leagueName

        binding.tvLeagueName.text = displayName
        binding.tvSeason.text = getString(R.string.league_season, league.season)

        // Color personalizado de la liga
        val colorHex = league.color?.takeIf { it.isNotEmpty() } ?: "#CD7F32"
        try {
            val color = android.graphics.Color.parseColor(colorHex)
            binding.cardLeagueHeader.setCardBackgroundColor(color)
        } catch (e: Exception) {
            // Color por defecto si el hex es inválido
        }

        // Mostrar información de la liga
        binding.tvMaxParticipants.text = getString(R.string.league_participants, league.maxParticipants)
        binding.tvPromotionSpots.text = getString(R.string.league_promotion, league.promotionSpots)
        binding.tvRelegationSpots.text = getString(R.string.league_relegation, league.relegationSpots)

        // Mostrar descripción si existe
        val description = league.description?.takeIf { it.isNotEmpty() }
        if (description != null) {
            binding.cardLeagueDescription.visibility = View.VISIBLE
            binding.tvLeagueDescription.text = description
        } else {
            binding.cardLeagueDescription.visibility = View.GONE
        }

        // Mostrar fechas de temporada
        displayLeagueDates(league)

        // Mostrar premios si existen
        displayLeaguePrizes(league.prizes)
    }

    private fun displayLeagueDates(league: League) {
        try {
            val dateFormat = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault())
            val startDate = dateFormat.format(league.startDate.toDate())
            val endDate = dateFormat.format(league.endDate.toDate())

            binding.cardLeagueDates.visibility = View.VISIBLE
            binding.tvLeagueDates.text = getString(R.string.league_date_range, startDate, endDate)
        } catch (e: Exception) {
            binding.cardLeagueDates.visibility = View.GONE
        }
    }

    private fun displayLeaguePrizes(prizes: List<models.LeaguePrize>) {
        if (prizes.isEmpty()) {
            binding.cardLeaguePrizes.visibility = View.GONE
            return
        }

        binding.cardLeaguePrizes.visibility = View.VISIBLE
        binding.layoutPrizes.removeAllViews()

        prizes.sortedBy { it.position }.forEach { prize ->
            val prizeView = layoutInflater.inflate(
                android.R.layout.simple_list_item_2,
                binding.layoutPrizes,
                false
            )

            val text1 = prizeView.findViewById<android.widget.TextView>(android.R.id.text1)
            val text2 = prizeView.findViewById<android.widget.TextView>(android.R.id.text2)

            text1.text = getString(R.string.league_prize_position, prize.position)
            text1.textSize = 16f
            text1.setTypeface(null, android.graphics.Typeface.BOLD)

            var prizeDescription = prize.description
            if (prize.amount > 0) {
                prizeDescription += " - \$${prize.amount}"
            }
            text2.text = prizeDescription
            text2.textSize = 14f

            binding.layoutPrizes.addView(prizeView)
        }
    }

    private fun displayUserStats(participant: LeagueParticipant) {
        binding.tvUserPosition.text = getString(R.string.league_position_format, participant.currentPosition)
        binding.tvUserPoints.text = getString(R.string.league_points_format, participant.currentPoints)
        binding.tvSalesInSeason.text = participant.salesInSeason.toString()

        // Indicador de cambio de posición
        val positionChange = participant.previousPosition - participant.currentPosition
        when {
            positionChange > 0 -> {
                binding.tvPositionChange.text = getString(R.string.league_position_change_up, positionChange)
                binding.tvPositionChange.setTextColor(
                    resources.getColor(android.R.color.holo_green_dark, null)
                )
            }
            positionChange < 0 -> {
                binding.tvPositionChange.text = getString(R.string.league_position_change_down, positionChange)
                binding.tvPositionChange.setTextColor(
                    resources.getColor(android.R.color.holo_red_dark, null)
                )
            }
            else -> {
                binding.tvPositionChange.text = getString(R.string.league_position_change_same)
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
