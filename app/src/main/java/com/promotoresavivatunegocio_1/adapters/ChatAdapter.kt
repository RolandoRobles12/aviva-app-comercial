package com.promotoresavivatunegocio_1.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.models.ChatMessage
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Adapter para los mensajes del chat
 */
class ChatAdapter : ListAdapter<ChatMessage, RecyclerView.ViewHolder>(ChatMessageDiffCallback()) {

    companion object {
        private const val VIEW_TYPE_USER = 1
        private const val VIEW_TYPE_BOT = 2
        private const val VIEW_TYPE_TYPING = 3

        private val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
    }

    override fun getItemViewType(position: Int): Int {
        val message = getItem(position)
        return when {
            message.isTyping -> VIEW_TYPE_TYPING
            message.isFromUser -> VIEW_TYPE_USER
            else -> VIEW_TYPE_BOT
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return when (viewType) {
            VIEW_TYPE_USER -> {
                val view = inflater.inflate(R.layout.item_chat_message_user, parent, false)
                UserMessageViewHolder(view)
            }
            VIEW_TYPE_BOT -> {
                val view = inflater.inflate(R.layout.item_chat_message_bot, parent, false)
                BotMessageViewHolder(view)
            }
            VIEW_TYPE_TYPING -> {
                val view = inflater.inflate(R.layout.item_chat_typing, parent, false)
                TypingViewHolder(view)
            }
            else -> throw IllegalArgumentException("Unknown view type: $viewType")
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val message = getItem(position)
        when (holder) {
            is UserMessageViewHolder -> holder.bind(message)
            is BotMessageViewHolder -> holder.bind(message)
            is TypingViewHolder -> {
                // No necesita bind, solo muestra el indicador
            }
        }
    }

    /**
     * ViewHolder para mensajes del usuario
     */
    class UserMessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val textViewMessage: TextView = itemView.findViewById(R.id.textViewMessage)
        private val textViewTime: TextView = itemView.findViewById(R.id.textViewTime)

        fun bind(message: ChatMessage) {
            textViewMessage.text = message.content
            textViewTime.text = timeFormat.format(message.timestamp)
        }
    }

    /**
     * ViewHolder para mensajes del bot
     */
    class BotMessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val textViewMessage: TextView = itemView.findViewById(R.id.textViewMessage)
        private val textViewTime: TextView = itemView.findViewById(R.id.textViewTime)

        fun bind(message: ChatMessage) {
            textViewMessage.text = message.content
            textViewTime.text = timeFormat.format(message.timestamp)
        }
    }

    /**
     * ViewHolder para indicador de "escribiendo..."
     */
    class TypingViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView)

    /**
     * DiffUtil para optimizar actualizaciones
     */
    class ChatMessageDiffCallback : DiffUtil.ItemCallback<ChatMessage>() {
        override fun areItemsTheSame(oldItem: ChatMessage, newItem: ChatMessage): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: ChatMessage, newItem: ChatMessage): Boolean {
            return oldItem == newItem
        }
    }
}
