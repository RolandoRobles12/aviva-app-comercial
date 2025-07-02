package com.promotoresavivatunegocio_1.ui.notifications

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.databinding.FragmentNotificationsBinding
import com.promotoresavivatunegocio_1.models.Notification
import com.promotoresavivatunegocio_1.adapters.NotificationsAdapter

class NotificationsFragment : Fragment() {

    private var _binding: FragmentNotificationsBinding? = null
    private val binding get() = _binding!!

    private lateinit var notificationsViewModel: NotificationsViewModel
    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore
    private lateinit var notificationsAdapter: NotificationsAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        notificationsViewModel = ViewModelProvider(this)[NotificationsViewModel::class.java]
        _binding = FragmentNotificationsBinding.inflate(inflater, container, false)

        // Inicializar Firebase
        auth = FirebaseAuth.getInstance()
        db = FirebaseFirestore.getInstance()

        setupUI()
        loadNotifications()

        return binding.root
    }

    private fun setupUI() {
        // Configurar RecyclerView
        notificationsAdapter = NotificationsAdapter { notification ->
            markAsRead(notification)
        }

        binding.notificationsRecyclerView.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = notificationsAdapter
        }
    }

    private fun loadNotifications() {
        val userId = auth.currentUser?.uid ?: return

        // Cargar notificaciones del usuario
        db.collection("notifications")
            .whereEqualTo("userId", userId)
            .orderBy("timestamp", Query.Direction.DESCENDING)
            .limit(50)
            .get()
            .addOnSuccessListener { documents ->
                val notifications = documents.mapNotNull { doc ->
                    try {
                        doc.toObject(Notification::class.java)?.copy(id = doc.id)
                    } catch (e: Exception) {
                        null // Ignorar documentos con formato incorrecto
                    }
                }

                if (notifications.isEmpty()) {
                    showEmptyState()
                } else {
                    showNotifications(notifications)
                }
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Error al cargar notificaciones: ${e.message}", Toast.LENGTH_SHORT).show()
                showEmptyState()
            }
    }

    private fun showNotifications(notifications: List<Notification>) {
        binding.notificationsRecyclerView.visibility = View.VISIBLE
        binding.emptyStateText.visibility = View.GONE
        notificationsAdapter.submitList(notifications)
    }

    private fun showEmptyState() {
        binding.notificationsRecyclerView.visibility = View.GONE
        binding.emptyStateText.visibility = View.VISIBLE
    }

    private fun markAsRead(notification: Notification) {
        if (notification.isRead) return

        db.collection("notifications").document(notification.id)
            .update("isRead", true)
            .addOnSuccessListener {
                // Actualizar lista local
                loadNotifications()
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Error al marcar como leída: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}