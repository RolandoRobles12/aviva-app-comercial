package com.promotoresavivatunegocio_1.ui.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.card.MaterialCardView
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.R

/**
 * HomeFragment - Pantalla principal de inicio
 * Muestra un menú de navegación con todas las secciones principales de la app
 */
class HomeFragment : Fragment() {

    private lateinit var auth: FirebaseAuth

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_home, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Inicializar Firebase Auth
        auth = FirebaseAuth.getInstance()

        // Configurar el mensaje de bienvenida
        setupWelcomeMessage(view)

        // Configurar los listeners de las cards
        setupCardListeners(view)
    }

    private fun setupWelcomeMessage(view: View) {
        val welcomeText = view.findViewById<TextView>(R.id.welcomeText)
        val currentUser = auth.currentUser

        if (currentUser != null) {
            val displayName = currentUser.displayName
            if (!displayName.isNullOrEmpty()) {
                welcomeText.text = "¡Bienvenido, $displayName!"
            } else {
                welcomeText.text = "¡Bienvenido!"
            }
        } else {
            welcomeText.text = "¡Bienvenido!"
        }
    }

    private fun setupCardListeners(view: View) {
        // Card: Mis metas comerciales
        view.findViewById<MaterialCardView>(R.id.cardMetasComerciales).setOnClickListener {
            navigateToCommercialGoals()
        }

        // Card: Mi carrera
        view.findViewById<MaterialCardView>(R.id.cardMiCarrera).setOnClickListener {
            navigateToProfile()
        }

        // Card: Registro
        view.findViewById<MaterialCardView>(R.id.cardRegistro).setOnClickListener {
            navigateToRegistro()
        }

        // Card: Mi camino de aprendizaje
        view.findViewById<MaterialCardView>(R.id.cardAprendizaje).setOnClickListener {
            showComingSoon("Mi camino de aprendizaje")
        }

        // Card: Ayuda - Chatbot Asistente
        view.findViewById<MaterialCardView>(R.id.cardAyuda).setOnClickListener {
            navigateToHelpAssistant()
        }

        // Card: Trámites
        view.findViewById<MaterialCardView>(R.id.cardTramites).setOnClickListener {
            navigateToTramites()
        }
    }

    private fun navigateToCommercialGoals() {
        try {
            findNavController().navigate(R.id.navigation_commercial_goals)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Error al navegar", Toast.LENGTH_SHORT).show()
        }
    }

    private fun navigateToProfile() {
        try {
            findNavController().navigate(R.id.navigation_mi_carrera)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Error al navegar", Toast.LENGTH_SHORT).show()
        }
    }

    private fun navigateToRegistro() {
        try {
            findNavController().navigate(R.id.navigation_registro)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Error al navegar", Toast.LENGTH_SHORT).show()
        }
    }

    private fun navigateToHelpAssistant() {
        try {
            findNavController().navigate(R.id.navigation_help_assistant)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Error al navegar al asistente", Toast.LENGTH_SHORT).show()
        }
    }

    private fun navigateToTramites() {
        try {
            findNavController().navigate(R.id.navigation_tramites)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Error al navegar a trámites", Toast.LENGTH_SHORT).show()
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
