package com.promotoresavivatunegocio_1.services

import com.promotoresavivatunegocio_1.models.GiroRelevante
import com.promotoresavivatunegocio_1.BuildConfig

object AvivaConfig {

    /*────────────────────────── API KEYS ──────────────────────────*/
    const val GOOGLE_API_KEY = BuildConfig.GOOGLE_API_KEY
    const val DENUE_TOKEN    = BuildConfig.DENUE_TOKEN

    /*────────────────────── Catálogo de giros ────────────────────*/
    val girosAceptados = listOf(
        GiroRelevante(
            codigo = "461110",
            nombre = "Abarrotes",
            montoMinimoCentavos = 7_500_00,
            montoMaximoCentavos = 15_000_00,
            descripcion = "Tiendas de abarrotes y misceláneas",
            palabrasClave = listOf("abarrotes", "miscelanea", "tienda", "minisuper")
        ),
        GiroRelevante(
            codigo = "461121",
            nombre = "Carnicerías",
            montoMinimoCentavos = 10_000_00,
            montoMaximoCentavos = 15_000_00,
            descripcion = "Venta de carnes rojas",
            palabrasClave = listOf("carniceria", "carnes", "carnitas", "polleria")
        ),
        GiroRelevante(
            codigo = "461170",
            nombre = "Tortillerías",
            montoMinimoCentavos = 8_000_00,
            montoMaximoCentavos = 12_000_00,
            descripcion = "Producción y venta de tortillas",
            palabrasClave = listOf("tortilleria", "tortillas", "masa")
        ),
        GiroRelevante(
            codigo = "461130",
            nombre = "Fruterías",
            montoMinimoCentavos = 7_500_00,
            montoMaximoCentavos = 12_000_00,
            descripcion = "Venta de frutas y verduras",
            palabrasClave = listOf("fruteria", "verduras", "frutas", "verduleria")
        ),
        GiroRelevante(
            codigo = "464111",
            nombre = "Papelerías",
            montoMinimoCentavos = 7_500_00,
            montoMaximoCentavos = 12_000_00,
            descripcion = "Venta de artículos de papelería",
            palabrasClave = listOf("papeleria", "libreria", "copias", "impresiones")
        ),
        GiroRelevante(
            codigo = "311811",
            nombre = "Panaderías",
            montoMinimoCentavos = 8_000_00,
            montoMaximoCentavos = 15_000_00,
            descripcion = "Elaboración y venta de pan",
            palabrasClave = listOf("panaderia", "pan", "pasteles", "reposteria")
        ),
        GiroRelevante(
            codigo = "467111",
            nombre = "Tlapalerías",
            montoMinimoCentavos = 9_000_00,
            montoMaximoCentavos = 15_000_00,
            descripcion = "Venta de materiales para construcción menor",
            palabrasClave = listOf("tlapaleria", "ferreteria", "materiales", "construccion")
        ),
        GiroRelevante(
            codigo = "339999",
            nombre = "Artesanías",
            montoMinimoCentavos = 7_500_00,
            montoMaximoCentavos = 10_000_00,
            descripcion = "Elaboración y venta de artesanías",
            palabrasClave = listOf("artesanias", "artesania", "manualidades")
        ),
        GiroRelevante(
            codigo = "464121",
            nombre = "Farmacias",
            montoMinimoCentavos = 10_000_00,
            montoMaximoCentavos = 15_000_00,
            descripcion = "Venta de medicamentos",
            palabrasClave = listOf("farmacia", "medicinas", "drogueria")
        )
    )

    /*────────────────────── Giros rechazados ─────────────────────*/
    val girosRechazados = setOf(
        "722511", // Cafeterías / restaurantes
        "722412", // Bares
        "722330", // Casas de empeño
        "468211", // Venta ambulante
        "531113", // Bienes raíces
        "722515", // Centros nocturnos
        "811192"  // Algunos talleres mecánicos específicos
    )

    /*───────────────── Utilidades de catálogo ───────────────────*/
    fun esGiroAceptado(codigoScian: String): Boolean =
        girosAceptados.any { it.codigo == codigoScian } &&
                !girosRechazados.contains(codigoScian)

    fun encontrarGiroPorCodigo(codigo: String) =
        girosAceptados.find { it.codigo == codigo }

    fun encontrarGiroPorNombre(nombre: String) =
        girosAceptados.find { giro ->
            giro.palabrasClave.any { nombre.contains(it, ignoreCase = true) } ||
                    giro.nombre.contains(nombre, ignoreCase = true)
        }

    /*────────── Parámetros de búsqueda & Street View ───────────*/
    const val RADIO_BUSQUEDA_METROS    = 3_000   // 3 km
    const val HORA_BUSQUEDA_AUTOMATICA = 10      // 10:00 AM
    const val MAX_PROSPECTOS_POR_DIA   = 5

    const val STREET_VIEW_SIZE  = "640x640"
    const val STREET_VIEW_FOV   = 90
    const val ANGULOS_VERIFICACION = "0,45,90,135,180,225,270,315"
}