package com.promotoresavivatunegocio_1

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import android.widget.ImageButton
import com.google.android.material.textfield.TextInputEditText
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.adapters.ChatAdapter
import com.promotoresavivatunegocio_1.models.ChatMessage
import com.promotoresavivatunegocio_1.services.ChatService
import kotlinx.coroutines.launch

/**
 * Fragment del asistente de ayuda (chatbot)
 */
class HelpAssistantFragment : Fragment() {

    private lateinit var chatService: ChatService
    private lateinit var chatAdapter: ChatAdapter
    private val messages = mutableListOf<ChatMessage>()

    // Views
    private lateinit var recyclerView: RecyclerView
    private lateinit var editTextMessage: TextInputEditText
    private lateinit var buttonSend: ImageButton
    private lateinit var buttonBack: ImageButton
    private lateinit var emptyState: View

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_help_assistant, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Inicializar servicio
        chatService = ChatService()

        // Configurar views
        setupViews(view)
        setupRecyclerView()
        setupListeners()

        // Mensaje de bienvenida
        showWelcomeMessage()
    }

    private fun setupViews(view: View) {
        recyclerView = view.findViewById(R.id.recyclerViewMessages)
        editTextMessage = view.findViewById(R.id.editTextMessage)
        buttonSend = view.findViewById(R.id.buttonSend)
        buttonBack = view.findViewById(R.id.buttonBack)
        emptyState = view.findViewById(R.id.emptyState)

        // Configurar botón de regreso
        buttonBack.setOnClickListener {
            requireActivity().onBackPressed()
        }
    }

    private fun setupRecyclerView() {
        chatAdapter = ChatAdapter()
        recyclerView.apply {
            adapter = chatAdapter
            layoutManager = LinearLayoutManager(context).apply {
                stackFromEnd = true
            }
        }
    }

    private fun setupListeners() {
        buttonSend.setOnClickListener {
            sendMessage()
        }

        // Enviar mensaje con Enter
        editTextMessage.setOnEditorActionListener { _, _, _ ->
            sendMessage()
            true
        }
    }

    private fun showWelcomeMessage() {
        if (messages.isEmpty()) {
            val welcomeMessage = ChatMessage.fromBot(
                "¡Hola! Soy Ro-Bot Aviva, tu asistente virtual. Puedo ayudarte con:\n\n" +
                "• Consultas sobre deals y llamadas en HubSpot\n" +
                "• Información sobre procesos y procedimientos\n" +
                "• Preguntas frecuentes sobre Aviva Tu Negocio\n\n" +
                "¿En qué puedo ayudarte hoy?",
                queryType = "welcome"
            )
            addMessage(welcomeMessage)
        }
    }

    private fun sendMessage() {
        val messageText = editTextMessage.text?.toString()?.trim()

        if (messageText.isNullOrEmpty()) {
            return
        }

        // Limpiar input
        editTextMessage.text?.clear()

        // Agregar mensaje del usuario
        val userMessage = ChatMessage.fromUser(messageText)
        addMessage(userMessage)

        // Ocultar empty state
        hideEmptyState()

        // Mostrar indicador de "escribiendo..."
        val typingIndicator = ChatMessage.typingIndicator()
        addMessage(typingIndicator)

        // Enviar mensaje al backend
        lifecycleScope.launch {
            try {
                val currentUser = FirebaseAuth.getInstance().currentUser
                val userName = currentUser?.displayName ?: "Usuario"

                val result = chatService.sendMessage(
                    message = messageText,
                    userName = userName
                )

                // Remover indicador de "escribiendo..."
                removeTypingIndicator()

                result.fold(
                    onSuccess = { response ->
                        response.data?.let { data ->
                            val botMessage = ChatMessage.fromBot(
                                content = data.response,
                                queryType = data.queryType
                            )
                            addMessage(botMessage)
                        }
                    },
                    onFailure = { error ->
                        val errorMessage = ChatMessage.error(
                            error.message ?: "Error desconocido"
                        )
                        addMessage(errorMessage)
                        Toast.makeText(
                            context,
                            "Error: ${error.message}",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                )
            } catch (e: Exception) {
                removeTypingIndicator()
                val errorMessage = ChatMessage.error(e.message ?: "Error inesperado")
                addMessage(errorMessage)
                Toast.makeText(
                    context,
                    "Error: ${e.message}",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    private fun addMessage(message: ChatMessage) {
        messages.add(message)
        chatAdapter.submitList(messages.toList()) {
            // Scroll al último mensaje
            recyclerView.smoothScrollToPosition(messages.size - 1)
        }
    }

    private fun removeTypingIndicator() {
        val typingIndex = messages.indexOfFirst { it.isTyping }
        if (typingIndex != -1) {
            messages.removeAt(typingIndex)
            chatAdapter.submitList(messages.toList())
        }
    }

    private fun hideEmptyState() {
        emptyState.visibility = View.GONE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        // Opcional: resetear conversación al salir
        // chatService.resetConversation()
    }

    companion object {
        fun newInstance() = HelpAssistantFragment()
    }
}
