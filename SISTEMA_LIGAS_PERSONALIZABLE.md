# Sistema de Ligas Personalizable

## 🎯 Descripción

Sistema completamente personalizable para crear ligas de ventas con criterios y puntuación configurables desde el panel de administración.

## ✨ Características

- **Criterios Personalizables**: Define qué se mide (visitas, ventas, deals, etc.)
- **Puntuación Flexible**: Asigna puntos a cada criterio según su importancia
- **Fuentes de Datos Múltiples**:
  - Visitas desde Firestore
  - Campos personalizados de cualquier colección
  - Entrada manual
- **Cálculos Automáticos**: COUNT, SUM, AVERAGE
- **Filtros Avanzados**: Filtra datos por estado, fechas, etc.
- **Rankings Automáticos**: Actualización automática de posiciones

---

## 📋 Cómo Crear una Liga Personalizable

### Paso 1: Acceder al Admin Panel

1. Ir a **Ligas de Ventas**
2. Click en **Nueva Liga**

### Paso 2: Configuración Básica

```
Nombre: Liga Promotores Zona Norte
Descripción: Competencia mensual de ventas
Icono: 🏆
Color: #16b877
Miembros: [Seleccionar promotores]
Temporada: 1
Fechas: Inicio y Fin de temporada
```

### Paso 3: Configurar Criterios de Puntuación

#### Ejemplo 1: Visitas Realizadas
```
Nombre: Visitas Realizadas
Puntos por Unidad: 10
Fuente de Datos: Visitas (Firestore)
Tipo de Cálculo: Contar registros
Activo: ✅
```

**Resultado**: Por cada visita registrada, el promotor recibe 10 puntos.

#### Ejemplo 2: Ventas Cerradas (Campo Personalizado)
```
Nombre: Ventas Cerradas
Puntos por Unidad: 100
Fuente de Datos: Campo Personalizado
  - Colección: sales
  - Campo Usuario: userId
  - Tipo de Cálculo: Contar registros
  - Filtro:
    - Campo: status
    - Operador: ==
    - Valor: closed
Activo: ✅
```

**Resultado**: Por cada venta cerrada, el promotor recibe 100 puntos.

#### Ejemplo 3: Monto Total Vendido
```
Nombre: Monto Total Vendido
Puntos por Unidad: 0.01
Fuente de Datos: Campo Personalizado
  - Colección: sales
  - Campo Usuario: userId
  - Campo a Sumar: amount
  - Tipo de Cálculo: Sumar valores
  - Filtro:
    - Campo: status
    - Operador: ==
    - Valor: paid
Activo: ✅
```

**Resultado**: Por cada peso vendido, el promotor recibe 0.01 puntos (1 punto por cada $100).

### Paso 4: Configurar Premios (Opcional)

```
Posición 1:
  - Descripción: Bono $5,000 + Trofeo de Oro
  - Monto: 5000

Posición 2:
  - Descripción: Bono $3,000 + Medalla de Plata
  - Monto: 3000

Posición 3:
  - Descripción: Bono $1,500 + Medalla de Bronce
  - Monto: 1500
```

### Paso 5: Activar la Liga

1. Marcar **Liga Activa**: ✅
2. Click en **Crear Liga**

---

## 🔄 Recalcular Puntos

### Método 1: Botón en Admin Panel

1. Ir a **Ligas de Ventas**
2. Localizar la liga
3. Click en el ícono de calculadora (📊)
4. Confirmar

**Esto actualizará:**
- Puntos de todos los participantes
- Rankings y posiciones
- Campo "ventas" visible en la app

### Método 2: Llamada API Manual

```bash
curl -X POST \
  https://us-central1-promotores-aviva-tu-negocio.cloudfunctions.net/updateLeaguePoints \
  -H "Content-Type: application/json" \
  -d '{"leagueId": "ID_DE_LA_LIGA"}'
```

### Método 3: Job Programado (Recomendado)

Para actualizar automáticamente cada hora, agregar en `functions/src/index.ts`:

```typescript
import * as functions from "firebase-functions";

export const scheduleLeaguePointsUpdate = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const activeLeagues = await db.collection('leagues')
      .where('active', '==', true)
      .get();

    for (const league of activeLeagues.docs) {
      // Llamar a updateLeaguePoints para cada liga activa
      await updateLeaguePointsLogic(league.id);
    }
  });
```

---

## 📊 Ejemplos de Configuración

### Liga Simple: Solo Visitas

**Objetivo**: Incentivar visitas a clientes

```
Criterio único:
- Nombre: Visitas Realizadas
- Puntos: 1 punto por visita
- Fuente: Visitas (Firestore)
- Cálculo: COUNT
```

### Liga Compleja: Múltiples Métricas

**Objetivo**: Evaluar rendimiento integral

```
Criterio 1 - Prospección:
- Visitas: 5 puntos c/u

Criterio 2 - Efectividad:
- Llamadas convertidas: 20 puntos c/u
- Filtro: status == "contacted"

Criterio 3 - Cierre:
- Ventas cerradas: 100 puntos c/u
- Filtro: status == "closed"

Criterio 4 - Volumen:
- Monto vendido: 0.01 puntos por peso
- Campo a sumar: amount

Total posible: Variable según desempeño
```

