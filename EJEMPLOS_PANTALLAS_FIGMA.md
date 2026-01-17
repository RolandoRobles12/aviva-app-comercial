# 📱 Ejemplos Visuales de Pantallas para Figma

Este documento complementa la guía principal con ejemplos visuales de cómo deberían verse las pantallas principales de la Mobile App en Figma.

---

## 🏠 HomeFragment

```
┌─────────────────────────────────────┐
│ ☰  Inicio                    🔔 (3) │ <- AppBar verde #16B877
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 👋 Hola, Juan Pérez          │  │
│  │ Promotor - Kiosko Centro     │  │
│  │                              │  │
│  │ 🎯 2 metas activas           │  │
│  │ 🏆 Liga Oro - Posición #3    │  │
│  └───────────────────────────────┘  │
│                                     │
│  Acciones Rápidas                   │
│  ┌─────────┐ ┌─────────┐           │
│  │   ✓     │ │   🏪    │           │
│  │ Check-in│ │ Visita  │           │
│  └─────────┘ └─────────┘           │
│                                     │
│  Actividad Reciente                 │
│  ┌───────────────────────────────┐  │
│  │ 🏪 Visita: Abarrotes "La     │  │
│  │    Esquina"                  │  │
│  │    Hace 2 horas              │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ ✓ Check-in registrado         │  │
│  │   08:30 AM - Kiosko Centro   │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 🎯 Meta "Llamadas Nov" al    │  │
│  │    73% - On Track            │  │
│  └───────────────────────────────┘  │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👤]        │ <- Bottom Nav
│ Home  Dash Check Negoc  Perfil     │
└─────────────────────────────────────┘
```

---

## 📊 DashboardFragment (Gerente)

```
┌─────────────────────────────────────┐
│ ←  Dashboard                  •••   │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Resumen del Día               │  │
│  │ ┌──────┐ ┌──────┐ ┌──────┐   │  │
│  │ │  15  │ │  42  │ │  8   │   │  │
│  │ │Activo│ │Visit.│ │Metas │   │  │
│  │ └──────┘ └──────┘ └──────┘   │  │
│  └───────────────────────────────┘  │
│                                     │
│  🗺️ Mapa del Equipo                │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │     [Mapa con marcadores]     │  │
│  │    📍 📍    📍                │  │
│  │  📍    📍                     │  │
│  │     📍                        │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  Filtros:                           │
│  [Todos ▾] [Hoy ▾] [Producto ▾]    │
│                                     │
│  Vendedores Activos                 │
│  ┌───────────────────────────────┐  │
│  │ [👤] Juan Pérez          🟢   │  │
│  │      8 visitas - Centro       │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ [👤] María García        🟢   │  │
│  │      5 visitas - Norte        │  │
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👤]        │
│ Home  Dash Check Negoc  Perfil     │
└─────────────────────────────────────┘
```

---

## ✅ AttendanceFragment (Check-in)

```
┌─────────────────────────────────────┐
│ ←  Asistencia                       │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │         Estado Actual         │  │
│  │                               │  │
│  │           🕐                  │  │
│  │                               │  │
│  │      Sin registrar            │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  Tu Kiosko Asignado                 │
│  ┌───────────────────────────────┐  │
│  │ 🏪 Kiosko Centro              │  │
│  │ 📍 Av. Juárez #123            │  │
│  │ 📏 Radio: 100m                │  │
│  └───────────────────────────────┘  │
│                                     │
│  Ubicación Actual                   │
│  ┌───────────────────────────────┐  │
│  │ 📍 Detectando ubicación...    │  │
│  └───────────────────────────────┘  │
│                                     │
│         ┌───────────────┐           │
│         │  CHECK-IN     │           │
│         └───────────────┘           │
│                                     │
│  Historial de Hoy                   │
│  ┌───────────────────────────────┐  │
│  │ No hay registros aún          │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Ver historial completo]           │
│                                     │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👤]        │
│ Home  Dash Check Negoc  Perfil     │
└─────────────────────────────────────┘
```

### Check-in Exitoso

