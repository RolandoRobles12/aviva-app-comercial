package com.promotoresavivatunegocio_1.ui.attendance

import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.databinding.FragmentAttendanceBinding

/**
 * Fragment que abre la app web de asistencia en Chrome Custom Tabs
 *
 * SOLUCIÓN AL ERROR 403: disallowed_useragent
 * ============================================
 * Google bloquea el login OAuth en WebViews por seguridad.
 * Chrome Custom Tabs abre la web en el navegador Chrome real,
 * permitiendo el login OAuth sin problemas.
 *
 * VENTAJAS:
 * - ✅ Login OAuth funciona perfectamente (Google lo permite)
 * - ✅ NO requiere modificar la app web
 * - ✅ Mejor rendimiento que WebView
 * - ✅ Apariencia personalizada integrada en la app
 * - ✅ Cookies y sesión persistentes del navegador
 * - ✅ Soporte completo para todas las features web modernas
 *
 * URL de la web app: https://registro-aviva.web.app/
 */
class AttendanceFragment : Fragment() {
    private var _binding: FragmentAttendanceBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth

    companion object {
        private const val TAG = "AttendanceFragment"

        // URL de la web app de registro de asistencia
        // Para cambiar la URL, simplemente modifica esta constante
        private const val ATTENDANCE_WEB_URL = "https://registro-aviva.web.app/"
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAttendanceBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Inicializar Firebase Auth
        auth = FirebaseAuth.getInstance()

        setupUI()
    }

    private fun setupUI() {
        // Ocultar el WebView del layout (ya no se usa)
        binding.webView.visibility = View.GONE

        // Crear un mensaje de información y botón para abrir
        // Nota: Idealmente deberías crear un layout personalizado,
        // pero para simplicidad usamos el WebView para mostrar un mensaje
        val htmlContent = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        padding: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-align: center;
                    }
                    .container {
                        max-width: 400px;
                    }
                    h1 {
                        font-size: 28px;
                        margin-bottom: 16px;
                        font-weight: 700;
                    }
                    p {
                        font-size: 16px;
                        line-height: 1.6;
                        margin-bottom: 32px;
                        opacity: 0.9;
                    }
                    .button {
                        background: white;
                        color: #667eea;
                        padding: 16px 32px;
                        border-radius: 12px;
                        font-size: 18px;
                        font-weight: 600;
                        text-decoration: none;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        transition: transform 0.2s;
                    }
                    .info {
                        margin-top: 24px;
                        font-size: 14px;
                        opacity: 0.8;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>📋 Registro de Asistencia</h1>
                    <p>Se abrirá la aplicación web en una pestaña segura del navegador Chrome.</p>
                    <p class="info">✅ El login con Google funcionará correctamente<br>✅ Tu sesión se mantendrá entre visitas</p>
                </div>
            </body>
            </html>
        """.trimIndent()

        binding.webView.apply {
            visibility = View.VISIBLE
            loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
        }

        // Abrir automáticamente Chrome Custom Tabs cuando se crea la vista
        openInChromeCustomTabs()
    }

    /**
     * Abre la app web en Chrome Custom Tabs
     *
     * Chrome Custom Tabs es la solución oficial de Google para abrir contenido web
     * en apps Android manteniendo una buena UX y permitiendo OAuth.
     */
    private fun openInChromeCustomTabs() {
        try {
            Log.d(TAG, "Abriendo app web en Chrome Custom Tabs: $ATTENDANCE_WEB_URL")

            // Verificar que el usuario esté autenticado (opcional)
            val currentUser = auth.currentUser
            if (currentUser == null) {
                Log.w(TAG, "Usuario no autenticado, pero se permite acceso a la web")
                // Puedes decidir si permites o no el acceso sin autenticación
            } else {
                Log.d(TAG, "Usuario autenticado: ${currentUser.email}")
            }

            // Configurar colores personalizados para Chrome Custom Tabs
            // Usa los colores de tu app para que parezca integrado
            val colorSchemeParams = CustomTabColorSchemeParams.Builder()
                .setToolbarColor(ContextCompat.getColor(requireContext(), R.color.primary))
                .setSecondaryToolbarColor(ContextCompat.getColor(requireContext(), R.color.primary_dark))
                .setNavigationBarColor(ContextCompat.getColor(requireContext(), R.color.primary_dark))
                .build()

            // Crear el Custom Tab Intent
            val customTabsIntent = CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(colorSchemeParams)
                .setShowTitle(true)  // Mostrar título de la página
                .setUrlBarHidingEnabled(true)  // Ocultar URL bar al hacer scroll
                .setStartAnimations(requireContext(), android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                .setExitAnimations(requireContext(), android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                .build()

            // Abrir la URL
            customTabsIntent.launchUrl(requireContext(), Uri.parse(ATTENDANCE_WEB_URL))

            Log.d(TAG, "✅ Chrome Custom Tabs abierto exitosamente")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error al abrir Chrome Custom Tabs", e)
            Toast.makeText(
                requireContext(),
                "Error al abrir la aplicación web. Asegúrate de tener Chrome instalado.",
                Toast.LENGTH_LONG
            ).show()

            // Fallback: abrir en navegador normal si Chrome Custom Tabs falla
            openInExternalBrowser()
        }
    }

    /**
     * Fallback: Abre la URL en el navegador externo
     */
    private fun openInExternalBrowser() {
        try {
            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
                data = Uri.parse(ATTENDANCE_WEB_URL)
            }
            startActivity(intent)
            Log.d(TAG, "✅ URL abierta en navegador externo")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error al abrir navegador externo", e)
            Toast.makeText(
                requireContext(),
                "No se pudo abrir la aplicación web",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    override fun onResume() {
        super.onResume()
        Log.d(TAG, "AttendanceFragment resumed")

        // Opcional: Re-abrir Chrome Custom Tabs cuando el usuario vuelva al fragment
        // Descomenta la siguiente línea si quieres este comportamiento
        // openInChromeCustomTabs()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
