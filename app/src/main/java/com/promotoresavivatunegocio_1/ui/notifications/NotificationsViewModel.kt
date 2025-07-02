package com.promotoresavivatunegocio_1.ui.notifications

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.promotoresavivatunegocio_1.models.Notification
import kotlinx.coroutines.launch

class NotificationsViewModel : ViewModel() {

    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()

    private val _notifications = MutableLiveData<List<Notification>>()
    val notifications: LiveData<List<Notification>> = _notifications

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _errorMessage = MutableLiveData<String?>()
    val errorMessage: LiveData<String?> = _errorMessage

    private val _unreadCount = MutableLiveData<Int>()
    val unreadCount: LiveData<Int> = _unreadCount

    init {
        loadNotifications()
    }

    fun loadNotifications() {
        val userId = auth.currentUser?.uid ?: return

        _isLoading.value = true
        _errorMessage.value = null

        viewModelScope.launch {
            try {
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

                        _notifications.value = notifications
                        _unreadCount.value = notifications.count { !it.isRead }
                        _isLoading.value = false
                    }
                    .addOnFailureListener { e ->
                        _errorMessage.value = "Error al cargar notificaciones: ${e.message}"
                        _isLoading.value = false
                    }
            } catch (e: Exception) {
                _errorMessage.value = "Error inesperado: ${e.message}"
                _isLoading.value = false
            }
        }
    }

    fun markAsRead(notification: Notification) {
        if (notification.isRead) return

        viewModelScope.launch {
            try {
                db.collection("notifications").document(notification.id)
                    .update("isRead", true)
                    .addOnSuccessListener {
                        // Actualizar lista local
                        loadNotifications()
                    }
                    .addOnFailureListener { e ->
                        _errorMessage.value = "Error al marcar como leída: ${e.message}"
                    }
            } catch (e: Exception) {
                _errorMessage.value = "Error inesperado: ${e.message}"
            }
        }
    }

    fun markAllAsRead() {
        val userId = auth.currentUser?.uid ?: return

        viewModelScope.launch {
            try {
                db.collection("notifications")
                    .whereEqualTo("userId", userId)
                    .whereEqualTo("isRead", false)
                    .get()
                    .addOnSuccessListener { documents ->
                        val batch = db.batch()
                        documents.forEach { doc ->
                            batch.update(doc.reference, "isRead", true)
                        }
                        batch.commit().addOnSuccessListener {
                            loadNotifications()
                        }
                    }
                    .addOnFailureListener { e ->
                        _errorMessage.value = "Error al marcar todas como leídas: ${e.message}"
                    }
            } catch (e: Exception) {
                _errorMessage.value = "Error inesperado: ${e.message}"
            }
        }
    }

    fun refreshNotifications() {
        loadNotifications()
    }

    fun clearErrorMessage() {
        _errorMessage.value = null
    }
}