```
┌─────────────────────────────────────┐
│ ←  Asistencia                       │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │         Estado Actual         │  │
│  │                               │  │
│  │           ✓                   │  │
│  │                               │  │
│  │      Registrado               │  │
│  │      08:30 AM                 │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  Tu Kiosko Asignado                 │
│  ┌───────────────────────────────┐  │
│  │ 🏪 Kiosko Centro              │  │
│  │ 📍 Av. Juárez #123            │  │
│  │ ✓ Ubicación verificada        │  │
│  └───────────────────────────────┘  │
│                                     │
│  Resumen de Hoy                     │
│  ┌───────────────────────────────┐  │
│  │ Entrada: 08:30 AM             │  │
│  │ Tiempo transcurrido: 2h 15m   │  │
│  └───────────────────────────────┘  │
│                                     │
│         ┌───────────────┐           │
│         │  CHECK-OUT    │           │
│         └───────────────┘           │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👤]        │
│ Home  Dash Check Negoc  Perfil     │
└─────────────────────────────────────┘
```

---

## 🏪 AvivaTuNegocioFragment

```
┌─────────────────────────────────────┐
│ ←  Aviva Tu Negocio          🔍     │
├─────────────────────────────────────┤
│                                     │
│  Filtros: [Todas ▾] [Hoy ▾]        │
│                                     │
│  Mis Visitas (23)                   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🏪 Abarrotes "La Esquina"    │  │
│  │ Giro: Abarrotes               │  │
│  │ ─────────────────────────────│  │
│  │ 📍 Calle 5 de Mayo #45       │  │
│  │ 📞 555-1234                   │  │
│  │ ─────────────────────────────│  │
│  │ Probabilidad: Alta 🟢         │  │
│  │ Distancia: 2.3 km            │  │
│  │                               │  │
│  │ [Ver más] [Navegar]           │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🏪 Ferretería "El Martillo"  │  │
│  │ Giro: Ferretería              │  │
│  │ ─────────────────────────────│  │
│  │ 📍 Av. Reforma #123          │  │
│  │ 📞 555-5678                   │  │
│  │ ─────────────────────────────│  │
│  │ Probabilidad: Media 🟡        │  │
│  │ Distancia: 5.1 km            │  │
│  │                               │  │
│  │ [Ver más] [Navegar]           │  │
│  └───────────────────────────────┘  │
│                                     │
│                      ┌────┐         │
│                      │ +  │ <- FAB  │
│                      └────┘         │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👤]        │
│ Home  Dash Check Negoc  Perfil     │
└─────────────────────────────────────┘
```

---

## 📝 RegistroFragment (Nueva Visita)

