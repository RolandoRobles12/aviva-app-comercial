package com.promotoresavivatunegocio_1.ui.metrics

import android.net.Uri
import android.os.Bundle
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
import com.promotoresavivatunegocio_1.databinding.FragmentMetricsBinding

/**
 * Fragmento de Métricas y Reportería - Looker Studio
 *
 * Muestra tus dashboards de Looker Studio en Chrome Custom Tabs
 *
 * CONFIGURACIÓN SUPER SIMPLE:
 * 1. Copia las URLs de tus dashboards de Looker Studio
 * 2. Pégalas en las constantes LOOKER_*_DASHBOARD abajo (líneas 63-68)
 * 3. Compila y ejecuta
 * 4. ¡Listo!
 *
 * VENTAJAS DE CHROME CUSTOM TABS:
 * ✅ Login de Google funciona sin error 403
 * ✅ Todas las funciones de Looker Studio disponibles
 * ✅ Filtros interactivos funcionan
 * ✅ Exportar a PDF/Excel disponible
 * ✅ Mejor rendimiento
 * ✅ Apariencia integrada con los colores de tu app
 */
class MetricsFragment : Fragment() {
    private var _binding: FragmentMetricsBinding? = null
    private val binding get() = _binding!!

    private val auth = FirebaseAuth.getInstance()

    companion object {
        private const val TAG = "MetricsFragment"

        // ============================================================================
        // CONFIGURACIÓN - CAMBIA ESTAS URLs POR TUS DASHBOARDS DE LOOKER STUDIO
        // ============================================================================

        /**
         * URLs de tus dashboards de Looker Studio
         *
         * CÓMO OBTENER LA URL:
         * 1. Ve a Looker Studio (https://lookerstudio.google.com)
         * 2. Abre tu dashboard
         * 3. Copia la URL de la barra de direcciones
         * 4. Pégala aquí
         */
        private const val LOOKER_MAIN_DASHBOARD = "https://lookerstudio.google.com/u/0/reporting/5f4ab63e-bea9-4726-96f3-078ffd1ff9cb/page/iWhNF"

        // Dashboards específicos por período (opcional - si tienes dashboards separados)
        private const val LOOKER_DAILY_DASHBOARD = "https://lookerstudio.google.com/u/0/reporting/5f4ab63e-bea9-4726-96f3-078ffd1ff9cb/page/iWhNF"
        private const val LOOKER_WEEKLY_DASHBOARD = "https://lookerstudio.google.com/u/0/reporting/5f4ab63e-bea9-4726-96f3-078ffd1ff9cb/page/iWhNF"
        private const val LOOKER_MONTHLY_DASHBOARD = "https://lookerstudio.google.com/u/0/reporting/5f4ab63e-bea9-4726-96f3-078ffd1ff9cb/page/iWhNF"

        /**
         * MODO DE VISUALIZACIÓN: Chrome Custom Tabs
         *
         * Los dashboards se abren en Chrome Custom Tabs automáticamente.
         * Esto asegura que el login de Google funcione sin problemas.
         */
        enum class DisplayMode {
            CHROME_TABS   // Único modo disponible
        }

        // Siempre usa Chrome Custom Tabs (recomendado por Google)
        private val DISPLAY_MODE = DisplayMode.CHROME_TABS

        /**
         * ¿Usar dashboards separados por período?
         * - true: Usar LOOKER_DAILY_DASHBOARD, LOOKER_WEEKLY_DASHBOARD, etc.
         * - false: Usar solo LOOKER_MAIN_DASHBOARD para todo
         */
        private const val USE_SEPARATE_DASHBOARDS = false

        /**
         * ¿Filtrar dashboards por usuario?
         * Si tus dashboards de Looker Studio tienen configurado un parámetro
         * de usuario, puedes pasarlo en la URL
         *
         * Ejemplo: ?params={"userId":"VALOR"}
         */
        private const val ENABLE_USER_FILTER = false
        private const val USER_PARAM_NAME = "userId"  // Nombre del parámetro en Looker Studio
    }

    private var currentDashboardUrl = LOOKER_MAIN_DASHBOARD

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentMetricsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupUI()

