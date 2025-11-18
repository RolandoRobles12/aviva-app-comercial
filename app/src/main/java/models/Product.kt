package models

import com.google.firebase.Timestamp

data class Product(
    val id: String = "",
    val name: String = "",
    val type: ProductType = ProductType.BODEGA_AURRERA,
    val description: String = "",
    val category: String = "",
    val targetAudience: String = "",
    val isActive: Boolean = true,
    val requiredDocuments: List<String> = emptyList(),
    val commissionRate: Double = 0.0,
    val minimumAmount: Double = 0.0,
    val maximumAmount: Double = 0.0,
    val processingTimeHours: Int = 24,
    val eligibilityRequirements: List<String> = emptyList(),
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now(),
    val createdBy: String = ""
) {
    enum class ProductType {
        BODEGA_AURRERA,
        AVIVA_CONTIGO,
        CONSTRURAMA,
        CREDITO_PERSONAL,
        TARJETA_CREDITO
    }

    fun getTypeDisplayName(): String {
        return when (type) {
            ProductType.BODEGA_AURRERA -> "Bodega Aurrera"
            ProductType.AVIVA_CONTIGO -> "Aviva Contigo"
            ProductType.CONSTRURAMA -> "Construrama"
            ProductType.CREDITO_PERSONAL -> "Crédito Personal"
            ProductType.TARJETA_CREDITO -> "Tarjeta de Crédito"
        }
    }

    fun getStatusDisplayName(): String {
        return if (isActive) "Activo" else "Inactivo"
    }

    companion object {
        fun getDefaultProducts(): List<Product> {
            return listOf(
                Product(
                    id = "bodega_aurrera_001",
                    name = "Crédito Bodega Aurrera",
                    type = ProductType.BODEGA_AURRERA,
                    description = "Crédito para compras en Bodega Aurrera",
                    category = "Retail",
                    targetAudience = "Familias trabajadoras",
                    commissionRate = 0.05,
                    minimumAmount = 500.0,
                    maximumAmount = 15000.0,
                    processingTimeHours = 24,
                    requiredDocuments = listOf("INE", "Comprobante de ingresos", "Comprobante de domicilio"),
                    eligibilityRequirements = listOf(
                        "Edad entre 18 y 65 años",
                        "Ingresos mínimos de $8,000 mensuales",
                        "Historial crediticio limpio"
                    )
                ),
                Product(
                    id = "aviva_contigo_001",
                    name = "Aviva Contigo",
                    type = ProductType.AVIVA_CONTIGO,
                    description = "Producto financiero integral",
                    category = "Financiero",
                    targetAudience = "Personas emprendedoras",
                    commissionRate = 0.08,
                    minimumAmount = 1000.0,
                    maximumAmount = 50000.0,
                    processingTimeHours = 48,
                    requiredDocuments = listOf("INE", "RFC", "Comprobante de ingresos"),
                    eligibilityRequirements = listOf(
                        "Edad entre 21 y 60 años",
                        "Actividad económica comprobable",
                        "Score crediticio mínimo de 650"
                    )
                ),
                Product(
                    id = "construrama_001",
                    name = "Crédito Construrama",
                    type = ProductType.CONSTRURAMA,
                    description = "Financiamiento para materiales de construcción",
                    category = "Construcción",
                    targetAudience = "Constructores y albañiles",
                    commissionRate = 0.06,
                    minimumAmount = 2000.0,
                    maximumAmount = 100000.0,
                    processingTimeHours = 72,
                    requiredDocuments = listOf("INE", "Comprobante de domicilio", "Referencias comerciales"),
                    eligibilityRequirements = listOf(
                        "Experiencia en construcción",
                        "Referencias comerciales verificables",
                        "Proyecto de construcción definido"
                    )
                )
            )
        }
    }
}