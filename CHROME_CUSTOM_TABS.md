# Chrome Custom Tabs - OAuth en AttendanceFragment

## Problema

Google bloquea OAuth en WebViews con `Error 403: disallowed_useragent`. Chrome Custom Tabs resuelve esto abriendo el navegador Chrome real dentro del contexto de la app.

## Implementación

### Dependencia (`app/build.gradle.kts`)

```kotlin
implementation("androidx.browser:browser:1.8.0")
```

### Apertura con colores de la app

```kotlin
val colorSchemeParams = CustomTabColorSchemeParams.Builder()
    .setToolbarColor(ContextCompat.getColor(requireContext(), R.color.purple_500))
    .setSecondaryToolbarColor(ContextCompat.getColor(requireContext(), R.color.purple_700))
    .setNavigationBarColor(ContextCompat.getColor(requireContext(), R.color.purple_700))
    .build()
```

Colores en `res/values/colors.xml` o directamente con `Color.parseColor("#XXXXXX")` en `AttendanceFragment.kt:170-172`.

### Apertura automática vs manual

```kotlin
// AttendanceFragment.kt:145 - apertura automática al crear la vista
openInChromeCustomTabs()  // comentar para deshabilitar apertura automática

// AttendanceFragment.kt:228 - para abrir al volver al fragment
override fun onResume() {
    super.onResume()
    // openInChromeCustomTabs()  // descomentar si se requiere
}
```

### URL de la web app

```kotlin
// AttendanceFragment.kt:25
private const val ATTENDANCE_WEB_URL = "https://registro-aviva.web.app/"
```

## Fallback

Si Chrome no está instalado, el fallback abre el navegador externo por defecto. La lógica está en `openInChromeCustomTabs()`.

## Ventajas sobre WebView

- OAuth funciona correctamente (Chrome completo, no user-agent modificado)
- Cookies compartidas con Chrome del sistema (sesión persistente)
- Sin necesidad de modificar la web app
- Service Workers y PWA features habilitadas

## Logs de diagnóstico

```bash
adb logcat | grep AttendanceFragment
```

## Troubleshooting

**Chrome Custom Tabs no abre**: Chrome no está instalado. El fallback usa el navegador por defecto.

**Colores no aplican**: Verificar que los nombres de color en `colors.xml` coinciden con los referenciados en `AttendanceFragment.kt`. Hacer Clean + Rebuild.

**Se abre múltiples veces**: Comentar `openInChromeCustomTabs()` en `onResume()`.
