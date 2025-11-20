package com.promotoresavivatunegocio_1.ui.commercialgoals

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.card.MaterialCardView
import com.promotoresavivatunegocio_1.R

/**
 * Fragment para la pantalla de Metas Comerciales
 * Muestra 4 opciones principales: Metas, Ligas, Bonos y Premios
 */
class CommercialGoalsFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_commercial_goals, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupCardListeners(view)
    }

    private fun setupCardListeners(view: View) {
        // Card Metas
        view.findViewById<MaterialCardView>(R.id.cardMetas).setOnClickListener {
            navigateToMetrics()
        }

        // Card Ligas
        view.findViewById<MaterialCardView>(R.id.cardLigas).setOnClickListener {
            navigateToLeagues()
        }

        // Card Bonos
        view.findViewById<MaterialCardView>(R.id.cardBonos).setOnClickListener {
            showComingSoon("Bonos")
        }

        // Card Premios
        view.findViewById<MaterialCardView>(R.id.cardPremios).setOnClickListener {
            showComingSoon("Premios")
        }
    }

    private fun navigateToMetrics() {
        try {
            findNavController().navigate(R.id.navigation_metrics)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Error al navegar a Métricas", Toast.LENGTH_SHORT).show()
        }
    }

    private fun navigateToLeagues() {
        try {
            findNavController().navigate(R.id.navigation_leagues)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Error al navegar a Ligas", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showComingSoon(feature: String) {
        Toast.makeText(
            requireContext(),
            "$feature - Próximamente disponible",
            Toast.LENGTH_SHORT
        ).show()
    }
}
