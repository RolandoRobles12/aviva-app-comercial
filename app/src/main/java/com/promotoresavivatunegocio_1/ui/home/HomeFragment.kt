package com.promotoresavivatunegocio_1.ui.home

import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.google.android.material.card.MaterialCardView
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.promotoresavivatunegocio_1.MainActivity
import com.promotoresavivatunegocio_1.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import models.User
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * HomeFragment — Pantalla principal.
 *
 * Módulos visibles:
 *   - Registro  → Asistencia directa (todos)  ← Hero card con estado del día
 *   - Metas     → MetasBono (todos)
 *   - Prospectos→ AvivaTuNegocio (solo AVIVA_TU_NEGOCIO)
 *   - Aprendizaje → LMS embed (todos)
 *   - Trámites  → Tramites (todos)
 */
class HomeFragment : Fragment() {

    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore

    // Guardamos la línea de producto para decidir la navegación del mapa
    private var userProductLine: User.ProductLine? = null

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
    // Los check-ins están en el proyecto Firebase "registro-aviva".
    // Se consulta via REST API (lectura pública) usando el email del usuario.
    // ──────────────────────────────────────────────────────────────────

    private fun loadTodayAttendanceStatus(view: View) {
        val email = auth.currentUser?.email ?: return

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val types = withContext(Dispatchers.IO) { fetchTodayCheckIns(email) }
                if (isAdded) updateRegistroStatusBadge(view, types)
            } catch (e: Exception) {
                Log.e("HomeFragment", "Error cargando check-ins", e)
                // Badge permanece en "Sin registro hoy"
            }
        }
    }

    /**
     * Consulta la colección "checkins" en el proyecto Firebase "registro-aviva"
     * usando la REST API de Firestore (lectura pública, sin credenciales).
     *
     * Filtra solo por email y luego determina si el registro es de hoy en la
     * zona horaria LOCAL del dispositivo (evita errores UTC vs hora México).
     */
    private fun fetchTodayCheckIns(email: String): Set<String> {
        val endpoint = "https://firestore.googleapis.com/v1/projects/registro-aviva" +
                "/databases/(default)/documents:runQuery"

        val emailEscaped = email.replace("\"", "\\\"")

        // Rango del día de hoy usando zona horaria LOCAL del dispositivo.
        // Los timestamps en Firestore se guardan en UTC, así que convertimos
        // medianoche/23:59 hora local a epoch millis y luego a RFC3339 UTC.
        val cal = Calendar.getInstance() // zona horaria local
        cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0);      cal.set(Calendar.MILLISECOND, 0)
        val startMs = cal.timeInMillis
        cal.set(Calendar.HOUR_OF_DAY, 23); cal.set(Calendar.MINUTE, 59)
        cal.set(Calendar.SECOND, 59)
        val endMs = cal.timeInMillis

        val utcFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }
        val startTs = utcFmt.format(Date(startMs))
        val endTs   = utcFmt.format(Date(endMs))

        val body = """
            {
              "structuredQuery": {
                "from": [{"collectionId": "checkins"}],
                "where": {
                  "compositeFilter": {
                    "op": "AND",
                    "filters": [
                      {
                        "fieldFilter": {
                          "field": {"fieldPath": "email"},
                          "op": "EQUAL",
                          "value": {"stringValue": "$emailEscaped"}
                        }
                      },
                      {
                        "fieldFilter": {
                          "field": {"fieldPath": "timestamp"},
                          "op": "GREATER_THAN_OR_EQUAL",
                          "value": {"timestampValue": "$startTs"}
                        }
                      },
                      {
                        "fieldFilter": {
                          "field": {"fieldPath": "timestamp"},
                          "op": "LESS_THAN_OR_EQUAL",
                          "value": {"timestampValue": "$endTs"}
                        }
                      }
                    ]
                  }
                },
                "select": {
                  "fields": [{"fieldPath": "type"}]
                }
              }
            }
        """.trimIndent()

        val conn = URL(endpoint).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 10_000
        conn.readTimeout = 10_000

        try {
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            if (code != 200) {
                val errorBody = conn.errorStream?.bufferedReader()?.readText() ?: ""
                Log.w("HomeFragment", "Firestore REST devolvió $code: $errorBody")
                return emptySet()
            }

            val response = conn.inputStream.bufferedReader().readText()
            Log.d("HomeFragment", "check-ins hoy (raw): $response")

            // "type": { "stringValue": "entrada" }
            val pattern = Regex(""""type"\s*:\s*\{\s*"stringValue"\s*:\s*"([^"]+)"""")
            return pattern.findAll(response)
                .map { it.groupValues[1].lowercase() }
                .toSet()
        } finally {
            conn.disconnect()
        }
    }

    private fun updateRegistroStatusBadge(view: View, types: Set<String>) {
        val textStatus = view.findViewById<TextView>(R.id.textRegistroStatus)
        val cardStatus = view.findViewById<MaterialCardView>(R.id.cardRegistroStatus)

        val hasEntrada = types.contains("entrada")
        val hasComida  = types.contains("comida")
        val hasSalida  = types.contains("salida")

        val (label, colorRes) = when {
            hasEntrada && hasSalida ->
                Pair("✓ Día completo", R.color.primary_dark)
            hasEntrada && hasComida ->
                Pair("✓ Entrada y comida registradas", R.color.aviva_green)
            hasEntrada ->
                Pair("✓ Entrada registrada", R.color.aviva_green)
            hasSalida || hasComida ->
                Pair("✓ Registro parcial", R.color.aviva_green)
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
        val uid   = auth.currentUser?.uid   ?: return
        val email = auth.currentUser?.email ?: return

        db.collection("users").document(uid)
            .get()
            .addOnSuccessListener { doc ->
                val user = doc.toObject(User::class.java)
                if (user != null && isAdded) {
                    applyProductLayout(view, user)
                } else {
                    // El documento no existe por UID (creado desde el admin con addDoc).
                    // Buscamos por email para obtener la línea de producto correcta.
                    db.collection("users")
                        .whereEqualTo("email", email)
                        .limit(1)
                        .get()
                        .addOnSuccessListener { query ->
                            val emailUser = query.documents.firstOrNull()?.toObject(User::class.java)
                            if (emailUser != null && isAdded) applyProductLayout(view, emailUser)
                        }
                }
            }
    }

    private fun applyProductLayout(view: View, user: User) {
        val productNameText        = view.findViewById<TextView>(R.id.productNameText)
        val textMetasLabel         = view.findViewById<TextView>(R.id.textMetasComerciales)
        val cardProspectos         = view.findViewById<MaterialCardView>(R.id.cardProspectos)
        val textProspectosIcon     = view.findViewById<TextView>(R.id.textProspectosIcon)
        val textProspectosLabel    = view.findViewById<TextView>(R.id.textProspectosLabel)
        val textProspectosSubtitle = view.findViewById<TextView>(R.id.textProspectosSubtitle)

        // Guardamos la línea de producto para la navegación del botón
        userProductLine = user.productLine

        // Visible para todos los productos
        cardProspectos.visibility = View.VISIBLE

        if (user.productLine == User.ProductLine.AVIVA_TU_NEGOCIO) {
            // Sección completa de prospección
            textProspectosIcon.text     = "🔍"
            textProspectosLabel.text    = "Prospectos"
            textProspectosSubtitle.text = "Buscar y levantar solicitudes"
        }
        // El resto de productos usa los defaults del XML:
        // 🗺️ / "Mapa de Zonas" / "Ver zonas asignadas y restricciones"

        when (user.productLine) {
            User.ProductLine.CONSTRURAMA -> {
                productNameText.text = "Construrama · Promotores"
                textMetasLabel.text  = "Mis metas"
            }
            else -> {
                productNameText.text = "App Comercial Aviva"
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
        // Metas comerciales → directo a Metas & Bono (ventas y solicitudes)
        view.findViewById<MaterialCardView>(R.id.cardMetasComerciales).setOnClickListener {
            navigate(R.id.navigation_metas_bono)
        }
        // Mapa / Prospectos: AVIVA_TU_NEGOCIO → sección completa; resto → mapa simple de zonas
        view.findViewById<MaterialCardView>(R.id.cardProspectos).setOnClickListener {
            if (userProductLine == User.ProductLine.AVIVA_TU_NEGOCIO) {
                navigate(R.id.navigation_aviva_tu_negocio)
            } else {
                navigate(R.id.navigation_zone_map)
            }
        }
        // LMS embed
        view.findViewById<MaterialCardView>(R.id.cardAprendizaje).setOnClickListener {
            navigate(R.id.navigation_lms)
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
