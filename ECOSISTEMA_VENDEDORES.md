# Ecosistema Completo para Vendedores - Aviva Tu Negocio

Este documento explica la estructura del ecosistema completo para vendedores y cómo mantenerlo y editarlo fácilmente.

## 📱 Estructura de la Aplicación

La app ahora incluye 5 secciones principales en el bottom navigation:

1. **Inicio (Home)** - Dashboard general
2. **Métricas** - Reportería y estadísticas de desempeño
3. **Asistencia** - Sistema de registro (WebView)
4. **Ligas** - Competencias y rankings
5. **Perfil** - Insignias y Plan de Carrera

## 🎯 Sección 1: Asistencia

### Ubicación
- Fragmento: `AttendanceFragment.kt`
- Layout: `fragment_attendance.xml`

### Configuración
La asistencia ahora usa un **WebView** que muestra la web app externa.

**Para cambiar la URL:**
```kotlin
// En AttendanceFragment.kt línea 25
private const val ATTENDANCE_WEB_URL = "https://registro-aviva.web.app/"
```

Simplemente modifica esta constante para cambiar la URL del sistema de asistencia.

## 📊 Sección 2: Métricas y Reportería

### Ubicación
- Fragmento: `MetricsFragment.kt`
- Servicio: `MetricsService.kt`
- Modelo: `models/Metrics.kt`
- Layout: `fragment_metrics.xml`

### Métricas Disponibles

El modelo `UserMetrics` incluye:
- **Ventas:** Total, monto, ticket promedio, tasa de conversión
- **Prospectos:** Generados, contactados, convertidos
- **Asistencia:** Días trabajados, tasa de asistencia, horas
- **Actividad:** Visitas, kioscos, ciudades
- **Puntos:** Total y mensuales
- **Rankings:** Posición general y en liga

### Agregar Nuevas Métricas

1. **Agregar campo en el modelo:**
```kotlin
// En models/Metrics.kt
data class UserMetrics(
    // ... campos existentes ...
    val nuevaMetrica: Int = 0,  // Agregar aquí
)
```

2. **Actualizar el layout:**
```xml
<!-- En fragment_metrics.xml -->
<TextView
    android:id="@+id/tvNuevaMetrica"
    android:text="0" />
```

3. **Mostrar en el fragmento:**
```kotlin
// En MetricsFragment.kt, método displayMetrics()
binding.tvNuevaMetrica.text = metrics.nuevaMetrica.toString()
```

### Períodos de Métricas

Actualmente soporta:
- Diario
- Semanal
- Mensual
- Trimestral
- Anual

Para agregar nuevos períodos, editar el enum en `models/Metrics.kt`.

## 🏆 Sección 3: Ligas y Competencias

### Ubicación
- Fragmento: `LeaguesFragment.kt`
- Servicio: `LeagueService.kt`
- Modelo: `models/League.kt`
- Layout: `fragment_leagues.xml`

### Niveles de Liga

Los niveles están definidos en el enum `LeagueTier`:

```kotlin
enum class LeagueTier(
    val displayName: String,
    val colorHex: String,
    val minPoints: Int
) {
    BRONCE("Bronce", "#CD7F32", 0),
    PLATA("Plata", "#C0C0C0", 1000),
    ORO("Oro", "#FFD700", 2500),
    PLATINO("Platino", "#E5E4E2", 5000),
    DIAMANTE("Diamante", "#B9F2FF", 10000),
    MASTER("Master", "#FF1744", 20000),
    LEYENDA("Leyenda", "#9C27B0", 50000)
}
```

### Personalizar Ligas

**Cambiar nombres o colores:**
```kotlin
// En models/League.kt
ORO("Mi Liga Dorada", "#FFC700", 2500),
```

**Ajustar puntos requeridos:**
```kotlin
PLATINO("Platino", "#E5E4E2", 7500), // Cambiar de 5000 a 7500
```

**Agregar nueva liga:**
```kotlin
ELITE("Elite", "#00BCD4", 30000),
```

