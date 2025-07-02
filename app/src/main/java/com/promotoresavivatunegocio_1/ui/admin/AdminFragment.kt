package com.promotoresavivatunegocio_1.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.promotoresavivatunegocio_1.databinding.FragmentAdminBinding

/**
 * Pantalla de Administración (placeholder).
 *
 * - No contiene lógica aún; sólo infla `fragment_admin.xml`.
 * - Añade tu código de negocio cuando sea necesario.
 */
class AdminFragment : Fragment() {

    private var _binding: FragmentAdminBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAdminBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}