package com.promotoresavivatunegocio_1.services

import android.util.Log
import com.promotoresavivatunegocio_1.BuildConfig
import com.promotoresavivatunegocio_1.models.NegocioDenue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.*
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.math.*

class DenueService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()
    private val gson = Gson()

    companion object {
        private const val TAG = "DenueService"
        private const val BASE_URL = "https://www.inegi.org.mx/app/api/denue/v1/consulta"
        private const val DELAY_BETWEEN_REQUESTS = 500L
        private const val DENUE_TOKEN: String = BuildConfig.DENUE_TOKEN

        // Giros de interés para Aviva Tu Negocio
        private val GIROS_ACEPTADOS = listOf(
            "461110", "461121", "311830", "464111", "461190",
            "463211", "461213", "311810", "468211", "468420",
            "811192", "561432"
        )
    }

    suspend fun buscarNegociosRelevantes(
        latitud: Double,
        longitud: Double,
        radio: Int = 1500
    ): List<NegocioDenue> = withContext(Dispatchers.IO) {

        Log.d(TAG, "Iniciando búsqueda en DENUE: lat=$latitud, lng=$longitud, radio=${radio}m")

        val todosLosNegocios = mutableListOf<NegocioDenue>()

        try {
            Log.d(TAG, "Estrategia 1: Búsqueda general en el área...")

            val negociosArea = buscarTodosEnArea(latitud, longitud, radio)
            Log.d(TAG, "Búsqueda general encontró ${negociosArea.size} establecimientos")

            if (negociosArea.isNotEmpty()) {
                val negociosFiltrados = filtrarYValidarNegocios(negociosArea)
                Log.d(TAG, "Filtrados ${negociosFiltrados.size} negocios relevantes")
                todosLosNegocios.addAll(negociosFiltrados)
            } else {
                throw Exception("No se encontraron establecimientos en búsqueda general")
            }

        } catch (e: Exception) {
            Log.w(TAG, "Búsqueda general falló: ${e.message}")
            Log.d(TAG, "Estrategia 2: Búsqueda por giros específicos...")

            val girosComunes = listOf("461110", "464111", "463211", "461190", "311830")

            for (giro in girosComunes) {
                try {
                    Log.d(TAG, "Buscando giro: ${obtenerNombreGiro(giro)} ($giro)")

                    val negociosGiro = buscarPorGiroEspecifico(latitud, longitud, giro, radio)
                    Log.d(TAG, "Encontrados ${negociosGiro.size} para ${obtenerNombreGiro(giro)}")

                    if (negociosGiro.isNotEmpty()) {
                        val filtrados = filtrarYValidarNegocios(negociosGiro)
                        todosLosNegocios.addAll(filtrados)
                        Log.d(TAG, "Agregados ${filtrados.size} negocios válidos de ${obtenerNombreGiro(giro)}")
                    }

                    delay(300L)

                } catch (e: Exception) {
                    Log.w(TAG, "Error buscando ${obtenerNombreGiro(giro)}: ${e.message}")
                    continue
                }
            }
        }

        val negociosUnicos = todosLosNegocios
            .distinctBy { it.clee.ifEmpty { it.id } }
            .sortedBy { calcularDistancia(latitud, longitud, it.latitud, it.longitud) }
            .take(20)

        Log.d(TAG, "Búsqueda completada: ${negociosUnicos.size} micronegocios encontrados")
        return@withContext negociosUnicos
    }

    private fun filtrarYValidarNegocios(negocios: List<NegocioDenue>): List<NegocioDenue> {
        return negocios.filter { negocio ->
            val nombreNegocio = negocio.nombre.lowercase()
            val razonSocial = negocio.razonSocial?.lowercase() ?: ""
            val nombreActividad = negocio.nombreActividad.lowercase()
            val codigoActividad = negocio.codigoActividad

            val esNegocioProhibido = esNegocioExcluido(nombreNegocio, razonSocial, nombreActividad, codigoActividad)

            if (esNegocioProhibido) {
                Log.v(TAG, "Negocio excluido: ${negocio.nombre} - ${negocio.nombreActividad}")
                return@filter false
            }

            val esGiroPermitido = GIROS_ACEPTADOS.any { giro ->
                codigoActividad.contains(giro) || esGiroEspecificoRelevante(giro, nombreActividad, nombreNegocio)
            }

            val esCadenaGrande = esCadenaOFranquicia(nombreNegocio, razonSocial)
            val esViable = esGiroPermitido && !esCadenaGrande

            if (esViable) {
                Log.v(TAG, "Micronegocio: ${negocio.nombre} - ${negocio.nombreActividad}")
            }

            esViable
        }
    }

    private suspend fun buscarTodosEnArea(
        latitud: Double,
        longitud: Double,
        radio: Int
    ): List<NegocioDenue> = withContext(Dispatchers.IO) {

        val url = "$BASE_URL/Buscar/todos/$latitud,$longitud/$radio/$DENUE_TOKEN"
        Log.d(TAG, "URL de consulta: $url")

        val request = Request.Builder()
            .url(url)
            .get()
            .addHeader("User-Agent", "AvivaApp/1.0")
            .build()

        return@withContext try {
            val response = client.newCall(request).execute()

            Log.d(TAG, "Response Code: ${response.code}")

            if (!response.isSuccessful) {
                val errorBody = response.body?.string()
                Log.w(TAG, "Response no exitoso: ${response.code} - $errorBody")

                when (response.code) {
                    401 -> Log.e(TAG, "Token inválido o expirado. Verifica tu token del DENUE")
                    429 -> Log.e(TAG, "Demasiadas consultas. Espera antes de hacer otra consulta")
                    500 -> Log.e(TAG, "Error del servidor DENUE")
                }

                return@withContext emptyList()
            }

            val responseBody = response.body?.string()
            if (responseBody.isNullOrEmpty()) {
                Log.w(TAG, "Response body vacío")
                return@withContext emptyList()
            }

            Log.d(TAG, "Response body (primeros 300 chars): ${responseBody.take(300)}...")

            val negocios = try {
                // Intentar como objetos JSON primero
                val objectArrayType = object : TypeToken<Array<DenueJsonObject>>() {}.type
                val denueObjects: Array<DenueJsonObject> = gson.fromJson(responseBody, objectArrayType)

                Log.d(TAG, "Parseado como objetos JSON: ${denueObjects.size} registros")

                denueObjects.mapNotNull { denueObject ->
                    try {
                        convertirJsonObjectANegocio(denueObject)
                    } catch (e: Exception) {
                        Log.w(TAG, "Error convirtiendo objeto JSON a negocio: ${e.message}")
                        null
                    }
                }

            } catch (e: Exception) {
                Log.d(TAG, "No es formato JSON, intentando como array de arrays...")

                try {
                    // Fallback: array de arrays
                    val arrayType = object : TypeToken<Array<Array<String>>>() {}.type
                    val denueArrays: Array<Array<String>> = gson.fromJson(responseBody, arrayType)

                    Log.d(TAG, "Parseado como arrays: ${denueArrays.size} registros")

                    denueArrays.mapNotNull { denueArray ->
                        try {
                            convertirArrayANegocio(denueArray)
                        } catch (e2: Exception) {
                            Log.w(TAG, "Error convirtiendo array a negocio: ${e2.message}")
                            null
                        }
                    }
                } catch (e2: Exception) {
                    Log.e(TAG, "Error parseando respuesta en ambos formatos: ${e2.message}")
                    emptyList()
                }
            }

            Log.d(TAG, "Convertidos ${negocios.size} negocios válidos")
            return@withContext negocios

        } catch (e: IOException) {
            Log.e(TAG, "Error de red: ${e.message}")
            emptyList()
        } catch (e: Exception) {
            Log.e(TAG, "Error inesperado: ${e.message}")
            emptyList()
        }
    }

    private suspend fun buscarPorGiroEspecifico(
        latitud: Double,
        longitud: Double,
        codigoGiro: String,
        radio: Int
    ): List<NegocioDenue> = withContext(Dispatchers.IO) {

        val nombreGiro = obtenerNombreGiro(codigoGiro)
        val url = "$BASE_URL/Buscar/$nombreGiro/$latitud,$longitud/$radio/$DENUE_TOKEN"

        val request = Request.Builder()
            .url(url)
            .get()
            .build()

        return@withContext try {
            val response = client.newCall(request).execute()

            if (!response.isSuccessful) {
                Log.w(TAG, "Response no exitoso para giro $codigoGiro: ${response.code}")
                return@withContext emptyList()
            }

            val responseBody = response.body?.string()
            if (responseBody.isNullOrEmpty()) {
                return@withContext emptyList()
            }

            val negocios = try {
                val objectArrayType = object : TypeToken<Array<DenueJsonObject>>() {}.type
                val denueObjects: Array<DenueJsonObject> = gson.fromJson(responseBody, objectArrayType)
                denueObjects.mapNotNull { convertirJsonObjectANegocio(it) }
            } catch (e: Exception) {
                try {
                    val arrayType = object : TypeToken<Array<Array<String>>>() {}.type
                    val denueArrays: Array<Array<String>> = gson.fromJson(responseBody, arrayType)
                    denueArrays.mapNotNull { convertirArrayANegocio(it, codigoGiro) }
                } catch (e2: Exception) {
                    emptyList()
                }
            }

            return@withContext negocios

        } catch (e: Exception) {
            Log.e(TAG, "Error buscando giro específico $codigoGiro: ${e.message}")
            emptyList()
        }
    }

    // ==========================================
    // CONVERSIÓN DE DATOS MEJORADA
    // ==========================================

    data class DenueJsonObject(
        val CLEE: String? = null,
        val Id: String? = null,
        val Nombre: String? = null,
        val Razon_social: String? = null,
        val Clase_actividad: String? = null,
        val Estrato: String? = null,
        val Tipo_vialidad: String? = null,
        val Calle: String? = null,
        val Num_Exterior: String? = null,
        val Num_Interior: String? = null,
        val Colonia: String? = null,
        val CP: String? = null,
        val Localidad: String? = null,
        val Municipio: String? = null,
        val Entidad_federativa: String? = null,
        val Telefono: String? = null,
        val Correo_electronico: String? = null,
        val Sitio_internet: String? = null,
        val Tipo_establecimiento: String? = null,
        val Longitud: String? = null,
        val Latitud: String? = null,
        val Tipo_corredor_industrial: String? = null,
        val Nom_corredor_industrial: String? = null,
        val Numero_local: String? = null,
        val AGEB: String? = null,
        val Manzana: String? = null,
        val CLASE_ACTIVIDAD_ID: String? = null,
        val EDIFICIO_PISO: String? = null,
        val SECTOR_ACTIVIDAD_ID: String? = null,
        val SUBSECTOR_ACTIVIDAD_ID: String? = null,
        val RAMA_ACTIVIDAD_ID: String? = null,
        val SUBRAMA_ACTIVIDAD_ID: String? = null,
        val Edificio: String? = null
    )

    private fun convertirJsonObjectANegocio(denueObject: DenueJsonObject): NegocioDenue? {
        return try {
            val latitud = denueObject.Latitud?.toDoubleOrNull()
            val longitud = denueObject.Longitud?.toDoubleOrNull()

            if (latitud == null || longitud == null) {
                Log.w(TAG, "Coordenadas inválidas para ${denueObject.Nombre}: lat=${denueObject.Latitud}, lng=${denueObject.Longitud}")
                return null
            }

            // Construir dirección completa mejorada
            val direccionCompleta = construirDireccionCompleta(
                tipoVialidad = denueObject.Tipo_vialidad,
                calle = denueObject.Calle,
                numeroExt = denueObject.Num_Exterior,
                numeroInt = denueObject.Num_Interior,
                colonia = denueObject.Colonia,
                cp = denueObject.CP,
                localidad = denueObject.Localidad,
                municipio = denueObject.Municipio,
                entidad = denueObject.Entidad_federativa
            )

            NegocioDenue(
                // Campos básicos
                id = denueObject.Id ?: "",
                nombre = limpiarTexto(denueObject.Nombre) ?: "Sin nombre",
                razonSocial = limpiarTexto(denueObject.Razon_social) ?: limpiarTexto(denueObject.Nombre),
                codigoActividad = denueObject.CLEE ?: "",
                nombreActividad = convertirGiroAmigable(denueObject.Clase_actividad),
                latitud = latitud,
                longitud = longitud,
                direccion = direccionCompleta,
                telefono = limpiarTelefono(denueObject.Telefono),
                email = limpiarEmail(denueObject.Correo_electronico),
                sitioWeb = limpiarUrl(denueObject.Sitio_internet),

                // Campos completos del DENUE
                clee = denueObject.CLEE ?: "",
                idEstablecimiento = denueObject.Id ?: "",
                claseActividad = limpiarTexto(denueObject.Clase_actividad) ?: "",
                estrato = limpiarTexto(denueObject.Estrato) ?: "",
                tipoVialidad = limpiarTexto(denueObject.Tipo_vialidad) ?: "",
                calle = limpiarTexto(denueObject.Calle) ?: "",
                numeroExterior = limpiarTexto(denueObject.Num_Exterior) ?: "",
                numeroInterior = limpiarTexto(denueObject.Num_Interior) ?: "",
                colonia = limpiarTexto(denueObject.Colonia) ?: "",
                codigoPostal = limpiarTexto(denueObject.CP) ?: "",
                localidad = limpiarTexto(denueObject.Localidad) ?: "",
                municipio = limpiarTexto(denueObject.Municipio) ?: "",
                entidadFederativa = limpiarTexto(denueObject.Entidad_federativa) ?: "",
                tipoEstablecimiento = limpiarTexto(denueObject.Tipo_establecimiento) ?: "",

                // Campos adicionales cuando están disponibles
                tipoCorredor = limpiarTexto(denueObject.Tipo_corredor_industrial) ?: "",
                nombreCorredor = limpiarTexto(denueObject.Nom_corredor_industrial) ?: "",
                numeroLocal = limpiarTexto(denueObject.Numero_local) ?: "",
                ageb = limpiarTexto(denueObject.AGEB) ?: "",
                manzana = limpiarTexto(denueObject.Manzana) ?: "",
                edificio = limpiarTexto(denueObject.Edificio) ?: "",
                idClaseActividad = limpiarTexto(denueObject.CLASE_ACTIVIDAD_ID) ?: "",
                idSector = limpiarTexto(denueObject.SECTOR_ACTIVIDAD_ID) ?: "",
                idSubsector = limpiarTexto(denueObject.SUBSECTOR_ACTIVIDAD_ID) ?: "",
                idRama = limpiarTexto(denueObject.RAMA_ACTIVIDAD_ID) ?: ""
            )

        } catch (e: Exception) {
            Log.e(TAG, "Error convirtiendo objeto JSON a negocio: ${e.message}")
            null
        }
    }

    private fun convertirArrayANegocio(
        denueArray: Array<String>,
        codigoActividad: String? = null
    ): NegocioDenue? {
        return try {
            if (denueArray.size < 19) {
                Log.w(TAG, "Array del DENUE tiene menos campos de los esperados: ${denueArray.size}")
                return null
            }

            // Mapeo según la documentación oficial del DENUE
            val claveClee = denueArray.getOrNull(0) ?: ""
            val id = denueArray.getOrNull(1) ?: ""
            val nombre = denueArray.getOrNull(2) ?: ""
            val razonSocial = denueArray.getOrNull(3) ?: ""
            val claseActividad = denueArray.getOrNull(4) ?: ""
            val estrato = denueArray.getOrNull(5) ?: ""
            val tipoVialidad = denueArray.getOrNull(6) ?: ""
            val calle = denueArray.getOrNull(7) ?: ""
            val numeroExt = denueArray.getOrNull(8) ?: ""
            val numeroInt = denueArray.getOrNull(9) ?: ""
            val colonia = denueArray.getOrNull(10) ?: ""
            val codigoPostal = denueArray.getOrNull(11) ?: ""
            val localidadMunicipio = denueArray.getOrNull(12) ?: ""
            val telefono = denueArray.getOrNull(13)
            val email = denueArray.getOrNull(14)
            val sitioWeb = denueArray.getOrNull(15)
            val tipoEstablecimiento = denueArray.getOrNull(16) ?: ""
            val longitudStr = denueArray.getOrNull(17) ?: ""
            val latitudStr = denueArray.getOrNull(18) ?: ""

            // Campos adicionales si están disponibles
            val tipoCorredor = denueArray.getOrNull(19) ?: ""
            val nombreCorredor = denueArray.getOrNull(20) ?: ""
            val numeroLocal = denueArray.getOrNull(21) ?: ""
            val ageb = denueArray.getOrNull(22) ?: ""
            val manzana = denueArray.getOrNull(23) ?: ""
            val edificio = denueArray.getOrNull(24) ?: ""
            val idClaseActividad = denueArray.getOrNull(25) ?: ""
            val idSector = denueArray.getOrNull(26) ?: ""
            val idSubsector = denueArray.getOrNull(27) ?: ""
            val idRama = denueArray.getOrNull(28) ?: ""

            val longitud = longitudStr.toDoubleOrNull()
            val latitud = latitudStr.toDoubleOrNull()

            if (latitud == null || longitud == null) {
                Log.w(TAG, "Coordenadas inválidas para $nombre: lat=$latitudStr, lng=$longitudStr")
                return null
            }

            val direccionCompleta = construirDireccionCompleta(
                tipoVialidad = tipoVialidad,
                calle = calle,
                numeroExt = numeroExt,
                numeroInt = numeroInt,
                colonia = colonia,
                cp = codigoPostal,
                localidad = localidadMunicipio,
                municipio = "",
                entidad = ""
            )

            NegocioDenue(
                id = id,
                nombre = limpiarTexto(nombre) ?: "Sin nombre",
                razonSocial = limpiarTexto(razonSocial) ?: limpiarTexto(nombre),
                codigoActividad = claveClee.takeIf { it.isNotEmpty() } ?: codigoActividad ?: "",
                nombreActividad = convertirGiroAmigable(claseActividad),
                latitud = latitud,
                longitud = longitud,
                direccion = direccionCompleta,
                telefono = limpiarTelefono(telefono),
                email = limpiarEmail(email),
                sitioWeb = limpiarUrl(sitioWeb),

                // Campos completos
                clee = claveClee,
                idEstablecimiento = id,
                claseActividad = limpiarTexto(claseActividad) ?: "",
                estrato = limpiarTexto(estrato) ?: "",
                tipoVialidad = limpiarTexto(tipoVialidad) ?: "",
                calle = limpiarTexto(calle) ?: "",
                numeroExterior = limpiarTexto(numeroExt) ?: "",
                numeroInterior = limpiarTexto(numeroInt) ?: "",
                colonia = limpiarTexto(colonia) ?: "",
                codigoPostal = limpiarTexto(codigoPostal) ?: "",
                localidad = limpiarTexto(localidadMunicipio) ?: "",
                municipio = "",
                entidadFederativa = "",
                tipoEstablecimiento = limpiarTexto(tipoEstablecimiento) ?: "",

                // Campos adicionales
                tipoCorredor = limpiarTexto(tipoCorredor) ?: "",
                nombreCorredor = limpiarTexto(nombreCorredor) ?: "",
                numeroLocal = limpiarTexto(numeroLocal) ?: "",
                ageb = limpiarTexto(ageb) ?: "",
                manzana = limpiarTexto(manzana) ?: "",
                edificio = limpiarTexto(edificio) ?: "",
                idClaseActividad = limpiarTexto(idClaseActividad) ?: "",
                idSector = limpiarTexto(idSector) ?: "",
                idSubsector = limpiarTexto(idSubsector) ?: "",
                idRama = limpiarTexto(idRama) ?: ""
            )

        } catch (e: Exception) {
            Log.e(TAG, "Error convirtiendo array a negocio: ${e.message}")
            null
        }
    }

    // ==========================================
    // FUNCIONES AUXILIARES DE LIMPIEZA
    // ==========================================

    private fun construirDireccionCompleta(
        tipoVialidad: String?,
        calle: String?,
        numeroExt: String?,
        numeroInt: String?,
        colonia: String?,
        cp: String?,
        localidad: String?,
        municipio: String?,
        entidad: String?
    ): String {
        return buildString {
            tipoVialidad?.takeIf { it.isNotEmpty() && it != "0" }?.let { append("$it ") }
            calle?.takeIf { it.isNotEmpty() }?.let { append(it) }
            numeroExt?.takeIf { it.isNotEmpty() && it != "0" }?.let { append(" #$it") }
            numeroInt?.takeIf { it.isNotEmpty() && it != "0" }?.let { append(" Int. $it") }
            colonia?.takeIf { it.isNotEmpty() }?.let { append(", $it") }
            cp?.takeIf { it.isNotEmpty() && it != "0" }?.let { append(", CP $it") }
            localidad?.takeIf { it.isNotEmpty() }?.let { append(", $it") }
            municipio?.takeIf { it.isNotEmpty() }?.let { append(", $it") }
            entidad?.takeIf { it.isNotEmpty() }?.let { append(", $it") }
        }.trim()
    }

    private fun limpiarTexto(texto: String?): String? {
        return texto?.trim()
            ?.takeIf { it.isNotEmpty() && it != "0" && it != "null" && it != "NULL" }
            ?.replace(Regex("\\s+"), " ")
    }

    private fun limpiarTelefono(telefono: String?): String? {
        return telefono?.trim()
            ?.takeIf { it.isNotEmpty() && it != "0" && it != "null" && it.length >= 7 }
            ?.replace(Regex("[^0-9]"), "")
            ?.takeIf { it.length >= 7 }
    }

    private fun limpiarEmail(email: String?): String? {
        return email?.trim()
            ?.takeIf { it.isNotEmpty() && it != "0" && it != "null" && it.contains("@") }
    }

    private fun limpiarUrl(url: String?): String? {
        return url?.trim()
            ?.takeIf { it.isNotEmpty() && it != "0" && it != "null" }
            ?.let { if (it.startsWith("http")) it else "http://$it" }
    }

    private fun convertirGiroAmigable(claseActividad: String?): String {
        val giro = claseActividad?.lowercase() ?: return "Comercio General"

        return when {
            giro.contains("abarrotes") -> "Tienda de Abarrotes"
            giro.contains("farmacia") -> "Farmacia"
            giro.contains("tortillería") || giro.contains("tortilla") -> "Tortillería"
            giro.contains("ferretería") -> "Ferretería"
            giro.contains("carnicería") -> "Carnicería"
            giro.contains("panadería") -> "Panadería"
            giro.contains("papelería") -> "Papelería"
            giro.contains("pescadería") -> "Pescadería"
            giro.contains("artesanía") -> "Artesanías"
            giro.contains("taller") -> "Taller de Reparación"
            giro.contains("repuesto") || giro.contains("refacción") -> "Repuestos Automotrices"
            else -> claseActividad.take(100)
        }
    }

    // ==========================================
    // FUNCIONES DE FILTRADO (sin cambios)
    // ==========================================

    private fun esNegocioExcluido(nombre: String, razonSocial: String, actividad: String, codigo: String): Boolean {
        val textoCompleto = "$nombre $razonSocial $actividad".lowercase()

        val esEstacionamiento = listOf("estacionamiento", "parking", "aparcamiento", "cochera", "pensión de autos")
            .any { textoCompleto.contains(it) } || codigo.contains("581241")

        val esTransporte = listOf("metrobus", "transporte", "autobús", "camión", "taxi", "uber", "didi",
            "arrendadora", "renta de autos", "alquiler", "vehicular", "automotriz", "flotillas", "logistics",
            "mudanza", "paquetería", "mensajería").any { textoCompleto.contains(it) } ||
                listOf("485", "532", "488", "492").any { codigo.startsWith(it) }

        val esFinanciero = listOf("banco", "financiera", "prestamos", "crédito", "seguros", "casa de cambio",
            "caja de ahorro", "cooperativa financiera", "afore", "inversiones").any { textoCompleto.contains(it) } ||
                codigo.startsWith("522")

        val esProfesional = listOf("consultoria", "abogado", "contador", "notario", "gestor", "asesor",
            "arquitecto", "ingeniero", "diseñador", "desarrollador").any { textoCompleto.contains(it) } ||
                codigo.startsWith("541")

        val esMedico = listOf("hospital", "clínica", "consultorio", "doctor", "médico", "dentista",
            "laboratorio", "radiología", "fisioterapia", "psicólogo").any { textoCompleto.contains(it) } ||
                codigo.startsWith("621")

        val esEducativo = listOf("escuela", "colegio", "universidad", "instituto", "academia", "guardería",
            "kinder", "preescolar", "primaria", "secundaria", "preparatoria").any { textoCompleto.contains(it) } ||
                codigo.startsWith("611")

        val esInmobiliario = listOf("inmobiliaria", "bienes raíces", "desarrolladora", "fraccionamiento",
            "residencial", "condominios", "departamentos").any { textoCompleto.contains(it) } ||
                codigo.startsWith("531")

        val esGobierno = listOf("gobierno", "municipal", "delegación", "secretaría", "instituto nacional",
            "comisión", "organismo", "dependencia", "oficina gubernamental").any { textoCompleto.contains(it) } ||
                codigo.startsWith("931")

        return esEstacionamiento || esTransporte || esFinanciero || esProfesional ||
                esMedico || esEducativo || esInmobiliario || esGobierno
    }

    private fun esGiroEspecificoRelevante(giro: String, nombreActividad: String, nombreNegocio: String = ""): Boolean {
        val textoCompleto = "$nombreActividad $nombreNegocio".lowercase()

        return when (giro) {
            "461110" -> textoCompleto.contains("abarrotes") || textoCompleto.contains("minisuper") ||
                    textoCompleto.contains("miscelánea") || textoCompleto.contains("tienda de abarrotes") ||
                    (textoCompleto.contains("comercio") && textoCompleto.contains("menor"))
            "461121" -> textoCompleto.contains("carnicería") || textoCompleto.contains("carne") ||
                    textoCompleto.contains("pollo") || textoCompleto.contains("pollería") ||
                    textoCompleto.contains("expendio de carne")
            "311830" -> textoCompleto.contains("tortillería") || textoCompleto.contains("tortilla") ||
                    textoCompleto.contains("masa") || textoCompleto.contains("molino de nixtamal")
            "464111" -> textoCompleto.contains("farmacia") || textoCompleto.contains("medicamento") ||
                    textoCompleto.contains("medicinas") || textoCompleto.contains("botica") &&
                    !textoCompleto.contains("guadalajara") && !textoCompleto.contains("del ahorro") &&
                    !textoCompleto.contains("benavides")
            "461190" -> (textoCompleto.contains("tienda") || textoCompleto.contains("conveniencia")) &&
                    !textoCompleto.contains("oxxo") && !textoCompleto.contains("seven eleven") &&
                    !textoCompleto.contains("circle k")
            "463211" -> textoCompleto.contains("ferretería") || textoCompleto.contains("herramienta") ||
                    textoCompleto.contains("construcción") || textoCompleto.contains("materiales") &&
                    !textoCompleto.contains("home depot") && !textoCompleto.contains("comex")
            "461213" -> textoCompleto.contains("pescadería") || textoCompleto.contains("pescado") ||
                    textoCompleto.contains("mariscos") || textoCompleto.contains("productos del mar")
            "311810" -> (textoCompleto.contains("panadería") || textoCompleto.contains("pan")) &&
                    !textoCompleto.contains("café") && !textoCompleto.contains("restaurant") &&
                    !textoCompleto.contains("bimbo")
            "468211" -> textoCompleto.contains("papelería") || textoCompleto.contains("papel") ||
                    textoCompleto.contains("útiles") || textoCompleto.contains("artículos escolares")
            "468420" -> textoCompleto.contains("artesanía") || textoCompleto.contains("manualidad") ||
                    textoCompleto.contains("artesanal") || textoCompleto.contains("trabajo manual")
            "811192" -> (textoCompleto.contains("taller") || textoCompleto.contains("reparación")) &&
                    (textoCompleto.contains("mecánica") || textoCompleto.contains("carpintería") ||
                            textoCompleto.contains("costura") || textoCompleto.contains("zapatería"))
            "561432" -> (textoCompleto.contains("repuesto") || textoCompleto.contains("refacción") ||
                    textoCompleto.contains("auto")) && !textoCompleto.contains("corporativo") &&
                    !textoCompleto.contains("distribuidora")
            else -> false
        }
    }

    private fun esCadenaOFranquicia(nombreNegocio: String, razonSocial: String): Boolean {
        val texto = "$nombreNegocio $razonSocial".lowercase()

        val cadenasConveniencia = setOf("oxxo", "seven eleven", "7 eleven", "circle k", "extra", "kiosko",
            "modelorama", "six", "super willys", "willy's", "ampm", "go mart")

        val cadenaSupermercados = setOf("walmart", "soriana", "chedraui", "mega", "superama", "bodega aurrera",
            "comercial mexicana", "calimax", "heb", "costco", "sams", "city club")

        val cadenasComida = setOf("mcdonalds", "burger king", "kfc", "subway", "dominos", "pizza hut",
            "starbucks", "carl's jr", "taco bell", "little caesars", "papa johns", "pollo feliz",
            "pollo loco", "church's", "kentucky", "wendys", "pizza dominos", "pizza little caesars")

        val cadenasFarmacias = setOf("farmacia guadalajara", "farmacias del ahorro", "farmacia benavides",
            "farmacia san pablo", "farmacia similares", "dr simi", "farmacia yza")

        val cadenasFerreterias = setOf("home depot", "comex", "sherwin williams", "novaceramic", "interceramic",
            "liverpool", "palacio de hierro", "elektra", "coppel")

        val panaderiasIndustriales = setOf("wonder", "bimbo", "marinela", "tia rosa", "globo", "donuts krispy")

        val indicadoresEmpresaGrande = setOf("s.a. de c.v.", "sa de cv", "sociedad anonima", "corporativo", "grupo",
            "holding", "internacional", "enterprise", "corporation", "sucursal", "franquicia", "cadena",
            "matriz", "subsidiaria")

        val tieneNumeroSucursal = Regex("""#\d+|no\.\s*\d+|sucursal\s*\d+""").containsMatchIn(texto)

        val todasLasCadenas = cadenasConveniencia + cadenaSupermercados + cadenasComida +
                cadenasFarmacias + cadenasFerreterias + panaderiasIndustriales

        val esNegocioComidaDetectado = esNegocioComida(texto)

        return todasLasCadenas.any { cadena -> texto.contains(cadena) } ||
                indicadoresEmpresaGrande.any { indicador -> texto.contains(indicador) } ||
                tieneNumeroSucursal || esNegocioComidaDetectado
    }

    private fun esNegocioComida(texto: String): Boolean {
        val palabrasComida = setOf("restaurant", "restaurante", "taqueria", "comida", "cocina", "antojitos",
            "mariscos", "pozole", "birria", "tacos", "tortas", "hamburguesas", "pizza", "sushi", "cafeteria",
            "cantina", "bar", "cerveza", "comedor", "fonda", "cenaduria", "loncheria", "quesadillas", "tamales",
            "elotes", "raspados", "nieves", "helados", "cafe", "coffee", "latte", "cappuccino", "bebidas",
            "jugos", "licuados", "aguas", "refrescos", "snacks", "botanero", "mezcal", "tequila", "pulque",
            "michelada", "cerveceria", "wings", "alitas", "carnitas", "barbacoa", "mole", "enchiladas",
            "chilaquiles", "flautas", "tostadas", "sopes", "huaraches", "gorditas")

        return palabrasComida.any { palabra -> texto.contains(palabra) }
    }

    private fun obtenerNombreGiro(codigo: String): String {
        return when (codigo) {
            "461110" -> "abarrotes"
            "461121" -> "carniceria"
            "311830" -> "tortilleria"
            "464111" -> "farmacia"
            "461190" -> "tienda"
            "463211" -> "ferreteria"
            "461213" -> "pescaderia"
            "311810" -> "panaderia"
            "468211" -> "papeleria"
            "468420" -> "artesania"
            "811192" -> "taller"
            "561432" -> "repuestos"
            else -> "comercio"
        }
    }

    private fun calcularDistancia(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val radioTierra = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLng / 2) * sin(dLng / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return radioTierra * c * 1000
    }

    suspend fun verificarConectividadDenue(): Boolean = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Verificando conectividad con DENUE...")

            val request = Request.Builder()
                .url("$BASE_URL/Buscar/todos/19.4326,-99.1332/100/$DENUE_TOKEN")
                .get()
                .addHeader("User-Agent", "AvivaApp/1.0")
                .build()

            val response = client.newCall(request).execute()
            val isSuccessful = response.isSuccessful

            Log.d(TAG, "Verificación DENUE - Response Code: ${response.code}")

            if (!isSuccessful) {
                when (response.code) {
                    401 -> Log.w(TAG, "Token del DENUE inválido o expirado")
                    429 -> Log.w(TAG, "Demasiadas consultas al DENUE")
                    500 -> Log.w(TAG, "Error del servidor DENUE")
                    else -> Log.w(TAG, "Error de conectividad DENUE: ${response.code}")
                }
            } else {
                Log.d(TAG, "Conectividad DENUE exitosa")
            }

            return@withContext isSuccessful

        } catch (e: Exception) {
            Log.e(TAG, "Error verificando conectividad DENUE: ${e.message}")
            return@withContext false
        }
    }
}