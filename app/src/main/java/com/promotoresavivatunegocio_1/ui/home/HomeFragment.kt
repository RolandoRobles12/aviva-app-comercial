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
import com.google.firebase.firestore.FirebaseFirestore
import com.promotoresavivatunegocio_1.R
import models.User

/**
 * HomeFragment - Pantalla principal de inicio
 * Muestra un menú de navegación adaptado según el producto del vendedor:
 * - Aviva Tu Negocio: branding y textos de Aviva Tu Negocio Promotores
 * - Construrama: branding y textos de Construrama
 */
class HomeFragment : Fragment() {

    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_home, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()
        db = FirebaseFirestore.getInstance()

        setupWelcomeMessage(view)
        setupCardListeners(view)
        loadUserAndAdaptLayout(view)
    }

    private fun setupWelcomeMessage(view: View) {
        val welcomeText = view.findViewById<TextView>(R.id.welcomeText)
        val currentUser = auth.currentUser

        if (currentUser != null) {
            val displayName = currentUser.displayName
            if (!displayName.isNullOrEmpty()) {
                val firstName = displayName.split(" ").firstOrNull() ?: displayName
                welcomeText.text = "¡Hola, $firstName!"
            } else {
                welcomeText.text = "¡Bienvenido!"
            }
        } else {
            welcomeText.text = "¡Bienvenido!"
        }
    }

    /**
     * Carga el perfil del usuario desde Firestore y adapta el layout
     * según su producto (Aviva Tu Negocio o Construrama).
     */
    private fun loadUserAndAdaptLayout(view: View) {
        val uid = auth.currentUser?.uid ?: return

        db.collection("users").document(uid)
            .get()
            .addOnSuccessListener { doc ->
                if (doc.exists()) {
                    val user = doc.toObject(User::class.java)
                    if (user != null) {
                        applyProductLayout(view, user)
                    }
                }
            }
            .addOnFailureListener {
                // Silently fail - use default Aviva Tu Negocio layout
            }
    }

    /**
     * Aplica los textos y el layout correspondiente al producto del usuario.
     */
    private fun applyProductLayout(view: View, user: User) {
        val productNameText = view.findViewById<TextView>(R.id.productNameText)
        val productSubtitleText = view.findViewById<TextView>(R.id.productSubtitleText)
        val textMetasComerciales = view.findViewById<TextView>(R.id.textMetasComerciales)

        when (user.productLine) {
            User.ProductLine.CONSTRURAMA -> applyConstructamaLayout(
                productNameText, productSubtitleText, textMetasComerciales
            )
            else -> applyAvivaTuNegocioLayout(
                productNameText, productSubtitleText, textMetasComerciales
            )
        }
    }

    private fun applyAvivaTuNegocioLayout(
        productNameText: TextView,
        productSubtitleText: TextView,
        textMetasComerciales: TextView
    ) {
        productNameText.text = "Aviva Tu Negocio"
        productSubtitleText.text = "Promotores"
        textMetasComerciales.text = "Mis metas comerciales"
    }

    private fun applyConstructamaLayout(
        productNameText: TextView,
        productSubtitleText: TextView,
        textMetasComerciales: TextView
    ) {
        productNameText.text = "Construrama"
        productSubtitleText.text = "Promotores"
        textMetasComerciales.text = "Mis metas"
    }

    private fun setupCardListeners(view: View) {
        view.findViewById<MaterialCardView>(R.id.cardMetasComerciales).setOnClickListener {
            navigateToCommercialGoals()
        }

        view.findViewById<MaterialCardView>(R.id.cardMiCarrera).setOnClickListener {
            navigateToProfile()
        }

        view.findViewById<MaterialCardView>(R.id.cardRegistro).setOnClickListener {
            navigateToRegistro()
        }

        view.findViewById<MaterialCardView>(R.id.cardAprendizaje).setOnClickListener {
            showComingSoon("Mi camino de aprendizaje")
        }

        view.findViewById<MaterialCardView>(R.id.cardAyuda).setOnClickListener {
            navigateToHelpAssistant()
        }

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
