# 🚀 Quick Start: HubSpot + Firebase Functions

## Instalación Rápida (5 minutos)

### 1. HubSpot - Obtener API Key

```bash
1. Ve a: https://app.hubspot.com/settings/integrations/private-apps
2. Crea "Aviva App Integration"
3. Permisos necesarios:
   ✅ crm.objects.contacts.read/write
   ✅ crm.objects.deals.read/write
   ✅ crm.schemas.contacts.read
   ✅ crm.schemas.deals.read
4. Copia el token: pat-na1-xxxxx
```

### 2. Firebase - Configurar y Desplegar

```bash
# Instalar dependencias
cd functions
npm install

# Configurar token HubSpot
firebase functions:config:set hubspot.apikey="pat-na1-TU_TOKEN_AQUI"

# Desplegar functions
cd ..
firebase deploy --only functions
```

### 3. Android App - Actualizar URL

Edita `app/src/main/java/.../services/HubSpotRepository.kt`:

```kotlin
private const val FUNCTIONS_BASE_URL =
    "https://us-central1-TU_PROJECT_ID.cloudfunctions.net/"
```

### 4. Verificar que funciona

1. Abre la app como admin
2. Ve a pestaña "Admin" → "📊 HubSpot"
3. Presiona "🔄 Actualizar Métricas"
4. Deberías ver datos de HubSpot

---

## Comandos Útiles

```bash
# Ver logs en tiempo real
firebase functions:log

# Verificar configuración
firebase functions:config:get

# Re-desplegar solo una function
firebase deploy --only functions:getHubSpotMetrics

# Listar functions desplegadas
firebase functions:list
```

---

## Estructura del Proyecto

```
aviva-app-comercial/
├── functions/                          # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts                   # Endpoints principales
│   │   └── hubspot.service.ts         # Servicio HubSpot
│   ├── package.json
│   └── tsconfig.json
│
├── app/src/main/java/.../
│   ├── models/hubspot/                # Modelos de datos
│   │   └── HubSpotMetrics.kt
│   ├── services/                      # APIs y Repositorios
│   │   ├── HubSpotApiService.kt
│   │   └── HubSpotRepository.kt
│   └── ui/admin/                      # UI Admin Panel
│       ├── HubSpotMetricsFragment.kt
│       ├── HubSpotMetricsViewModel.kt
│       └── AdminPagerAdapter.kt
│
└── HUBSPOT_INTEGRATION_SETUP.md       # Documentación completa
```

---

## Endpoints Disponibles

| Endpoint | Descripción |
|----------|-------------|
| `getHubSpotMetrics` | Todas las métricas (deals, contacts, pipelines) |
| `getDealsMetrics` | Solo deals |
| `getContactsMetrics` | Solo contactos |
| `getPipelineMetrics` | Solo pipelines |
| `syncVisitToHubSpot` | Sincroniza 1 visita |
| `batchSyncVisits` | Sincroniza múltiples visitas |

---

## Troubleshooting Rápido

| Error | Solución |
|-------|----------|
| "API key not configured" | `firebase functions:config:set hubspot.apikey="TOKEN"` |
| "Forbidden: Admin access required" | Usuario debe tener `role: "admin"` en Firestore |
| "Failed to fetch metrics" | Verificar token y scopes en HubSpot |
| Functions no despliegan | `firebase login --reauth` |

---

Para documentación completa, ver: `HUBSPOT_INTEGRATION_SETUP.md`
