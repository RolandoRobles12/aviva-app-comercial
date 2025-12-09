package com.promotoresavivatunegocio_1.ui.metasbono

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.services.HubSpotRepository
import com.promotoresavivatunegocio_1.services.LeagueService
import kotlinx.coroutines.launch
import models.League
import models.LeagueParticipant

/**
 * Fragment para "Metas & Bono - Front"
 * Muestra 3 módulos principales con DATOS REALES de HubSpot:
 * 1. Alcance de metas semanales (con proyección de bono)
 * 2. Benchmarking (comparación con liga)
 * 3. Ligas y Premios
 */
class MetasBonoFragment : Fragment() {

    companion object {
        private const val TAG = "MetasBonoFragment"
    }

    private lateinit var auth: FirebaseAuth
    private lateinit var hubSpotRepository: HubSpotRepository
    private lateinit var leagueService: LeagueService

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_metas_bono, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()
        hubSpotRepository = HubSpotRepository()
        leagueService = LeagueService()

        // Cargar datos REALES de HubSpot y Ligas
        loadRealData(view)
    }

    /**
     * Carga todos los datos REALES desde HubSpot
     */
    private fun loadRealData(view: View) {
        lifecycleScope.launch {
            try {
                // Cargar metas reales
                val goalsResult = hubSpotRepository.getMyGoals()
                goalsResult.onSuccess { goalsData ->
                    Log.d(TAG, "✅ Metas recibidas: ${goalsData.goals.size} metas")
                    if (goalsData.goals.isNotEmpty()) {
                        // Mostrar la primera meta activa
                        loadModulo1WithRealData(view, goalsData.goals.first())
                    } else {
                        Log.w(TAG, "⚠️ No hay metas asignadas: ${goalsData.message}")
                        showNoGoalsMessage(view)
                    }
                }.onFailure { error ->
                    Log.e(TAG, "❌ Error cargando metas", error)
                    showErrorMessage(view, "Error al cargar metas: ${error.message}")
                }

                // Cargar estadísticas de liga reales
                val leagueResult = hubSpotRepository.getMyLeagueStats()
                leagueResult.onSuccess { leagueData ->
                    Log.d(TAG, "✅ Estadísticas de liga recibidas: ${leagueData.leagues.size} ligas")
                    if (leagueData.leagues.isNotEmpty()) {
                        // Mostrar la primera liga
                        loadModulo2WithRealData(view, leagueData.leagues.first())
                    } else {
                        Log.w(TAG, "⚠️ No está en ninguna liga: ${leagueData.message}")
                    }
                }.onFailure { error ->
                    Log.e(TAG, "❌ Error cargando liga", error)
                }

                // Cargar módulo 3: Ligas y Premios desde Firestore
                val user = auth.currentUser
                if (user != null) {
                    val currentLeague = leagueService.getUserCurrentLeague(user.uid)
                    if (currentLeague != null) {
                        loadModulo3WithRealData(view, currentLeague, user.uid)
                    } else {
                        Log.w(TAG, "⚠️ Usuario no está en ninguna liga")
                        showNoLeagueMessage(view)
                    }
                }

            } catch (e: Exception) {
                Log.e(TAG, "❌ Error general cargando datos", e)
                showErrorMessage(view, "Error: ${e.message}")
            }
        }
    }

    /**
     * Módulo 1: Muestra DATOS REALES de HubSpot
     */
    private fun loadModulo1WithRealData(view: View, goal: com.promotoresavivatunegocio_1.models.hubspot.UserGoal) {
        val llamadasCurrent = goal.metrics.llamadas.current
        val llamadasTarget = goal.metrics.llamadas.target
        val llamadasPercentage = goal.metrics.llamadas.percentage

        val colocacionCurrent = goal.metrics.colocacion.current
        val colocacionTarget = goal.metrics.colocacion.target
        val colocacionPercentage = goal.metrics.colocacion.percentage

        // Actualizar UI con datos REALES
        view.findViewById<TextView>(R.id.tvLlamadasValor).text = "$llamadasCurrent / $llamadasTarget"
        view.findViewById<TextView>(R.id.tvLlamadasPorcentaje).text = "$llamadasPercentage%"
        view.findViewById<ProgressBar>(R.id.progressLlamadas).progress = llamadasPercentage

        view.findViewById<TextView>(R.id.tvColocacionValor).text =
            "$${formatMoney(colocacionCurrent)} / $${formatMoney(colocacionTarget)}"
        view.findViewById<TextView>(R.id.tvColocacionPorcentaje).text = "$colocacionPercentage%"
        view.findViewById<ProgressBar>(R.id.progressColocacion).progress = colocacionPercentage

        // Proyecciones de bono basadas en progreso real
        val faltanteB = colocacionTarget - colocacionCurrent
        val faltanteA = (colocacionTarget * 1.17).toInt() - colocacionCurrent

        view.findViewById<TextView>(R.id.tvProyeccionActual).text =
            "• Llevas $${formatMoney(colocacionCurrent)} de $${formatMoney(colocacionTarget)} (${colocacionPercentage}%)"

        view.findViewById<TextView>(R.id.tvProyeccionB).text =
            if (faltanteB > 0)
                "• Faltan $${formatMoney(faltanteB)} para cumplir la meta base"
            else
                "• ✅ ¡Ya cumpliste la meta base!"

        view.findViewById<TextView>(R.id.tvProyeccionA).text =
            if (faltanteA > 0)
                "• Faltan $${formatMoney(faltanteA)} para superar la meta en 17%"
            else
                "• 🏆 ¡Superaste la meta extendida!"
    }

    /**
     * Módulo 2: Muestra BENCHMARKING REAL de la liga
     */
    private fun loadModulo2WithRealData(view: View, league: com.promotoresavivatunegocio_1.models.hubspot.LeagueStats) {
        val tuLlamadas = league.userMetrics.llamadas
        val grupoLlamadas = league.leagueAverage.llamadas
        val diffLlamadas = if (grupoLlamadas > 0)
            ((tuLlamadas - grupoLlamadas).toFloat() / grupoLlamadas * 100).toInt()
        else 0

        val tuColocacion = league.userMetrics.colocacion
        val grupoColocacion = league.leagueAverage.colocacion
        val diffColocacion = if (grupoColocacion > 0)
            ((tuColocacion - grupoColocacion).toFloat() / grupoColocacion * 100).toInt()
        else 0

        val tuCierre = league.userMetrics.tasaCierre.toInt()
        val grupoCierre = league.leagueAverage.tasaCierre.toInt()
        val diffCierre = if (grupoCierre > 0)
            ((tuCierre - grupoCierre).toFloat() / grupoCierre * 100).toInt()
        else 0

        // Llamadas
        view.findViewById<TextView>(R.id.tvBenchLlamadasTu).text = tuLlamadas.toString()
        view.findViewById<TextView>(R.id.tvBenchLlamadasGrupo).text = grupoLlamadas.toString()
        view.findViewById<TextView>(R.id.tvBenchLlamadasDiff).apply {
            text = if (diffLlamadas >= 0) "↑ $diffLlamadas%" else "↓ ${-diffLlamadas}%"
            setTextColor(if (diffLlamadas >= 0)
                resources.getColor(R.color.success_color, null)
                else resources.getColor(R.color.error_color, null))
        }

        // Colocación
        view.findViewById<TextView>(R.id.tvBenchColocacionTu).text = "$${formatMoneyShort(tuColocacion)}"
        view.findViewById<TextView>(R.id.tvBenchColocacionGrupo).text = "$${formatMoneyShort(grupoColocacion)}"
        view.findViewById<TextView>(R.id.tvBenchColocacionDiff).apply {
            text = if (diffColocacion >= 0) "↑ $diffColocacion%" else "↓ ${-diffColocacion}%"
            setTextColor(if (diffColocacion >= 0)
                resources.getColor(R.color.success_color, null)
                else resources.getColor(R.color.error_color, null))
        }

        // Tasa de cierre
        view.findViewById<TextView>(R.id.tvBenchCierreTu).text = "$tuCierre%"
        view.findViewById<TextView>(R.id.tvBenchCierreGrupo).text = "$grupoCierre%"
        view.findViewById<TextView>(R.id.tvBenchCierreDiff).apply {
            text = if (diffCierre >= 0) "↑ $diffCierre%" else "↓ ${-diffCierre}%"
            setTextColor(if (diffCierre >= 0)
                resources.getColor(R.color.success_color, null)
                else resources.getColor(R.color.error_color, null))
        }

        // Mostrar ranking
        val currentUser = auth.currentUser
        val displayName = currentUser?.displayName ?: "TÚ"
        view.findViewById<TextView>(R.id.tvNombreUsuario).text = "$displayName - Rank #${league.userRank}/${league.totalMembers}"
        view.findViewById<TextView>(R.id.tvPuntosUsuario).text = "$${formatMoneyShort(tuColocacion)}"
    }

    /**
     * Módulo 3: Muestra DATOS REALES de Ligas y Premios desde Firestore
     */
    private fun loadModulo3WithRealData(view: View, league: League, userId: String) {
        lifecycleScope.launch {
            try {
                // Obtener el ranking de la liga
                val standings = leagueService.getLeagueStandings(league.id)
                displayLeagueRanking(view, standings.participants, userId)

                // Mostrar los premios de la liga
                displayLeaguePrizes(view, league.prizes)

            } catch (e: Exception) {
                Log.e(TAG, "❌ Error cargando módulo 3", e)
            }
        }
    }

    /**
     * Muestra el ranking de la liga dinámicamente
     */
    private fun displayLeagueRanking(view: View, participants: List<LeagueParticipant>, currentUserId: String) {
        val layoutRanking = view.findViewById<ViewGroup>(R.id.layoutLeagueRanking)
        layoutRanking.removeAllViews()

        // Mostrar top 5 o todos si hay menos
        val topParticipants = participants.sortedByDescending { it.currentPoints }.take(5)

        topParticipants.forEachIndexed { index, participant ->
            val isCurrentUser = participant.userId == currentUserId
            val rankingItem = layoutInflater.inflate(
                android.R.layout.simple_list_item_2,
                layoutRanking,
                false
            ) as ViewGroup

            // Agregar estilo especial para el usuario actual
            if (isCurrentUser) {
                rankingItem.setBackgroundColor(resources.getColor(R.color.primary_container, null))
            }

            val text1 = rankingItem.findViewById<TextView>(android.R.id.text1)
            val text2 = rankingItem.findViewById<TextView>(android.R.id.text2)

            // Formato: "#1 - Juan Pérez"
            val rankText = "#${index + 1}"
            val nameText = if (isCurrentUser) "TÚ" else participant.userName
            text1.text = "$rankText - $nameText"
            text1.textSize = 14f
            text1.setTypeface(null, if (isCurrentUser) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)

            // Puntos
            text2.text = "${formatMoney(participant.currentPoints)} pts"
            text2.textSize = 14f
            text2.setTypeface(null, android.graphics.Typeface.BOLD)

            layoutRanking.addView(rankingItem)

            // Agregar divider excepto después del último
            if (index < topParticipants.size - 1) {
                val divider = View(requireContext())
                divider.layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    2 // 1dp en píxeles
                )
                divider.setBackgroundColor(resources.getColor(R.color.divider, null))
                layoutRanking.addView(divider)
            }
        }
    }

    /**
     * Muestra los premios de la liga dinámicamente
     */
    private fun displayLeaguePrizes(view: View, prizes: List<models.LeaguePrize>) {
        val layoutPrizes = view.findViewById<ViewGroup>(R.id.layoutLeaguePrizes)
        layoutPrizes.removeAllViews()

        if (prizes.isEmpty()) {
            // Mostrar mensaje de "sin premios"
            val noPrizesText = TextView(requireContext())
            noPrizesText.text = "No hay premios configurados para esta liga"
            noPrizesText.textSize = 14f
            noPrizesText.setTextColor(resources.getColor(R.color.secondary_text, null))
            layoutPrizes.addView(noPrizesText)
            return
        }

        prizes.sortedBy { it.position }.forEach { prize ->
            val prizeContainer = LinearLayout(requireContext())
            prizeContainer.orientation = LinearLayout.VERTICAL
            prizeContainer.layoutParams = ViewGroup.MarginLayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = 16 // 16dp en píxeles
            }

            // Título del premio
            val prizeTitle = TextView(requireContext())
            val emoji = when (prize.position) {
                1 -> "🥇"
                2 -> "🥈"
                3 -> "🥉"
                else -> "🏅"
            }
            var prizeText = "$emoji ${prize.position}° lugar - ${prize.description}"
            if (prize.amount > 0) {
                prizeText += " - $${formatMoney(prize.amount)}"
            }
            prizeTitle.text = prizeText
            prizeTitle.textSize = 14f
            prizeTitle.setTypeface(null, android.graphics.Typeface.BOLD)
            prizeTitle.setTextColor(resources.getColor(R.color.primary_text, null))

            prizeContainer.addView(prizeTitle)
            layoutPrizes.addView(prizeContainer)
        }
    }

    private fun showNoGoalsMessage(view: View) {
        view.findViewById<TextView>(R.id.tvLlamadasValor).text = "Sin metas asignadas"
        view.findViewById<TextView>(R.id.tvColocacionValor).text = "Contacta al administrador"
    }

    private fun showNoLeagueMessage(view: View) {
        val layoutRanking = view.findViewById<ViewGroup>(R.id.layoutLeagueRanking)
        layoutRanking.removeAllViews()

        val noLeagueText = TextView(requireContext())
        noLeagueText.text = "No estás en una liga"
        noLeagueText.textSize = 14f
        noLeagueText.setTextColor(resources.getColor(R.color.secondary_text, null))
        noLeagueText.gravity = android.view.Gravity.CENTER
        noLeagueText.setPadding(16, 16, 16, 16)
        layoutRanking.addView(noLeagueText)
    }

    private fun showErrorMessage(view: View, message: String) {
        view.findViewById<TextView>(R.id.tvLlamadasValor).text = "Error"
        view.findViewById<TextView>(R.id.tvColocacionValor).text = message
    }

    /**
     * Formatea un número a formato de dinero con comas
     * Ejemplo: 125000 -> "125,000"
     */
    private fun formatMoney(amount: Int): String {
        return String.format("%,d", amount)
    }

    /**
     * Formatea un número a formato corto con K
     * Ejemplo: 450000 -> "450K"
     */
    private fun formatMoneyShort(amount: Int): String {
        return when {
            amount >= 1000000 -> String.format("%.1fM", amount / 1000000.0)
            amount >= 1000 -> "${amount / 1000}K"
            else -> amount.toString()
        }
    }
}