```
┌─────────────────────────────────────┐
│ ✕  Nueva Visita              [💾]  │
├─────────────────────────────────────┤
│                                     │
│  Información del Negocio            │
│                                     │
│  Nombre del negocio *               │
│  ┌─────────────────────────────┐   │
│  │ Abarrotes "La Esquina"      │   │
│  └─────────────────────────────┘   │
│                                     │
│  Giro comercial *                   │
│  ┌─────────────────────────────┐   │
│  │ Abarrotes                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Contacto                           │
│                                     │
│  Teléfono                           │
│  ┌─────────────────────────────┐   │
│  │ 555-1234                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  Email                              │
│  ┌─────────────────────────────┐   │
│  │ contacto@ejemplo.com        │   │
│  └─────────────────────────────┘   │
│                                     │
│  Ubicación                          │
│  ┌─────────────────────────────┐   │
│  │ 📍 Usar ubicación actual    │   │
│  └─────────────────────────────┘   │
│                                     │
│  Evidencia                          │
│  ┌───────┐ ┌───────┐               │
│  │ 📷    │ │       │               │
│  │ Tomar │ │Galería│               │
│  └───────┘ └───────┘               │
│                                     │
│  Notas                              │
│  ┌─────────────────────────────┐   │
│  │ Interesado en crédito para  │   │
│  │ ampliar negocio...          │   │
│  └─────────────────────────────┘   │
│                                     │
│  Probabilidad de éxito              │
│  ┌─────────────────────────────┐   │
│  │ [○ Baja] [○ Media] [● Alta] │   │
│  └─────────────────────────────┘   │
│                                     │
│         ┌────────────────┐          │
│         │ GUARDAR VISITA │          │
│         └────────────────┘          │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎯 CommercialGoalsFragment

```
┌─────────────────────────────────────┐
│ ←  Metas Comerciales          🔄    │
├─────────────────────────────────────┤
│                                     │
│  Metas Activas (3)                  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🎯 Meta de Llamadas           │  │
│  │    Noviembre 2026             │  │
│  │ ─────────────────────────────│  │
│  │ Objetivo: 100 llamadas        │  │
│  │ Actual: 73 llamadas           │  │
│  │                               │  │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 73%         │  │
│  │                               │  │
│  │ Estado: On Track 🟢           │  │
│  │ Días restantes: 12            │  │
│  │                               │  │
│  │          [Ver detalles]       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🎯 Meta de Colocación         │  │
│  │    Noviembre 2026             │  │
│  │ ─────────────────────────────│  │
│  │ Objetivo: 20 créditos         │  │
│  │ Actual: 9 créditos            │  │
│  │                               │  │
│  │ ▓▓▓▓▓░░░░░░░░░░░ 45%         │  │
│  │                               │  │
│  │ Estado: Behind 🟡             │  │
│  │ Días restantes: 12            │  │
│  │                               │  │
│  │          [Ver detalles]       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🎯 Meta de Prospección        │  │
│  │    Noviembre 2026             │  │
│  │ ─────────────────────────────│  │
│  │ Objetivo: 50 visitas          │  │
│  │ Actual: 48 visitas            │  │
│  │                               │  │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░ 96%         │  │
│  │                               │  │
│  │ Estado: Ahead 🟢              │  │
│  │ Días restantes: 12            │  │
│  │                               │  │
│  │          [Ver detalles]       │  │
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👤]        │
│ Home  Dash Check Negoc  Perfil     │
└─────────────────────────────────────┘
```

---

## 🏆 LeaguesFragment

```
┌─────────────────────────────────────┐
│ ←  Mis Ligas                        │
├─────────────────────────────────────┤
│                                     │
│  Ligas Activas (2)                  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🏆 Liga Oro                   │  │
│  │ Temporada 3                   │  │
│  │ ─────────────────────────────│  │
│  │ Tu Posición: #3               │  │
│  │ Puntos: 1,245 pts             │  │
│  │                               │  │
│  │ 📊 Top 3 ascienden            │  │
│  │ 📉 Bottom 2 descienden        │  │
│  │                               │  │
│  │ 👥 12 participantes           │  │
│  │ 📅 21 Nov - 20 Dic            │  │
│  │                               │  │
│  │ [Ver tabla] [Detalles]        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🥈 Liga Plata                 │  │
│  │ Temporada 2                   │  │
│  │ ─────────────────────────────│  │
│  │ Tu Posición: #1 🥇            │  │
│  │ Puntos: 890 pts               │  │
│  │                               │  │
│  │ 📊 Lider de la liga           │  │
│  │ 🎁 Premio: $500               │  │
│  │                               │  │
│  │ 👥 10 participantes           │  │
│  │ 📅 Finaliza en 5 días         │  │
│  │                               │  │
│  │ [Ver tabla] [Detalles]        │  │
│  └───────────────────────────────┘  │
│                                     │
│  Historial de Ligas                 │
│  [Ver ligas anteriores]             │
│                                     │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👤]        │
│ Home  Dash Check Negoc  Perfil     │
└─────────────────────────────────────┘
```

### Tabla de Posiciones de Liga

```
┌─────────────────────────────────────┐
│ ←  Liga Oro - Tabla           [i]   │
├─────────────────────────────────────┤
│                                     │
│  🏆 Liga Oro - Temporada 3          │
│  📅 21 Nov - 20 Dic 2026            │
│                                     │
│  ─────────────────────────────────  │
│  Posiciones                         │
│  ─────────────────────────────────  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ #1  👤 Juan Pérez        🥇  │  │
│  │     1,500 pts                 │  │
│  │     ↑ +2                      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ #2  👤 María García      🥈  │  │
│  │     1,380 pts                 │  │
│  │     → 0                       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │ <- Posición actual
│  │ #3  👤 TÚ                🥉  │  │
│  │     1,245 pts                 │  │
│  │     ↓ -1                      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ #4  👤 Carlos López           │  │
│  │     1,100 pts                 │  │
│  │     ↑ +1                      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ #5  👤 Ana Martínez           │  │
│  │     980 pts                   │  │
│  │     → 0                       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ... 7 más                          │
│                                     │
│  ─────────────────────────────────  │
│  📊 Top 3 ascienden a Liga Oro Plus│
│  📉 Bottom 2 descienden a Liga Plata│
│  ─────────────────────────────────  │
│                                     │
│         [Ver premios]               │
│                                     │
└─────────────────────────────────────┘
```

---

## 📈 MetricsFragment

```
┌─────────────────────────────────────┐
│ ←  Mis Métricas              [📊]   │
├─────────────────────────────────────┤
│                                     │
│  Período: [Esta semana ▾]           │
│                                     │
│  Resumen General                    │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│  │ 42 │ │ 15 │ │ 8  │ │73% │       │
│  │Vis.│ │Llam│ │Colo│ │Éxito│      │
│  └────┘ └────┘ └────┘ └────┘       │
│                                     │
│  Visitas por Día                    │
│  ┌───────────────────────────────┐  │
│  │        📊                     │  │
│  │     ▄                         │  │
│  │    ▄█▄   ▄                    │  │
│  │   ▄███▄ ▄█ ▄                  │  │
│  │  ▄█████▄██▄█                  │  │
│  │ ───────────────────           │  │
│  │ L M M J V S D                 │  │
│  └───────────────────────────────┘  │
│                                     │
│  Conversión                         │
│  ┌───────────────────────────────┐  │
│  │ Prospección → Llamada         │  │
│  │ ▓▓▓▓▓▓░░░░░░ 52%              │  │
│  │                               │  │
│  │ Llamada → Colocación          │  │
│  │ ▓▓▓░░░░░░░░░ 23%              │  │
│  │                               │  │
│  │ Tasa de Éxito General         │  │
│  │ ▓▓▓▓▓▓▓▓░░░░ 73%              │  │
│  └───────────────────────────────┘  │
│                                     │
│  Comparación con Equipo             │
│  ┌───────────────────────────────┐  │
│  │ Tu rendimiento vs promedio:   │  │
│  │                               │  │
│  │ Visitas:      +12% ↑          │  │
│  │ Llamadas:     +5% ↑           │  │
│  │ Colocación:   -3% ↓           │  │
│  │ Tasa éxito:   +8% ↑           │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Ver reporte completo]             │
│                                     │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👤]        │
│ Home  Dash Check Negoc  Perfil     │
└─────────────────────────────────────┘
```

---

## 🎖️ BadgesFragment

```
┌─────────────────────────────────────┐
│ ←  Badges y Logros                  │
├─────────────────────────────────────┤
│                                     │
│  Tus Badges (12 de 24)              │
│                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │  🎖️   │ │  🏆    │ │  ⭐    │  │
│  │        │ │        │ │        │  │
│  │Vendedor│ │  Top   │ │Primera │  │
│  │Estrella│ │  10    │ │  Venta │  │
│  │        │ │        │ │        │  │
│  │Nivel 5 │ │Nivel 3 │ │Nivel 1 │  │
│  └────────┘ └────────┘ └────────┘  │
│                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │  🚀    │ │  💯    │ │  📈    │  │
│  │        │ │        │ │        │  │
│  │Rápido  │ │Perfect │ │ Creci- │  │
│  │y Fuerte│ │ Month  │ │ miento │  │
│  │        │ │        │ │        │  │
│  │Nivel 2 │ │Nivel 1 │ │Nivel 4 │  │
│  └────────┘ └────────┘ └────────┘  │
│                                     │
│  En Progreso (3)                    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🎯 Maestro de Metas           │  │
│  │ Completa 10 metas seguidas    │  │
│  │ ▓▓▓▓▓▓▓░░░░░ 7/10             │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🏆 Campeón de Liga            │  │
│  │ Gana 3 ligas consecutivas     │  │
│  │ ▓▓▓▓░░░░░░░░ 2/3              │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 📞 Comunicador Experto        │  │
│  │ Realiza 500 llamadas          │  │
│  │ ▓▓▓▓▓▓▓▓▓▓░░ 432/500          │  │
│  └───────────────────────────────┘  │
│                                     │
│  Bloqueados (9)                     │
│  [Ver todos los badges]             │
│                                     │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👤]        │
│ Home  Dash Check Negoc  Perfil     │
└─────────────────────────────────────┘
```

---

## 👤 ProfileFragment

```
┌─────────────────────────────────────┐
│ ☰  Mi Perfil                  [⚙️]  │
├─────────────────────────────────────┤
│                                     │
│         ┌──────────┐                │
│         │   👤    │                │
│         │  Foto   │                │
│         └──────────┘                │
│                                     │
│      Juan Pérez García              │
│      Promotor Aviva Tu Negocio      │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Información Personal               │
│  ┌───────────────────────────────┐  │
│  │ 📧 juan.perez@avivacredito...│  │
│  │ 📞 555-1234                   │  │
│  │ 🏪 Kiosko: Centro             │  │
│  │ 📅 Ingreso: 15 Ene 2024       │  │
│  └───────────────────────────────┘  │
│                                     │
│  Estadísticas Generales             │
│  ┌───────────────────────────────┐  │
│  │ 🏆 Badges: 12/24              │  │
│  │ 🎯 Metas completadas: 18      │  │
│  │ 📈 Ligas ganadas: 2           │  │
│  │ ⭐ Nivel: Vendedor Estrella 5 │  │
│  └───────────────────────────────┘  │
│                                     │
│  Opciones                           │
│  ┌───────────────────────────────┐  │
│  │ 💼 Mi Carrera                 │→ │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 🎖️ Mis Badges                 │→ │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 📊 Mis Métricas               │→ │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ ⚙️ Configuración               │→ │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 🚪 Cerrar Sesión              │→ │
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👤]        │
│ Home  Dash Check Negoc  Perfil     │
└─────────────────────────────────────┘
```

---

## 🆘 HelpAssistantFragment (Chat)

```
┌─────────────────────────────────────┐
│ ←  Asistente de Ayuda               │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🤖 Hola! Soy tu asistente    │  │ <- Bot
│  │    Aviva. ¿En qué puedo      │  │
│  │    ayudarte hoy?              │  │
│  │                      09:30 AM │  │
│  └───────────────────────────────┘  │
│                                     │
│              ┌─────────────────────┐│
│              │ ¿Cómo solicito      ││ <- Usuario
│              │ tiempo libre?       ││
│              │            09:32 AM ││
│              └─────────────────────┘│
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🤖 Para solicitar tiempo     │  │ <- Bot
│  │    libre, sigue estos pasos: │  │
│  │                               │  │
│  │    1. Ve al menú "Trámites"  │  │
│  │    2. Selecciona "Tiempo     │  │
│  │       Libre"                  │  │
│  │    3. Llena el formulario     │  │
│  │       con las fechas          │  │
│  │    4. Envía tu solicitud      │  │
│  │                               │  │
│  │    Tu gerente recibirá una   │  │
│  │    notificación y podrá      │  │
│  │    aprobar o rechazar.       │  │
│  │                               │  │
│  │    ¿Necesitas ayuda con      │  │
│  │    algo más?                  │  │
│  │                      09:32 AM │  │
│  └───────────────────────────────┘  │
│                                     │
│              ┌─────────────────────┐│
│              │ Gracias!            ││
│              │            09:35 AM ││
│              └─────────────────────┘│
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🤖 De nada! Estoy aquí para  │  │
│  │    ayudarte cuando me         │  │
│  │    necesites. 😊              │  │
│  │                      09:35 AM │  │
│  └───────────────────────────────┘  │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────┐ [↑]│
│ │ Escribe un mensaje...       │    │
│ └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## 🔔 NotificationsFragment

