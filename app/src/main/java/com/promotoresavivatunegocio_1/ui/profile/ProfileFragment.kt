package com.promotoresavivatunegocio_1.ui.profile

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.tabs.TabLayoutMediator
import com.promotoresavivatunegocio_1.MainActivity
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.databinding.FragmentProfileBinding

/**
 * Fragmento de Perfil
 *
 * Contiene tabs para:
 * - Insignias/Badges obtenidas
 * - Plan de Carrera y progreso
 * - Información personal (opcional)
 * - Acceso al Panel de Admin (solo para administradores)
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
        setupAdminAccess()
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

    /**
     * Configura el acceso al panel de administración
     * Solo visible para usuarios con rol ADMIN o SUPER_ADMIN
     */
    private fun setupAdminAccess() {
        val mainActivity = activity as? MainActivity
        val currentUser = mainActivity?.currentUser

        // Mostrar card de admin solo si el usuario es administrador
        if (currentUser?.isAdmin() == true) {
            binding.adminPanelCard.visibility = View.VISIBLE

            binding.btnAccessAdmin.setOnClickListener {
                // Navegar al fragmento de Admin
                findNavController().navigate(R.id.navigation_admin)
            }
        } else {
            binding.adminPanelCard.visibility = View.GONE
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
