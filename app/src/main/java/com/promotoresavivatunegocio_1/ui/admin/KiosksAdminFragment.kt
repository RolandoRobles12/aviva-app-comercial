package com.promotoresavivatunegocio_1.ui.admin

import android.app.AlertDialog
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.Polygon
import com.google.android.gms.maps.model.PolygonOptions
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.textfield.TextInputEditText
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.promotoresavivatunegocio_1.R
import models.ForbiddenZone

/**
 * Gestor de Zonas Prohibidas.
 *
 * Permite al administrador:
 * - Ver las zonas prohibidas existentes en el mapa (polígonos de colores)
 * - Dibujar nuevas zonas tapeando puntos en el mapa
 * - Personalizar el color de cada zona con chips de colores
 * - Editar nombre, descripción y color de zonas existentes
 * - Eliminar zonas (desactivación lógica en Firestore)
 *
 * Colección Firestore: "forbidden_zones"
 */
class KiosksAdminFragment : Fragment(), OnMapReadyCallback {

    private var googleMap: GoogleMap? = null
    private val db = FirebaseFirestore.getInstance()

    // ─── Estado del modo dibujo ───────────────────────────────────
    private var isDrawingMode = false
    private val drawnPoints   = mutableListOf<LatLng>()
    private var previewPolygon: Polygon? = null
    private val previewMarkers = mutableListOf<Marker>()

    // Color actualmente seleccionado (se actualiza al elegir chip)
    private var currentFillColor   = PRESET_COLORS[0].second
    private var currentStrokeColor = PRESET_COLORS[0].third

    // ─── Zonas cargadas ──────────────────────────────────────────
    private val zones        = mutableListOf<ForbiddenZone>()
    private val zonePolygons = mutableMapOf<String, Polygon>() // zoneId → Polygon

    // ─── Views ───────────────────────────────────────────────────
    private lateinit var drawingToolbar:     View
    private lateinit var bottomControlsCard: MaterialCardView
    private lateinit var cardPointCount:     MaterialCardView
    private lateinit var tvPointCount:       TextView
    private lateinit var tvInstructions:     TextView
    private lateinit var btnNewZone:         MaterialButton
    private lateinit var btnUndo:            MaterialButton
    private lateinit var btnFinishZone:      MaterialButton
    private lateinit var btnCancelDraw:      MaterialButton
    private lateinit var btnReloadZones:     MaterialButton

    // ═══════════════════════════════════════════════════════════════
    companion object {
        private const val TAG        = "ZonasProhibidas"
        private const val COLLECTION = "forbidden_zones"

        /**
         * Colores preestablecidos: (Nombre, fillColorHex ARGB, strokeColorHex ARGB)
         * El prefijo de alpha ("66" ≈ 40% opacidad) hace que el relleno sea semi-transparente.
         */
        val PRESET_COLORS = listOf(
            Triple("Rojo",    "#66FF2222", "#FFCC0000"),
            Triple("Naranja", "#66FF8800", "#FFCC6600"),
            Triple("Amarillo","#66FFCC00", "#FFB89900"),
            Triple("Azul",    "#660055FF", "#FF0033CC"),
            Triple("Morado",  "#668800CC", "#FF660099"),
            Triple("Rosa",    "#66FF0088", "#FFCC0066")
        )
    }

