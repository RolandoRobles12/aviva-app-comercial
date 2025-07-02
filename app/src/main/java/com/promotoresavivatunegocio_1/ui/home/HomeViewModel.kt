package com.promotoresavivatunegocio_1.ui.home

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.promotoresavivatunegocio_1.models.Visit
import kotlinx.coroutines.launch

class HomeViewModel : ViewModel() {

    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()

    private val _visits = MutableLiveData<List<Visit>>()
    val visits: LiveData<List<Visit>> = _visits

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _errorMessage = MutableLiveData<String?>()
    val errorMessage: LiveData<String?> = _errorMessage

    private val _userDisplayName = MutableLiveData<String>()
    val userDisplayName: LiveData<String> = _userDisplayName

    init {
        loadUserInfo()
        loadRecentVisits()
    }

    private fun loadUserInfo() {
        val user = auth.currentUser
        val displayName = user?.displayName ?: user?.email ?: "Promotor"
        _userDisplayName.value = displayName
    }

    fun loadRecentVisits() {
        val userId = auth.currentUser?.uid ?: return

        _isLoading.value = true
        _errorMessage.value = null

        viewModelScope.launch {
            try {
                db.collection("visits")
                    .whereEqualTo("userId", userId)
                    .orderBy("timestamp", Query.Direction.DESCENDING)
                    .limit(10)
                    .get()
                    .addOnSuccessListener { documents ->
                        val visits = documents.mapNotNull { doc ->
                            try {
                                doc.toObject(Visit::class.java).copy(id = doc.id)
                            } catch (e: Exception) {
                                null // Ignorar documentos con formato incorrecto
                            }
                        }
                        _visits.value = visits
                        _isLoading.value = false
                    }
                    .addOnFailureListener { e ->
                        _errorMessage.value = "Error al cargar visitas: ${e.message}"
                        _isLoading.value = false
                    }
            } catch (e: Exception) {
                _errorMessage.value = "Error inesperado: ${e.message}"
                _isLoading.value = false
            }
        }
    }

    fun refreshVisits() {
        loadRecentVisits()
    }

    fun clearErrorMessage() {
        _errorMessage.value = null
    }
}