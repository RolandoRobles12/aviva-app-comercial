package com.promotoresavivatunegocio_1.ui.admin

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.promotoresavivatunegocio_1.R
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.Calendar

data class UserGoal(
    val email: String,
    val category: String,
    val product: String,
    val monthlyTarget: Double,
    val solicitudesTarget: Double? = null
)

class GoalsAdminFragment : Fragment() {

    companion object {
        private const val TAG = "GoalsAdminFragment"
    }

    private val db = FirebaseFirestore.getInstance()

    private lateinit var btnSelectFile: MaterialButton
    private lateinit var btnUploadGoals: MaterialButton
    private lateinit var btnRefreshSolicitudes: MaterialButton
    private lateinit var tvFileName: TextView
    private lateinit var tvUploadStatus: TextView
    private lateinit var tvSolicitudesCount: TextView
    private lateinit var tvSolicitudesError: TextView
    private lateinit var tvPreviewContent: TextView
    private lateinit var uploadProgress: ProgressBar
    private lateinit var solicitudesProgress: ProgressBar
    private lateinit var cardPreview: MaterialCardView

    private var selectedFileUri: Uri? = null
    private var parsedGoals: List<UserGoal> = emptyList()

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                selectedFileUri = uri
                val fileName = getFileName(uri)
                tvFileName.text = "Archivo: $fileName"
                parseAndPreviewFile(uri)
            }
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_goals_admin, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        initViews(view)
        setupListeners()
        loadSolicitudesCount()
    }

    private fun initViews(view: View) {
        btnSelectFile = view.findViewById(R.id.btnSelectFile)
        btnUploadGoals = view.findViewById(R.id.btnUploadGoals)
        btnRefreshSolicitudes = view.findViewById(R.id.btnRefreshSolicitudes)
        tvFileName = view.findViewById(R.id.tvFileName)
        tvUploadStatus = view.findViewById(R.id.tvUploadStatus)
        tvSolicitudesCount = view.findViewById(R.id.tvSolicitudesCount)
        tvSolicitudesError = view.findViewById(R.id.tvSolicitudesError)
        tvPreviewContent = view.findViewById(R.id.tvPreviewContent)
        uploadProgress = view.findViewById(R.id.uploadProgress)
        solicitudesProgress = view.findViewById(R.id.solicitudesProgress)
        cardPreview = view.findViewById(R.id.cardPreview)
    }

    private fun setupListeners() {
        btnSelectFile.setOnClickListener { openFilePicker() }
        btnUploadGoals.setOnClickListener { uploadGoals() }
        btnRefreshSolicitudes.setOnClickListener { loadSolicitudesCount() }
    }

    private fun openFilePicker() {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "*/*"
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("text/csv", "text/plain", "application/vnd.ms-excel"))
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        filePickerLauncher.launch(intent)
    }

    private fun getFileName(uri: Uri): String {
        return try {
            requireContext().contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                cursor.moveToFirst()
                cursor.getString(nameIndex)
            } ?: uri.lastPathSegment ?: "archivo"
        } catch (e: Exception) {
            uri.lastPathSegment ?: "archivo"
        }
    }

    /**
     * Retorna (startDate, endDate) para el periodo mensual vigente.
     * startDate = 01 del mes actual a las 00:00:00
     * endDate   = último día del mes actual a las 23:59:59
     */
    private fun currentMonthPeriod(): Pair<Timestamp, Timestamp> {
        val cal = Calendar.getInstance()
        cal.set(Calendar.DAY_OF_MONTH, 1)
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val startDate = Timestamp(cal.time)

        cal.set(Calendar.DAY_OF_MONTH, cal.getActualMaximum(Calendar.DAY_OF_MONTH))
        cal.set(Calendar.HOUR_OF_DAY, 23)
        cal.set(Calendar.MINUTE, 59)
        cal.set(Calendar.SECOND, 59)
        cal.set(Calendar.MILLISECOND, 999)
        val endDate = Timestamp(cal.time)

        return startDate to endDate
    }

    /**
     * Parsea el CSV y muestra una vista previa.
     * Formato esperado (separador coma o tabulador para pegar desde Sheets):
     *   Correo, Categoría, Producto, Meta Mensual[, Meta Solicitudes (opcional)]
     */
    private fun parseAndPreviewFile(uri: Uri) {
        try {
            val inputStream = requireContext().contentResolver.openInputStream(uri) ?: return
            val reader = BufferedReader(InputStreamReader(inputStream))
            val lines = reader.readLines()
            reader.close()

            if (lines.isEmpty()) {
                tvFileName.text = "El archivo está vacío"
                btnUploadGoals.isEnabled = false
                return
            }

            val firstLine = lines.first()
            val separator = if (firstLine.contains('\t')) '\t' else ','

            val dataLines = if (firstLine.contains("Correo", ignoreCase = true) ||
                firstLine.contains("Email", ignoreCase = true)) {
                lines.drop(1)
            } else {
                lines
            }

            val goals = mutableListOf<UserGoal>()
            val errors = mutableListOf<String>()

            dataLines.forEachIndexed { idx, line ->
                if (line.isBlank()) return@forEachIndexed
                val cols = line.split(separator)
                if (cols.size < 4) {
                    errors.add("Línea ${idx + 2}: columnas insuficientes")
                    return@forEachIndexed
                }
                val email = cols[0].trim()
                val category = cols[1].trim()
                val product = cols[2].trim()
                val targetRaw = cols[3].trim().replace(",", "").replace("$", "")
                val target = targetRaw.toDoubleOrNull()
                if (target == null) {
                    errors.add("Línea ${idx + 2}: meta inválida '$targetRaw'")
                    return@forEachIndexed
                }
                val solicitudesTarget = if (cols.size >= 5) {
                    val solRaw = cols[4].trim().replace(",", "").replace("$", "")
                    if (solRaw.isBlank()) null else solRaw.toDoubleOrNull()
                } else null

                goals.add(UserGoal(email, category, product, target, solicitudesTarget))
            }

            parsedGoals = goals

            val hasSolicitudesMeta = goals.any { it.solicitudesTarget != null }
            val previewText = buildString {
                appendLine("${goals.size} metas encontradas${if (errors.isNotEmpty()) " (${errors.size} errores)" else ""}")
                if (hasSolicitudesMeta) appendLine("Incluye meta de solicitudes ✓")
                appendLine()
                goals.take(5).forEach { g ->
                    appendLine("• ${g.email}")
                    val solStr = g.solicitudesTarget?.let { " | ${it.toLong()} sol." } ?: ""
                    appendLine("  ${g.product} | ${g.category} | \$${g.monthlyTarget.toLong()}$solStr")
                }
                if (goals.size > 5) appendLine("  ... y ${goals.size - 5} más")
                if (errors.isNotEmpty()) {
                    appendLine()
                    appendLine("⚠️ Errores:")
                    errors.take(3).forEach { appendLine("  $it") }
                }
            }

            tvPreviewContent.text = previewText
            cardPreview.visibility = View.VISIBLE
            btnUploadGoals.isEnabled = goals.isNotEmpty()

            Log.d(TAG, "Archivo parseado: ${goals.size} metas, ${errors.size} errores")
        } catch (e: Exception) {
            Log.e(TAG, "Error al parsear archivo: ${e.message}", e)
            tvFileName.text = "Error al leer el archivo"
            btnUploadGoals.isEnabled = false
        }
    }

    private fun uploadGoals() {
        if (parsedGoals.isEmpty()) {
            Toast.makeText(requireContext(), "No hay metas para subir", Toast.LENGTH_SHORT).show()
            return
        }

        btnUploadGoals.isEnabled = false
        uploadProgress.visibility = View.VISIBLE
        tvUploadStatus.visibility = View.GONE

        val (periodStart, periodEnd) = currentMonthPeriod()
        val emails = parsedGoals.map { it.email }

        // Buscar usuarios en Firestore por correo para asignarles la meta
        db.collection("users")
            .whereIn("email", emails.take(30)) // Firestore whereIn limite = 30
            .get()
            .addOnSuccessListener { snapshot ->
                val foundEmails = snapshot.documents.mapNotNull { it.getString("email")?.lowercase() }.toSet()

                // Si hay más de 30 emails, hay que consultar en lotes — por ahora usamos el set parcial
                // y reportamos cuántos no se encontraron
                val notFound = emails.count { it.lowercase() !in foundEmails }

                val batch = db.batch()

                parsedGoals.forEach { goal ->
                    val docRef = db.collection("userGoals").document(goal.email.lowercase())
                    val data = mutableMapOf<String, Any>(
                        "email" to goal.email.lowercase(),
                        "category" to goal.category,
                        "product" to goal.product,
                        "monthlyTarget" to goal.monthlyTarget,
                        "periodStart" to periodStart,
                        "periodEnd" to periodEnd,
                        "updatedAt" to Timestamp.now()
                    )
                    goal.solicitudesTarget?.let { data["solicitudesTarget"] = it }
                    batch.set(docRef, data)
                }

                batch.commit()
                    .addOnSuccessListener {
                        uploadProgress.visibility = View.GONE
                        val notFoundMsg = if (notFound > 0) "\n⚠️ $notFound usuario(s) aún no han ingresado a la app" else ""
                        tvUploadStatus.text = "✅ ${parsedGoals.size} metas subidas correctamente$notFoundMsg"
                        tvUploadStatus.setTextColor(android.graphics.Color.parseColor("#2E7D32"))
                        tvUploadStatus.visibility = View.VISIBLE
                        btnUploadGoals.isEnabled = true
                        Log.d(TAG, "Metas subidas: ${parsedGoals.size}, no encontrados: $notFound")
                    }
                    .addOnFailureListener { e ->
                        uploadProgress.visibility = View.GONE
                        tvUploadStatus.text = "❌ Error al subir: ${e.message}"
                        tvUploadStatus.setTextColor(android.graphics.Color.parseColor("#C62828"))
                        tvUploadStatus.visibility = View.VISIBLE
                        btnUploadGoals.isEnabled = true
                        Log.e(TAG, "Error al subir metas: ${e.message}", e)
                    }
            }
            .addOnFailureListener { e ->
                // Si falla la consulta de usuarios, subir metas de todas formas
                Log.w(TAG, "No se pudo verificar usuarios en Firestore: ${e.message}")
                uploadGoalsDirectly(periodStart, periodEnd)
            }
    }

    /** Sube metas directamente sin verificar usuarios (fallback). */
    private fun uploadGoalsDirectly(periodStart: Timestamp, periodEnd: Timestamp) {
        val batch = db.batch()
        parsedGoals.forEach { goal ->
            val docRef = db.collection("userGoals").document(goal.email.lowercase())
            val data = mutableMapOf<String, Any>(
                "email" to goal.email.lowercase(),
                "category" to goal.category,
                "product" to goal.product,
                "monthlyTarget" to goal.monthlyTarget,
                "periodStart" to periodStart,
                "periodEnd" to periodEnd,
                "updatedAt" to Timestamp.now()
            )
            goal.solicitudesTarget?.let { data["solicitudesTarget"] = it }
            batch.set(docRef, data)
        }

        batch.commit()
            .addOnSuccessListener {
                uploadProgress.visibility = View.GONE
                tvUploadStatus.text = "✅ ${parsedGoals.size} metas subidas correctamente"
                tvUploadStatus.setTextColor(android.graphics.Color.parseColor("#2E7D32"))
                tvUploadStatus.visibility = View.VISIBLE
                btnUploadGoals.isEnabled = true
            }
            .addOnFailureListener { e ->
                uploadProgress.visibility = View.GONE
                tvUploadStatus.text = "❌ Error al subir: ${e.message}"
                tvUploadStatus.setTextColor(android.graphics.Color.parseColor("#C62828"))
                tvUploadStatus.visibility = View.VISIBLE
                btnUploadGoals.isEnabled = true
                Log.e(TAG, "Error al subir metas: ${e.message}", e)
            }
    }

    private fun loadSolicitudesCount() {
        solicitudesProgress.visibility = View.VISIBLE
        tvSolicitudesCount.text = "—"
        tvSolicitudesError.visibility = View.GONE

        db.collection("solicitudes")
            .get()
            .addOnSuccessListener { snapshot ->
                solicitudesProgress.visibility = View.GONE
                tvSolicitudesCount.text = snapshot.size().toString()
                Log.d(TAG, "Solicitudes: ${snapshot.size()}")
            }
            .addOnFailureListener { _ ->
                db.collection("applications")
                    .get()
                    .addOnSuccessListener { snapshot ->
                        solicitudesProgress.visibility = View.GONE
                        tvSolicitudesCount.text = snapshot.size().toString()
                    }
                    .addOnFailureListener { e2 ->
                        solicitudesProgress.visibility = View.GONE
                        tvSolicitudesCount.text = "—"
                        tvSolicitudesError.text = "No se pudo obtener el conteo (${e2.message})"
                        tvSolicitudesError.visibility = View.VISIBLE
                        Log.e(TAG, "Error cargando solicitudes: ${e2.message}", e2)
                    }
            }
    }
}
