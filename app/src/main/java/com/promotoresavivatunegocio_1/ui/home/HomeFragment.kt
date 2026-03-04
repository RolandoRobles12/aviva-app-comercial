package com.promotoresavivatunegocio_1.ui.home

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.card.MaterialCardView
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.promotoresavivatunegocio_1.MainActivity
import com.promotoresavivatunegocio_1.R
import models.User
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * HomeFragment — Pantalla principal.
 *
 * Módulos visibles:
 *   - Registro  → Asistencia directa (todos)  ← Hero card con estado del día
 *   - Metas     → CommercialGoals (todos)
 *   - Prospectos→ AvivaTuNegocio (solo AVIVA_TU_NEGOCIO)
 *   - Aprendizaje → LMS embed (todos)
 *   - Asistente → HelpAssistant (todos)
 *   - Trámites  → Tramites (todos)
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
        db   = FirebaseFirestore.getInstance()

        setupHeader(view)
        setupCardListeners(view)
        loadUserAndAdaptLayout(view)
        loadTodayAttendanceStatus(view)
    }

    // ──────────────────────────────────────────────────────────────────
    // Header: saludo + fecha + iniciales en avatar
    // ──────────────────────────────────────────────────────────────────

    private fun setupHeader(view: View) {
        val currentUser = auth.currentUser

        // Saludo con nombre
        val displayName = currentUser?.displayName
        val firstName = displayName?.trim()?.split(" ")?.firstOrNull() ?: "Bienvenido"
        val greeting = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
            in 5..11  -> "¡Buenos días, $firstName!"
            in 12..18 -> "¡Buenas tardes, $firstName!"
            else      -> "¡Buenas noches, $firstName!"
        }
        view.findViewById<TextView>(R.id.welcomeText).text = greeting

        // Fecha localizada: "Miércoles, 4 de marzo"
        val sdf = SimpleDateFormat("EEEE, d 'de' MMMM", Locale("es", "MX"))
        val dateStr = sdf.format(Date()).replaceFirstChar { it.uppercaseChar() }
        view.findViewById<TextView>(R.id.textDate).text = dateStr

        // Iniciales en el avatar
        if (!displayName.isNullOrBlank()) {
            val parts = displayName.trim().split("\\s+".toRegex())
            val initials = when {
                parts.size >= 2 -> "${parts[0].first().uppercaseChar()}${parts[1].first().uppercaseChar()}"
                else            -> parts[0].take(2).uppercase()
            }
            view.findViewById<TextView>(R.id.textUserInitials).text = initials
        }

        // Avatar tap → logout
        view.findViewById<MaterialCardView>(R.id.cardUserAvatar).setOnClickListener {
            (requireActivity() as? MainActivity)?.showLogoutConfirmationDialog()
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // Estado del día en la hero card de Registro
    // Consulta la colección "checkins" para hoy y actualiza el badge
    // ──────────────────────────────────────────────────────────────────

    private fun loadTodayAttendanceStatus(view: View) {
        val uid = auth.currentUser?.uid ?: return

        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0);      cal.set(Calendar.MILLISECOND, 0)
        val startOfDay = Timestamp(cal.time)

        cal.set(Calendar.HOUR_OF_DAY, 23); cal.set(Calendar.MINUTE, 59)
        cal.set(Calendar.SECOND, 59);      cal.set(Calendar.MILLISECOND, 999)
        val endOfDay = Timestamp(cal.time)

        db.collection("checkins")
            .whereEqualTo("userId", uid)
            .whereGreaterThanOrEqualTo("timestamp", startOfDay)
            .whereLessThanOrEqualTo("timestamp", endOfDay)
            .get()
            .addOnSuccessListener { snap ->
                val types = snap.documents.mapNotNull { it.getString("type") }.toSet()
                if (isAdded) updateRegistroStatusBadge(view, types)
            }
            // En caso de fallo el badge permanece en "Sin registro hoy"
    }

    private fun updateRegistroStatusBadge(view: View, types: Set<String>) {
        val textStatus = view.findViewById<TextView>(R.id.textRegistroStatus)
        val cardStatus = view.findViewById<MaterialCardView>(R.id.cardRegistroStatus)

        val hasSalida  = types.contains("SALIDA")
        val hasComida  = types.contains("COMIDA")
        val hasEntrada = types.contains("ENTRADA")

        val (label, colorRes) = when {
            hasEntrada && hasSalida ->
                Pair("✓ Día completo", R.color.primary_dark)
            hasEntrada && hasComida ->
                Pair("✓ Entrada y comida registradas", R.color.aviva_green)
            hasEntrada ->
                Pair("✓ Entrada registrada", R.color.aviva_green)
            else ->
                Pair("● Sin registro hoy", R.color.warning_color)
        }

        textStatus.text = label
        cardStatus.setCardBackgroundColor(
            ContextCompat.getColor(requireContext(), colorRes)
        )
        textStatus.setTextColor(Color.WHITE)
    }

    // ──────────────────────────────────────────────────────────────────
    // Adaptar layout al producto del usuario (textos + visibilidad)
    // ──────────────────────────────────────────────────────────────────

    private fun loadUserAndAdaptLayout(view: View) {
        val uid = auth.currentUser?.uid ?: return
        db.collection("users").document(uid)
            .get()
            .addOnSuccessListener { doc ->
                val user = doc.toObject(User::class.java)
                if (user != null && isAdded) applyProductLayout(view, user)
            }
    }

    private fun applyProductLayout(view: View, user: User) {
        val productNameText    = view.findViewById<TextView>(R.id.productNameText)
        val textMetasLabel     = view.findViewById<TextView>(R.id.textMetasComerciales)
        val cardProspectos     = view.findViewById<MaterialCardView>(R.id.cardProspectos)

        // Prospectos: solo para línea Aviva Tu Negocio
        cardProspectos.visibility =
            if (user.productLine == User.ProductLine.AVIVA_TU_NEGOCIO) View.VISIBLE
            else View.GONE

        when (user.productLine) {
            User.ProductLine.CONSTRURAMA -> {
                productNameText.text = "Construrama · Promotores"
                textMetasLabel.text  = "Mis metas"
            }
            else -> {
                productNameText.text = "Aviva Tu Negocio · Promotores"
                textMetasLabel.text  = "Mis metas comerciales"
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // Navegación
    // ──────────────────────────────────────────────────────────────────

    private fun setupCardListeners(view: View) {
        // Registro → directo a Asistencia
        view.findViewById<MaterialCardView>(R.id.cardRegistro).setOnClickListener {
            navigate(R.id.navigation_attendance)
        }
        // Metas comerciales
        view.findViewById<MaterialCardView>(R.id.cardMetasComerciales).setOnClickListener {
            navigate(R.id.navigation_commercial_goals)
        }
        // Prospectos (solo AVIVA_TU_NEGOCIO, visibilidad controlada en applyProductLayout)
        view.findViewById<MaterialCardView>(R.id.cardProspectos).setOnClickListener {
            navigate(R.id.navigation_aviva_tu_negocio)
        }
        // LMS embed
        view.findViewById<MaterialCardView>(R.id.cardAprendizaje).setOnClickListener {
            navigate(R.id.navigation_lms)
        }
        // Asistente IA
        view.findViewById<MaterialCardView>(R.id.cardAyuda).setOnClickListener {
            navigate(R.id.navigation_help_assistant)
        }
        // Trámites
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
