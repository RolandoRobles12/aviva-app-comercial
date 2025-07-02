package com.promotoresavivatunegocio_1.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.models.ProspectoAviva

class ProspectosAdapter(
    private val prospectos: List<ProspectoAviva>,
    private val onProspectoClick: (ProspectoAviva) -> Unit
) : RecyclerView.Adapter<ProspectosAdapter.ProspectoViewHolder>() {

    class ProspectoViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvNumero: TextView = view.findViewById(R.id.tvNumero)
        val tvNombre: TextView = view.findViewById(R.id.tvNombre)
        val tvGiro: TextView = view.findViewById(R.id.tvGiro)
        val tvProbabilidad: TextView = view.findViewById(R.id.tvProbabilidad)
        val ivTelefono: TextView = view.findViewById(R.id.ivTelefono)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProspectoViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_prospecto, parent, false)
        return ProspectoViewHolder(view)
    }

    override fun onBindViewHolder(holder: ProspectoViewHolder, position: Int) {
        val prospecto = prospectos[position]

        holder.tvNumero.text = (position + 1).toString()
        holder.tvNombre.text = prospecto.nombre
        holder.tvGiro.text = "📍 ${prospecto.giro}"
        holder.tvProbabilidad.text = "${(prospecto.probabilidad * 100).toInt()}%"

        // Mostrar icono de teléfono si tiene
        if (!prospecto.telefono.isNullOrEmpty()) {
            holder.ivTelefono.visibility = View.VISIBLE
        } else {
            holder.ivTelefono.visibility = View.GONE
        }

        // Click listener
        holder.itemView.setOnClickListener {
            onProspectoClick(prospecto)
        }
    }

    override fun getItemCount() = prospectos.size
}