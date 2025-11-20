package com.promotoresavivatunegocio_1.ui.registro

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
 * Fragment para el menú de Registro
 * Muestra 3 opciones principales: Asistencia, Prospectos y Advertencias
 */
class RegistroFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_registro, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupCardListeners(view)
    }

    private fun setupCardListeners(view: View) {
        // Card 1: Registrar entradas, comidas y salidas
        view.findViewById<MaterialCardView>(R.id.cardAsistencia).setOnClickListener {
            navigateToAttendance()
        }

        // Card 2: Buscar prospectos y levantar solicitudes
        view.findViewById<MaterialCardView>(R.id.cardProspectos).setOnClickListener {
            navigateToAvivaTuNegocio()
        }

        // Card 3: Advertencias de retrasos y faltas
        view.findViewById<MaterialCardView>(R.id.cardAdvertencias).setOnClickListener {
            showComingSoon("Advertencias")
        }
    }

    private fun navigateToAttendance() {
        try {
            findNavController().navigate(R.id.navigation_attendance)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Error al navegar a Asistencia", Toast.LENGTH_SHORT).show()
        }
    }

    private fun navigateToAvivaTuNegocio() {
        try {
            findNavController().navigate(R.id.navigation_aviva_tu_negocio)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Error al navegar a Aviva Tu Negocio", Toast.LENGTH_SHORT).show()
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
