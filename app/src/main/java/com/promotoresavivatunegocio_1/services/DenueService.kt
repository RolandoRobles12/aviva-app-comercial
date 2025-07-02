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

        // Token del DENUE (inyectado desde secrets.properties)
        private const val DENUE_TOKEN: String = BuildConfig.DENUE_TOKEN

        // Giros de interés para Aviva Tu Negocio (SIN COMIDA)
        private val GIROS_ACEPTADOS = listOf(
            "461110", // Abarrotes
            "461121", // Carnicerías
            "311830", // Tortillerías
            "464111", // Farmacias
            "461190", // Tiendas de conveniencia
            "463211", // Ferreterías
            "461213", // Pescaderías
            "311810", // Panaderías (solo venta de pan, no consumo)
            "468211", // Papelerías
            "468420", // Artesanías
            "811192", // Talleres de reparación (mecánica, carpintería, costura)
            "561432"  // Repuestos automotrices
        )
    }

    suspend fun buscarNegociosRelevantes(
        latitud: Double,
        longitud: Double,
        radio: Int = 1500 // Reducir radio para consultas más rápidas
    ): List<NegocioDenue> = withContext(Dispatchers.IO) {

        Log.d(TAG, "Iniciando búsqueda en DENUE: lat=$latitud, lng=$longitud, radio=${radio}m")

        val todosLosNegocios = mutableListOf<NegocioDenue>()

        // Estrategia híbrida: primero intentar búsqueda general, luego específica
        try {
            Log.d(TAG, "Estrategia 1: Búsqueda general en el área...")

            val negociosArea = buscarTodosEnArea(latitud, longitud, radio)
            Log.d(TAG, "Búsqueda general encontró ${negociosArea.size} establecimientos")

            if (negociosArea.isNotEmpty()) {
                // Si encontramos resultados, filtrarlos
                val negociosFiltrados = filtrarYValidarNegocios(negociosArea)
                Log.d(TAG, "Filtrados ${negociosFiltrados.size} negocios relevantes")
                todosLosNegocios.addAll(negociosFiltrados)
            } else {
                // Si no hay resultados, activar búsqueda específica
                throw Exception("No se encontraron establecimientos en búsqueda general")
            }

        } catch (e: Exception) {
            Log.w(TAG, "Búsqueda general falló: ${e.message}")
            Log.d(TAG, "Estrategia 2: Búsqueda por giros específicos...")

            // Fallback: buscar por giros específicos más comunes
            val girosComunes = listOf(
                "461110",
                "464111",
                "463211",
                "461190",
                "311830"
            ) // Abarrotes, Farmacias, Ferreterías, Tiendas, Tortillerías

            for (giro in girosComunes) {
                try {
                    Log.d(TAG, "Buscando giro: ${obtenerNombreGiro(giro)} ($giro)")

                    val negociosGiro = buscarPorGiroEspecifico(latitud, longitud, giro, radio)
                    Log.d(TAG, "Encontrados ${negociosGiro.size} para ${obtenerNombreGiro(giro)}")

                    if (negociosGiro.isNotEmpty()) {
                        val filtrados = filtrarYValidarNegocios(negociosGiro)
                        todosLosNegocios.addAll(filtrados)
                        Log.d(
                            TAG,
                            "Agregados ${filtrados.size} negocios válidos de ${
                                obtenerNombreGiro(giro)
                            }"
                        )
                    }

                    delay(300L) // Delay corto entre búsquedas

                } catch (e: Exception) {
                    Log.w(TAG, "Error buscando ${obtenerNombreGiro(giro)}: ${e.message}")
                    continue
                }
            }
        }

        val negociosUnicos = todosLosNegocios
            .distinctBy { it.id }
            .sortedBy { calcularDistancia(latitud, longitud, it.latitud, it.longitud) }
            .take(15) // Limitar a 15 para mejor rendimiento

        Log.d(TAG, "✅ Búsqueda completada: ${negociosUnicos.size} micronegocios encontrados")
        return@withContext negociosUnicos
    }

    // Nueva función para filtrar y validar negocios
    private fun filtrarYValidarNegocios(negocios: List<NegocioDenue>): List<NegocioDenue> {
        return negocios.filter { negocio ->
            val nombreNegocio = negocio.nombre.lowercase()
            val razonSocial = negocio.razonSocial?.lowercase() ?: ""
            val nombreActividad = negocio.nombreActividad.lowercase()
            val codigoActividad = negocio.codigoActividad

            // PASO 1: EXCLUIR EXPLÍCITAMENTE negocios prohibidos
            val esNegocioProhibido =
                esNegocioExcluido(nombreNegocio, razonSocial, nombreActividad, codigoActividad)

            if (esNegocioProhibido) {
                Log.v(TAG, "❌ Negocio excluido: ${negocio.nombre} - ${negocio.nombreActividad}")
                return@filter false
            }

            // PASO 2: VERIFICAR si es un giro específicamente PERMITIDO
            val esGiroPermitido = GIROS_ACEPTADOS.any { giro ->
                // Verificar por código SCIAN
                codigoActividad.contains(giro) ||
                        // Verificar por nombre de actividad
                        esGiroEspecificoRelevante(giro, nombreActividad, nombreNegocio)
            }

            // PASO 3: VERIFICAR que NO sea cadena grande
            val esCadenaGrande = esCadenaOFranquicia(nombreNegocio, razonSocial)

            val esViable = esGiroPermitido && !esCadenaGrande

            if (esViable) {
                Log.v(TAG, "✅ Micronegocio: ${negocio.nombre} - ${negocio.nombreActividad}")
            } else if (!esGiroPermitido) {
                Log.v(TAG, "⚠️ Giro no permitido: ${negocio.nombre} - ${negocio.nombreActividad}")
            } else if (esCadenaGrande) {
                Log.v(TAG, "❌ Cadena excluida: ${negocio.nombre}")
            }

            esViable
        }
    }

    // NUEVA FUNCIÓN: Detectar negocios que deben ser completamente excluidos
    private fun esNegocioExcluido(
        nombre: String,
        razonSocial: String,
        actividad: String,
        codigo: String
    ): Boolean {
        val textoCompleto = "$nombre $razonSocial $actividad".lowercase()

        // 1. ESTACIONAMIENTOS (todos excluidos)
        val esEstacionamiento = listOf(
            "estacionamiento", "parking", "aparcamiento", "cochera", "pensión de autos"
        ).any { textoCompleto.contains(it) } || codigo.contains("581241") // Código SCIAN de estacionamientos

        // 2. TRANSPORTE Y VEHÍCULOS (todos excluidos)
        val esTransporte = listOf(
            "metrobus", "transporte", "autobús", "camión", "taxi", "uber", "didi",
            "arrendadora", "renta de autos", "alquiler", "vehicular", "automotriz",
            "flotillas", "logistics", "mudanza", "paquetería", "mensajería"
        ).any { textoCompleto.contains(it) } ||
                listOf(
                    "485",
                    "532",
                    "488",
                    "492"
                ).any { codigo.startsWith(it) } // Códigos de transporte

        // 3. SERVICIOS FINANCIEROS (todos excluidos)
        val esFinanciero = listOf(
            "banco", "financiera", "prestamos", "crédito", "seguros", "casa de cambio",
            "caja de ahorro", "cooperativa financiera", "afore", "inversiones"
        ).any { textoCompleto.contains(it) } || codigo.startsWith("522")

        // 4. SERVICIOS PROFESIONALES (todos excluidos)
        val esProfesional = listOf(
            "consultoria", "abogado", "contador", "notario", "gestor", "asesor",
            "arquitecto", "ingeniero", "diseñador", "desarrollador"
        ).any { textoCompleto.contains(it) } || codigo.startsWith("541")

        // 5. SERVICIOS MÉDICOS (todos excluidos)
        val esMedico = listOf(
            "hospital", "clínica", "consultorio", "doctor", "médico", "dentista",
            "laboratorio", "radiología", "fisioterapia", "psicólogo"
        ).any { textoCompleto.contains(it) } || codigo.startsWith("621")

        // 6. SERVICIOS EDUCATIVOS (todos excluidos)
        val esEducativo = listOf(
            "escuela", "colegio", "universidad", "instituto", "academia", "guardería",
            "kinder", "preescolar", "primaria", "secundaria", "preparatoria"
        ).any { textoCompleto.contains(it) } || codigo.startsWith("611")

        // 7. INMOBILIARIAS Y BIENES RAÍCES (todos excluidos)
        val esInmobiliario = listOf(
            "inmobiliaria", "bienes raíces", "desarrolladora", "fraccionamiento",
            "residencial", "condominios", "departamentos"
        ).any { textoCompleto.contains(it) } || codigo.startsWith("531")

        // 8. GOBIERNO Y SERVICIOS PÚBLICOS (todos excluidos)
        val esGobierno = listOf(
            "gobierno", "municipal", "delegación", "secretaría", "instituto nacional",
            "comisión", "organismo", "dependencia", "oficina gubernamental"
        ).any { textoCompleto.contains(it) } || codigo.startsWith("931")

        return esEstacionamiento || esTransporte || esFinanciero || esProfesional ||
                esMedico || esEducativo || esInmobiliario || esGobierno
    }

    // Función helper para verificar giros específicos PERMITIDOS
    private fun esGiroEspecificoRelevante(
        giro: String,
        nombreActividad: String,
        nombreNegocio: String = ""
    ): Boolean {
        val textoCompleto = "$nombreActividad $nombreNegocio".lowercase()

        return when (giro) {
            "461110" -> // Abarrotes
                textoCompleto.contains("abarrotes") ||
                        textoCompleto.contains("minisuper") ||
                        textoCompleto.contains("miscelánea") ||
                        textoCompleto.contains("tienda de abarrotes") ||
                        (textoCompleto.contains("comercio") && textoCompleto.contains("menor"))

            "461121" -> // Carnicerías
                textoCompleto.contains("carnicería") ||
                        textoCompleto.contains("carne") ||
                        textoCompleto.contains("pollo") ||
                        textoCompleto.contains("pollería") ||
                        textoCompleto.contains("expendio de carne")

            "311830" -> // Tortillerías
                textoCompleto.contains("tortillería") ||
                        textoCompleto.contains("tortilla") ||
                        textoCompleto.contains("masa") ||
                        textoCompleto.contains("molino de nixtamal")

            "464111" -> // Farmacias
                textoCompleto.contains("farmacia") ||
                        textoCompleto.contains("medicamento") ||
                        textoCompleto.contains("medicinas") ||
                        textoCompleto.contains("botica") &&
                        !textoCompleto.contains("guadalajara") &&
                        !textoCompleto.contains("del ahorro") &&
                        !textoCompleto.contains("benavides")

            "461190" -> // Tiendas de conveniencia (solo familiares)
                (textoCompleto.contains("tienda") || textoCompleto.contains("conveniencia")) &&
                        !textoCompleto.contains("oxxo") &&
                        !textoCompleto.contains("seven eleven") &&
                        !textoCompleto.contains("circle k")

            "463211" -> // Ferreterías
                textoCompleto.contains("ferretería") ||
                        textoCompleto.contains("herramienta") ||
                        textoCompleto.contains("construcción") ||
                        textoCompleto.contains("materiales") &&
                        !textoCompleto.contains("home depot") &&
                        !textoCompleto.contains("comex")

            "461213" -> // Pescaderías
                textoCompleto.contains("pescadería") ||
                        textoCompleto.contains("pescado") ||
                        textoCompleto.contains("mariscos") ||
                        textoCompleto.contains("productos del mar")

            "311810" -> // Panaderías (solo venta, no cafeterías)
                (textoCompleto.contains("panadería") || textoCompleto.contains("pan")) &&
                        !textoCompleto.contains("café") &&
                        !textoCompleto.contains("restaurant") &&
                        !textoCompleto.contains("bimbo")

            "468211" -> // Papelerías
                textoCompleto.contains("papelería") ||
                        textoCompleto.contains("papel") ||
                        textoCompleto.contains("útiles") ||
                        textoCompleto.contains("artículos escolares")

            "468420" -> // Artesanías
                textoCompleto.contains("artesanía") ||
                        textoCompleto.contains("manualidad") ||
                        textoCompleto.contains("artesanal") ||
                        textoCompleto.contains("trabajo manual")

            "811192" -> // Talleres de reparación
                (textoCompleto.contains("taller") || textoCompleto.contains("reparación")) &&
                        (textoCompleto.contains("mecánica") ||
                                textoCompleto.contains("carpintería") ||
                                textoCompleto.contains("costura") ||
                                textoCompleto.contains("zapatería"))

            "561432" -> // Repuestos automotrices (solo pequeños)
                (textoCompleto.contains("repuesto") ||
                        textoCompleto.contains("refacción") ||
                        textoCompleto.contains("auto")) &&
                        !textoCompleto.contains("corporativo") &&
                        !textoCompleto.contains("distribuidora")

            else -> false
        }
    }

    // Método principal: buscar todos los establecimientos en un área
    private suspend fun buscarTodosEnArea(
        latitud: Double,
        longitud: Double,
        radio: Int
    ): List<NegocioDenue> = withContext(Dispatchers.IO) {

        // Usar el método Buscar según la documentación oficial
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
            Log.d(TAG, "Response Message: ${response.message}")

            if (!response.isSuccessful) {
                val errorBody = response.body?.string()
                Log.w(TAG, "Response no exitoso: ${response.code} - $errorBody")

                when (response.code) {
                    401 -> Log.e(TAG, "❌ Token inválido o expirado. Verifica tu token del DENUE")
                    429 -> Log.e(TAG, "❌ Demasiadas consultas. Espera antes de hacer otra consulta")
                    500 -> Log.e(TAG, "❌ Error del servidor DENUE")
                }

                return@withContext emptyList()
            }

            val responseBody = response.body?.string()
            if (responseBody.isNullOrEmpty()) {
                Log.w(TAG, "Response body vacío")
                return@withContext emptyList()
            }

            Log.d(TAG, "Response body (primeros 300 chars): ${responseBody.take(300)}...")

            // El DENUE puede devolver dos formatos:
            // 1. Array de arrays (formato clásico)
            // 2. Array de objetos JSON (formato nuevo)
            val negocios = try {
                // Intentar primero como array de objetos JSON
                val objectArrayType = object : TypeToken<Array<DenueJsonObject>>() {}.type
                val denueObjects: Array<DenueJsonObject> =
                    gson.fromJson(responseBody, objectArrayType)

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
                    // Fallback: intentar como array de arrays
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

    // Método fallback: buscar por giro específico
    private suspend fun buscarPorGiroEspecifico(
        latitud: Double,
        longitud: Double,
        codigoGiro: String,
        radio: Int
    ): List<NegocioDenue> = withContext(Dispatchers.IO) {

        // Buscar por nombre del giro
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

            // Intentar parsear como JSON primero, luego como arrays
            val negocios = try {
                val objectArrayType = object : TypeToken<Array<DenueJsonObject>>() {}.type
                val denueObjects: Array<DenueJsonObject> =
                    gson.fromJson(responseBody, objectArrayType)
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

    // Función para obtener nombre del giro por código
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

    // Función para detectar negocios de comida
    private fun esNegocioComida(texto: String): Boolean {
        val palabrasComida = setOf(
            "restaurant", "restaurante", "taqueria", "comida", "cocina", "antojitos",
            "mariscos", "pozole", "birria", "tacos", "tortas", "hamburguesas",
            "pizza", "sushi", "cafeteria", "cantina", "bar", "cerveza", "comedor",
            "fonda", "cenaduria", "loncheria", "quesadillas", "tamales", "elotes",
            "raspados", "nieves", "helados", "cafe", "coffee", "latte", "cappuccino",
            "bebidas", "jugos", "licuados", "aguas", "refrescos", "snacks",
            "botanero", "mezcal", "tequila", "pulque", "michelada", "cerveceria",
            "wings", "alitas", "carnitas", "barbacoa", "mole", "enchiladas",
            "chilaquiles", "flautas", "tostadas", "sopes", "huaraches", "gorditas"
        )

        return palabrasComida.any { palabra -> texto.contains(palabra) }
    }

    // Función para detectar cadenas grandes y franquicias
    private fun esCadenaOFranquicia(nombreNegocio: String, razonSocial: String): Boolean {
        val texto = "$nombreNegocio $razonSocial".lowercase()

        // Cadenas de conveniencia
        val cadenasConveniencia = setOf(
            "oxxo", "seven eleven", "7 eleven", "circle k", "extra", "kiosko",
            "modelorama", "six", "super willys", "willy's", "ampm", "go mart"
        )

        // Cadenas de supermercados
        val cadenaSupermercados = setOf(
            "walmart", "soriana", "chedraui", "mega", "superama", "bodega aurrera",
            "comercial mexicana", "calimax", "heb", "costco", "sams", "city club"
        )

        // Cadenas de restaurantes (TODAS EXCLUIDAS)
        val cadenasComida = setOf(
            "mcdonalds", "burger king", "kfc", "subway", "dominos", "pizza hut",
            "starbucks", "carl's jr", "taco bell", "little caesars", "papa johns",
            "pollo feliz", "pollo loco", "church's", "kentucky", "wendys",
            "pizza dominos", "pizza little caesars", "tacos el güero"
        )

        // Cadenas de farmacias
        val cadenasFarmacias = setOf(
            "farmacia guadalajara", "farmacias del ahorro", "farmacia benavides",
            "farmacia san pablo", "farmacia similares", "dr simi", "farmacia yza"
        )

        // Cadenas de ferreterías
        val cadenasFerreterias = setOf(
            "home depot", "comex", "sherwin williams", "novaceramic", "interceramic",
            "liverpool", "palacio de hierro", "elektra", "coppel"
        )

        // Panaderías industriales
        val panaderiasIndustriales = setOf(
            "wonder", "bimbo", "marinela", "tia rosa", "globo", "donuts krispy"
        )

        // Indicadores de empresa grande
        val indicadoresEmpresaGrande = setOf(
            "s.a. de c.v.", "sa de cv", "sociedad anonima", "corporativo", "grupo",
            "holding", "internacional", "enterprise", "corporation", "sucursal",
            "franquicia", "cadena", "matriz", "subsidiaria"
        )

        // Números que indican sucursales
        val tieneNumeroSucursal = Regex("""#\d+|no\.\s*\d+|sucursal\s*\d+""").containsMatchIn(texto)

        val todasLasCadenas = cadenasConveniencia + cadenaSupermercados + cadenasComida +
                cadenasFarmacias + cadenasFerreterias + panaderiasIndustriales

        // VALIDACIÓN ADICIONAL: Excluir cualquier cosa relacionada con comida
        val esNegocioComidaDetectado = esNegocioComida(texto)

        return todasLasCadenas.any { cadena -> texto.contains(cadena) } ||
                indicadoresEmpresaGrande.any { indicador -> texto.contains(indicador) } ||
                tieneNumeroSucursal ||
                esNegocioComidaDetectado
    }

    // Función para identificar micronegocios ideales
    private fun esMicronegocioIdeal(negocio: NegocioDenue): Boolean {
        val nombre = negocio.nombre.lowercase()
        val razonSocial = negocio.razonSocial?.lowercase() ?: ""
        val direccion = negocio.direccion.lowercase()

        // Indicadores positivos de micronegocio
        val indicadoresMicronegocio = setOf(
            "don", "doña", "la", "el", "los", "las", "san", "santa",
            "familiar", "casero", "artesanal", "tradicional", "local",
            "barrio", "colonia", "esquina", "rincón"
        )

        // Indicadores de negocio establecido
        val indicadoresEstablecido = setOf(
            "desde", "años", "tradición", "generación", "familia",
            "local", "establecimiento", "negocio"
        )

        val tieneIndicadorMicro = indicadoresMicronegocio.any { ind ->
            nombre.contains(ind) || razonSocial.contains(ind)
        }

        val tieneIndicadorEstablecido = indicadoresEstablecido.any { ind ->
            nombre.contains(ind) || razonSocial.contains(ind) || direccion.contains(ind)
        }

        // Prefiere negocios con nombre de persona o nombres tradicionales
        val esNombrePersonal = Regex("""(don|doña)\s+\w+""").containsMatchIn(nombre) ||
                Regex("""\w+\s+(de|del)\s+\w+""").containsMatchIn(nombre)

        return tieneIndicadorMicro || tieneIndicadorEstablecido || esNombrePersonal
    }

    // Clase de datos para objetos JSON del DENUE
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
        val Telefono: String? = null,
        val Correo_electronico: String? = null,
        val Sitio_internet: String? = null,
        val Tipo_establecimiento: String? = null,
        val Longitud: String? = null,
        val Latitud: String? = null
    )

    // Convertir objeto JSON a NegocioDenue
    private fun convertirJsonObjectANegocio(denueObject: DenueJsonObject): NegocioDenue? {
        return try {
            val latitud = denueObject.Latitud?.toDoubleOrNull()
            val longitud = denueObject.Longitud?.toDoubleOrNull()

            if (latitud == null || longitud == null) {
                Log.w(
                    TAG,
                    "Coordenadas inválidas para ${denueObject.Nombre}: lat=${denueObject.Latitud}, lng=${denueObject.Longitud}"
                )
                return null
            }

            // Construir dirección completa
            val direccionCompleta = buildString {
                denueObject.Tipo_vialidad?.takeIf { it.isNotEmpty() }?.let { append("$it ") }
                denueObject.Calle?.let { append(it) }
                denueObject.Num_Exterior?.takeIf { it.isNotEmpty() && it != "0" }
                    ?.let { append(" #$it") }
                denueObject.Num_Interior?.takeIf { it.isNotEmpty() && it != "0" }
                    ?.let { append(" Int. $it") }
                denueObject.Colonia?.takeIf { it.isNotEmpty() }?.let { append(", $it") }
                denueObject.CP?.takeIf { it.isNotEmpty() && it != "0" }?.let { append(", CP $it") }
                denueObject.Localidad?.takeIf { it.isNotEmpty() }?.let { append(", $it") }
            }

            NegocioDenue(
                id = denueObject.Id ?: "",
                nombre = denueObject.Nombre?.trim()?.takeIf { it.isNotEmpty() } ?: "Sin nombre",
                razonSocial = denueObject.Razon_social?.trim()?.takeIf { it.isNotEmpty() }
                    ?: denueObject.Nombre?.trim(),
                codigoActividad = denueObject.CLEE ?: "", // Usar CLEE como código de actividad
                nombreActividad = denueObject.Clase_actividad?.trim() ?: "",
                latitud = latitud,
                longitud = longitud,
                direccion = direccionCompleta.trim(),
                telefono = denueObject.Telefono?.takeIf { it.isNotEmpty() && it != "0" && it != "null" },
                email = denueObject.Correo_electronico?.takeIf { it.isNotEmpty() && it != "0" && it != "null" },
                sitioWeb = denueObject.Sitio_internet?.takeIf { it.isNotEmpty() && it != "0" && it != "null" }
            )

        } catch (e: Exception) {
            Log.e(TAG, "Error convirtiendo objeto JSON a negocio: ${e.message}")
            null
        }
    }

    // Convertir array a NegocioDenue
    private fun convertirArrayANegocio(
        denueArray: Array<String>,
        codigoActividad: String? = null
    ): NegocioDenue? {
        return try {
            if (denueArray.size < 19) {
                Log.w(
                    TAG,
                    "Array del DENUE tiene menos campos de los esperados: ${denueArray.size}"
                )
                return null
            }

            val claveClee = denueArray.getOrNull(0) ?: ""
            val id = denueArray.getOrNull(1) ?: ""
            val nombre = denueArray.getOrNull(2) ?: ""
            val razonSocial = denueArray.getOrNull(3) ?: ""
            val claseActividad = denueArray.getOrNull(4) ?: ""
            val tipoVialidad = denueArray.getOrNull(6) ?: ""
            val calle = denueArray.getOrNull(7) ?: ""
            val numeroExt = denueArray.getOrNull(8) ?: ""
            val numeroInt = denueArray.getOrNull(9) ?: ""
            val colonia = denueArray.getOrNull(10) ?: ""
            val codigoPostal = denueArray.getOrNull(11) ?: ""
            val localidadMunicipio = denueArray.getOrNull(12) ?: ""
            val telefono = denueArray.getOrNull(13)?.takeIf { it.isNotEmpty() && it != "0" }
            val email = denueArray.getOrNull(14)?.takeIf { it.isNotEmpty() && it != "0" }
            val sitioWeb = denueArray.getOrNull(15)?.takeIf { it.isNotEmpty() && it != "0" }
            val longitudStr = denueArray.getOrNull(17) ?: ""
            val latitudStr = denueArray.getOrNull(18) ?: ""

            // Validar coordenadas
            val longitud = longitudStr.toDoubleOrNull()
            val latitud = latitudStr.toDoubleOrNull()

            if (latitud == null || longitud == null) {
                Log.w(TAG, "Coordenadas inválidas para $nombre: lat=$latitudStr, lng=$longitudStr")
                return null
            }

            // Construir dirección completa
            val direccionCompleta = buildString {
                if (tipoVialidad.isNotEmpty()) append("$tipoVialidad ")
                append(calle)
                if (numeroExt.isNotEmpty() && numeroExt != "0") append(" #$numeroExt")
                if (numeroInt.isNotEmpty() && numeroInt != "0") append(" Int. $numeroInt")
                if (colonia.isNotEmpty()) append(", $colonia")
                if (codigoPostal.isNotEmpty() && codigoPostal != "0") append(", CP $codigoPostal")
                if (localidadMunicipio.isNotEmpty()) append(", $localidadMunicipio")
            }

            // Usar código de actividad del array, o el proporcionado como fallback
            val codigoActividadFinal = claveClee.takeIf { it.isNotEmpty() } ?: codigoActividad ?: ""

            NegocioDenue(
                id = id,
                nombre = nombre.trim().takeIf { it.isNotEmpty() } ?: "Sin nombre",
                razonSocial = razonSocial.trim().takeIf { it.isNotEmpty() } ?: nombre.trim(),
                codigoActividad = codigoActividadFinal,
                nombreActividad = claseActividad.trim(),
                latitud = latitud,
                longitud = longitud,
                direccion = direccionCompleta.trim(),
                telefono = telefono,
                email = email,
                sitioWeb = sitioWeb
            )

        } catch (e: Exception) {
            Log.e(TAG, "Error convirtiendo array a negocio: ${e.message}")
            null
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

            // Hacer una consulta simple para verificar conectividad
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
                Log.d(TAG, "✅ Conectividad DENUE exitosa")
            }

            return@withContext isSuccessful

        } catch (e: Exception) {
            Log.e(TAG, "Error verificando conectividad DENUE: ${e.message}")
            return@withContext false
        }
    }
}