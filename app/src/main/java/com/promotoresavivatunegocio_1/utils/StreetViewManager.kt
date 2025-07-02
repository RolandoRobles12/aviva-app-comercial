package com.promotoresavivatunegocio_1.utils

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.FragmentActivity
import com.google.android.gms.maps.OnStreetViewPanoramaReadyCallback
import com.google.android.gms.maps.StreetViewPanorama
import com.google.android.gms.maps.StreetViewPanoramaFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.StreetViewPanoramaCamera
import com.promotoresavivatunegocio_1.R
import com.promotoresavivatunegocio_1.models.ProspectoAviva
import kotlin.math.*

class StreetViewManager(private val activity: FragmentActivity) {

    companion object {
        private const val TAG = "StreetViewManager"
        private const val STREET_VIEW_RADIUS = 50f // metros
    }

    /**
     * Muestra un diálogo con Street View del prospecto
     */
    fun mostrarStreetViewDialog(
        prospecto: ProspectoAviva,
        onNavegar: (ProspectoAviva) -> Unit,
        onVerDetalles: (ProspectoAviva) -> Unit
    ) {
        try {
            // Crear el diálogo usando un layout más simple
            mostrarDialogSimplificado(prospecto, onNavegar, onVerDetalles)

        } catch (e: Exception) {
            Log.e(TAG, "Error mostrando diálogo Street View: ${e.message}", e)
            // Fallback: abrir Street View en Maps directamente
            abrirStreetViewEnMaps(prospecto)
        }
    }

    private fun mostrarDialogSimplificado(
        prospecto: ProspectoAviva,
        onNavegar: (ProspectoAviva) -> Unit,
        onVerDetalles: (ProspectoAviva) -> Unit
    ) {
        val mensaje = buildString {
            append("🏪 ${prospecto.nombre}\n\n")
            append("📍 ${prospecto.giro}\n\n")
            append("📊 ${(prospecto.probabilidad * 100).toInt()}% probabilidad\n\n")
            append("¿Qué te gustaría hacer?")
        }

        AlertDialog.Builder(activity)
            .setTitle("📷 Vista de Calle")
            .setMessage(mensaje)
            .setPositiveButton("🗺️ Ver en Maps") { _, _ ->
                abrirStreetViewEnMaps(prospecto)
            }
            .setNeutralButton("🚶‍♂️ Navegar") { _, _ ->
                onNavegar(prospecto)
            }
            .setNegativeButton("📋 Detalles") { _, _ ->
                onVerDetalles(prospecto)
            }
            .show()
    }

