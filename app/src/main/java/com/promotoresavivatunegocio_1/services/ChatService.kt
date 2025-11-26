package com.promotoresavivatunegocio_1.services

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.functions.FirebaseFunctions
import com.google.gson.Gson
import com.promotoresavivatunegocio_1.models.ChatRequest
import com.promotoresavivatunegocio_1.models.ChatResponse
import kotlinx.coroutines.tasks.await
import java.util.concurrent.TimeUnit

/**
 * Servicio para comunicarse con el chatbot backend
 */
class ChatService {
    private val functions = FirebaseFunctions.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val gson = Gson()

    // Thread ID para mantener contexto conversacional
    private var threadId: String? = null

    companion object {
        private const val TAG = "ChatService"
        private const val FUNCTION_NAME = "chat"
        private const val TIMEOUT_SECONDS = 60L
    }

    /**
     * Envía un mensaje al chatbot y recibe respuesta
     */
    suspend fun sendMessage(
        message: String,
        userName: String? = null,
        userRole: String? = null
    ): Result<ChatResponse> {
        return try {
            val currentUser = auth.currentUser
            if (currentUser == null) {
                Log.e(TAG, "Usuario no autenticado")
                return Result.failure(Exception("Usuario no autenticado"))
            }

            Log.d(TAG, "Enviando mensaje: $message")
            Log.d(TAG, "Usuario: ${currentUser.uid}")
            Log.d(TAG, "Thread ID: $threadId")

            // Construir request
            val request = ChatRequest(
                message = message,
                userId = currentUser.uid,
                userName = userName ?: currentUser.displayName,
                userRole = userRole,
                threadId = threadId
            )

            // Convertir a Map para Firebase Functions
            val data = hashMapOf(
                "message" to request.message,
                "userId" to request.userId,
                "userName" to request.userName,
                "userRole" to request.userRole,
                "threadId" to request.threadId
            )

            Log.d(TAG, "Request data: $data")

            // Llamar a la función
            val result = functions
                .getHttpsCallable(FUNCTION_NAME)
                .withTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .call(data)
                .await()

            Log.d(TAG, "Respuesta recibida: ${result.data}")

            // Parsear respuesta
            val responseJson = gson.toJson(result.data)
            val chatResponse = gson.fromJson(responseJson, ChatResponse::class.java)

            // Guardar thread ID para próximas conversaciones
            chatResponse.data?.threadId?.let { newThreadId ->
                threadId = newThreadId
                Log.d(TAG, "Thread ID actualizado: $threadId")
            }

            if (chatResponse.success) {
                Log.d(TAG, "✅ Mensaje procesado exitosamente")
                Log.d(TAG, "Tipo de consulta: ${chatResponse.data?.queryType}")
                Log.d(TAG, "Es HubSpot query: ${chatResponse.data?.isHubSpotQuery}")
                return Result.success(chatResponse)
            } else {
                Log.e(TAG, "❌ Error en respuesta: ${chatResponse.error}")
                return Result.failure(Exception(chatResponse.error ?: "Error desconocido"))
            }

        } catch (e: Exception) {
            Log.e(TAG, "❌ Error llamando al chatbot", e)
            Result.failure(e)
        }
    }

    /**
     * Reinicia la conversación (elimina el contexto)
     */
    fun resetConversation() {
        Log.d(TAG, "🔄 Conversación reiniciada")
        threadId = null
    }

    /**
     * Obtiene el thread ID actual
     */
    fun getThreadId(): String? = threadId

    /**
     * Verifica si hay una conversación activa
     */
    fun hasActiveConversation(): Boolean = threadId != null
}
