# Integración HubSpot CRM

## Flujo de datos

```
App Android
    ↓ Firebase Auth Token
Firebase Functions  →  verifica token + role == "admin"
    ↓ API Key (guardada en Functions Config)
HubSpot API
```

## 1. Crear Private App en HubSpot

Settings → Integrations → Private Apps → Create a private app.

**Scopes requeridos:**
- `crm.objects.contacts.read` / `write`
- `crm.objects.deals.read` / `write`
- `crm.schemas.contacts.read`
- `crm.schemas.deals.read`

Copiar el Access Token (`pat-na1-...`).

## 2. Configurar Firebase Functions

```bash
firebase functions:config:set hubspot.apikey="pat-na1-..."
firebase functions:config:get  # verificar
cd functions && npm run build
firebase deploy --only functions
```

## 3. Configurar App Android

Actualizar `HubSpotRepository.kt`:
```kotlin
companion object {
    private const val FUNCTIONS_BASE_URL = "https://us-central1-{PROJECT_ID}.cloudfunctions.net/"
}
```

Dependencias (`build.gradle.kts`):
```kotlin
implementation("com.squareup.retrofit2:retrofit:2.9.0")
implementation("com.squareup.retrofit2:converter-gson:2.9.0")
implementation("com.squareup.okhttp3:okhttp:4.12.0")
implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
```

## Endpoints

**Headers requeridos:** `Authorization: Bearer {FIREBASE_ID_TOKEN}`

### GET /getHubSpotMetrics
```json
{ "startDate": "2024-01-01", "endDate": "2024-12-31" }
```
Retorna: deals totales, valor total, distribución por etapas, contactos por lifecycle stage, pipelines.

### POST /syncVisitToHubSpot
```json
{ "visitId": "FIRESTORE_VISIT_ID" }
```
Crea/actualiza el contacto en HubSpot y crea un deal asociado. Marca la visita como sincronizada en Firestore.

### POST /batchSyncVisits
```json
{ "visitIds": ["visit1", "visit2"] }
```

### GET /getDealsMetrics, /getContactsMetrics, /getPipelineMetrics
Sin body adicional, usa el rango de fechas del token del usuario.

## Configuración de usuario en Firestore

Para que las consultas personales del chatbot (`"mis ventas"`) funcionen, cada usuario necesita:
```
/users/{userId}/
  hubspotOwnerId: "123456789"   // ID numérico del owner en HubSpot
```

Sin este campo, los filtros por owner no operarán.

## Troubleshooting

**"HubSpot API key not configured"**:
```bash
firebase functions:config:set hubspot.apikey="..." && firebase deploy --only functions
```

**"Forbidden: Admin access required"**: El usuario no tiene `role: "admin"` en `users/{userId}`.

**"Failed to fetch HubSpot metrics"**: Verificar validez del token, scopes en HubSpot, y logs:
```bash
firebase functions:log --only getHubSpotMetrics
```

**Build error en Android**:
```bash
./gradlew clean && ./gradlew build
```

## Logs de referencia

Tags de Logcat: `HubSpotRepository`, `HubSpotMetricsViewModel`
