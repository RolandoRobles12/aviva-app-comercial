package com.promotoresavivatunegocio_1.ui.profile

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.google.android.material.tabs.TabLayoutMediator
import com.promotoresavivatunegocio_1.databinding.FragmentProfileBinding

/**
 * Fragmento de Perfil
 *
 * Contiene tabs para:
 * - Insignias/Badges obtenidas
 * - Plan de Carrera y progreso
 * - Información personal (opcional)
 *
 * Para personalizar:
 * - Modificar layout fragment_profile.xml
 * - Agregar/quitar tabs en ProfilePagerAdapter
 * - Personalizar sub-fragmentos
 */
class ProfileFragment : Fragment() {
    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupViewPager()
    }

    private fun setupViewPager() {
        val adapter = ProfilePagerAdapter(this)
        binding.viewPager.adapter = adapter

        TabLayoutMediator(binding.tabLayout, binding.viewPager) { tab, position ->
            tab.text = when (position) {
                0 -> "Insignias"
                1 -> "Plan de Carrera"
                else -> "Tab $position"
            }
        }.attach()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
