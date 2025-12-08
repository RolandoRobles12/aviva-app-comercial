package com.promotoresavivatunegocio_1.ui.profile

import android.app.AlertDialog
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.tabs.TabLayoutMediator
import com.google.firebase.auth.FirebaseAuth
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

        setupUserInfo()
        setupLogoutButton()
        setupViewPager()
        setupAdminAccess()
    }

    /**
     * Muestra la información del usuario actual
     */
    private fun setupUserInfo() {
        val mainActivity = activity as? MainActivity
        val currentUser = mainActivity?.currentUser
        val firebaseUser = FirebaseAuth.getInstance().currentUser

        if (currentUser != null) {
            // Mostrar nombre
            binding.userNameTextView.text = currentUser.displayName.ifEmpty {
                firebaseUser?.displayName ?: "Usuario"
            }

            // Mostrar email
            binding.userEmailTextView.text = currentUser.email.ifEmpty {
                firebaseUser?.email ?: "Sin email"
            }

            // Mostrar rol
            binding.userRoleTextView.text = currentUser.getRoleDisplayName()

            Log.d("ProfileFragment", "Usuario cargado: ${currentUser.displayName} (${currentUser.getRoleDisplayName()})")
        } else if (firebaseUser != null) {
            // Fallback a Firebase Auth si no hay datos de Firestore
            binding.userNameTextView.text = firebaseUser.displayName ?: "Usuario"
            binding.userEmailTextView.text = firebaseUser.email ?: "Sin email"
            binding.userRoleTextView.text = "Usuario"
            Log.d("ProfileFragment", "Usando datos de Firebase Auth")
        } else {
            binding.userNameTextView.text = "Usuario no autenticado"
            binding.userEmailTextView.text = ""
            binding.userRoleTextView.text = ""
            Log.w("ProfileFragment", "No hay usuario autenticado")
        }
    }

    /**
     * Configura el botón de cerrar sesión
     */
    private fun setupLogoutButton() {
        binding.btnLogout.setOnClickListener {
            showLogoutConfirmationDialog()
        }

        // También permitir cerrar sesión al hacer clic en el card completo
        binding.logoutCard.setOnClickListener {
            showLogoutConfirmationDialog()
        }
    }

    /**
     * Muestra un diálogo de confirmación antes de cerrar sesión
     */
    private fun showLogoutConfirmationDialog() {
        AlertDialog.Builder(requireContext())
            .setTitle("Cerrar Sesión")
            .setMessage("¿Estás seguro de que deseas cerrar sesión?")
            .setPositiveButton("Sí, salir") { _, _ ->
                performLogout()
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    /**
     * Ejecuta el cierre de sesión
     */
    private fun performLogout() {
        val mainActivity = activity as? MainActivity

        if (mainActivity != null) {
            Log.d("ProfileFragment", "Cerrando sesión...")
            Toast.makeText(requireContext(), "Cerrando sesión...", Toast.LENGTH_SHORT).show()

            // Llamar al método signOut de MainActivity
            // MainActivity tiene un método signOut() privado, así que usamos el método público
            try {
                FirebaseAuth.getInstance().signOut()

                // Reiniciar la actividad para mostrar la pantalla de login
                mainActivity.finish()
                startActivity(mainActivity.intent)

                Log.d("ProfileFragment", "Sesión cerrada exitosamente")
            } catch (e: Exception) {
                Log.e("ProfileFragment", "Error al cerrar sesión", e)
                Toast.makeText(
                    requireContext(),
                    "Error al cerrar sesión: ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            }
        } else {
            Log.e("ProfileFragment", "No se pudo obtener MainActivity")
            Toast.makeText(
                requireContext(),
                "Error: No se pudo cerrar la sesión",
                Toast.LENGTH_SHORT
            ).show()
        }
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