        // Mostrar dashboard en Chrome Custom Tabs
        showInfoAndOpenChromeTabs()
    }

    private fun setupUI() {
        // Configurar botones de período
        binding.btnDaily.setOnClickListener {
            currentDashboardUrl = if (USE_SEPARATE_DASHBOARDS) {
                LOOKER_DAILY_DASHBOARD
            } else {
                LOOKER_MAIN_DASHBOARD
            }
            openDashboard()
        }

        binding.btnWeekly.setOnClickListener {
            currentDashboardUrl = if (USE_SEPARATE_DASHBOARDS) {
                LOOKER_WEEKLY_DASHBOARD
            } else {
                LOOKER_MAIN_DASHBOARD
            }
            openDashboard()
        }

        binding.btnMonthly.setOnClickListener {
            currentDashboardUrl = if (USE_SEPARATE_DASHBOARDS) {
                LOOKER_MONTHLY_DASHBOARD
            } else {
                LOOKER_MAIN_DASHBOARD
            }
            openDashboard()
        }

        binding.btnRefresh.setOnClickListener {
            openDashboard()
        }
    }

    private fun openDashboard() {
        openInChromeTabs(currentDashboardUrl)
    }

    // ============================================================================
    // MODO 1: CHROME CUSTOM TABS (Recomendado)
    // ============================================================================

    private fun showInfoAndOpenChromeTabs() {
        // Ocultar otros elementos
        binding.progressBar.visibility = View.GONE
        binding.scrollContent.visibility = View.GONE

        // Abrir automáticamente el dashboard
        openInChromeTabs(currentDashboardUrl)
    }

    private fun openInChromeTabs(dashboardUrl: String) {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            Toast.makeText(context, "Debes iniciar sesión para ver los reportes", Toast.LENGTH_SHORT).show()
            return
        }

        // Construir URL final (con filtro de usuario si está habilitado)
        val finalUrl = if (ENABLE_USER_FILTER) {
            buildUrlWithUserFilter(dashboardUrl, currentUser.uid, currentUser.email ?: "")
        } else {
            dashboardUrl
        }

        try {
            // Configurar colores de Chrome Custom Tabs
            val colorSchemeParams = CustomTabColorSchemeParams.Builder()
                .setToolbarColor(ContextCompat.getColor(requireContext(), R.color.primary))
                .setSecondaryToolbarColor(ContextCompat.getColor(requireContext(), R.color.primary_dark))
                .setNavigationBarColor(ContextCompat.getColor(requireContext(), R.color.primary_dark))
                .build()

            // Crear Custom Tab Intent
            val customTabsIntent = CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(colorSchemeParams)
                .setShowTitle(true)
                .setUrlBarHidingEnabled(true)
                .setStartAnimations(requireContext(), android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                .setExitAnimations(requireContext(), android.R.anim.slide_in_left, android.R.anim.slide_out_right)
                .build()

            // Abrir Looker Studio
            customTabsIntent.launchUrl(requireContext(), Uri.parse(finalUrl))

            Toast.makeText(context, "Abriendo reportes...", Toast.LENGTH_SHORT).show()

        } catch (e: Exception) {
            Toast.makeText(
                context,
                "Error al abrir reportes. Asegúrate de tener Chrome instalado.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    /**
     * Construye la URL con parámetros de filtro de usuario
     *
     * Looker Studio acepta parámetros en la URL como:
     * https://tu-dashboard.com?params={"userId":"VALOR"}
     *
     * IMPORTANTE: Debes configurar el parámetro en Looker Studio primero:
     * 1. En Looker Studio: Archivo > Administrar parámetros
     * 2. Crear parámetro con el nombre configurado en USER_PARAM_NAME
     * 3. Usar ese parámetro en tus filtros
     */
    private fun buildUrlWithUserFilter(baseUrl: String, userId: String, userEmail: String): String {
        // Usar el valor que prefieras: userId o userEmail
        val filterValue = userId  // Cambia a userEmail si prefieres filtrar por email

        // Formato de parámetros de Looker Studio
        return "$baseUrl?params={\"$USER_PARAM_NAME\":\"$filterValue\"}"
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
