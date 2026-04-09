package com.promotoresavivatunegocio_1.ui.zonemap

import android.Manifest
import android.content.pm.PackageManager
import android.location.Location
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.PolygonOptions
import com.google.android.material.card.MaterialCardView
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.maps.android.PolyUtil
import com.promotoresavivatunegocio_1.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

class ZoneMapFragment : Fragment(), OnMapReadyCallback {

    private val auth = FirebaseAuth.getInstance()
    private val db   = FirebaseFirestore.getInstance()

    private lateinit var googleMap: GoogleMap
    private lateinit var cardBanner: MaterialCardView
    private lateinit var tvDot: TextView
    private lateinit var tvStatus: TextView
    private lateinit var progress: ProgressBar

    private val assignedZonePoints  = mutableListOf<List<LatLng>>()
    private val forbiddenZonePoints = mutableListOf<List<LatLng>>()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_zone_map, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        cardBanner = view.findViewById(R.id.cardZoneBanner)
        tvDot      = view.findViewById(R.id.tvZoneDot)
        tvStatus   = view.findViewById(R.id.tvZoneStatus)
        progress   = view.findViewById(R.id.zoneMapProgress)

        val mapFrag = childFragmentManager.findFragmentById(R.id.mapZone) as SupportMapFragment
        mapFrag.getMapAsync(this)
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        googleMap.uiSettings.isMyLocationButtonEnabled = true
        googleMap.uiSettings.isZoomControlsEnabled = true

        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED) {
            googleMap.isMyLocationEnabled = true
        }

        loadZones()
    }

    private fun loadZones() {
        val uid = auth.currentUser?.uid ?: run {
            tvStatus.text = "No autenticado"
            progress.visibility = View.GONE
            return
        }

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val assignedSnap = withContext(Dispatchers.IO) {
                    db.collection("zones")
                        .whereEqualTo("assignedSellerId", uid)
                        .whereEqualTo("isActive", true)
                        .get().await()
                }
                val forbiddenSnap = withContext(Dispatchers.IO) {
                    db.collection("forbidden_zones")
                        .whereEqualTo("isActive", true)
                        .get().await()
                }

                if (!isAdded || !::googleMap.isInitialized) return@launch

                assignedZonePoints.clear()
                forbiddenZonePoints.clear()

                val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                    .format(java.util.Date())

                // Zonas asignadas — verde
                for (doc in assignedSnap.documents) {
                    // Skip expired zones
                    val endDate = doc.getString("endDate") ?: ""
                    if (endDate.isNotEmpty() && endDate < todayStr) continue

                    @Suppress("UNCHECKED_CAST")
                    val raw = doc.get("coordinates") as? List<Map<String, Any>> ?: continue
                    val pts = parsePoints(raw)
                    if (pts.size < 3) continue
                    assignedZonePoints.add(pts)
                    googleMap.addPolygon(
                        PolygonOptions()
                            .addAll(pts)
                            .fillColor(android.graphics.Color.argb(60, 76, 175, 80))
                            .strokeColor(android.graphics.Color.rgb(46, 125, 50))
                            .strokeWidth(3f)
                    )
                }

                // Zonas prohibidas — rojo
                for (doc in forbiddenSnap.documents) {
                    @Suppress("UNCHECKED_CAST")
                    val assignedIds = doc.get("assignedPromotorIds") as? List<String> ?: emptyList()
                    if (assignedIds.isNotEmpty() && uid !in assignedIds) continue

                    @Suppress("UNCHECKED_CAST")
                    val raw = doc.get("coordinates") as? List<Map<String, Any>> ?: continue
                    val pts = parsePoints(raw)
                    if (pts.size < 3) continue
                    forbiddenZonePoints.add(pts)
                    googleMap.addPolygon(
                        PolygonOptions()
                            .addAll(pts)
                            .fillColor(android.graphics.Color.argb(60, 244, 67, 54))
                            .strokeColor(android.graphics.Color.rgb(198, 40, 40))
                            .strokeWidth(3f)
                    )
                }

                progress.visibility = View.GONE

                // Centrar cámara en la primera zona asignada o en la ubicación actual
                val firstZone = assignedZonePoints.firstOrNull()
                if (firstZone != null) {
                    val center = LatLng(
                        firstZone.map { it.latitude }.average(),
                        firstZone.map { it.longitude }.average()
                    )
                    googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(center, 13f))
                }

                // Obtener ubicación actual y actualizar banner
                updateLocationAndBanner()

            } catch (e: Exception) {
                if (!isAdded) return@launch
                progress.visibility = View.GONE
                tvStatus.text = "Error al cargar zonas"
                tvDot.setTextColor(ContextCompat.getColor(requireContext(), R.color.error_color))
            }
        }
    }

    private fun updateLocationAndBanner() {
        if (!isAdded) return
        val hasFine = ContextCompat.checkSelfPermission(
            requireContext(), Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasFine) {
            updateBanner(null)
            return
        }

        try {
            LocationServices.getFusedLocationProviderClient(requireContext())
                .lastLocation
                .addOnSuccessListener { location ->
                    if (isAdded) {
                        updateBanner(location)
                        if (location != null && ::googleMap.isInitialized && assignedZonePoints.isEmpty()) {
                            googleMap.animateCamera(
                                CameraUpdateFactory.newLatLngZoom(
                                    LatLng(location.latitude, location.longitude), 13f
                                )
                            )
                        }
                    }
                }
        } catch (e: SecurityException) {
            updateBanner(null)
        }
    }

    private fun updateBanner(location: Location?) {
        if (!isAdded) return
        val ctx = requireContext()

        if (location == null) {
            if (assignedZonePoints.isEmpty() && forbiddenZonePoints.isEmpty()) {
                cardBanner.setCardBackgroundColor(ContextCompat.getColor(ctx, R.color.primary_container))
                tvDot.setTextColor(ContextCompat.getColor(ctx, R.color.secondary_text))
                tvStatus.setTextColor(ContextCompat.getColor(ctx, R.color.primary_text))
                tvDot.text = "●"
                tvStatus.text = "Sin zonas asignadas"
            } else {
                cardBanner.setCardBackgroundColor(ContextCompat.getColor(ctx, R.color.primary_container))
                tvDot.setTextColor(ContextCompat.getColor(ctx, R.color.secondary_text))
                tvStatus.setTextColor(ContextCompat.getColor(ctx, R.color.primary_text))
                tvDot.text = "●"
                tvStatus.text = "Activa ubicación para ver estado"
            }
            return
        }

        val pos = LatLng(location.latitude, location.longitude)
        val enProhibida = forbiddenZonePoints.any { PolyUtil.containsLocation(pos, it, true) }
        val enAsignada  = !enProhibida && assignedZonePoints.any { PolyUtil.containsLocation(pos, it, true) }

        when {
            enProhibida -> {
                cardBanner.setCardBackgroundColor(ContextCompat.getColor(ctx, R.color.error_color))
                tvDot.setTextColor(android.graphics.Color.WHITE)
                tvStatus.setTextColor(android.graphics.Color.WHITE)
                tvDot.text = "⚠"
                tvStatus.text = "Zona prohibida — sal de aquí"
            }
            enAsignada -> {
                cardBanner.setCardBackgroundColor(ContextCompat.getColor(ctx, R.color.aviva_green))
                tvDot.setTextColor(android.graphics.Color.WHITE)
                tvStatus.setTextColor(android.graphics.Color.WHITE)
                tvDot.text = "✓"
                tvStatus.text = "Estás en tu zona"
            }
            assignedZonePoints.isEmpty() && forbiddenZonePoints.isEmpty() -> {
                cardBanner.setCardBackgroundColor(ContextCompat.getColor(ctx, R.color.primary_container))
                tvDot.setTextColor(ContextCompat.getColor(ctx, R.color.secondary_text))
                tvStatus.setTextColor(ContextCompat.getColor(ctx, R.color.primary_text))
                tvDot.text = "●"
                tvStatus.text = "Sin zonas asignadas"
            }
            else -> {
                cardBanner.setCardBackgroundColor(ContextCompat.getColor(ctx, R.color.warning_color))
                tvDot.setTextColor(android.graphics.Color.WHITE)
                tvStatus.setTextColor(android.graphics.Color.WHITE)
                tvDot.text = "●"
                tvStatus.text = "Fuera de zona"
            }
        }
    }

    private fun parsePoints(raw: List<Map<String, Any>>): List<LatLng> =
        raw.mapNotNull { m ->
            val lat = (m["lat"] as? Double) ?: (m["lat"] as? Long)?.toDouble() ?: return@mapNotNull null
            val lng = (m["lng"] as? Double) ?: (m["lng"] as? Long)?.toDouble() ?: return@mapNotNull null
            LatLng(lat, lng)
        }
}