```
┌─────────────────────────────────────┐
│ ←  Notificaciones           [✓ Todo]│
├─────────────────────────────────────┤
│                                     │
│  Hoy (5)                            │
│                                     │
│  ┌───────────────────────────────┐  │
│  │🔴 Nueva meta asignada         │  │ <- No leída
│  │   Se te asignó la meta        │  │
│  │   "Llamadas Noviembre"        │  │
│  │   Hace 2 horas                │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  🏆 Actualización de liga     │  │ <- Leída
│  │   Subiste al puesto #3 en     │  │
│  │   Liga Oro                    │  │
│  │   Hace 5 horas                │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │🔴 Recordatorio                │  │
│  │   No olvides hacer check-out  │  │
│  │   al finalizar tu jornada     │  │
│  │   Hace 6 horas                │  │
│  └───────────────────────────────┘  │
│                                     │
│  Ayer (3)                           │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  🎖️ Nuevo badge desbloqueado │  │
│  │   Conseguiste el badge        │  │
│  │   "Vendedor Estrella 5"       │  │
│  │   Ayer, 18:30                 │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  📊 Meta completada           │  │
│  │   Felicidades! Completaste    │  │
│  │   "Meta de Prospección Oct"   │  │
│  │   Ayer, 14:20                 │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Ver anteriores]                   │
│                                     │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👤]        │
│ Home  Dash Check Negoc  Perfil     │
└─────────────────────────────────────┘
```