    /**
     * Abre Street View directamente en Google Maps
     */
    fun abrirStreetViewEnMaps(prospecto: ProspectoAviva) {
        try {
            // URI para Street View en Google Maps
            val streetViewUri = Uri.parse(
                "google.streetview:cbll=${prospecto.latitud},${prospecto.longitud}" +
                        "&cbp=0,0,0,0,0" + // Parámetros: yaw, pitch, roll, zoom, mapaction
                        "&layer=c" // Capa de Street View
            )

            val intent = Intent(Intent.ACTION_VIEW, streetViewUri)
            intent.setPackage("com.google.android.apps.maps")

            if (intent.resolveActivity(activity.packageManager) != null) {
                activity.startActivity(intent)
                Log.d(TAG, "Abriendo Street View en Maps para ${prospecto.nombre}")
            } else {
                // Fallback: abrir ubicación normal en Maps
                abrirUbicacionEnMaps(prospecto)
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error abriendo Street View en Maps: ${e.message}")
            abrirUbicacionEnMaps(prospecto)
        }
    }

    private fun abrirUbicacionEnMaps(prospecto: ProspectoAviva) {
        try {
            val uriGenerico = Uri.parse(
                "geo:${prospecto.latitud},${prospecto.longitud}" +
                        "?q=${prospecto.latitud},${prospecto.longitud}(${Uri.encode(prospecto.nombre)})"
            )
            val intent = Intent(Intent.ACTION_VIEW, uriGenerico)
            activity.startActivity(intent)

        } catch (e: Exception) {
            Log.e(TAG, "Error abriendo ubicación: ${e.message}")
        }
    }

    /**
     * Verifica si Street View está disponible para una ubicación
     */
    fun verificarDisponibilidadStreetView(
        latitud: Double,
        longitud: Double,
        callback: (Boolean) -> Unit
    ) {
        // Versión simplificada - asume que está disponible y deja que Google Maps maneje
        callback(true)
    }

    /**
     * Versión avanzada del diálogo (solo usar si el layout existe)
     */
    fun mostrarStreetViewDialogAvanzado(
        prospecto: ProspectoAviva,
        onNavegar: (ProspectoAviva) -> Unit,
        onVerDetalles: (ProspectoAviva) -> Unit
    ) {
        try {
            // Verificar si el layout existe
            val layoutId = activity.resources.getIdentifier(
                "dialog_street_view",
                "layout",
                activity.packageName
            )

            if (layoutId == 0) {
                // El layout no existe, usar versión simplificada
                mostrarDialogSimplificado(prospecto, onNavegar, onVerDetalles)
                return
            }

            val dialogView = LayoutInflater.from(activity)
                .inflate(layoutId, null)

            val dialog = AlertDialog.Builder(activity)
                .setView(dialogView)
                .setCancelable(true)
                .create()

            // Configurar información del prospecto
            configurarInfoProspecto(dialogView, prospecto)

            // Configurar botones
            configurarBotones(dialogView, prospecto, dialog, onNavegar, onVerDetalles)

            dialog.show()

        } catch (e: Exception) {
            Log.e(TAG, "Error con diálogo avanzado, usando versión simple: ${e.message}")
            mostrarDialogSimplificado(prospecto, onNavegar, onVerDetalles)
        }
    }

    private fun configurarInfoProspecto(view: View, prospecto: ProspectoAviva) {
        try {
            view.findViewById<TextView>(R.id.tvProspectoNombre)?.text = prospecto.nombre
            view.findViewById<TextView>(R.id.tvProspectoGiro)?.text = "📍 ${prospecto.giro}"
            view.findViewById<TextView>(R.id.tvProspectoProbabilidad)?.text =
                "📊 ${(prospecto.probabilidad * 100).toInt()}% probabilidad"
        } catch (e: Exception) {
            Log.w(TAG, "Error configurando info: ${e.message}")
        }
    }

    private fun configurarBotones(
        view: View,
        prospecto: ProspectoAviva,
        dialog: AlertDialog,
        onNavegar: (ProspectoAviva) -> Unit,
        onVerDetalles: (ProspectoAviva) -> Unit
    ) {
        try {
            // Botón cerrar
            view.findViewById<View>(R.id.btnCloseStreetView)?.setOnClickListener {
                dialog.dismiss()
            }

            // Botón navegar
            view.findViewById<Button>(R.id.btnNavegar)?.setOnClickListener {
                dialog.dismiss()
                onNavegar(prospecto)
            }

            // Botón detalles
            view.findViewById<Button>(R.id.btnDetalles)?.setOnClickListener {
                dialog.dismiss()
                onVerDetalles(prospecto)
            }

            // Botón abrir en Maps
            view.findViewById<Button>(R.id.btnOpenMapsStreetView)?.setOnClickListener {
                dialog.dismiss()
                abrirStreetViewEnMaps(prospecto)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error configurando botones: ${e.message}")
        }
    }

    private fun calcularBearing(desde: LatLng, hacia: LatLng): Float {
        val lat1 = Math.toRadians(desde.latitude)
        val lat2 = Math.toRadians(hacia.latitude)
        val deltaLng = Math.toRadians(hacia.longitude - desde.longitude)

        val y = sin(deltaLng) * cos(lat2)
        val x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(deltaLng)

        val bearing = Math.toDegrees(atan2(y, x))
        return ((bearing + 360) % 360).toFloat()
    }
}