# OpenAI Assistant - Configuración de Function Calling

## Agregar herramienta al Assistant

En `platform.openai.com/assistants` → tu assistant → Tools → Add Function.

### Nombre
```
search_hubspot_deals
```

### Descripción
```
Busca deals/llamadas en HubSpot CRM. Usar cuando el usuario pregunte sobre:
- Status o información de clientes específicos (por nombre)
- Deals en etapas específicas (castigo, aprobado, pagado)
- Conteos de deals/llamadas con filtros de fecha (hoy, ayer, esta semana, este mes)
- Métricas y análisis de deals (top vendedores, montos totales)
- Consultas de ventas personales ("cuánto he vendido", "mis ventas") — incluir owner_id
- Consultas por producto (Aviva Contigo, Aviva Tu Negocio, etc.)
- Renovaciones y cross-selling
```

### JSON Schema de parámetros

```json
{
  "type": "object",
  "properties": {
    "deal_name": {
      "type": "string",
      "description": "Nombre del cliente o deal a buscar."
    },
    "deal_stage": {
      "type": "string",
      "enum": ["closedlost", "closedwon", "appointmentscheduled"]
    },
    "owner_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "IDs de HubSpot de los owners. Vacío = todos."
    },
    "date_from": {
      "type": "string",
      "format": "date",
      "description": "Fecha inicio YYYY-MM-DD."
    },
    "date_to": {
      "type": "string",
      "format": "date"
    },
    "response_type": {
      "type": "string",
      "enum": ["count_only", "summary", "details"],
      "default": "summary"
    },
    "limit": {
      "type": "integer",
      "default": 20
    },
    "producto_aviva": {
      "type": "string",
      "enum": ["aviva_contigo", "aviva_atn", "aviva_tucompra", "aviva_tucasa", "construrama_aviva_tucasa", "casa_marchand", "salauno"]
    },
    "aos_cross_selling": {
      "type": "boolean",
      "description": "true = solo renovaciones/cross-selling"
    }
  },
  "required": []
}
```

## Mapeo de lenguaje natural a parámetros

| Expresión del usuario | Parámetro |
|-----------------------|-----------|
| "en castigo" | `deal_stage: "closedlost"` |
| "aprobado/aprobadas" | `deal_stage: "appointmentscheduled"` |
| "pagado/pagadas" | `deal_stage: "closedwon"` |
| "hoy" | `date_from/date_to: fecha actual` |
| "ayer" | `date_from/date_to: ayer` |
| "mis ventas", "yo", "he vendido" | `owner_ids: [hubspotOwnerId del usuario]` |

## Configuración de Firebase Functions

```bash
firebase functions:config:set \
  openai.apikey="sk-..." \
  openai.assistantid="asst_..."

cd functions && npm run build
firebase deploy --only functions:chat
```

## Comportamiento del sistema

- **Conteo real**: Obtiene hasta 20,000 deals (sin límites artificiales)
- **Filtros de producto**: Soporta los 7 productos Aviva
- **Permisos automáticos**: El sistema detecta consultas personales y filtra por `hubspotOwnerId` del usuario en Firestore
- **Respuestas limpias**: `cleanResponse()` en `chatAssistant.ts` elimina markdown y citaciones antes de enviar al cliente
- **Fechas**: Los filtros usan `createdate`. La fecha de venta real se incluye en los resultados pero no se usa para filtrar.

## Troubleshooting

**"HubSpot no está configurado"**: Verificar `hubspot.apikey` y redesplegar.

**"Function not implemented"**: El nombre de la función debe ser exactamente `search_hubspot_deals`.

**No encuentra deals**: Revisar filtros y logs:
```bash
firebase functions:log --only chat --tail
```

Indicadores en logs:
- `Ejecutando herramienta: search_hubspot_deals` — función invocada
- `Ejecutando búsqueda HubSpot con:` — parámetros usados
- `Error ejecutando` — fallo en ejecución
