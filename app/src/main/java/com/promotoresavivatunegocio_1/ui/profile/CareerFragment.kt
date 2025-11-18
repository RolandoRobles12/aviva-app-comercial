package com.promotoresavivatunegocio_1.ui.profile

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.databinding.FragmentCareerBinding
import com.promotoresavivatunegocio_1.services.CareerService
import kotlinx.coroutines.launch
import models.UserCareerProgress
import java.text.NumberFormat
import java.util.Locale

/**
 * Fragmento de Plan de Carrera
 *
 * Muestra:
 * - Nivel actual del usuario
 * - Progreso hacia siguiente nivel
 * - Requisitos pendientes
 * - Beneficios del nivel actual y siguiente
 * - Historial de niveles alcanzados
 *
 * Para personalizar:
 * - Modificar layout fragment_career.xml
 * - Ajustar requisitos en CareerLevelRequirements
 * - Personalizar beneficios
 */
class CareerFragment : Fragment() {
    private var _binding: FragmentCareerBinding? = null
    private val binding get() = _binding!!

    private val auth = FirebaseAuth.getInstance()
    private val careerService = CareerService()

    private lateinit var levelsAdapter: CareerLevelsAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCareerBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        loadCareerProgress()
    }

    private fun setupRecyclerView() {
        levelsAdapter = CareerLevelsAdapter()
        binding.rvLevelHistory.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = levelsAdapter
        }
    }

    private fun loadCareerProgress() {
        val user = auth.currentUser
        if (user == null) {
            Toast.makeText(context, "Usuario no autenticado", Toast.LENGTH_SHORT).show()
            return
        }

        binding.progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val progress = careerService.getUserProgress(user.uid)

                if (progress != null) {
                    displayProgress(progress)
                } else {
                    showEmptyState()
                }
            } catch (e: Exception) {
                Toast.makeText(
                    context,
                    "Error al cargar progreso: ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun displayProgress(progress: UserCareerProgress) {
        val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "MX"))

        // Nivel actual
        binding.tvCurrentLevel.text = progress.currentLevelName
        binding.tvLevelNumber.text = "Nivel ${progress.currentLevel}"

        // Salario y comisión actual
        progress.currentLevelDetails?.let { level ->
            binding.tvBaseSalary.text = currencyFormat.format(level.baseSalary)
            binding.tvCommissionRate.text = "${(level.commissionRate * 100).toInt()}%"
        }

        // Progreso hacia siguiente nivel
        binding.progressNextLevel.progress = progress.progressToNextLevel.toInt()
        binding.tvProgressPercent.text = "${progress.progressToNextLevel.toInt()}%"

        // Siguiente nivel
        progress.nextLevel?.let { nextLevel ->
            binding.tvNextLevelName.text = nextLevel.name
            binding.tvNextLevelSalary.text = currencyFormat.format(nextLevel.baseSalary)
            binding.tvNextLevelCommission.text = "${(nextLevel.commissionRate * 100).toInt()}%"
        }

        // Requisitos
        binding.tvRequirementsCompleted.text =
            "${progress.requirementsCompleted}/${progress.requirementsTótal} completados"

        // Historial
        if (progress.levelHistory.isNotEmpty()) {
            levelsAdapter.updateData(progress.levelHistory)
            binding.rvLevelHistory.visibility = View.VISIBLE
        } else {
            binding.rvLevelHistory.visibility = View.GONE
        }

        binding.contentLayout.visibility = View.VISIBLE
    }

    private fun showEmptyState() {
        binding.contentLayout.visibility = View.GONE
        Toast.makeText(
            context,
            "No hay información de carrera disponible",
            Toast.LENGTH_LONG
        ).show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
