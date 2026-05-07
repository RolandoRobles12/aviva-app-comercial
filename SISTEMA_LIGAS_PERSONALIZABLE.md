# Sistema de Ligas Personalizable

## Arquitectura

- **Admin Panel**: `admin/src/pages/Ligas.tsx` — CRUD de ligas y criterios
- **Types**: `admin/src/types/league.ts` — modelos compartidos
- **Firebase Function**: `functions/src/index.ts:1026` — `updateLeaguePoints`
- **Android**: `app/src/main/java/.../ui/leagues/`

## Schema de liga en Firestore

```
/leagues/{leagueId}
  name: string
  description: string
  icon: string
  color: string          // hex, ej: "#16b877"
  memberIds: string[]
  season: int
  startDate: Timestamp
  endDate: Timestamp
  active: boolean
  criteria: LeagueCriterion[]
  prizes: LeaguePrize[]
```

## Schema de criterio (`LeagueCriterion`)

```typescript
{
  name: string
  pointsPerUnit: number
  dataSource: "visits" | "custom_field" | "manual"

  // Solo para dataSource == "custom_field"
  collection?: string          // ej: "sales"
  userField?: string           // ej: "userId"
  calculationType: "COUNT" | "SUM" | "AVERAGE"
  fieldToAggregate?: string    // campo a sumar/promediar para SUM/AVERAGE
  filter?: {
    field: string
    operator: "==" | ">" | "<" | ">="
    value: any
  }

  active: boolean
}
```

## Schema de `leagueParticipants` (actualizado por `updateLeaguePoints`)

```
/leagueParticipants/{participantId}
  leagueId: string
  userId: string
  currentPoints: number
  salesInSeason: number      // conteo de "ventas" según criterios
  currentPosition: int
  previousPosition: int
```

## Firebase Function — `updateLeaguePoints`

```bash
# Trigger manual via curl
curl -X POST \
  https://us-central1-{PROJECT_ID}.cloudfunctions.net/updateLeaguePoints \
  -H "Content-Type: application/json" \
  -d '{"leagueId": "ID_DE_LA_LIGA"}'

# Deploy
cd functions && npm run build
firebase deploy --only functions:updateLeaguePoints
```

### Job programado (opcional)

```typescript
// functions/src/index.ts
export const scheduleLeaguePointsUpdate = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const activeLeagues = await db.collection('leagues')
      .where('active', '==', true).get();
    for (const league of activeLeagues.docs) {
      await updateLeaguePointsLogic(league.id);
    }
  });
```

## Filtros por fecha

Los criterios de tipo `visits` y `custom_field` filtran automáticamente por `league.startDate` - `league.endDate`. Los criterios de tipo `manual` no se calculan automáticamente.

## Ejemplos de configuración de criterios

**Solo visitas:**
```json
{ "name": "Visitas", "pointsPerUnit": 10, "dataSource": "visits", "calculationType": "COUNT", "active": true }
```

**Ventas cerradas:**
```json
{
  "name": "Ventas Cerradas", "pointsPerUnit": 100,
  "dataSource": "custom_field", "collection": "sales", "userField": "userId",
  "calculationType": "COUNT",
  "filter": { "field": "status", "operator": "==", "value": "closed" },
  "active": true
}
```

**Monto colocado:**
```json
{
  "name": "Monto Colocado", "pointsPerUnit": 0.01,
  "dataSource": "custom_field", "collection": "sales", "userField": "userId",
  "calculationType": "SUM", "fieldToAggregate": "amount",
  "filter": { "field": "status", "operator": "==", "value": "paid" },
  "active": true
}
```

## Recalcular desde Admin Panel

Ligas → botón de calculadora (icono) en la fila de la liga → confirmar. Actualiza `currentPoints`, `salesInSeason`, `currentPosition`, `previousPosition` en `leagueParticipants`.

## Troubleshooting

**"La liga no tiene criterios configurados"**: Verificar que al menos un criterio tenga `active: true`.

**`currentPoints` siempre en 0**: Verificar `active` del criterio, nombre de colección y campo, campo de usuario (`userId` vs `promotorId`), y que hay datos en el rango de fechas de la liga.

**Error al recalcular**: Revisar Firebase Console → Functions → Logs. Causas comunes: nombre de colección incorrecto, campo de usuario inexistente, filtro mal formado.
