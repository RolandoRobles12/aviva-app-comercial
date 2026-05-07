# Soporte Tablet y Sistema Offline

## Layouts adaptativos

### Estructura de recursos

```
res/
├── layout/              # < 600dp (teléfonos)
├── layout-sw600dp/      # tablets 7" (600-720dp)
├── layout-sw720dp/      # tablets 10" (> 720dp)
├── values/dimens.xml
├── values-sw600dp/dimens.xml
└── values-sw720dp/dimens.xml
```

### Dimensiones por breakpoint

| Recurso | Teléfono | Tablet 7" | Tablet 10" |
|---------|----------|-----------|------------|
| `text_title` | 18sp | 22sp | 26sp |
| `text_body` | 14sp | 16sp | 18sp |
| `metrics_value_text_size` | 24sp | 28sp | 32sp |
| `icon_normal` | 24dp | 32dp | 40dp |
| `card_padding` | 12dp | 16dp | 20dp |
| `spacing_normal` | 16dp | 24dp | 28dp |

Layouts implementados: `layout-sw600dp/fragment_metrics.xml`, `layout-sw720dp/fragment_metrics.xml` (patrón master-detail). Pendiente aplicar el patrón a `fragment_profile.xml`, `fragment_leagues.xml`, `fragment_home.xml`.

## Sistema Offline — Arquitectura

```
UI (Fragments)
    └── ViewModel + LiveData/StateFlow
            └── Repository (Room ↔ Firestore)
                    └── WorkManager (SyncWorker — background sync)
```

## Room Database (`AppDatabase.kt`)

### Entidades

```kotlin
@Entity(tableName = "visits")
data class VisitLocal(
    val id: String, val userId: String, val businessName: String,
    val latitude: Double, val longitude: Double, val photoUrl: String?,
    val isSynced: Boolean = false, val syncAttempts: Int = 0
)

@Entity(tableName = "prospects")
data class ProspectLocal(
    val id: String, val businessName: String,
    val approvalProbability: Double, val isSynced: Boolean = false
)

@Entity(tableName = "metrics_cache")
data class MetricsCache(
    val id: String, val userId: String, val period: String,
    val totalSales: Int, val salesAmount: Double,
    val cachedAt: Long, val expiresAt: Long
)

@Entity(tableName = "sync_queue")
data class SyncQueue(
    val id: Long, val entityType: String,   // "visit" | "prospect"
    val entityId: String,
    val operation: String,                  // "CREATE" | "UPDATE" | "DELETE"
    val dataJson: String,
    val status: String,                     // "PENDING" | "SYNCING" | "FAILED" | "COMPLETED"
    val attempts: Int = 0, val maxAttempts: Int = 5
)
```

## NetworkConnectivityManager

```kotlin
val networkManager = NetworkConnectivityManager(context)

networkManager.networkState.collect { state ->
    when (state) {
        is NetworkState.Available -> { /* state.connectionType: WIFI | CELLULAR | ETHERNET */ }
        NetworkState.Unavailable -> { /* modo offline */ }
    }
}

networkManager.isConnected()      // verificación síncrona
networkManager.isWiFiConnected()
networkManager.cleanup()          // llamar en onDestroyView
```

## SyncWorker

**Características:** requiere red, periódico cada 15 min, retry con backoff exponencial (1→2→4→8→16s), máximo 5 intentos por item, limpieza de items completados >7 días y visitas sincronizadas >90 días.

```kotlin
// En Application.onCreate() o MainActivity
SyncWorker.schedule(context)   // programar periódico
SyncWorker.syncNow(context)    // sync inmediata
SyncWorker.cancel(context)
```

**Proceso por ciclo:**
1. Verificar conectividad
2. Obtener items `PENDING` de `SyncQueue`
3. Por cada item: marcar `SYNCING` → subir a Firestore → marcar `COMPLETED` o `FAILED`
4. Items `FAILED` con `attempts >= maxAttempts` se descartan
5. Limpiar registros antiguos

## VisitRepository

**Online:** guarda en Firestore primero, luego en Room con `isSynced = true`.
**Offline:** guarda en Room con `isSynced = false`, encola en `SyncQueue`.

```kotlin
// En ViewModel
private val visitRepository = VisitRepository(
    visitDao = database.visitDao(),
    syncQueueDao = database.syncQueueDao(),
    firestore = FirebaseFirestore.getInstance(),
    networkManager = networkManager
)

viewModelScope.launch {
    visitRepository.createVisit(visit).fold(
        onSuccess = { visitId -> ... },
        onFailure = { error -> ... }
    )
}

// Observables
val visitsFlow = visitRepository.getVisitsByUserFlow(userId)
    .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

val pendingCountFlow = visitRepository.getUnsyncedCountFlow()
    .stateIn(viewModelScope, SharingStarted.Lazily, 0)
```

## ConnectionStatusView

```xml
<com.promotoresavivatunegocio_1.views.ConnectionStatusView
    android:id="@+id/connectionStatus"
    android:layout_width="match_parent"
    android:layout_height="wrap_content" />
```

```kotlin
binding.connectionStatus.updateNetworkState(networkState)
binding.connectionStatus.updatePendingCount(5)
binding.connectionStatus.showSyncing()
binding.connectionStatus.showSyncSuccess()
binding.connectionStatus.showSyncError("mensaje")
binding.connectionStatus.setOnSyncClickListener { SyncWorker.syncNow(requireContext()) }
```

## Setup en Application

```kotlin
class AvivaApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AppDatabase.getInstance(this)
        SyncWorker.schedule(this)
    }
}
```

## Archivos creados

```
database/AppDatabase.kt
database/entities/VisitLocal.kt, ProspectLocal.kt, MetricsCache.kt, SyncQueue.kt
database/dao/VisitDao.kt, ProspectDao.kt, MetricsCacheDao.kt, SyncQueueDao.kt
utils/NetworkConnectivityManager.kt
repository/VisitRepository.kt
workers/SyncWorker.kt
views/ConnectionStatusView.kt
layout/view_connection_status.xml
layout-sw600dp/fragment_metrics.xml
layout-sw720dp/fragment_metrics.xml
values-sw600dp/dimens.xml
values-sw720dp/dimens.xml
```

`build.gradle.kts` actualizado con dependencias KSP para Room.

## Pendiente

- Implementar `ProspectRepository`, `MetricsRepository`, `AttendanceRepository`
- Aplicar master-detail layouts a `fragment_profile.xml`, `fragment_leagues.xml`, `fragment_home.xml`, `fragment_badges.xml`
- Compresión de imágenes antes de guardar en Room
- Paging 3 para listas con muchos registros