---

## 👨‍💼 AdminFragment

```
┌─────────────────────────────────────┐
│ ☰  Panel de Administración          │
├─────────────────────────────────────┤
│                                     │
│  Gestión                            │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 👥 Usuarios                   │→ │
│  │ Gestionar usuarios del sistema│  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🏪 Kioscos                    │→ │
│  │ Administrar ubicaciones       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 📦 Productos                  │→ │
│  │ Catálogo de productos         │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🏙️ Ciudades                   │→ │
│  │ Gestionar ciudades            │  │
│  └───────────────────────────────┘  │
│                                     │
│  Reportes y Métricas                │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 📊 Métricas HubSpot           │→ │
│  │ Análisis de CRM               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ ✓ Asistencia del Equipo       │→ │
│  │ Reportes de asistencia        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🏪 Visitas del Equipo         │→ │
│  │ Administrar visitas           │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 💰 Metas y Bonos              │→ │
│  │ Configurar bonificaciones     │  │
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│ [🏠]  [📊]  [✓]  [🏪]  [👨‍💼]       │
│ Home  Dash Check Negoc  Admin      │
└─────────────────────────────────────┘
```

---

## 📱 Dialogs y Componentes Especiales

### Alert Dialog (Ubicación fuera de rango)

```
┌──────────────────────────────┐
│  ⚠️  Fuera de ubicación     │
│                              │
│  No estás en el área del     │
│  kiosko asignado. La         │
│  distancia al kiosko es de   │
│  523 metros.                 │
│                              │
│  ¿Deseas continuar de todos  │
│  modos?                      │
│                              │
│                              │
│    [CANCELAR]  [CONTINUAR]   │
└──────────────────────────────┘
```

