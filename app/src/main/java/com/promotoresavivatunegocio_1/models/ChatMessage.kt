package com.promotoresavivatunegocio_1.models

import java.util.Date

/**
 * Modelo de mensaje del chat
 */
data class ChatMessage(
    val id: String = "",
    val content: String = "",
    val isFromUser: Boolean = true,
    val timestamp: Date = Date(),
    val isTyping: Boolean = false, // Para mostrar indicador de "escribiendo..."
    val queryType: String? = null, // hubspot_query, faq, etc.
    val error: String? = null
) {
    companion object {
        /**
         * Crea un mensaje del usuario
         */
        fun fromUser(content: String): ChatMessage {
            return ChatMessage(
                id = System.currentTimeMillis().toString(),
                content = content,
                isFromUser = true,
                timestamp = Date()
            )
        }

        /**
         * Crea un mensaje del bot
         */
        fun fromBot(content: String, queryType: String? = null): ChatMessage {
            return ChatMessage(
                id = System.currentTimeMillis().toString(),
                content = content,
                isFromUser = false,
                timestamp = Date(),
                queryType = queryType
            )
        }

        /**
         * Crea un indicador de "escribiendo..."
         */
        fun typingIndicator(): ChatMessage {
            return ChatMessage(
                id = "typing_indicator",
                content = "",
                isFromUser = false,
                timestamp = Date(),
                isTyping = true
            )
        }

        /**
         * Crea un mensaje de error
         */
        fun error(errorMessage: String): ChatMessage {
            return ChatMessage(
                id = System.currentTimeMillis().toString(),
                content = "Lo siento, ocurrió un error: $errorMessage",
                isFromUser = false,
                timestamp = Date(),
                error = errorMessage
            )
        }
    }
}

/**
 * Request para enviar mensaje al backend
 */
data class ChatRequest(
    val message: String,
    val userId: String,
    val userName: String? = null,
    val userRole: String? = null,
    val threadId: String? = null
)

/**
 * Response del backend
 */
data class ChatResponse(
    val success: Boolean,
    val data: ChatData?,
    val error: String?,
    val message: String?
)

data class ChatData(
    val response: String,
    val threadId: String,
    val isHubSpotQuery: Boolean,
    val queryType: String
)
