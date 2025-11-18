package models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint

data class City(
    val id: String = "",
    val name: String = "",
    val state: String = "",
    val country: String = "México",
    val coordinates: GeoPoint? = null,
    val postalCodes: List<String> = emptyList(),
    val isActive: Boolean = true,
    val population: Int = 0,
    val economicLevel: EconomicLevel = EconomicLevel.MEDIUM,
    val kioskCount: Int = 0,
    val activePromotersCount: Int = 0,
    val monthlyTarget: Double = 0.0,
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now(),
    val createdBy: String = ""
) {
    enum class EconomicLevel {
        LOW,
        MEDIUM_LOW,
        MEDIUM,
        MEDIUM_HIGH,
        HIGH
    }

    fun getEconomicLevelDisplayName(): String {
        return when (economicLevel) {
            EconomicLevel.LOW -> "Bajo"
            EconomicLevel.MEDIUM_LOW -> "Medio Bajo"
            EconomicLevel.MEDIUM -> "Medio"
            EconomicLevel.MEDIUM_HIGH -> "Medio Alto"
            EconomicLevel.HIGH -> "Alto"
        }
    }

    fun getFullName(): String {
        return "$name, $state"
    }

    fun getStatusDisplayName(): String {
        return if (isActive) "Activa" else "Inactiva"
    }

    companion object {
        fun getDefaultCities(): List<City> {
            return listOf(
                City(
                    id = "mexico_city",
                    name = "Ciudad de México",
                    state = "CDMX",
                    coordinates = GeoPoint(19.4326, -99.1332),
                    postalCodes = listOf("01000", "02000", "03000", "04000", "05000"),
                    population = 9200000,
                    economicLevel = EconomicLevel.HIGH,
                    monthlyTarget = 500000.0
                ),
                City(
                    id = "guadalajara",
                    name = "Guadalajara",
                    state = "Jalisco",
                    coordinates = GeoPoint(20.6597, -103.3496),
                    postalCodes = listOf("44100", "44200", "44300", "44400", "44500"),
                    population = 1500000,
                    economicLevel = EconomicLevel.MEDIUM_HIGH,
                    monthlyTarget = 300000.0
                ),
                City(
                    id = "monterrey",
                    name = "Monterrey",
                    state = "Nuevo León",
                    coordinates = GeoPoint(25.6866, -100.3161),
                    postalCodes = listOf("64000", "64100", "64200", "64300", "64400"),
                    population = 1100000,
                    economicLevel = EconomicLevel.HIGH,
                    monthlyTarget = 350000.0
                ),
                City(
                    id = "puebla",
                    name = "Puebla",
                    state = "Puebla",
                    coordinates = GeoPoint(19.0414, -98.2063),
                    postalCodes = listOf("72000", "72100", "72200", "72300", "72400"),
                    population = 600000,
                    economicLevel = EconomicLevel.MEDIUM,
                    monthlyTarget = 200000.0
                ),
                City(
                    id = "tijuana",
                    name = "Tijuana",
                    state = "Baja California",
                    coordinates = GeoPoint(32.5149, -117.0382),
                    postalCodes = listOf("22000", "22100", "22200", "22300", "22400"),
                    population = 700000,
                    economicLevel = EconomicLevel.MEDIUM_HIGH,
                    monthlyTarget = 250000.0
                ),
                City(
                    id = "leon",
                    name = "León",
                    state = "Guanajuato",
                    coordinates = GeoPoint(21.1619, -101.6957),
                    postalCodes = listOf("37000", "37100", "37200", "37300", "37400"),
                    population = 500000,
                    economicLevel = EconomicLevel.MEDIUM,
                    monthlyTarget = 180000.0
                ),
                City(
                    id = "juarez",
                    name = "Ciudad Juárez",
                    state = "Chihuahua",
                    coordinates = GeoPoint(31.6904, -106.4245),
                    postalCodes = listOf("32000", "32100", "32200", "32300", "32400"),
                    population = 400000,
                    economicLevel = EconomicLevel.MEDIUM,
                    monthlyTarget = 150000.0
                )
            )
        }
    }
}