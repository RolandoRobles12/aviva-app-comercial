package com.promotoresavivatunegocio_1.ui.admin

import android.app.AlertDialog
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.firebase.firestore.FirebaseFirestore
import com.promotoresavivatunegocio_1.R
import models.City

class CitiesAdminFragment : Fragment() {

    private val db = FirebaseFirestore.getInstance()
    private val cities = mutableListOf<City>()
    private lateinit var citiesAdapter: CitiesAdapter

    companion object {
        private const val TAG = "CitiesAdminFragment"
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_cities_admin, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView(view)
        setupButtons(view)
        loadCities()
    }

    private fun setupRecyclerView(view: View) {
        val recyclerView = view.findViewById<RecyclerView>(R.id.citiesRecyclerView)
        citiesAdapter = CitiesAdapter(cities) { city, action ->
            when (action) {
                "edit" -> editCity(city)
                "delete" -> deleteCity(city)
                "toggle" -> toggleCityStatus(city)
            }
        }
        recyclerView.layoutManager = LinearLayoutManager(context)
        recyclerView.adapter = citiesAdapter
    }

    private fun setupButtons(view: View) {
        val btnAddCity = view.findViewById<Button>(R.id.btnAddCity)
        btnAddCity.setOnClickListener {
            Toast.makeText(context, "Función agregar ciudad en desarrollo", Toast.LENGTH_SHORT).show()
        }

        val btnInitializeCities = view.findViewById<Button>(R.id.btnInitializeCities)
        btnInitializeCities.setOnClickListener {
            initializeDefaultCities()
        }
    }

    private fun loadCities() {
        Log.d(TAG, "🔄 Cargando ciudades desde Firebase...")

        db.collection("cities")
            .get()
            .addOnSuccessListener { documents ->
                cities.clear()

                if (documents.isEmpty) {
                    showNoCitiesMessage()
                    return@addOnSuccessListener
                }

                for (document in documents) {
                    try {
                        val city = document.toObject(City::class.java).copy(id = document.id)
                        cities.add(city)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error converting city: ${document.id}", e)
                    }
                }

                cities.sortBy { it.name }
                citiesAdapter.notifyDataSetChanged()
                Log.d(TAG, "✅ Ciudades cargadas: ${cities.size}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Error loading cities", e)
                Toast.makeText(context, "Error cargando ciudades: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun showNoCitiesMessage() {
        AlertDialog.Builder(requireContext())
            .setTitle("Sin ciudades")
            .setMessage("No hay ciudades configuradas. ¿Deseas crear las ciudades por defecto?")
            .setPositiveButton("Crear ciudades por defecto") { _, _ ->
                initializeDefaultCities()
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun initializeDefaultCities() {
        val batch = db.batch()
        val defaultCities = City.getDefaultCities()

        defaultCities.forEach { city ->
            val cityRef = db.collection("cities").document(city.id)
            batch.set(cityRef, city)
        }

        batch.commit()
            .addOnSuccessListener {
                Toast.makeText(context, "Ciudades por defecto creadas exitosamente", Toast.LENGTH_SHORT).show()
                loadCities()
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Error creando ciudades: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun editCity(city: City) {
        Toast.makeText(context, "Editar: ${city.name}", Toast.LENGTH_SHORT).show()
    }

    private fun deleteCity(city: City) {
        AlertDialog.Builder(requireContext())
            .setTitle("¿Eliminar ciudad?")
            .setMessage("¿Estás seguro de que deseas eliminar ${city.name}?")
            .setPositiveButton("Eliminar") { _, _ ->
                db.collection("cities").document(city.id)
                    .delete()
                    .addOnSuccessListener {
                        Toast.makeText(context, "Ciudad eliminada", Toast.LENGTH_SHORT).show()
                        loadCities()
                    }
                    .addOnFailureListener { e ->
                        Toast.makeText(context, "Error eliminando ciudad: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun toggleCityStatus(city: City) {
        val newStatus = !city.isActive
        db.collection("cities").document(city.id)
            .update("isActive", newStatus)
            .addOnSuccessListener {
                Toast.makeText(context, "Ciudad ${if (newStatus) "activada" else "desactivada"}", Toast.LENGTH_SHORT).show()
                loadCities()
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Error actualizando ciudad: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }
}

class CitiesAdapter(
    private val cities: List<City>,
    private val onAction: (City, String) -> Unit
) : RecyclerView.Adapter<CitiesAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val nameText: TextView = view.findViewById(R.id.tvCityName)
        val stateText: TextView = view.findViewById(R.id.tvCityState)
        val statusText: TextView = view.findViewById(R.id.tvCityStatus)
        val populationText: TextView = view.findViewById(R.id.tvPopulation)
        val btnEdit: Button = view.findViewById(R.id.btnEditCity)
        val btnDelete: Button = view.findViewById(R.id.btnDeleteCity)
        val btnToggle: Button = view.findViewById(R.id.btnToggleCity)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_city_admin, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val city = cities[position]

        holder.nameText.text = city.name
        holder.stateText.text = city.state
        holder.statusText.text = city.getStatusDisplayName()
        holder.populationText.text = "Población: ${city.population}"

        val statusColor = if (city.isActive) R.color.success_color else R.color.error_color
        holder.statusText.setTextColor(holder.itemView.context.getColor(statusColor))

        holder.btnEdit.setOnClickListener { onAction(city, "edit") }
        holder.btnDelete.setOnClickListener { onAction(city, "delete") }
        holder.btnToggle.text = if (city.isActive) "Desactivar" else "Activar"
        holder.btnToggle.setOnClickListener { onAction(city, "toggle") }
    }

    override fun getItemCount() = cities.size
}