### Success Dialog

```
┌──────────────────────────────┐
│                              │
│           ✓                  │
│                              │
│     Visita guardada          │
│     exitosamente             │
│                              │
│                              │
│        [ACEPTAR]             │
└──────────────────────────────┘
```

### Loading Overlay

```
┌──────────────────────────────┐
│                              │
│         ⟳                    │
│                              │
│    Guardando visita...       │
│                              │
└──────────────────────────────┘
```

### Bottom Sheet (Opciones de Prospecto)

```
┌──────────────────────────────┐
│        ═══                   │ <- Handle
│                              │
│  Opciones de Prospecto       │
│                              │
│  ┌────────────────────────┐  │
│  │ 📞 Llamar al prospecto │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ 🗺️  Navegar al negocio │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ ✏️  Editar información │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ 🗑️  Eliminar prospecto │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### Snackbar (Notificación temporal)

```




┌─────────────────────────────────┐
│ ✓ Visita registrada             │
└─────────────────────────────────┘
 ^^ Aparece desde abajo del Bottom Nav
```

---

## 🎨 Estados de Componentes

### Empty State (Sin datos)

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│           🏆                        │
│                                     │
│     No estás en una liga            │
│                                     │
│     Completa más ventas para        │
│     unirte a una liga               │
│                                     │
│      [Ver metas disponibles]        │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### Loading State (Skeleton)

```
┌─────────────────────────────────────┐
│  ▒▒▒▒▒▒▒▒▒▒▒                        │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒              │  │
│  │ ▒▒▒▒▒▒▒▒▒                     │  │
│  │ ─────────────────────────────│  │
│  │ ▒▒▒▒▒▒▒▒▒▒                    │  │
│  │ ▒▒▒▒▒▒▒▒                      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒              │  │
│  │ ▒▒▒▒▒▒▒▒▒                     │  │
│  │ ─────────────────────────────│  │
│  │ ▒▒▒▒▒▒▒▒▒▒                    │  │
│  │ ▒▒▒▒▒▒▒▒                      │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Error State

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│           ⚠️                        │
│                                     │
│     Error al cargar datos           │
│                                     │
│     Verifica tu conexión a internet │
│     y vuelve a intentar             │
│                                     │
│         [REINTENTAR]                │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

