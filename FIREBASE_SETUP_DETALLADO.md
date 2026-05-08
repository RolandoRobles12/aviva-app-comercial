# Firebase Functions - Setup y Configuración

## Prerrequisitos

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Proyecto Firebase con Blaze plan (requerido para Cloud Functions)

## Setup inicial

```bash
firebase login
firebase use --add          # seleccionar proyecto, alias: default
cd functions && npm install
npm run build               # compilar TypeScript
```

## Configurar secrets

```bash
firebase functions:config:set hubspot.apikey="pat-na1-..."
firebase functions:config:set openai.apikey="sk-..."
firebase functions:config:set openai.assistantid="asst_..."
firebase functions:config:get   # verificar
```

## Deploy

```bash
firebase deploy --only functions           # deploy completo
firebase deploy --only functions:chat      # función específica
firebase functions:list                    # verificar estado READY
```

## URL base de Functions

```
https://us-central1-{PROJECT_ID}.cloudfunctions.net/
```

Actualizar en `HubSpotRepository.kt`:
```kotlin
private const val FUNCTIONS_BASE_URL = "https://us-central1-aviva-app-comercial.cloudfunctions.net/"
```

## Endpoints desplegados

| Función | Método | Descripción |
|---------|--------|-------------|
| `getHubSpotMetrics` | GET | Deals + contacts + pipelines |
| `getDealsMetrics` | GET | Solo métricas de deals |
| `getContactsMetrics` | GET | Solo métricas de contactos |
| `getPipelineMetrics` | GET | Métricas de pipelines |
| `syncVisitToHubSpot` | POST | Sync visita individual |
| `batchSyncVisits` | POST | Sync múltiples visitas |
| `chat` | POST | Chatbot OpenAI + HubSpot |
| `updateLeaguePoints` | POST | Recalcular puntos de liga |

## Monitoring y logs

```bash
firebase functions:log                        # logs recientes
firebase functions:log --only chat --tail     # stream en tiempo real
firebase functions:log --only getHubSpotMetrics --log-level error
```

## Re-deploy tras cambiar config

Cualquier cambio en `firebase functions:config:set` requiere re-deploy:
```bash
firebase deploy --only functions
```

## Archivos fuente

```
functions/src/
├── index.ts              # exports de todas las funciones
├── chatAssistant.ts      # endpoint /chat
└── hubspot.service.ts    # lógica de HubSpot
```

No editar: `functions/node_modules/`, `functions/lib/`, `functions/.runtimeconfig.json`

## Troubleshooting

**Build falla**: Verificar TypeScript con `npm run build` antes de deploy.

**Functions no aparecen en `functions:list`**: Verificar que el proyecto está configurado con `firebase use`.

**"HubSpot API key not configured"**:
```bash
firebase functions:config:set hubspot.apikey="..." && firebase deploy --only functions
```

**Timeout en OpenAI**: Aumentar `TIMEOUT_SECONDS` en `chatAssistant.ts`.

**Usuario admin no puede acceder**: Verificar `role: "admin"` en Firestore colección `users/{uid}`.
