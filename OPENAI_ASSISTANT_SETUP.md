# Configuración del Asistente de OpenAI para HubSpot

Este documento explica cómo configurar el asistente de OpenAI para que pueda realizar consultas a HubSpot.

## Paso 1: Acceder al Asistente

1. Ve a https://platform.openai.com/assistants
2. Abre tu asistente existente (el que usas para el chatbot)
3. Ve a la sección **"Tools"** o **"Herramientas"**

## Paso 2: Agregar Function/Tool

Haz clic en **"Add Function"** o **"Agregar Función"** y configura lo siguiente:

### Nombre de la Función
```
search_hubspot_deals
```

### Descripción
```
Busca deals/llamadas en HubSpot CRM. Usa esta función cuando el usuario pregunte sobre:
- Status o información de clientes específicos (por nombre)
- Deals en etapas específicas (castigo, aprobado, pagado)
- Conteos de deals/llamadas (cuántos deals, cuántas ventas)
- Métricas y análisis de deals (top vendedores, montos totales)
- Consultas con filtros de fecha (hoy, ayer, esta semana, este mes)
- Consultas de ventas personales ("cuánto he vendido", "mis ventas")
- Consultas por producto (Aviva Contigo, Aviva Tu Negocio, etc.)
- Consultas de renovaciones y cross-selling

IMPORTANTE:
- Cuando el usuario usa "yo", "mi", "he vendido", "vendí", debes incluir el owner_id del usuario
- Los nombres de owners y service owners deben mostrarse con nombres reales, no IDs
- La fecha de venta es diferente a la fecha de solicitud (createdate)
```

### Parámetros (JSON Schema)

Copia y pega el siguiente JSON Schema en el campo de parámetros:

```json
{
  "type": "object",
  "properties": {
    "deal_name": {
      "type": "string",
      "description": "Nombre del cliente o deal a buscar. Usar cuando el usuario menciona un nombre específico."
    },
    "deal_stage": {
      "type": "string",
      "description": "Etapa del deal. Valores válidos: 'closedlost' (castigo), 'closedwon' (pagado), 'appointmentscheduled' (aprobado)",
      "enum": ["closedlost", "closedwon", "appointmentscheduled"]
    },
    "owner_ids": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs de HubSpot de los owners/creadores. Dejar vacío para buscar todos."
    },
    "date_from": {
      "type": "string",
      "format": "date",
      "description": "Fecha de inicio en formato YYYY-MM-DD. Usar la fecha de HOY cuando el usuario dice 'hoy', AYER cuando dice 'ayer', etc."
    },
    "date_to": {
      "type": "string",
      "format": "date",
      "description": "Fecha de fin en formato YYYY-MM-DD. Generalmente igual a date_from para búsquedas de un día específico."
    },
    "response_type": {
      "type": "string",
      "description": "Tipo de respuesta: 'count_only' (solo conteo), 'summary' (resumen con análisis), 'details' (detalles de cada deal)",
      "enum": ["count_only", "summary", "details"],
      "default": "summary"
    },
    "limit": {
      "type": "integer",
      "description": "Límite de resultados a retornar",
      "default": 20
    }
  },
  "required": []
}
```

## Paso 3: Configurar Firebase Functions

Asegúrate de que la API key de HubSpot esté configurada:

```bash
firebase functions:config:set hubspot.apikey="TU_API_KEY_DE_HUBSPOT"
```

Verifica la configuración:

```bash
firebase functions:config:get
```

Deberías ver:

```json
{
  "hubspot": {
    "apikey": "tu-api-key"
  },
  "openai": {
    "apikey": "tu-openai-key",
    "assistantid": "tu-assistant-id"
  }
}
```

## Paso 4: Desplegar Functions

```bash
cd functions
npm run build
firebase deploy --only functions:chat
```

## Paso 5: Probar

Prueba con mensajes como:

### Consultas por nombre:
- "¿Cuál es el status del cliente Brayan Andres Garcia Suarez?"
- "Información del cliente Juan Pérez"
- "Buscar deal de María González"

### Consultas por etapa:
- "Deals en castigo"
- "Llamadas aprobadas"
- "Deals pagados"

### Consultas con fecha:
- "¿Cuántos deals creé hoy?"
- "Deals de ayer"
- "Llamadas creadas hoy"

### Consultas de análisis:
- "¿Quién creó más deals hoy?"
- "Total de deals este mes"
- "Resumen de llamadas"

## Mapeo de Etapas

El sistema mapea automáticamente:

| Usuario dice | deal_stage |
|--------------|-----------|
| "en castigo" | closedlost |
| "aprobado" / "aprobadas" | appointmentscheduled |
| "pagado" / "pagadas" | closedwon |

## Manejo de Fechas

El asistente debe convertir lenguaje natural a formato YYYY-MM-DD:

- "hoy" → fecha actual (ej: 2025-11-27)
- "ayer" → fecha de ayer
- "esta semana" → rango de fechas de la semana actual

## Troubleshooting

### Error: "HubSpot no está configurado"
- Verifica que `hubspot.apikey` esté en la configuración de Firebase Functions
- Redeploya las functions después de configurar la API key

### Error: "Function not implemented"
- Asegúrate de que el nombre de la función sea exactamente `search_hubspot_deals`
- Verifica que el asistente de OpenAI tenga la herramienta configurada

### No encuentra deals
- Verifica que los filtros sean correctos
- Revisa los logs de Firebase Functions: `firebase functions:log`
- Asegúrate de que la API key de HubSpot tenga los permisos necesarios

## Logs

Para ver logs en tiempo real:

```bash
firebase functions:log --only chat --tail
```

Busca estos indicadores:

- `🔧 Ejecutando herramienta: search_hubspot_deals` - La herramienta fue llamada
- `🚀 Ejecutando búsqueda HubSpot con:` - Parámetros de búsqueda
- `✅ Resultado HubSpot:` - Resultado exitoso
- `❌ Error ejecutando` - Error en la ejecución

## Notas Importantes

1. **Sin límites artificiales**: El sistema obtiene el conteo completo real de deals (hasta 20,000)
2. **Clasificación inteligente**: El detector de patrones ya está configurado para reconocer consultas de HubSpot
3. **Respuestas limpias**: Las respuestas se limpian de markdown y referencias técnicas automáticamente
4. **Permisos**: Por ahora, todos los usuarios pueden ver todos los deals. Para implementar permisos por usuario, necesitarás extender el sistema.

## Próximos Pasos (Opcional)

### Sistema de Permisos por Usuario

Para implementar permisos (como en el bot de Python), necesitarías:

1. Crear una colección de usuarios en Firestore con sus HubSpot IDs
2. Modificar `handleToolCalls` para filtrar por `owner_ids` según el usuario
3. Validar permisos antes de ejecutar búsquedas

### Caché de Resultados

Para mejorar performance, podrías:

1. Implementar cache con Firebase Realtime Database
2. Cachear resultados por 5-10 minutos
3. Invalidar cache cuando se creen/actualicen deals