### Configurar Promociones/Descensos

En Firestore, al crear una liga:
```kotlin
promotionSpots: Int = 10,      // Top 10 ascienden
relegationSpots: Int = 10,     // Bottom 10 descienden
```

## 🏅 Sección 4: Insignias/Badges

### Ubicación
- Fragmento: `BadgesFragment.kt` (dentro de ProfileFragment)
- Servicio: `BadgeService.kt`
- Modelo: `models/Badge.kt`
- Layout: `fragment_badges.xml`

### Categorías de Insignias

```kotlin
enum class BadgeCategory(val displayName: String) {
    VENTAS("Ventas"),
    ASISTENCIA("Asistencia"),
    CAPACITACION("Capacitación"),
    LIDERAZGO("Liderazgo"),
    ESPECIAL("Especial")
}
```

### Rareza de Insignias

```kotlin
enum class BadgeRarity(val displayName: String, val colorHex: String) {
    BRONCE("Bronce", "#CD7F32"),
    PLATA("Plata", "#C0C0C0"),
    ORO("Oro", "#FFD700"),
    PLATINO("Platino", "#E5E4E2"),
    DIAMANTE("Diamante", "#B9F2FF")
}
```

### Crear Nuevas Insignias

Las insignias se crean en Firestore en la colección `badges`:

```kotlin
{
    "name": "Vendedor del Mes",
    "description": "Alcanzaste el mayor número de ventas del mes",
    "category": "VENTAS",
    "rarity": "ORO",
    "requirement": "Ser el #1 en ventas del mes",
    "requiredValue": 1,
    "points": 500,
    "iconUrl": "https://...",
    "isActive": true
}
```

### Desbloquear Insignias

```kotlin
// En tu lógica de negocio
badgeService.unlockBadge(
    userId = userId,
    badgeId = badgeId,
    achievedValue = valorAlcanzado,
    notes = "¡Felicidades!"
)
```

## 💼 Sección 5: Plan de Carrera

### Ubicación
- Fragmento: `CareerFragment.kt` (dentro de ProfileFragment)
- Servicio: `CareerService.kt`
- Modelo: `models/CareerPath.kt`
- Layout: `fragment_career.xml`

### Niveles de Carrera Predefinidos

```kotlin
companion object {
    val PROMOTOR_JUNIOR = 1
    val PROMOTOR = 2
    val PROMOTOR_SENIOR = 3
    val SUPERVISOR = 4
    val COORDINADOR = 5
    val GERENTE = 6
    val DIRECTOR = 7
}
```

### Crear Plan de Carrera

El plan de carrera se configura en Firestore en la colección `careerPaths`:

```kotlin
{
    "name": "Plan de Carrera Aviva",
    "isActive": true,
    "levels": [
        {
            "level": 1,
            "name": "Promotor Junior",
            "baseSalary": 8000.0,
            "commissionRate": 0.05,
            "requirements": {
                "minSalesTotal": 0,
                "minMonthsExperience": 0
            }
        },
        {
            "level": 2,
            "name": "Promotor",
            "baseSalary": 10000.0,
            "commissionRate": 0.08,
            "requirements": {
                "minSalesTotal": 50,
                "minMonthsExperience": 3,
                "minAverageAttendance": 90.0
            }
        }
        // ... más niveles
    ]
}
```

### Requisitos Disponibles

```kotlin
data class CareerLevelRequirements(
    val minSalesTotal: Int = 0,
    val minSalesMonthly: Int = 0,
    val minSalesAmount: Double = 0.0,
    val minMonthsExperience: Int = 0,
    val minDaysWorked: Int = 0,
    val minAverageAttendance: Double = 0.0,
    val minConversionRate: Double = 0.0,
    val requiredCertifications: List<String> = emptyList(),
    val minTrainingsCompleted: Int = 0,
    val minLeagueTier: String = "",
    val minTotalPoints: Int = 0,
    val requiredBadges: List<String> = emptyList()
)
```

