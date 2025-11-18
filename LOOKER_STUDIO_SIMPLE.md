# Cómo Integrar tus Dashboards de Looker Studio

## Solo 3 Pasos

### 1. Obtén las URLs de tus Dashboards

Ve a [Looker Studio](https://lookerstudio.google.com) y copia las URLs de tus dashboards desde la barra de direcciones:

```
https://lookerstudio.google.com/reporting/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/page/YYYYY
```

### 2. Pega las URLs en el Código

Abre el archivo:
```
app/src/main/java/com/promotoresavivatunegocio_1/ui/metrics/MetricsFragment.kt
```

Busca las **líneas 63-68** y reemplaza con tus URLs:

```kotlin
// Dashboard principal (obligatorio)
private const val LOOKER_MAIN_DASHBOARD = "https://lookerstudio.google.com/reporting/TU_URL_AQUI"

// Si tienes dashboards separados por período (opcional)
private const val LOOKER_DAILY_DASHBOARD = "https://lookerstudio.google.com/reporting/TU_URL_DIARIO"
private const val LOOKER_WEEKLY_DASHBOARD = "https://lookerstudio.google.com/reporting/TU_URL_SEMANAL"
private const val LOOKER_MONTHLY_DASHBOARD = "https://lookerstudio.google.com/reporting/TU_URL_MENSUAL"
```

### 3. ¡Compila y Listo!

```bash
# En Android Studio
Build > Rebuild Project
Run > Run 'app'
```

## ✅ Ya Funciona

- ✅ Login de Google funciona sin error 403
- ✅ Filtros de Looker Studio funcionan
- ✅ Exportar a PDF/Excel disponible
- ✅ Colores de tu app integrados
- ✅ Los botones "Diario", "Semanal", "Mensual" abren los dashboards

---

## Opciones Adicionales

### ¿Tienes un solo dashboard para todo?

Si usas un dashboard con filtro de período, configura esto en **línea 95**:

```kotlin
private const val USE_SEPARATE_DASHBOARDS = false  // ← Dejar en false
```

Los botones abrirán siempre el mismo dashboard.

### ¿Tienes dashboards separados por período?

Si tienes un dashboard para diario, otro para semanal, etc., configura esto en **línea 95**:

```kotlin
private const val USE_SEPARATE_DASHBOARDS = true  // ← Cambiar a true
```

Los botones abrirán el dashboard correspondiente.

### ¿Quieres filtrar por usuario?

Si cada vendedor debe ver solo sus propios datos:

#### En Looker Studio:

1. Ve a `Archivo > Administrar parámetros`
2. Crea un parámetro llamado `userId`
3. Usa ese parámetro en tus filtros

#### En la App (líneas 104-105):

```kotlin
private const val ENABLE_USER_FILTER = true  // ← Cambiar a true
private const val USER_PARAM_NAME = "userId"  // ← Nombre del parámetro en Looker Studio
```

---

## Modos de Visualización

### Chrome Custom Tabs (Actual - Recomendado)

```kotlin
private val DISPLAY_MODE = DisplayMode.CHROME_TABS
```

**Ventajas**:
- ✅ Login de Google funciona
- ✅ Todas las funciones de Looker Studio
- ✅ Mejor rendimiento

### WebView (Alternativa)

```kotlin
private val DISPLAY_MODE = DisplayMode.WEBVIEW
```

**Solo úsalo si**:
- Tus dashboards son PÚBLICOS (compartidos con "Cualquiera que tenga el enlace")
- No requieren login de Google

⚠️ **Importante**: Login OAuth NO funciona en WebView.

---

## ¿Cómo Compartir tus Dashboards?

Para que funcionen en la app, tus dashboards deben estar compartidos:

### Opción 1: Privado (Recomendado)

1. En Looker Studio: `Compartir > Administrar acceso`
2. Agrega los emails de tus vendedores
3. Permisos: "Visualizador"

Los usuarios deberán iniciar sesión con su cuenta de Google la primera vez.

### Opción 2: Público

1. En Looker Studio: `Compartir > Obtener enlace`
2. Configurar: "Cualquiera que tenga el enlace puede ver"

Cualquiera con el link puede ver el dashboard (sin login).

---

## Ejemplo de Configuración

### Si tienes 1 dashboard general:

```kotlin
private const val LOOKER_MAIN_DASHBOARD = "https://lookerstudio.google.com/reporting/ABC123"
private const val USE_SEPARATE_DASHBOARDS = false
```

### Si tienes 3 dashboards (diario, semanal, mensual):

```kotlin
private const val LOOKER_DAILY_DASHBOARD = "https://lookerstudio.google.com/reporting/DIARIO123"
private const val LOOKER_WEEKLY_DASHBOARD = "https://lookerstudio.google.com/reporting/SEMANAL456"
private const val LOOKER_MONTHLY_DASHBOARD = "https://lookerstudio.google.com/reporting/MENSUAL789"
private const val USE_SEPARATE_DASHBOARDS = true
```

---

## Flujo del Usuario

```
Usuario navega a tab "Métricas"
    ↓
Chrome Custom Tabs se abre automáticamente
    ↓
Usuario ve su dashboard de Looker Studio
    ↓
(Primera vez) Debe iniciar sesión con Google
    ↓
Dashboard carga con todas sus funciones
    ↓
Usuario puede:
  - Ver gráficas interactivas
  - Usar filtros
  - Exportar a PDF/Excel
  - Cambiar fechas
    ↓
Al cerrar, vuelve a la app
```

---

## Testing

1. Abre la app en tu dispositivo
2. Inicia sesión con tu cuenta Google
3. Ve al tab "Métricas"
4. Chrome Custom Tabs debería abrirse
5. Verifica que tu dashboard carga correctamente
6. Prueba los botones "Diario", "Semanal", "Mensual"
7. (Si es privado) Verifica que pide login la primera vez

---

## Troubleshooting

### "Debes iniciar sesión para ver los reportes"

**Solución**: Inicia sesión en la app con Google

### Dashboard pide login cada vez

**Solución**: Las cookies se guardan, pero si el usuario cierra Chrome o limpia cache, pedirá login nuevamente.

### "Error al abrir reportes. Asegúrate de tener Chrome instalado"

**Solución**: Instala Google Chrome en el dispositivo

### Dashboard se ve mal en móvil

**Solución**:
1. En Looker Studio: `Archivo > Configuración del informe`
2. Habilita "Optimizado para móviles"

---

## ¿Necesitas Ayuda?

Revisa `CHROME_CUSTOM_TABS.md` para más detalles sobre cómo funciona Chrome Custom Tabs.
