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
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.Timestamp
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.models.User

class AdminFragment : Fragment() {

    // Views principales
    private lateinit var titleText: TextView
    private lateinit var btnCreateManager: Button
    private lateinit var managersRecyclerView: RecyclerView
    private lateinit var promotersSection: LinearLayout
    private lateinit var promotersRecyclerView: RecyclerView

    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    // Datos
    private val allUsers = mutableListOf<User>()
    private val promotores = mutableListOf<User>()
    private val gerentes = mutableListOf<User>()

    // Adaptadores
    private lateinit var managerAdapter: ManagerAdapter
    private lateinit var promoterAdapter: PromoterAdapter

    companion object {
        private const val TAG = "AdminFragment"
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_admin, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        initViews(view)
        setupRecyclerViews()
        loadUsers()
    }

    private fun initViews(view: View) {
        titleText = view.findViewById(R.id.titleText)
        btnCreateManager = view.findViewById(R.id.btnCreateManager)
        managersRecyclerView = view.findViewById(R.id.managersRecyclerView)
        promotersSection = view.findViewById(R.id.promotersSection)
        promotersRecyclerView = view.findViewById(R.id.promotersRecyclerView)

        titleText.text = "Gestión de Usuarios y Roles"

        btnCreateManager.setOnClickListener {
            showUserManagementDialog()
        }
    }

