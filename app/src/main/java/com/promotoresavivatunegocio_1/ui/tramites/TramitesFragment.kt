package com.promotoresavivatunegocio_1.ui.tramites

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
import com.promotoresavivatunegocio_1.databinding.FragmentTramitesBinding

/**
 * Fragment que abre el software de HR en Chrome Custom Tabs
 *
 * Permite a los usuarios gestionar:
 * - Vacaciones
 * - Aviva days
 * - Incapacidad
 *
 * URL del software de HR: https://app.humand.co/vacations
 */
class TramitesFragment : Fragment() {
    private var _binding: FragmentTramitesBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth

    companion object {
        private const val TAG = "TramitesFragment"

        // URL del software de HR
        private const val HR_SOFTWARE_URL = "https://app.humand.co/vacations"
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTramitesBinding.inflate(inflater, container, false)
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

        // Crear un mensaje de información
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
                    .info {
                        margin-top: 24px;
                        font-size: 14px;
                        opacity: 0.8;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>📄 Trámites de HR</h1>
                    <p>Se abrirá el software de HR en una pestaña segura del navegador.</p>
                    <p class="info">✅ Vacaciones<br>✅ Aviva days<br>✅ Incapacidad</p>
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
     * Abre el software de HR en Chrome Custom Tabs
     */
    private fun openInChromeCustomTabs() {
        try {
            Log.d(TAG, "Abriendo software de HR en Chrome Custom Tabs: $HR_SOFTWARE_URL")

            // Verificar que el usuario esté autenticado (opcional)
            val currentUser = auth.currentUser
            if (currentUser == null) {
                Log.w(TAG, "Usuario no autenticado, pero se permite acceso a la web")
            } else {
                Log.d(TAG, "Usuario autenticado: ${currentUser.email}")
            }

            // Configurar colores personalizados para Chrome Custom Tabs
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
            customTabsIntent.launchUrl(requireContext(), Uri.parse(HR_SOFTWARE_URL))

            Log.d(TAG, "✅ Chrome Custom Tabs abierto exitosamente")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error al abrir Chrome Custom Tabs", e)
            Toast.makeText(
                requireContext(),
                "Error al abrir el software de HR. Asegúrate de tener Chrome instalado.",
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
                data = Uri.parse(HR_SOFTWARE_URL)
            }
            startActivity(intent)
            Log.d(TAG, "✅ URL abierta en navegador externo")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error al abrir navegador externo", e)
            Toast.makeText(
                requireContext(),
                "No se pudo abrir el software de HR",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    override fun onResume() {
        super.onResume()
        Log.d(TAG, "TramitesFragment resumed")
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
