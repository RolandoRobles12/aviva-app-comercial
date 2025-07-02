package com.promotoresavivatunegocio_1.services

import android.content.Context
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.promotoresavivatunegocio_1.models.NegocioDenue
import com.promotoresavivatunegocio_1.models.ProspectoAviva
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.*

class ProspeccionService(private val context: Context) {

    private val denueService = DenueService()
    private val auth = FirebaseAuth.getInstance()

    companion object {
        private const val TAG = "ProspeccionService"
        const val RADIO_BUSQUEDA_METROS = 2000 // 2km por defecto
        const val MAX_PROSPECTOS = 50
    }

    /*──────────── Detección automática alrededor del usuario ────────────*/
    suspend fun detectarProspectosAutomatico(): List<ProspectoAviva> =
        withContext(Dispatchers.IO) {
            try {
                val (lat, lng) = obtenerUbicacionActual()
                Log.d(TAG, "Ubicación detectada: $lat, $lng")

                val negocios = denueService.buscarNegociosRelevantes(
                    latitud = lat,
                    longitud = lng,
                    radio = RADIO_BUSQUEDA_METROS
                )

                Log.d(TAG, "DENUE devolvió ${negocios.size} negocios")

                val prospectos = negocios
                    .mapNotNull(::evaluarNegocioComoProspecto)
                    .take(MAX_PROSPECTOS)

                Log.d(TAG, "Convertidos a ${prospectos.size} prospectos válidos")
                prospectos

            } catch (e: Exception) {
                Log.e(TAG, "Error en detectarProspectosAutomatico: ${e.message}", e)
                emptyList()
            }
        }

    /*──────────── Búsqueda en un área específica ────────────*/
    suspend fun buscarProspectosEnArea(
        latitud: Double,
        longitud: Double
    ): List<ProspectoAviva> = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Buscando prospectos en área: lat=$latitud, lng=$longitud")

            val negocios = denueService.buscarNegociosRelevantes(
                latitud = latitud,
                longitud = longitud,
                radio = RADIO_BUSQUEDA_METROS
            )

            Log.d(TAG, "DENUE API devolvió ${negocios.size} negocios en el área")

            val prospectos = negocios.mapNotNull { negocio ->
                evaluarNegocioComoProspecto(negocio)?.also { prospecto ->
                    // Calcular distancia para logging
                    val distancia = calcularDistancia(latitud, longitud, negocio.latitud, negocio.longitud)
                    Log.d(TAG, "Prospecto: ${prospecto.nombre} (${prospecto.giro}) - ${String.format("%.2f", distancia)}km - ${(prospecto.probabilidad * 100).toInt()}%")
                }
            }