## 🎨 Personalización de UI

### Colores

Los colores principales están en `res/values/colors.xml`:

```xml
<color name="primary">#6200EE</color>
<color name="secondary">#03DAC5</color>
<color name="accent">#FF4081</color>
<color name="background">#F5F5F5</color>
```

### Iconos

Los iconos están en `res/drawable/`:
- `ic_metrics_24.xml` - Icono de métricas
- `ic_leagues_24.xml` - Icono de ligas
- `ic_profile_24.xml` - Icono de perfil
- `ic_badge_24.xml` - Icono de insignias
- `ic_career_24.xml` - Icono de carrera

Para cambiar un icono, reemplaza el contenido del XML o usa tu propio drawable.

### Layouts

Todos los layouts están diseñados con Material Design 3 y son fáciles de modificar:

- **Fragmentos principales:** `fragment_*.xml`
- **Items de listas:** `item_*.xml`

## 🔥 Firebase / Firestore

### Colecciones Utilizadas

- `userMetrics` - Métricas de usuarios
- `metricsReports` - Reportes generados
- `leagues` - Definición de ligas
- `leagueParticipants` - Participantes en ligas
- `badges` - Definición de insignias
- `userBadges` - Insignias de usuarios
- `careerPaths` - Planes de carrera
- `userCareerProgress` - Progreso de usuarios

### Estructura de Datos

Todos los modelos incluyen comentarios detallados sobre su estructura. Ver:
- `models/Metrics.kt`
- `models/League.kt`
- `models/Badge.kt`
- `models/CareerPath.kt`

## 📝 Servicios

Cada funcionalidad tiene su servicio dedicado:

- **`MetricsService`** - Gestión de métricas y reportes
- **`LeagueService`** - Gestión de ligas y rankings
- **`BadgeService`** - Gestión de insignias
- **`CareerService`** - Gestión de plan de carrera

### Métodos Principales

```kotlin
// Métricas
metricsService.getCurrentUserMetrics(userId)
metricsService.generateMetricsReport(userId)

// Ligas
leagueService.getUserCurrentLeague(userId)
leagueService.getLeagueStandings(leagueId)

// Insignias
badgeService.getUserBadges(userId)
badgeService.unlockBadge(userId, badgeId)

// Carrera
careerService.getUserProgress(userId)
careerService.updateUserProgress(userId)
```

## 🚀 Próximos Pasos

1. **Configurar Firebase:** Asegúrate de tener las colecciones creadas en Firestore
2. **Datos de Prueba:** Crea datos iniciales para probar el sistema
3. **Personalizar:** Ajusta colores, textos e iconos según tu marca
4. **Agregar Métricas:** Agrega las métricas específicas que necesites
5. **Definir Insignias:** Crea las insignias que quieres otorgar
6. **Configurar Ligas:** Define las ligas y sus requisitos
7. **Establecer Plan:** Crea tu plan de carrera completo

## 📚 Documentación Adicional

Cada archivo de código incluye:
- Comentarios detallados sobre su propósito
- Instrucciones sobre cómo personalizarlo
- Ejemplos de uso

Para cualquier duda, revisa los comentarios en los archivos fuente.

## 🔧 Mantenimiento

### Actualizar Métricas
1. Modifica `models/Metrics.kt`
2. Actualiza `MetricsService.kt` si es necesario
3. Ajusta `fragment_metrics.xml` y `MetricsFragment.kt`

### Agregar Nueva Funcionalidad
1. Crea el modelo en `models/`
2. Crea el servicio en `services/`
3. Crea el fragmento y layout
4. Agrega al navigation y menú si es necesario

### Modificar Diseño
1. Edita los archivos XML en `res/layout/`
2. Los cambios se reflejarán automáticamente

---

**Nota:** Este ecosistema está diseñado para ser fácil de mantener y expandir. Todos los archivos incluyen comentarios detallados para facilitar futuros cambios.
