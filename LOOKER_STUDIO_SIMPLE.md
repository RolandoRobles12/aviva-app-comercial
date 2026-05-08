# Looker Studio - Integración en MetricsFragment

## Configuración

Editar `app/src/main/java/com/promotoresavivatunegocio_1/ui/metrics/MetricsFragment.kt`, líneas 63-68:

```kotlin
// Dashboard único (obligatorio)
private const val LOOKER_MAIN_DASHBOARD = "https://lookerstudio.google.com/reporting/{REPORT_ID}"

// Dashboards separados por período (opcional)
private const val LOOKER_DAILY_DASHBOARD   = "https://lookerstudio.google.com/reporting/{ID_DIARIO}"
private const val LOOKER_WEEKLY_DASHBOARD  = "https://lookerstudio.google.com/reporting/{ID_SEMANAL}"
private const val LOOKER_MONTHLY_DASHBOARD = "https://lookerstudio.google.com/reporting/{ID_MENSUAL}"
```

**Usar dashboards separados (línea 95):**
```kotlin
private const val USE_SEPARATE_DASHBOARDS = true   // false = todos los botones abren LOOKER_MAIN_DASHBOARD
```

## Modo de visualización

```kotlin
private val DISPLAY_MODE = DisplayMode.CHROME_TABS   // default y recomendado
// DisplayMode.WEBVIEW solo para dashboards públicos (sin OAuth)
```

Chrome Custom Tabs es necesario para OAuth. WebView bloquea Google Sign-In con `Error 403: disallowed_useragent`.

## Filtro por usuario

Para mostrar solo datos del usuario autenticado:

1. En Looker Studio: Archivo → Administrar parámetros → crear parámetro `userId`
2. En `MetricsFragment.kt`, líneas 104-105:
```kotlin
private const val ENABLE_USER_FILTER = true
private const val USER_PARAM_NAME = "userId"
```

## Permisos del dashboard en Looker Studio

- **Privado** (recomendado): Compartir → Administrar acceso → agregar emails con rol Visualizador
- **Público**: Compartir → Obtener enlace → "Cualquiera que tenga el enlace"

## Troubleshooting

**Dashboard pide login cada vez**: El usuario limpió caché de Chrome. Las cookies de Chrome Custom Tabs se comparten con el navegador del sistema.

**"Error al abrir reportes"**: Chrome no instalado en el dispositivo.

**Dashboard mal renderizado en móvil**: En Looker Studio → Archivo → Configuración del informe → habilitar "Optimizado para móviles".