            Log.d(TAG, "Total de prospectos válidos encontrados: ${prospectos.size}")
            prospectos

        } catch (e: Exception) {
            Log.e(TAG, "Error en buscarProspectosEnArea: ${e.message}", e)
            throw e // Re-lanzar para que el Fragment pueda manejar el error
        }
    }

    /*──────────── Búsqueda con radio personalizado ────────────*/
    suspend fun buscarProspectosEnAreaConRadio(
        latitud: Double,
        longitud: Double,
        radioKm: Double
    ): List<ProspectoAviva> = withContext(Dispatchers.IO) {
        try {
            val radioMetros = (radioKm * 1000).toInt()
            Log.d(TAG, "Buscando prospectos en radio de ${radioKm}km (${radioMetros}m)")

            val negocios = denueService.buscarNegociosRelevantes(
                latitud = latitud,
                longitud = longitud,
                radio = radioMetros
            )

            negocios.mapNotNull(::evaluarNegocioComoProspecto)

        } catch (e: Exception) {
            Log.e(TAG, "Error en buscarProspectosEnAreaConRadio: ${e.message}", e)
            throw e
        }
    }

    /*──────────── Verificación de red ────────────*/
    suspend fun verificarConectividad(): Boolean = try {
        Log.d(TAG, "Verificando conectividad con DENUE...")
        val resultado = denueService.verificarConectividadDenue()
        Log.d(TAG, "Conectividad DENUE: $resultado")
        resultado
    } catch (ex: Exception) {
        Log.e(TAG, "Verificación DENUE falló: ${ex.localizedMessage}", ex)
        false
    }

    /*──────────── Estadísticas y métricas ────────────*/
    suspend fun obtenerEstadisticasArea(
        latitud: Double,
        longitud: Double
    ): EstadisticasProspeccion = withContext(Dispatchers.IO) {
        try {
            val negocios = denueService.buscarNegociosRelevantes(latitud, longitud, RADIO_BUSQUEDA_METROS)
            val prospectos = negocios.mapNotNull(::evaluarNegocioComoProspecto)

            EstadisticasProspeccion(
                totalNegocios = negocios.size,
                prospectosViables = prospectos.size,
                prospectosPorGiro = prospectos.groupBy { it.giro }.mapValues { it.value.size },
                probabilidadPromedio = if (prospectos.isNotEmpty()) prospectos.map { it.probabilidad }.average() else 0.0
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error obteniendo estadísticas: ${e.message}", e)
            EstadisticasProspeccion()
        }
    }

    /*─────────────────────── Funciones Privadas ───────────────────────*/

    private fun obtenerUbicacionActual(): Pair<Double, Double> {
        // TODO: Integrar con LocationManager real
        // Por ahora retorna Ciudad de México como fallback
        return 19.4326 to -99.1332
    }

    /** Devuelve un Prospecto - Ya no filtra porque el DenueService ya filtró */
    private fun evaluarNegocioComoProspecto(negocio: NegocioDenue): ProspectoAviva? {
        try {
            // Ya no filtrar aquí porque el DenueService ya filtró
            // Solo crear el prospecto con la configuración correspondiente

            val giroCfg = encontrarGiroPorNombre(negocio.nombreActividad)
                ?: encontrarGiroPorCodigo(negocio.codigoActividad)
                ?: return crearProspectoGenerico(negocio) // Crear prospecto genérico si no encuentra configuración específica

            val tieneInstalaciones = estimarInstalaciones(negocio)
            val esNegocioFijo = evaluarNegocioFijo(negocio)
            val (probabilidad, razonProbabilidad) = calcularProbabilidadAprobacion(negocio, giroCfg, tieneInstalaciones, esNegocioFijo)

            return ProspectoAviva(
                nombre = negocio.nombre.take(100), // Limitar longitud
                giro = giroCfg.nombre,
                latitud = negocio.latitud,
                longitud = negocio.longitud,
                direccion = negocio.direccion.take(200),
                telefono = negocio.telefono?.take(15),
                montoMinimoCentavos = giroCfg.montoMinimoCentavos,
                montoMaximoCentavos = giroCfg.montoMaximoCentavos,
                probabilidad = probabilidad,
                razonProbabilidad = razonProbabilidad,
                promotorId = obtenerIdPromotor(),
                esNegocioFijo = esNegocioFijo,
                tieneInstalaciones = tieneInstalaciones
            )

        } catch (e: Exception) {
            Log.w(TAG, "Error evaluando negocio ${negocio.nombre}: ${e.message}")
            return null
        }
    }

    // Nueva función para encontrar giro por nombre de actividad
    private fun encontrarGiroPorNombre(nombreActividad: String): ConfiguracionGiro? {
        val nombre = nombreActividad.lowercase()
        return girosPermitidos.find { giro ->
            when (giro.codigo) {
                "461110" -> nombre.contains("abarrotes") || nombre.contains("minisuper") || nombre.contains("miscelánea")
                "461121" -> nombre.contains("carnicería") || nombre.contains("carne") || nombre.contains("pollo")
                "311830" -> nombre.contains("tortillería") || nombre.contains("tortilla") || nombre.contains("masa")
                "464111" -> nombre.contains("farmacia") || nombre.contains("medicamento") || nombre.contains("medicinas")
                "461190" -> nombre.contains("tienda") || nombre.contains("conveniencia")
                "463211" -> nombre.contains("ferretería") || nombre.contains("herramienta") || nombre.contains("construcción")
                "461213" -> nombre.contains("pescadería") || nombre.contains("pescado") || nombre.contains("mariscos")
                "311810" -> nombre.contains("panadería") || nombre.contains("pan")
                "468211" -> nombre.contains("papelería") || nombre.contains("papel") || nombre.contains("útiles")
                "468420" -> nombre.contains("artesanía") || nombre.contains("manualidad")
                "811192" -> nombre.contains("taller") || nombre.contains("reparación") || nombre.contains("mecánica")
                "561432" -> nombre.contains("repuesto") || nombre.contains("refacción") || nombre.contains("auto")
                else -> false
            }
        }
    }

    // Crear prospecto genérico para negocios que pasaron el filtro del DenueService
    private fun crearProspectoGenerico(negocio: NegocioDenue): ProspectoAviva {
        val tieneInstalaciones = estimarInstalaciones(negocio)
        val esNegocioFijo = evaluarNegocioFijo(negocio)

        // Configuración genérica
        val giroGenerico = ConfiguracionGiro("999999", "Comercio General", 7500L, 15000L, 0.6)
        val (probabilidad, razonProbabilidad) = calcularProbabilidadAprobacion(negocio, giroGenerico, tieneInstalaciones, esNegocioFijo)

        return ProspectoAviva(
            nombre = negocio.nombre.take(100),
            giro = negocio.nombreActividad.ifEmpty { "Comercio General" },
            latitud = negocio.latitud,
            longitud = negocio.longitud,
            direccion = negocio.direccion.take(200),
            telefono = negocio.telefono?.take(15),
            montoMinimoCentavos = 7500L,
            montoMaximoCentavos = 15000L,
            probabilidad = probabilidad,
            razonProbabilidad = razonProbabilidad,
            promotorId = obtenerIdPromotor(),
            esNegocioFijo = esNegocioFijo,
            tieneInstalaciones = tieneInstalaciones
        )
    }

    private fun estimarInstalaciones(negocio: NegocioDenue): Boolean {
        val clavesPositivas = listOf(
            "local", "establecimiento", "plaza", "centro", "edificio",
            "comercial", "sucursal", "matriz", "oficina", "nave",
            "bodega", "almacén", "tienda", "shop"
        )

        val clavesNegativas = listOf(
            "ambulante", "móvil", "temporal", "puesto", "stand",
            "domicilio", "casa", "hogar"
        )

        val texto = "${negocio.direccion} ${negocio.razonSocial} ${negocio.nombre}".lowercase()

        val tienePositivas = clavesPositivas.any(texto::contains)
        val tieneNegativas = clavesNegativas.any(texto::contains)

        return tienePositivas && !tieneNegativas
    }

    private fun evaluarNegocioFijo(negocio: NegocioDenue): Boolean {
        val direccion = negocio.direccion.lowercase()

        // Indicadores de negocio fijo
        val indicadoresFijos = listOf(
            "local", "número", "num", "#", "edificio", "piso",
            "plaza", "centro comercial", "av", "avenida", "calle",
            "boulevard", "blvd"
        )

        // Indicadores de negocio no fijo
        val indicadoresNoFijos = listOf(
            "s/n", "sin número", "ambulante", "puesto", "temporal",
            "domicilio conocido", "sin domicilio fijo"
        )

        val esFijo = indicadoresFijos.any(direccion::contains)
        val noEsFijo = indicadoresNoFijos.any(direccion::contains)

        return esFijo && !noEsFijo
    }

    private fun calcularProbabilidadAprobacion(
        negocio: NegocioDenue,
        giroConfig: ConfiguracionGiro,
        tieneInstalaciones: Boolean,
        esNegocioFijo: Boolean
    ): Pair<Double, String> {

        var probabilidad = giroConfig.probabilidadBase
        val razones = mutableListOf<String>()

        // NUEVO: Detectar si es micronegocio (factor MUY importante)
        val esMicronegocio = esMicronegocioIdeal(negocio)
        val esCadenaGrande = esCadenaOFranquicia(negocio)

        // Factores que aumentan probabilidad
        if (esMicronegocio) {
            probabilidad += 0.20
            razones.add("✅ Micronegocio ideal para Aviva Tu Negocio")
        }

        if (esNegocioFijo) {
            probabilidad += 0.15
            razones.add("✅ Negocio establecido con dirección fija")
        }

        if (tieneInstalaciones) {
            probabilidad += 0.10
            razones.add("✅ Cuenta con instalaciones comerciales")
        }

        if (!negocio.telefono.isNullOrBlank()) {
            probabilidad += 0.05
            razones.add("✅ Tiene teléfono de contacto")
        }

        if (negocio.direccion.length > 20) {
            probabilidad += 0.05
            razones.add("✅ Dirección completa y detallada")
        }

        // Factores que disminuyen probabilidad SIGNIFICATIVAMENTE
        if (esCadenaGrande) {
            probabilidad -= 0.40
            razones.add("❌ Cadena comercial (no califica para microcrédito)")
        }

        if (!esNegocioFijo) {
            probabilidad -= 0.20
            razones.add("⚠️ Negocio sin dirección fija")
        }

        if (!tieneInstalaciones) {
            probabilidad -= 0.10
            razones.add("⚠️ Sin instalaciones comerciales claras")
        }

        // Normalizar probabilidad
        probabilidad = probabilidad.coerceIn(0.05, 0.95)

        val nivel = when {
            probabilidad >= 0.8 -> "🎯 EXCELENTE"
            probabilidad >= 0.6 -> "📊 BUENA"
            probabilidad >= 0.4 -> "⚡ MEDIA"
            probabilidad >= 0.2 -> "📋 BAJA"
            else -> "❌ MUY BAJA"
        }

        razones.add("💰 Monto disponible: ${giroConfig.montoMinimoCentavos} - ${giroConfig.montoMaximoCentavos}")
        razones.add("$nivel probabilidad de aprobación")

        val razonCompleta = "✅ Giro compatible: ${giroConfig.nombre}\n" + razones.joinToString("\n")

        return probabilidad to razonCompleta
    }

    // NUEVAS FUNCIONES para detectar micronegocios
    private fun esMicronegocioIdeal(negocio: NegocioDenue): Boolean {
        val nombre = negocio.nombre.lowercase()
        val razonSocial = negocio.razonSocial?.lowercase() ?: ""

        // Indicadores positivos de micronegocio
        val indicadoresMicronegocio = listOf(
            "don", "doña", "la", "el", "los", "las", "san", "santa",
            "familiar", "casero", "artesanal", "tradicional", "local",
            "barrio", "colonia", "esquina", "rincón"
        )

        val tieneIndicadorMicro = indicadoresMicronegocio.any { ind ->
            nombre.contains(ind) || razonSocial.contains(ind)
        }

        // Prefiere negocios con nombre de persona
        val esNombrePersonal = Regex("""(don|doña)\s+\w+""").containsMatchIn(nombre)

        // No debe tener indicadores de empresa grande
        val tieneIndicadorGrande = listOf("s.a.", "sa de cv", "corporativo", "grupo").any {
            razonSocial.contains(it)
        }

        return (tieneIndicadorMicro || esNombrePersonal) && !tieneIndicadorGrande
    }

    private fun esCadenaOFranquicia(negocio: NegocioDenue): Boolean {
        val texto = "${negocio.nombre} ${negocio.razonSocial ?: ""}".lowercase()

        val cadenas = listOf(
            // Conveniencia
            "oxxo", "seven eleven", "7 eleven", "circle k", "extra",
            // Supermercados
            "walmart", "soriana", "chedraui", "mega", "bodega aurrera",
            // Farmacias
            "farmacia guadalajara", "farmacias del ahorro", "farmacia benavides",
            // Ferreterías
            "home depot", "comex", "sherwin williams",
            // CUALQUIER negocio de comida (todos excluidos)
            "mcdonalds", "burger king", "kfc", "subway", "dominos", "starbucks",
            "taquería", "restaurant", "comida", "cocina"
        )

        val indicadoresGrandes = listOf(
            "s.a. de c.v.", "sa de cv", "sociedad anonima", "corporativo",
            "grupo", "sucursal", "franquicia", "cadena"
        )

        // IMPORTANTE: Excluir cualquier negocio de comida
        val esComida = esNegocioComida(texto)

        return cadenas.any { texto.contains(it) } ||
                indicadoresGrandes.any { texto.contains(it) } ||
                esComida
    }

    // Nueva función para detectar negocios de comida
    private fun esNegocioComida(texto: String): Boolean {
        val palabrasComida = listOf(
            "restaurante", "restaurant", "comida", "alimentos preparados", "comedor",
            "taquería", "taco", "quesadilla", "torta", "hamburguesa", "pizza",
            "bar", "cantina", "cervecería", "café", "cafetería", "fonda",
            "lonchería", "cocina económica", "antojito", "elote", "esquites"
        )

        return palabrasComida.any { palabra -> texto.contains(palabra) }
    }

    private fun calcularDistancia(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val r = 6371 // Radio de la Tierra en km
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }

    /** Obtener ID del promotor logueado */
    private fun obtenerIdPromotor(): String {
        return auth.currentUser?.uid ?: "promotor_anonimo_${System.currentTimeMillis()}"
    }

    /*─────────────────────── Configuración de Giros ───────────────────────*/

    data class ConfiguracionGiro(
        val codigo: String,
        val nombre: String,
        val montoMinimoCentavos: Long,
        val montoMaximoCentavos: Long,
        val probabilidadBase: Double = 0.7
    )

    // Configuración de giros permitidos para Aviva Tu Negocio (SIN COMIDA)
    private val girosPermitidos = listOf(
        ConfiguracionGiro("461110", "Abarrotes", 7500L, 15000L, 0.85),
        ConfiguracionGiro("461121", "Carnicerías", 10000L, 15000L, 0.85),
        ConfiguracionGiro("311830", "Tortillerías", 8000L, 12000L, 0.80),
        ConfiguracionGiro("464111", "Farmacias", 10000L, 15000L, 0.70),
        ConfiguracionGiro("461190", "Tiendas de conveniencia", 8000L, 15000L, 0.75),
        ConfiguracionGiro("463211", "Ferreterías", 10000L, 15000L, 0.70),
        ConfiguracionGiro("461213", "Pescaderías", 10000L, 15000L, 0.80),
        ConfiguracionGiro("311810", "Panaderías", 8000L, 15000L, 0.75),
        ConfiguracionGiro("468211", "Papelerías", 7500L, 12000L, 0.75),
        ConfiguracionGiro("468420", "Artesanías", 7500L, 12000L, 0.80),
        ConfiguracionGiro("811192", "Talleres de reparación", 8000L, 15000L, 0.75),
        ConfiguracionGiro("561432", "Repuestos automotrices", 10000L, 15000L, 0.70)
    )

    private fun encontrarGiroPorCodigo(codigoActividad: String): ConfiguracionGiro? {
        return girosPermitidos.find {
            codigoActividad.contains(it.codigo) ||
                    codigoActividad.startsWith(it.codigo)
        }
    }

    /*─────────────────────── Clases de Datos ───────────────────────*/

    data class EstadisticasProspeccion(
        val totalNegocios: Int = 0,
        val prospectosViables: Int = 0,
        val prospectosPorGiro: Map<String, Int> = emptyMap(),
        val probabilidadPromedio: Double = 0.0
    )
}