### Liga de Colocación: Solo Monto

**Objetivo**: Medir monto total vendido

```
Criterio único:
- Nombre: Monto Colocado
- Puntos: 1 punto = $1 peso
- Fuente: Campo personalizado
- Colección: sales
- Campo: amount
- Cálculo: SUM
- Filtro: status == "paid"
```

---

## 🏆 Flujo Completo

```
1. Admin crea liga con criterios
   ↓
2. Admin asigna miembros
   ↓
3. Promotores registran actividad
   (visitas, ventas, etc.)
   ↓
4. Admin presiona "Recalcular Puntos"
   ↓
5. Firebase Function calcula puntos
   según criterios configurados
   ↓
6. Se actualiza leagueParticipants
   con puntos y ventas
   ↓
7. Se recalculan rankings
   ↓
8. App Android muestra:
   - Puntos totales
   - Ventas totales
   - Posición en ranking
   - Cambio de posición
```

---

## 🔧 Campos Generados

Cuando se recalculan puntos, se actualiza en `leagueParticipants`:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `currentPoints` | Puntos totales acumulados | 350 pts |
| `salesInSeason` | Total de "ventas" (visitas, deals, etc.) | 25 ventas |
| `currentPosition` | Posición actual en ranking | 3 |
| `previousPosition` | Posición anterior | 5 |

---

## 📱 Vista en App Android

Los promotores verán en `LeaguesFragment`:

```
Liga Promotores Zona Norte 🏆

Tu Posición: #3 ↑ (subiste 2 lugares)
Tus Puntos: 350 pts
Tus Ventas: 25 ventas

═══════════════════════════════════════
Tabla de Posiciones:

#1 🥇 Usuario ByYRSLRM     → 475 pts • 35 ventas
#2 🥈 Usuario F7xPNd7L     → 420 pts • 30 ventas
#3 🥉 TÚ                   → 350 pts • 25 ventas
#4    Usuario 6WVj5TGR    → 280 pts • 20 ventas
═══════════════════════════════════════

Premios:
🥇 1er Lugar: Bono $5,000 + Trofeo de Oro
🥈 2do Lugar: Bono $3,000 + Medalla de Plata
🥉 3er Lugar: Bono $1,500 + Medalla de Bronce
```

---

## ⚙️ Configuración Avanzada

### Filtros por Fecha

Los criterios automáticamente respetan las fechas de la liga (`startDate` - `endDate`).

**Ejemplo**: Si la liga es de Enero 2026, solo contará visitas/ventas de ese período.

### Múltiples Fuentes

Puedes combinar diferentes fuentes en una misma liga:

```
Criterio 1: Visitas (desde colección visits)
Criterio 2: Deals (desde colección sales)
Criterio 3: Llamadas (desde colección calls)
```

### Criterios Manuales

Para criterios que no están en Firestore:

```
Fuente: Manual (sin cálculo)

Nota: Los puntos NO se calcularán automáticamente.
El admin deberá actualizar manualmente los puntos
en la colección leagueParticipants.
```

---

## 🐛 Troubleshooting

### "La liga no tiene criterios configurados"

**Solución**: Agrega al menos un criterio activo antes de recalcular puntos.

### "Puntos siempre en 0"

**Verificar**:
1. ¿Los criterios están marcados como "Activo"?
2. ¿La colección y campos están bien configurados?
3. ¿El campo usuario coincide? (userId, promotorId, etc.)
4. ¿Hay datos en el rango de fechas de la liga?

### "Error al recalcular puntos"

**Logs**: Ver Firebase Console → Functions → Logs

**Común**:
- Nombre de colección incorrecto
- Campo de usuario no existe
- Filtro mal configurado

---

## 🚀 Despliegue

### 1. Compilar Functions

```bash
cd functions
npm install
npm run build
```

### 2. Desplegar a Firebase

```bash
firebase deploy --only functions:updateLeaguePoints
```

### 3. Verificar

Ir a Firebase Console → Functions → Ver lista de funciones desplegadas.

---

## 📚 Recursos

- **Archivo de configuración**: `/admin/src/types/league.ts`
- **Firebase Function**: `/functions/src/index.ts` (línea 1026)
- **Admin Panel**: `/admin/src/pages/Ligas.tsx`
- **App Android**: `/app/src/main/java/.../ui/leagues/`

---

## ✅ Checklist de Implementación

- [x] Definir modelo de criterios personalizables
- [x] Actualizar admin panel con UI de criterios
- [x] Crear Firebase Function `updateLeaguePoints`
- [x] Agregar botón de recalcular en admin
- [x] Compilar functions sin errores
- [ ] Desplegar functions a Firebase
- [ ] Crear primera liga de prueba
- [ ] Configurar criterios
- [ ] Recalcular puntos
- [ ] Verificar en app Android

---

**¡El sistema está listo para usar!** 🎉

Ahora puedes crear ligas completamente personalizadas con los criterios que elijas.