    private fun showUserManagementDialog() {
        val options = arrayOf(
            "Crear/Asignar Gerente",
            "Asignar Promotor",
            "Ver todos los usuarios"
        )

        AlertDialog.Builder(requireContext())
            .setTitle("Gestión de Usuarios")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> showCreateManagerDialog()
                    1 -> showCreatePromoterDialog()
                    2 -> showAllUsersDialog()
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun showCreatePromoterDialog() {
        // Mostrar usuarios sin rol asignado o que no sean admin/gerente
        val availableUsers = allUsers.filter {
            it.role != "admin" && it.role != "gerente" && it.role != "promotor"
        }

        if (availableUsers.isEmpty()) {
            Toast.makeText(context, "No hay usuarios sin rol para asignar como promotor", Toast.LENGTH_LONG).show()
            return
        }

        val userNames = availableUsers.map { user ->
            val name = user.name ?: user.displayName ?: user.email?.substringBefore("@") ?: "Usuario ${user.id.take(8)}"
            val roleText = if (user.role.isNullOrEmpty()) " (Sin rol)" else " (${user.role})"
            "$name$roleText"
        }.toTypedArray()

        AlertDialog.Builder(requireContext())
            .setTitle("Asignar como Promotor")
            .setItems(userNames) { _, which ->
                val selectedUser = availableUsers[which]
                createPromoter(selectedUser)
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun createPromoter(user: User) {
        Log.d(TAG, "🔄 Asignando promotor: ${user.name}")

        val updates = hashMapOf<String, Any?>(
            "role" to "promotor",
            "managerId" to null // Sin gerente asignado inicialmente
        )

        db.collection("users").document(user.id)
            .update(updates)
            .addOnSuccessListener {
                Log.d(TAG, "✅ Promotor asignado exitosamente")
                Toast.makeText(context, "Usuario asignado como Promotor exitosamente", Toast.LENGTH_SHORT).show()
                loadUsers()
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "❌ Error asignando promotor", e)
                Toast.makeText(context, "Error al asignar promotor: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun showAllUsersDialog() {
        if (allUsers.isEmpty()) {
            Toast.makeText(context, "No hay usuarios registrados", Toast.LENGTH_SHORT).show()
            return
        }

        val userInfo = allUsers.map { user ->
            val name = user.name ?: user.displayName ?: user.email?.substringBefore("@") ?: "Usuario ${user.id.take(8)}"
            val role = when (user.role) {
                "admin" -> "Administrador"
                "gerente" -> "Gerente (${user.assignedPromoters?.size ?: 0} promotores)"
                "promotor" -> if (user.managerId.isNullOrEmpty()) "Promotor (sin gerente)" else "Promotor (con gerente)"
                null, "" -> "Sin rol asignado"
                else -> user.role ?: "Sin rol"
            }
            "$name\n$role\n${user.email}"
        }.toTypedArray()

        AlertDialog.Builder(requireContext())
            .setTitle("Todos los Usuarios (${allUsers.size})")
            .setItems(userInfo) { _, which ->
                val selectedUser = allUsers[which]
                showUserActionDialog(selectedUser)
            }
            .setNegativeButton("Cerrar", null)
            .show()
    }

    private fun showUserActionDialog(user: User) {
        val currentRole = when (user.role) {
            "admin" -> "Administrador"
            "gerente" -> "Gerente"
            "promotor" -> "Promotor"
            else -> "Sin rol asignado"
        }

        val actions = mutableListOf<String>()

        // Acciones según el rol actual
        when (user.role) {
            "admin" -> {
                actions.add("Ver información")
            }
            "gerente" -> {
                actions.add("Ver/Editar gerente")
                actions.add("Convertir a promotor")
                actions.add("Quitar rol")
            }
            "promotor" -> {
                actions.add("Convertir a gerente")
                actions.add("Quitar rol")
            }
            else -> {
                actions.add("Asignar como gerente")
                actions.add("Asignar como promotor")
            }
        }

        AlertDialog.Builder(requireContext())
            .setTitle("${user.name ?: user.email}\nRol actual: $currentRole")
            .setItems(actions.toTypedArray()) { _, which ->
                handleUserAction(user, actions[which])
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun handleUserAction(user: User, action: String) {
        when (action) {
            "Convertir a gerente", "Asignar como gerente" -> createManager(user)
            "Convertir a promotor", "Asignar como promotor" -> createPromoter(user)
            "Ver/Editar gerente" -> editManager(user)
            "Quitar rol" -> removeUserRole(user)
            "Ver información" -> showUserInfo(user)
        }
    }

    private fun removeUserRole(user: User) {
        AlertDialog.Builder(requireContext())
            .setTitle("¿Quitar rol de usuario?")
            .setMessage("Esto eliminará el rol de ${user.name} y lo dejará sin permisos especiales")
            .setPositiveButton("Quitar rol") { _, _ ->
                val updates = hashMapOf<String, Any?>(
                    "role" to null,
                    "assignedPromoters" to null,
                    "managerId" to null
                )

                db.collection("users").document(user.id)
                    .update(updates)
                    .addOnSuccessListener {
                        Toast.makeText(context, "Rol removido exitosamente", Toast.LENGTH_SHORT).show()
                        loadUsers()
                    }
                    .addOnFailureListener { e ->
                        Toast.makeText(context, "Error al remover rol: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun showUserInfo(user: User) {
        val info = """
            Nombre: ${user.name ?: user.displayName ?: "Sin nombre"}
            Email: ${user.email ?: "Sin email"}
            Rol: ${user.role ?: "Sin rol"}
            UID: ${user.uid}
            Último login: ${user.lastLogin?.toDate()?.toString() ?: "Nunca"}
            Estado: ${if (user.isActive == true) "Activo" else "Inactivo"}
        """.trimIndent()

        AlertDialog.Builder(requireContext())
            .setTitle("Información del Usuario")
            .setMessage(info)
            .setPositiveButton("Cerrar", null)
            .show()
    }

    private fun setupRecyclerViews() {
        // Adapter para gerentes
        managerAdapter = ManagerAdapter(gerentes) { manager, action ->
            when (action) {
                "edit" -> editManager(manager)
                "delete" -> deleteManager(manager)
                "assign" -> assignPromotersToManager(manager)
            }
        }
        managersRecyclerView.layoutManager = LinearLayoutManager(context)
        managersRecyclerView.adapter = managerAdapter

        // Adapter para promotores sin asignar
        promoterAdapter = PromoterAdapter(promotores) { promoter ->
            showAssignManagerDialog(promoter)
        }
        promotersRecyclerView.layoutManager = LinearLayoutManager(context)
        promotersRecyclerView.adapter = promoterAdapter
    }

    private fun loadUsers() {
        Log.d(TAG, "🔄 Cargando usuarios...")

        db.collection("users")
            .get() // REMOVIDO: .orderBy que causaba problemas
            .addOnSuccessListener { documents ->
                allUsers.clear()
                promotores.clear()
                gerentes.clear()

                Log.d(TAG, "📄 Documentos encontrados: ${documents.size()}")

                for (document in documents) {
                    try {
                        val user = document.toObject(User::class.java).copy(id = document.id)
                        allUsers.add(user)

                        Log.d(TAG, "Usuario encontrado - ID: ${user.id}, Email: ${user.email}, Rol: ${user.role}")

                        when (user.role) {
                            "gerente" -> gerentes.add(user)
                            "promotor" -> {
                                // Solo agregar promotores sin gerente asignado
                                if (user.managerId.isNullOrEmpty()) {
                                    promotores.add(user)
                                }
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error al convertir usuario: ${document.id}", e)
                    }
                }

                // Actualizar UI
                managerAdapter.notifyDataSetChanged()
                promoterAdapter.notifyDataSetChanged()

                updatePromotersSection()

                Log.d(TAG, "✅ Usuarios cargados - Total: ${allUsers.size}, Gerentes: ${gerentes.size}, Promotores sin asignar: ${promotores.size}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "❌ Error cargando usuarios", e)
                Toast.makeText(context, "Error al cargar usuarios: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun updatePromotersSection() {
        promotersSection.visibility = if (promotores.isNotEmpty()) View.VISIBLE else View.GONE
    }

    // ============================================================================
    // GESTIÓN DE GERENTES
    // ============================================================================

    private fun showCreateManagerDialog() {
        // Mostrar TODOS los usuarios registrados, excluyendo solo admins y gerentes actuales
        val availableUsers = allUsers.filter {
            it.role != "admin" && it.role != "gerente"
        }

        if (availableUsers.isEmpty()) {
            Toast.makeText(context, "No hay usuarios registrados para gestionar", Toast.LENGTH_LONG).show()
            return
        }

        val userNames = availableUsers.map { user ->
            val name = user.name ?: user.displayName ?: user.email?.substringBefore("@") ?: "Usuario ${user.id.take(8)}"
            val roleText = when (user.role) {
                "promotor" -> " (Promotor actual)"
                null, "" -> " (Sin rol asignado)"
                else -> " (${user.role})"
            }
            "$name$roleText"
        }.toTypedArray()

        AlertDialog.Builder(requireContext())
            .setTitle("Seleccionar Usuario para Gerente")
            .setItems(userNames) { _, which ->
                val selectedUser = availableUsers[which]

                // Mostrar confirmación si ya es promotor
                if (selectedUser.role == "promotor") {
                    AlertDialog.Builder(requireContext())
                        .setTitle("Confirmar Cambio de Rol")
                        .setMessage("Este usuario es actualmente un Promotor. ¿Deseas convertirlo en Gerente?")
                        .setPositiveButton("Sí, convertir") { _, _ ->
                            createManager(selectedUser)
                        }
                        .setNegativeButton("Cancelar", null)
                        .show()
                } else {
                    createManager(selectedUser)
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun createManager(user: User) {
        Log.d(TAG, "🔄 Creando gerente: ${user.name} (rol anterior: ${user.role})")

        val updates = hashMapOf<String, Any?>(
            "role" to "gerente",
            "assignedPromoters" to emptyList<String>(),
            "managerId" to null // Limpiar managerId si era promotor
        )

        db.collection("users").document(user.id)
            .update(updates)
            .addOnSuccessListener {
                val roleChange = if (user.role == "promotor") {
                    "Promotor convertido a Gerente exitosamente"
                } else {
                    "Gerente creado exitosamente"
                }
                Log.d(TAG, "✅ $roleChange")
                Toast.makeText(context, roleChange, Toast.LENGTH_SHORT).show()
                loadUsers()
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "❌ Error creando gerente", e)
                Toast.makeText(context, "Error al crear gerente: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun editManager(manager: User) {
        // Por ahora solo permite cambiar nombre
        val editText = EditText(requireContext())
        editText.setText(manager.name ?: manager.displayName)

        AlertDialog.Builder(requireContext())
            .setTitle("Editar Gerente")
            .setView(editText)
            .setPositiveButton("Guardar") { _, _ ->
                val newName = editText.text.toString().trim()
                if (newName.isNotEmpty()) {
                    updateManagerName(manager, newName)
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun updateManagerName(manager: User, newName: String) {
        db.collection("users").document(manager.id)
            .update("name", newName)
            .addOnSuccessListener {
                Toast.makeText(context, "Nombre actualizado", Toast.LENGTH_SHORT).show()
                loadUsers()
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Error al actualizar: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun deleteManager(manager: User) {
        AlertDialog.Builder(requireContext())
            .setTitle("¿Eliminar Gerente?")
            .setMessage("Esto cambiará el rol del usuario y liberará a sus promotores asignados")
            .setPositiveButton("Eliminar") { _, _ ->
                removeManagerRole(manager)
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun removeManagerRole(manager: User) {
        // Primero liberar promotores asignados
        manager.assignedPromoters?.forEach { promoterId ->
            db.collection("users").document(promoterId)
                .update("managerId", null)
        }

        // Luego cambiar rol del gerente
        val updates = hashMapOf<String, Any?>(
            "role" to null,
            "assignedPromoters" to null
        )

        db.collection("users").document(manager.id)
            .update(updates)
            .addOnSuccessListener {
                Toast.makeText(context, "Gerente eliminado exitosamente", Toast.LENGTH_SHORT).show()
                loadUsers()
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Error al eliminar gerente: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    // ============================================================================
    // ASIGNACIÓN DE PROMOTORES
    // ============================================================================

    private fun assignPromotersToManager(manager: User) {
        val availablePromoters = allUsers.filter {
            it.role == "promotor" && it.managerId.isNullOrEmpty()
        }

        if (availablePromoters.isEmpty()) {
            Toast.makeText(context, "No hay promotores disponibles para asignar", Toast.LENGTH_LONG).show()
            return
        }

        val promoterNames = availablePromoters.map {
            "${it.name ?: it.displayName ?: it.email?.substringBefore("@") ?: "Promotor ${it.id.take(8)}"}"
        }.toTypedArray()

        val checkedItems = BooleanArray(promoterNames.size)

        AlertDialog.Builder(requireContext())
            .setTitle("Asignar Promotores a ${manager.name}")
            .setMultiChoiceItems(promoterNames, checkedItems) { _, which, isChecked ->
                checkedItems[which] = isChecked
            }
            .setPositiveButton("Asignar") { _, _ ->
                val selectedPromoters = mutableListOf<User>()
                checkedItems.forEachIndexed { index, isChecked ->
                    if (isChecked) {
                        selectedPromoters.add(availablePromoters[index])
                    }
                }

                if (selectedPromoters.isNotEmpty()) {
                    performPromoterAssignment(manager, selectedPromoters)
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun performPromoterAssignment(manager: User, promoters: List<User>) {
        val batch = db.batch()

        // Actualizar lista de promotores asignados en el gerente
        val currentAssigned = manager.assignedPromoters?.toMutableList() ?: mutableListOf()
        promoters.forEach { promoter ->
            if (!currentAssigned.contains(promoter.id)) {
                currentAssigned.add(promoter.id)
            }
        }

        batch.update(db.collection("users").document(manager.id), "assignedPromoters", currentAssigned)

        // Asignar gerente a cada promotor
        promoters.forEach { promoter ->
            batch.update(db.collection("users").document(promoter.id), "managerId", manager.id)
        }

        batch.commit()
            .addOnSuccessListener {
                Toast.makeText(context, "${promoters.size} promotores asignados exitosamente", Toast.LENGTH_SHORT).show()
                loadUsers()
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Error en la asignación: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun showAssignManagerDialog(promoter: User) {
        if (gerentes.isEmpty()) {
            Toast.makeText(context, "No hay gerentes disponibles", Toast.LENGTH_SHORT).show()
            return
        }

        val managerNames = gerentes.map {
            "${it.name ?: it.displayName ?: it.email?.substringBefore("@") ?: "Gerente ${it.id.take(8)}"}"
        }.toTypedArray()

        AlertDialog.Builder(requireContext())
            .setTitle("Asignar Gerente a ${promoter.name}")
            .setItems(managerNames) { _, which ->
                val selectedManager = gerentes[which]
                assignPromoterToManager(promoter, selectedManager)
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun assignPromoterToManager(promoter: User, manager: User) {
        val batch = db.batch()

        // Actualizar promotor
        batch.update(db.collection("users").document(promoter.id), "managerId", manager.id)

        // Actualizar gerente
        val currentAssigned = manager.assignedPromoters?.toMutableList() ?: mutableListOf()
        if (!currentAssigned.contains(promoter.id)) {
            currentAssigned.add(promoter.id)
        }
        batch.update(db.collection("users").document(manager.id), "assignedPromoters", currentAssigned)

        batch.commit()
            .addOnSuccessListener {
                Toast.makeText(context, "Promotor asignado exitosamente", Toast.LENGTH_SHORT).show()
                loadUsers()
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Error en la asignación: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }
}

// ============================================================================
// ADAPTADORES
// ============================================================================

class ManagerAdapter(
    private val managers: List<User>,
    private val onAction: (User, String) -> Unit
) : RecyclerView.Adapter<ManagerAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val nameText: TextView = view.findViewById(R.id.nameText)
        val emailText: TextView = view.findViewById(R.id.emailText)
        val promotersCountText: TextView = view.findViewById(R.id.promotersCountText)
        val btnEdit: Button = view.findViewById(R.id.btnEdit)
        val btnDelete: Button = view.findViewById(R.id.btnDelete)
        val btnAssign: Button = view.findViewById(R.id.btnAssign)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_manager, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val manager = managers[position]

        holder.nameText.text = manager.name ?: manager.displayName ?: "Sin nombre"
        holder.emailText.text = manager.email ?: "Sin email"
        holder.promotersCountText.text = "Promotores: ${manager.assignedPromoters?.size ?: 0}"

        holder.btnEdit.setOnClickListener { onAction(manager, "edit") }
        holder.btnDelete.setOnClickListener { onAction(manager, "delete") }
        holder.btnAssign.setOnClickListener { onAction(manager, "assign") }
    }

    override fun getItemCount() = managers.size
}

class PromoterAdapter(
    private val promoters: List<User>,
    private val onAssign: (User) -> Unit
) : RecyclerView.Adapter<PromoterAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val nameText: TextView = view.findViewById(R.id.nameText)
        val emailText: TextView = view.findViewById(R.id.emailText)
        val btnAssign: Button = view.findViewById(R.id.btnAssign)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_promoter, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val promoter = promoters[position]

        holder.nameText.text = promoter.name ?: promoter.displayName ?: "Sin nombre"
        holder.emailText.text = promoter.email ?: "Sin email"

        holder.btnAssign.setOnClickListener { onAssign(promoter) }
    }

    override fun getItemCount() = promoters.size
}