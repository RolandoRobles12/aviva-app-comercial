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
 * Módulos visibles:
 *   - Metas (todos)
 *   - Registro → Asistencia directa (todos)
 *   - Prospectos → Aviva Tu Negocio (solo AVIVA_TU_NEGOCIO)
 *   - Camino de aprendizaje → LMS embed (todos)
 *   - Asistente (todos)
 *   - Trámites (todos)
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
                // Silently fail - prospectos card permanece oculta por defecto
            }
    }

    private fun applyProductLayout(view: View, user: User) {
        val productNameText = view.findViewById<TextView>(R.id.productNameText)
        val productSubtitleText = view.findViewById<TextView>(R.id.productSubtitleText)
        val textMetasComerciales = view.findViewById<TextView>(R.id.textMetasComerciales)
        val cardProspectos = view.findViewById<MaterialCardView>(R.id.cardProspectos)

        // Mostrar prospectos solo para línea Aviva Tu Negocio
        if (user.productLine == User.ProductLine.AVIVA_TU_NEGOCIO) {
            cardProspectos.visibility = View.VISIBLE
        } else {
            cardProspectos.visibility = View.GONE
        }

        when (user.productLine) {
            User.ProductLine.CONSTRURAMA -> {
                productNameText.text = "Construrama"
                productSubtitleText.text = "Promotores"
                textMetasComerciales.text = "Mis metas"
            }
            else -> {
                productNameText.text = "Aviva Tu Negocio"
                productSubtitleText.text = "Promotores"
                textMetasComerciales.text = "Mis metas comerciales"
            }
        }
    }

    private fun setupCardListeners(view: View) {
        view.findViewById<MaterialCardView>(R.id.cardMetasComerciales).setOnClickListener {
            navigate(R.id.navigation_commercial_goals)
        }

        // Registro va directo a Asistencia (entradas, comidas y salidas)
        view.findViewById<MaterialCardView>(R.id.cardRegistro).setOnClickListener {
            navigate(R.id.navigation_attendance)
        }

        // Prospectos: visible solo para AVIVA_TU_NEGOCIO (controlado en applyProductLayout)
        view.findViewById<MaterialCardView>(R.id.cardProspectos).setOnClickListener {
            navigate(R.id.navigation_aviva_tu_negocio)
        }

        // Camino de aprendizaje: LMS embed
        view.findViewById<MaterialCardView>(R.id.cardAprendizaje).setOnClickListener {
            navigate(R.id.navigation_lms)
        }

        view.findViewById<MaterialCardView>(R.id.cardAyuda).setOnClickListener {
            navigate(R.id.navigation_help_assistant)
        }

        view.findViewById<MaterialCardView>(R.id.cardTramites).setOnClickListener {
            navigate(R.id.navigation_tramites)
        }
    }

    private fun navigate(destinationId: Int) {
        try {
            findNavController().navigate(destinationId)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Error al navegar", Toast.LENGTH_SHORT).show()
        }
    }
}
