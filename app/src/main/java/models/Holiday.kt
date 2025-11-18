package models

import com.google.firebase.Timestamp
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.Date

data class Holiday(
    var id: String = "",
    var name: String = "",
    var date: String = "", // yyyy-MM-dd format
    var type: HolidayType = HolidayType.NATIONAL,
    var productTypes: List<String> = emptyList(), // If empty, applies to all
    var isWorkDay: Boolean = false,
    var description: String = "",
    var customSchedule: WorkSchedule.HolidaySchedule? = null,
    var isActive: Boolean = true,
    var createdAt: Timestamp = Timestamp.now(),
    var updatedAt: Timestamp = Timestamp.now(),
    var createdBy: String = ""
) {
    enum class HolidayType {
        NATIONAL,           // National holidays
        PRODUCT_SPECIFIC,   // Specific to certain product types
        COMPANY,           // Company-specific holidays
        LOCAL              // Local/regional holidays
    }

    fun getTypeDisplayName(): String {
        return when (type) {
            HolidayType.NATIONAL -> "Día Festivo Nacional"
            HolidayType.PRODUCT_SPECIFIC -> "Día Festivo Específico del Producto"
            HolidayType.COMPANY -> "Día Festivo de la Empresa"
            HolidayType.LOCAL -> "Día Festivo Local"
        }
    }

    fun getFormattedDate(): String {
        return try {
            val inputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val outputFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
            val parsedDate = inputFormat.parse(date)
            if (parsedDate != null) outputFormat.format(parsedDate) else date
        } catch (e: Exception) {
            date
        }
    }

    fun appliesToProductType(productType: String): Boolean {
        return productTypes.isEmpty() || productTypes.contains(productType)
    }

    fun isToday(): Boolean {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        return date == today
    }

    fun isUpcoming(daysAhead: Int = 7): Boolean {
        return try {
            val inputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val holidayDate = inputFormat.parse(date)
            val currentDate = Date()
            val futureDate = Date(currentDate.time + (daysAhead * 24 * 60 * 60 * 1000))

            holidayDate != null && holidayDate.after(currentDate) && holidayDate.before(futureDate)
        } catch (e: Exception) {
            false
        }
    }

    companion object {
        // Mexican national holidays for default setup
        fun getMexicanNationalHolidays(year: Int): List<Holiday> {
            return listOf(
                Holiday(
                    name = "Año Nuevo",
                    date = "$year-01-01",
                    type = HolidayType.NATIONAL,
                    description = "Primer día del año"
                ),
                Holiday(
                    name = "Día de la Constitución",
                    date = "$year-02-05",
                    type = HolidayType.NATIONAL,
                    description = "Conmemoración de la Constitución Mexicana"
                ),
                Holiday(
                    name = "Natalicio de Benito Juárez",
                    date = "$year-03-21",
                    type = HolidayType.NATIONAL,
                    description = "Natalicio de Benito Juárez"
                ),
                Holiday(
                    name = "Día del Trabajo",
                    date = "$year-05-01",
                    type = HolidayType.NATIONAL,
                    description = "Día Internacional del Trabajo"
                ),
                Holiday(
                    name = "Día de la Independencia",
                    date = "$year-09-16",
                    type = HolidayType.NATIONAL,
                    description = "Independencia de México"
                ),
                Holiday(
                    name = "Día de la Revolución",
                    date = "$year-11-20",
                    type = HolidayType.NATIONAL,
                    description = "Revolución Mexicana"
                ),
                Holiday(
                    name = "Navidad",
                    date = "$year-12-25",
                    type = HolidayType.NATIONAL,
                    description = "Navidad"
                )
            )
        }
    }
}