    // ═══════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? = inflater.inflate(R.layout.fragment_kiosks_admin, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        initViews(view)
        setupButtons()
        setupMap()
    }

    // ═══════════════════════════════════════════════════════════════
    // INICIALIZACIÓN DE VISTAS Y BOTONES
    // ═══════════════════════════════════════════════════════════════

    private fun initViews(view: View) {
        drawingToolbar     = view.findViewById(R.id.drawingToolbar)
        bottomControlsCard = view.findViewById(R.id.bottomControlsCard)
        cardPointCount     = view.findViewById(R.id.cardPointCount)
        tvPointCount       = view.findViewById(R.id.tvPointCount)
        tvInstructions     = view.findViewById(R.id.tvInstructions)
        btnNewZone         = view.findViewById(R.id.btnNewZone)
        btnUndo            = view.findViewById(R.id.btnUndo)
        btnFinishZone      = view.findViewById(R.id.btnFinishZone)
        btnCancelDraw      = view.findViewById(R.id.btnCancelDraw)
        btnReloadZones     = view.findViewById(R.id.btnReloadZones)
    }

    private fun setupButtons() {
        btnNewZone.setOnClickListener    { startDrawingMode() }
        btnUndo.setOnClickListener       { undoLastPoint() }
        btnCancelDraw.setOnClickListener { cancelDrawing() }
        btnReloadZones.setOnClickListener { loadZones() }

        btnFinishZone.setOnClickListener {
            if (drawnPoints.size < 3) {
                Toast.makeText(
                    context,
                    "Necesitas al menos 3 puntos para crear una zona",
                    Toast.LENGTH_SHORT
                ).show()
            } else {
                showSaveZoneDialog()
            }
        }
    }

    private fun setupMap() {
        val mapFrag = childFragmentManager
            .findFragmentById(R.id.zonaMap) as? SupportMapFragment
        mapFrag?.getMapAsync(this)
    }

    // ═══════════════════════════════════════════════════════════════
    // MAP READY
    // ═══════════════════════════════════════════════════════════════

    override fun onMapReady(map: GoogleMap) {
        googleMap = map

        // Centrar en México
        map.moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(23.6345, -102.5528), 5f))

        map.uiSettings.apply {
            isZoomControlsEnabled = true
            isCompassEnabled      = true
            isMapToolbarEnabled   = false
        }

        // Tap en mapa → agregar vértice (solo en modo dibujo)
        map.setOnMapClickListener { latLng ->
            if (isDrawingMode) addPoint(latLng)
        }

        // Tap en polígono existente → opciones
        map.setOnPolygonClickListener { polygon ->
            val zoneId = polygon.tag as? String ?: return@setOnPolygonClickListener
            val zone   = zones.find { it.id == zoneId } ?: return@setOnPolygonClickListener
            showZoneOptionsDialog(zone)
        }

        loadZones()
    }

    // ═══════════════════════════════════════════════════════════════
    // MODO DIBUJO DE ZONA
    // ═══════════════════════════════════════════════════════════════

    private fun startDrawingMode() {
        isDrawingMode = true
        drawnPoints.clear()
        currentFillColor   = PRESET_COLORS[0].second
        currentStrokeColor = PRESET_COLORS[0].third

        drawingToolbar.visibility     = View.VISIBLE
        cardPointCount.visibility     = View.VISIBLE
        bottomControlsCard.visibility = View.GONE

        updatePointCount()
        Toast.makeText(
            context,
            "Toca el mapa para agregar puntos de la zona",
            Toast.LENGTH_LONG
        ).show()
    }

    private fun addPoint(latLng: LatLng) {
        drawnPoints.add(latLng)

        val marker = googleMap?.addMarker(
            MarkerOptions()
                .position(latLng)
                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED))
                .anchor(0.5f, 0.5f)
                .title("Punto ${drawnPoints.size}")
        )
        marker?.let { previewMarkers.add(it) }

        updatePreviewPolygon()
        updatePointCount()
    }

    private fun undoLastPoint() {
        if (drawnPoints.isEmpty()) return
        drawnPoints.removeAt(drawnPoints.lastIndex)
        previewMarkers.lastOrNull()?.remove()
        if (previewMarkers.isNotEmpty()) previewMarkers.removeAt(previewMarkers.lastIndex)
        updatePreviewPolygon()
        updatePointCount()
    }

    /** Redibuja el polígono de vista previa con el color actual */
    private fun updatePreviewPolygon() {
        previewPolygon?.remove()
        previewPolygon = null

        if (drawnPoints.size >= 2) {
            previewPolygon = googleMap?.addPolygon(
                PolygonOptions()
                    .addAll(drawnPoints)
                    .fillColor(parseColor(currentFillColor, Color.argb(80, 255, 0, 0)))
                    .strokeColor(parseColor(currentStrokeColor, Color.RED))
                    .strokeWidth(4f)
                    .clickable(false)
            )
        }
    }

    private fun updatePointCount() {
        val suffix = if (drawnPoints.size >= 3) " ✓" else " (mín. 3)"
        tvPointCount.text = "${drawnPoints.size} punto(s)$suffix"
    }

    private fun cancelDrawing() {
        isDrawingMode = false
        drawnPoints.clear()

        previewPolygon?.remove()
        previewPolygon = null
        previewMarkers.forEach { it.remove() }
        previewMarkers.clear()

        drawingToolbar.visibility     = View.GONE
        cardPointCount.visibility     = View.GONE
        bottomControlsCard.visibility = View.VISIBLE
    }

    // ═══════════════════════════════════════════════════════════════
    // DIÁLOGO GUARDAR / EDITAR ZONA
    // ═══════════════════════════════════════════════════════════════

    /**
     * Muestra el diálogo para guardar una zona nueva o editar una existente.
     * @param existingZone Si no es null, se entra en modo edición.
     */
    private fun showSaveZoneDialog(existingZone: ForbiddenZone? = null) {
        val isEdit   = existingZone != null
        val inflate  = LayoutInflater.from(requireContext())
        val dialogView = inflate.inflate(R.layout.dialog_save_zone, null)

        val etName         = dialogView.findViewById<TextInputEditText>(R.id.etZoneName)
        val etDesc         = dialogView.findViewById<TextInputEditText>(R.id.etZoneDesc)
        val chipGroup      = dialogView.findViewById<ChipGroup>(R.id.colorChipGroup)
        val viewPreview    = dialogView.findViewById<View>(R.id.viewColorPreview)

        // Pre-llenar si es edición
        if (isEdit) {
            etName.setText(existingZone!!.name)
            etDesc.setText(existingZone.description)
            currentFillColor   = existingZone.fillColorHex
            currentStrokeColor = existingZone.strokeColorHex
        } else {
            currentFillColor   = PRESET_COLORS[0].second
            currentStrokeColor = PRESET_COLORS[0].third
        }

        viewPreview.setBackgroundColor(parseColor(currentFillColor, Color.argb(80, 255, 0, 0)))

        // Generar chips de color dinámicamente
        chipGroup.removeAllViews()
        PRESET_COLORS.forEachIndexed { index, (name, fill, stroke) ->
            val chip = Chip(requireContext()).apply {
                text = name
                isCheckable = true
                isChecked = if (isEdit) fill == existingZone!!.fillColorHex
                            else index == 0
                chipBackgroundColor = ColorStateList.valueOf(
                    parseColor(stroke, Color.RED)
                )
                setTextColor(Color.WHITE)
                checkedIconTint = ColorStateList.valueOf(Color.WHITE)

                setOnCheckedChangeListener { _, checked ->
                    if (checked) {
                        currentFillColor   = fill
                        currentStrokeColor = stroke
                        viewPreview.setBackgroundColor(
                            parseColor(fill, Color.argb(80, 255, 0, 0))
                        )
                        // Actualizar polígono de vista previa (solo en modo creación)
                        if (!isEdit) updatePreviewPolygon()
                    }
                }
            }
            chipGroup.addView(chip)
        }

        val title = if (isEdit) "Editar zona" else "Nueva zona prohibida"
        AlertDialog.Builder(requireContext())
            .setTitle(title)
            .setView(dialogView)
            .setPositiveButton("Guardar") { _, _ ->
                val name = etName.text?.toString()?.trim() ?: ""
                val desc = etDesc.text?.toString()?.trim() ?: ""
                if (name.isBlank()) {
                    Toast.makeText(context, "El nombre es requerido", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (isEdit) updateZone(existingZone!!.id, name, desc)
                else saveNewZone(name, desc)
            }
            .setNegativeButton("Cancelar", null)
            .create()
            .show()
    }

    // ═══════════════════════════════════════════════════════════════
    // FIRESTORE: CREAR / ACTUALIZAR / ELIMINAR
    // ═══════════════════════════════════════════════════════════════

    private fun saveNewZone(name: String, description: String) {
        val pointsList = drawnPoints.map {
            mapOf("lat" to it.latitude, "lng" to it.longitude)
        }
        val data = hashMapOf(
            "name"           to name,
            "description"    to description,
            "points"         to pointsList,
            "fillColorHex"   to currentFillColor,
            "strokeColorHex" to currentStrokeColor,
            "strokeWidth"    to 3f,
            "isActive"       to true,
            "createdAt"      to Timestamp.now(),
            "updatedAt"      to Timestamp.now()
        )
        db.collection(COLLECTION).add(data)
            .addOnSuccessListener { ref ->
                Log.d(TAG, "Zona guardada: ${ref.id}")
                Toast.makeText(context, "Zona '$name' guardada", Toast.LENGTH_SHORT).show()
                cancelDrawing()
                loadZones()
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Error guardando zona", e)
                Toast.makeText(context, "Error al guardar: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun updateZone(id: String, name: String, description: String) {
        val updates = mapOf(
            "name"           to name,
            "description"    to description,
            "fillColorHex"   to currentFillColor,
            "strokeColorHex" to currentStrokeColor,
            "updatedAt"      to Timestamp.now()
        )
        db.collection(COLLECTION).document(id).update(updates)
            .addOnSuccessListener {
                Toast.makeText(context, "Zona actualizada", Toast.LENGTH_SHORT).show()
                loadZones()
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Error al actualizar: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun deleteZone(zone: ForbiddenZone) {
        db.collection(COLLECTION).document(zone.id)
            .update(
                mapOf(
                    "isActive"  to false,
                    "updatedAt" to Timestamp.now()
                )
            )
            .addOnSuccessListener {
                Toast.makeText(context, "Zona '${zone.name}' eliminada", Toast.LENGTH_SHORT).show()
                loadZones()
            }
            .addOnFailureListener { e ->
                Toast.makeText(context, "Error al eliminar: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    // ═══════════════════════════════════════════════════════════════
    // CARGAR Y DIBUJAR ZONAS
    // ═══════════════════════════════════════════════════════════════

    private fun loadZones() {
        db.collection(COLLECTION)
            .whereEqualTo("isActive", true)
            .get()
            .addOnSuccessListener { docs ->
                zones.clear()
                zonePolygons.values.forEach { it.remove() }
                zonePolygons.clear()

                for (doc in docs) {
                    try {
                        @Suppress("UNCHECKED_CAST")
                        val rawPts = doc.get("points") as? List<Map<String, Double>> ?: emptyList()
                        zones.add(
                            ForbiddenZone(
                                id             = doc.id,
                                name           = doc.getString("name") ?: "",
                                description    = doc.getString("description") ?: "",
                                points         = rawPts,
                                fillColorHex   = doc.getString("fillColorHex") ?: "#66FF2222",
                                strokeColorHex = doc.getString("strokeColorHex") ?: "#FFCC0000",
                                strokeWidth    = (doc.getDouble("strokeWidth") ?: 3.0).toFloat(),
                                isActive       = doc.getBoolean("isActive") ?: true,
                                createdAt      = doc.getTimestamp("createdAt"),
                                updatedAt      = doc.getTimestamp("updatedAt")
                            )
                        )
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parseando zona ${doc.id}", e)
                    }
                }

                drawZones()
                Log.d(TAG, "Zonas cargadas: ${zones.size}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Error cargando zonas", e)
                Toast.makeText(context, "Error al cargar zonas", Toast.LENGTH_SHORT).show()
            }
    }

    /** Dibuja todos los polígonos de zonas existentes en el mapa */
    private fun drawZones() {
        val map = googleMap ?: return
        zonePolygons.values.forEach { it.remove() }
        zonePolygons.clear()

        if (zones.isEmpty()) return

        val boundsBuilder = LatLngBounds.Builder()
        var hasValidPoints = false

        zones.forEach { zone ->
            if (zone.points.size < 3) return@forEach

            val latLngs = zone.points.mapNotNull { pt ->
                val lat = pt["lat"] ?: return@mapNotNull null
                val lng = pt["lng"] ?: return@mapNotNull null
                LatLng(lat, lng)
            }
            if (latLngs.size < 3) return@forEach

            val polygon = map.addPolygon(
                PolygonOptions()
                    .addAll(latLngs)
                    .fillColor(parseColor(zone.fillColorHex, Color.argb(80, 255, 0, 0)))
                    .strokeColor(parseColor(zone.strokeColorHex, Color.RED))
                    .strokeWidth(zone.strokeWidth)
                    .clickable(true)
            )
            polygon.tag = zone.id
            zonePolygons[zone.id] = polygon

            latLngs.forEach { boundsBuilder.include(it) }
            hasValidPoints = true
        }

        // Ajustar cámara para mostrar todas las zonas
        if (hasValidPoints) {
            try {
                val bounds = boundsBuilder.build()
                map.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, 80))
            } catch (e: Exception) {
                Log.e(TAG, "Error ajustando cámara", e)
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DIÁLOGO DE OPCIONES DE ZONA EXISTENTE
    // ═══════════════════════════════════════════════════════════════

    private fun showZoneOptionsDialog(zone: ForbiddenZone) {
        val items = arrayOf(
            "✏️  Editar nombre y color",
            "🗑️  Eliminar zona"
        )
        AlertDialog.Builder(requireContext())
            .setTitle("🚫 ${zone.name}")
            .apply {
                if (zone.description.isNotBlank()) setMessage(zone.description)
            }
            .setItems(items) { _, which ->
                when (which) {
                    0 -> showSaveZoneDialog(existingZone = zone)
                    1 -> confirmDeleteZone(zone)
                }
            }
            .setNegativeButton("Cerrar", null)
            .show()
    }

    private fun confirmDeleteZone(zone: ForbiddenZone) {
        AlertDialog.Builder(requireContext())
            .setTitle("Eliminar zona")
            .setMessage("¿Eliminar la zona '${zone.name}'? Esta acción no se puede deshacer.")
            .setPositiveButton("Eliminar") { _, _ -> deleteZone(zone) }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    // ═══════════════════════════════════════════════════════════════
    // UTILIDADES
    // ═══════════════════════════════════════════════════════════════

    private fun parseColor(hex: String, fallback: Int): Int = try {
        Color.parseColor(hex)
    } catch (e: Exception) {
        fallback
    }
}
