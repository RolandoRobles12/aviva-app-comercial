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
import models.Product

class ProductsAdminFragment : Fragment() {

    private val db = FirebaseFirestore.getInstance()
    private val products = mutableListOf<Product>()
    private lateinit var productsAdapter: ProductsAdapter

    companion object {
        private const val TAG = "ProductsAdminFragment"
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_products_admin, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView(view)
        setupButtons(view)
        loadProducts()
    }

    private fun setupRecyclerView(view: View) {
        val recyclerView = view.findViewById<RecyclerView>(R.id.productsRecyclerView)
        productsAdapter = ProductsAdapter(products) { product, action ->
            when (action) {
                "edit" -> editProduct(product)
                "delete" -> deleteProduct(product)
                "toggle" -> toggleProductStatus(product)
            }
        }
        recyclerView.layoutManager = LinearLayoutManager(context)
        recyclerView.adapter = productsAdapter
    }

    private fun setupButtons(view: View) {
        val btnAddProduct = view.findViewById<Button>(R.id.btnAddProduct)
        btnAddProduct.setOnClickListener {
            showAddProductDialog()
        }

        val btnInitializeProducts = view.findViewById<Button>(R.id.btnInitializeProducts)
        btnInitializeProducts.setOnClickListener {
            initializeDefaultProducts()
        }
    }

    private fun loadProducts() {
        Log.d(TAG, "🔄 Cargando productos desde Firebase...")

        db.collection("products")
            .get()
            .addOnSuccessListener { documents ->
                products.clear()

                Log.d(TAG, "📦 Productos encontrados: ${documents.size()}")

                if (documents.isEmpty) {
                    Log.w(TAG, "⚠️ No se encontraron productos en Firebase")
                    showNoProductsMessage()
                    return@addOnSuccessListener
                }

                for (document in documents) {
                    try {
                        val product = document.toObject(Product::class.java).copy(id = document.id)
                        products.add(product)
                        Log.d(TAG, "📦 Producto cargado: ${product.name} (${product.getTypeDisplayName()})")
                    } catch (e: Exception) {
                        Log.e(TAG, "❌ Error al convertir producto: ${document.id}", e)
                    }
                }

                // Ordenar por tipo y nombre
                products.sortWith(compareBy({ it.type }, { it.name }))
                productsAdapter.notifyDataSetChanged()

                Log.d(TAG, "✅ Productos cargados exitosamente: ${products.size}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "❌ Error cargando productos", e)
                Toast.makeText(context, "Error cargando productos: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun showNoProductsMessage() {
        AlertDialog.Builder(requireContext())
            .setTitle("Sin productos")
            .setMessage("No hay productos configurados. ¿Deseas crear los productos por defecto?")
            .setPositiveButton("Crear productos por defecto") { _, _ ->
                initializeDefaultProducts()
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun initializeDefaultProducts() {
        Log.d(TAG, "🔄 Inicializando productos por defecto...")

        val batch = db.batch()
        val defaultProducts = Product.getDefaultProducts()

        defaultProducts.forEach { product ->
            val productRef = db.collection("products").document(product.id)
            batch.set(productRef, product)
        }

        batch.commit()
            .addOnSuccessListener {
                Log.d(TAG, "✅ Productos por defecto creados")
                Toast.makeText(context, "Productos por defecto creados exitosamente", Toast.LENGTH_SHORT).show()
                loadProducts()
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "❌ Error creando productos por defecto", e)
                Toast.makeText(context, "Error creando productos: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun showAddProductDialog() {
        // TODO: Implementar diálogo para agregar nuevo producto
        Toast.makeText(context, "Función de agregar producto en desarrollo", Toast.LENGTH_SHORT).show()
    }

    private fun editProduct(product: Product) {
        // TODO: Implementar edición de producto
        Toast.makeText(context, "Editar: ${product.name}", Toast.LENGTH_SHORT).show()
    }

    private fun deleteProduct(product: Product) {
        AlertDialog.Builder(requireContext())
            .setTitle("¿Eliminar producto?")
            .setMessage("¿Estás seguro de que deseas eliminar ${product.name}?")
            .setPositiveButton("Eliminar") { _, _ ->
                db.collection("products").document(product.id)
                    .delete()
                    .addOnSuccessListener {
                        Toast.makeText(context, "Producto eliminado", Toast.LENGTH_SHORT).show()
                        loadProducts()
                    }
                    .addOnFailureListener { e ->
                        Toast.makeText(context, "Error eliminando producto: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun toggleProductStatus(product: Product) {
        val newStatus = !product.isActive
        val statusText = if (newStatus) "activar" else "desactivar"

        AlertDialog.Builder(requireContext())
            .setTitle("¿${statusText.capitalize()} producto?")
            .setMessage("¿Deseas $statusText ${product.name}?")
            .setPositiveButton("Confirmar") { _, _ ->
                db.collection("products").document(product.id)
                    .update("isActive", newStatus)
                    .addOnSuccessListener {
                        Toast.makeText(context, "Producto ${if (newStatus) "activado" else "desactivado"}", Toast.LENGTH_SHORT).show()
                        loadProducts()
                    }
                    .addOnFailureListener { e ->
                        Toast.makeText(context, "Error actualizando producto: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }
}

class ProductsAdapter(
    private val products: List<Product>,
    private val onAction: (Product, String) -> Unit
) : RecyclerView.Adapter<ProductsAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val nameText: TextView = view.findViewById(R.id.tvProductName)
        val typeText: TextView = view.findViewById(R.id.tvProductType)
        val statusText: TextView = view.findViewById(R.id.tvProductStatus)
        val commissionText: TextView = view.findViewById(R.id.tvCommission)
        val btnEdit: Button = view.findViewById(R.id.btnEditProduct)
        val btnDelete: Button = view.findViewById(R.id.btnDeleteProduct)
        val btnToggle: Button = view.findViewById(R.id.btnToggleProduct)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_product_admin, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val product = products[position]

        holder.nameText.text = product.name
        holder.typeText.text = product.getTypeDisplayName()
        holder.statusText.text = product.getStatusDisplayName()
        holder.commissionText.text = "Comisión: ${(product.commissionRate * 100)}%"

        // Cambiar color del estado
        val statusColor = if (product.isActive) R.color.success_color else R.color.error_color
        holder.statusText.setTextColor(holder.itemView.context.getColor(statusColor))

        holder.btnEdit.setOnClickListener { onAction(product, "edit") }
        holder.btnDelete.setOnClickListener { onAction(product, "delete") }

        holder.btnToggle.text = if (product.isActive) "Desactivar" else "Activar"
        holder.btnToggle.setOnClickListener { onAction(product, "toggle") }
    }

    override fun getItemCount() = products.size
}