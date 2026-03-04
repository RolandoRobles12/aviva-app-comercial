package com.promotoresavivatunegocio_1.ui.lms

import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.promotoresavivatunegocio_1.R

/**
 * LmsFragment - Camino de aprendizaje
 *
 * Abre el LMS en Chrome Custom Tabs para evitar el error 403
 * disallowed_useragent que bloquea el login OAuth en WebViews.
 */
class LmsFragment : Fragment() {

    companion object {
        private const val LMS_URL =
            "https://onboarding-challenge--aviva-onb-app.us-central1.hosted.app/"
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? = inflater.inflate(R.layout.fragment_lms, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        openInChromeCustomTabs()
    }

    private fun openInChromeCustomTabs() {
        val colorSchemeParams = CustomTabColorSchemeParams.Builder()
            .setToolbarColor(ContextCompat.getColor(requireContext(), R.color.primary))
            .build()

        val intent = CustomTabsIntent.Builder()
            .setDefaultColorSchemeParams(colorSchemeParams)
            .setShowTitle(true)
            .setUrlBarHidingEnabled(true)
            .build()

        intent.launchUrl(requireContext(), Uri.parse(LMS_URL))
    }
}
