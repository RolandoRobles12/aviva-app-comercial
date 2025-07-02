package com.promotoresavivatunegocio_1.models

import kotlinx.serialization.Serializable
import java.text.Normalizer

/**
 * Catálogo local con la configuración base de cada giro
 * que Aviva considera relevante al calificar un negocio.
 *
 * Todos los montos se almacenan en **centavos** para evitar
 * pérdida de precisión al hacer operaciones financieras.
 */
@Serializable
data class GiroRelevante(
    /** Código SCIAN o identificador interno. */
    val codigo: String,

    /** Nombre legible del giro (“Abarrotes”, “Farmacia”, etc.). */
    val nombre: String,


    /** Importe mínimo aprobado, en centavos. */
    val montoMinimoCentavos: Long,

    /** Importe máximo aprobado, en centavos. */
    val montoMaximoCentavos: Long,

    /** Descripción breve o comentario de negocio. */
    val descripcion: String,

    /**
     * Palabras clave que ayudan a identificar el giro a partir de texto
     * (OCR Street View, búsqueda libre, etc.). Conviene almacenarlas
     * en minúsculas y sin tildes para comparar más fácil.
     */
    val palabrasClave: List<String> = emptyList()
) {

    /* ──────────────── Validaciones tempranas ──────────────── */

    init {
        require(montoMinimoCentavos >= 0) {
            "montoMinimoCentavos no puede ser negativo"
        }
        require(montoMaximoCentavos >= montoMinimoCentavos) {
            "montoMaximoCentavos debe ser ≥ montoMinimoCentavos"
        }
    }

    /* ──────────────── Lógica utilitaria opcional ───────────── */

    /**
     * Devuelve `true` si el texto libre contiene alguna de las
     * palabras clave asociadas al giro (búsqueda naive).
     *
     * Se eliminan acentos y se compara en minúsculas
     * para una coincidencia más permisiva.
     */
    fun coincideCon(textoLibre: String): Boolean {
        if (palabrasClave.isEmpty()) return false
        val normalizado = textoLibre.normalizar()
        return palabrasClave.any { normalizado.contains(it.normalizar()) }
    }
}

/* ─────────────── Extensión de normalización ─────────────── */

private fun String.normalizar(): String =
    Normalizer.normalize(this.lowercase(), Normalizer.Form.NFD)
        .replace("\\p{Mn}+".toRegex(), "")  // elimina los acentos