---

## 📐 Medidas y Especificaciones

### Dimensiones Estándar

```
Frame de Android: 360 x 800 dp

AppBar:
- Altura: 56dp
- Padding horizontal: 16dp
- Título: Roboto Medium 20sp

Bottom Navigation:
- Altura: 56dp
- Ícono: 24dp
- Label: Roboto Medium 12sp
- Padding: 8dp

Card:
- Padding: 16dp
- Radius: 12dp
- Elevation: 1dp
- Margin: 8dp (horizontal), 4dp (vertical)

Button:
- Altura: 40dp
- Min width: 88dp
- Padding horizontal: 16dp
- Radius: 20dp
- Texto: Roboto Medium 14sp

TextField:
- Altura: 56dp
- Padding: 16dp
- Radius: 4dp
- Label: Roboto Regular 12sp
- Input: Roboto Regular 16sp

FAB:
- Tamaño: 56dp circular
- Ícono: 24dp
- Position: 16dp from bottom/right

List Item:
- Altura mínima: 48dp
- Single line: 48dp
- Two lines: 64dp
- Three lines: 88dp
- Padding: 16dp

Avatar:
- Tamaño estándar: 40dp
- Tamaño grande: 64dp
- Tamaño pequeño: 24dp
```

---

## ✅ Checklist Visual por Pantalla

Usa esto para verificar que incluiste todos los elementos:

### HomeFragment
- [ ] AppBar con título "Inicio" y notificaciones
- [ ] Card de resumen del usuario con foto/avatar
- [ ] 4-6 accesos rápidos (grid 2x2 o 2x3)
- [ ] Sección "Actividad Reciente" con 3-5 items
- [ ] Bottom Navigation con 5 ítems
- [ ] FAB opcional para acción principal

### DashboardFragment (Gerente)
- [ ] AppBar con filtros
- [ ] 3-4 cards de estadísticas generales
- [ ] Mapa del equipo (placeholder o mockup)
- [ ] Lista de vendedores activos con avatares
- [ ] Toggle de tiempo real
- [ ] Bottom Navigation

### AttendanceFragment
- [ ] AppBar simple
- [ ] Card grande de estado actual (con hora si ya registró)
- [ ] Card de kiosko asignado con ubicación
- [ ] Botón grande CHECK-IN o CHECK-OUT
- [ ] Sección de historial (collapsible)
- [ ] Bottom Navigation

### AvivaTuNegocioFragment
- [ ] AppBar con búsqueda
- [ ] Filtros (chips o dropdowns)
- [ ] Lista de cards de visitas (3-5 visibles)
- [ ] Cada card con: icono, nombre, giro, ubicación, probabilidad
- [ ] FAB para nueva visita
- [ ] Bottom Navigation

### CommercialGoalsFragment
- [ ] AppBar con refresh
- [ ] Lista de cards de metas (2-4 metas)
- [ ] Cada meta con: título, progreso bar, porcentaje, estado
- [ ] Indicador de días restantes
- [ ] Botón "Ver detalles" en cada meta
- [ ] Bottom Navigation

### LeaguesFragment
- [ ] AppBar simple
- [ ] Cards de ligas activas (1-3)
- [ ] Cada liga con: ícono, nombre, posición, puntos
- [ ] Indicadores de ascenso/descenso
- [ ] Botones de acción (Ver tabla, Detalles)
- [ ] Bottom Navigation

---

¡Usa estos ejemplos visuales como referencia al diseñar en Figma! Recuerda mantener la consistencia con el sistema de diseño Material Design 3 y los colores de la marca Aviva.
