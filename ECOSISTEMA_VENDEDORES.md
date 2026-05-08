# Ecosistema de Vendedores - Referencia Técnica

Bottom navigation con 5 destinos: Home, Métricas, Asistencia, Ligas, Perfil.

## Asistencia

- Fragment: `AttendanceFragment.kt`
- Layout: `fragment_attendance.xml`
- URL configurable: `AttendanceFragment.kt:25` → `private const val ATTENDANCE_WEB_URL`
- Abre via Chrome Custom Tabs (ver `CHROME_CUSTOM_TABS.md`)

## Métricas

- Fragment: `MetricsFragment.kt`
- Service: `MetricsService.kt`
- Modelo: `models/Metrics.kt` — data class `UserMetrics`

**Campos del modelo:**
- Ventas: `totalSales`, `salesAmount`, `avgTicket`, `conversionRate`
- Prospectos: `prospectsGenerated`, `prospectsContacted`, `prospectsConverted`
- Asistencia: `daysWorked`, `attendanceRate`, `hoursWorked`
- Actividad: `visitsCount`, `kiosksVisited`, `citiesVisited`
- Puntos: `totalPoints`, `monthlyPoints`
- Rankings: `generalRank`, `leagueRank`

**Períodos soportados** (enum en `models/Metrics.kt`): `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `ANNUAL`

**Agregar nueva métrica:**
1. Campo en `models/Metrics.kt`
2. Binding en `MetricsFragment.kt:displayMetrics()`
3. View en `fragment_metrics.xml`

## Ligas

- Fragment: `LeaguesFragment.kt`
- Service: `LeagueService.kt`
- Modelo: `models/League.kt`

**Tiers** (`LeagueTier` enum):

| Tier | Color | Puntos mínimos |
|------|-------|----------------|
| BRONCE | `#CD7F32` | 0 |
| PLATA | `#C0C0C0` | 1,000 |
| ORO | `#FFD700` | 2,500 |
| PLATINO | `#E5E4E2` | 5,000 |
| DIAMANTE | `#B9F2FF` | 10,000 |
| MASTER | `#FF1744` | 20,000 |
| LEYENDA | `#9C27B0` | 50,000 |

**Configuración de promoción/descenso en Firestore:**
```kotlin
promotionSpots: Int = 10   // top N ascienden
relegationSpots: Int = 10  // bottom N descienden
```

## Badges

- Fragment: `BadgesFragment.kt` (dentro de `ProfileFragment`)
- Service: `BadgeService.kt`
- Modelo: `models/Badge.kt`
- Colección Firestore: `badges` / `userBadges`

**Categorías:** `VENTAS`, `ASISTENCIA`, `CAPACITACION`, `LIDERAZGO`, `ESPECIAL`
**Rareza:** `BRONCE`, `PLATA`, `ORO`, `PLATINO`, `DIAMANTE`

**Crear badge en Firestore:**
```json
{
  "name": "Vendedor del Mes",
  "category": "VENTAS",
  "rarity": "ORO",
  "requiredValue": 1,
  "points": 500,
  "iconUrl": "https://...",
  "isActive": true
}
```

**Desbloquear desde código:**
```kotlin
badgeService.unlockBadge(userId, badgeId, achievedValue, notes)
```

## Plan de Carrera

- Fragment: `CareerFragment.kt` (dentro de `ProfileFragment`)
- Service: `CareerService.kt`
- Modelo: `models/CareerPath.kt`
- Colecciones: `careerPaths` / `userCareerProgress`

**Niveles (companion object):** 1=PROMOTOR_JUNIOR, 2=PROMOTOR, 3=PROMOTOR_SENIOR, 4=SUPERVISOR, 5=COORDINADOR, 6=GERENTE, 7=DIRECTOR

**Schema de nivel en `careerPaths`:**
```json
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
```

**`CareerLevelRequirements` completo:** `minSalesTotal`, `minSalesMonthly`, `minSalesAmount`, `minMonthsExperience`, `minDaysWorked`, `minAverageAttendance`, `minConversionRate`, `requiredCertifications`, `minTrainingsCompleted`, `minLeagueTier`, `minTotalPoints`, `requiredBadges`

## Colecciones Firestore

| Colección | Uso |
|-----------|-----|
| `userMetrics` | Métricas por usuario |
| `metricsReports` | Reportes generados |
| `leagues` | Definición de ligas |
| `leagueParticipants` | Participantes con puntos y ranking |
| `badges` | Catálogo de badges |
| `userBadges` | Badges desbloqueados |
| `careerPaths` | Planes de carrera |
| `userCareerProgress` | Progreso individual |

## API de Servicios

```kotlin
metricsService.getCurrentUserMetrics(userId)
metricsService.generateMetricsReport(userId)

leagueService.getUserCurrentLeague(userId)
leagueService.getLeagueStandings(leagueId)

badgeService.getUserBadges(userId)
badgeService.unlockBadge(userId, badgeId)

careerService.getUserProgress(userId)
careerService.updateUserProgress(userId)
```

## Recursos de UI

- Colores: `res/values/colors.xml`
- Iconos: `res/drawable/ic_metrics_24.xml`, `ic_leagues_24.xml`, `ic_profile_24.xml`, `ic_badge_24.xml`, `ic_career_24.xml`
- Layouts principales: `fragment_*.xml`
- Layouts de items: `item_*.xml`
