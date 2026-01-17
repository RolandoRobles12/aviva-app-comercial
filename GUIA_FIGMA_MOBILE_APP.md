# 🎨 Guía para Replicar Mobile App Aviva en Figma

## 📋 Tabla de Contenidos
1. [Configuración Inicial](#1-configuración-inicial)
2. [Sistema de Diseño](#2-sistema-de-diseño)
3. [Estructura de Pantallas](#3-estructura-de-pantallas)
4. [Componentes Principales](#4-componentes-principales)
5. [Flujos de Usuario](#5-flujos-de-usuario)
6. [Prototipado Interactivo](#6-prototipado-interactivo)
7. [Recursos y Referencias](#7-recursos-y-referencias)

---

## 1. Configuración Inicial

### 1.1 Crear Proyecto en Figma

1. **Crear nuevo archivo**: "Aviva App Comercial - Mobile"
2. **Configurar frames de dispositivo**:
   - Android: 360 x 800 dp (pantalla estándar)
   - Usar frame "Android - Default" de Figma
3. **Organizar páginas**:
   - 📱 **Design System** (componentes, colores, tipografía)
   - 🏠 **Screens** (todas las pantallas)
   - 🔄 **Flows** (diagramas de flujo)
   - 🎯 **Prototypes** (versión interactiva)

### 1.2 Plugins Recomendados de Figma

- **Material Design 3 Plugin**: Para componentes M3
- **Iconify**: Para iconos Material (usa Material Symbols)
- **Auto Layout**: Para layouts responsivos
- **Content Reel**: Para datos de prueba
- **FigJam**: Para diagramas de flujo

---

## 2. Sistema de Diseño

### 2.1 Paleta de Colores (Brand Aviva)

```
🎨 COLORES PRINCIPALES

Primary (Verde Aviva)
├─ #16B877    primary (verde principal)
├─ #074739    primary_dark (verde oscuro)
├─ #B0F5CD    primary_light (verde claro)
└─ #FFFFFF    on_primary (texto sobre verde)

Secondary
├─ #026149    secondary (verde medio)
├─ #074739    secondary_dark
├─ #16B877    secondary_light
└─ #B0F5CD    secondary_container

Superficies
├─ #FFFFFF    surface (fondo de tarjetas)
├─ #F0F5FA    surface_variant (fondo alternativo)
├─ #074739    on_surface (texto principal)
└─ #026149    on_surface_variant (texto secundario)

Background
├─ #F0F5FA    background (fondo general de la app)
└─ #074739    on_background (texto sobre fondo)

Estados y Alertas
├─ #16B877    success (éxito)
├─ #B0F5CD    success_background
├─ #F59E0B    warning (advertencia)
├─ #FFFBEB    warning_background
├─ #EF4444    error (error)
└─ #FEF2F2    error_background

Grises y Neutrales
├─ #6B7280    gray (texto terciario)
├─ #000000    black
└─ #FFFFFF    white

Chat Específico
├─ #009768    aviva_green (mensajes del usuario)
├─ #E8F6EC    aviva_green_light (mensajes del bot)
└─ #6B7280    chat_text_secondary
```

### 2.2 Tipografía

**Familia**: Roboto (por defecto en Material Design 3)

```
📝 JERARQUÍA TIPOGRÁFICA

Display Large
├─ Roboto Regular 57sp
└─ Uso: Títulos principales en onboarding

Headline Large
├─ Roboto Regular 32sp
└─ Uso: Títulos de pantalla principales

Headline Medium
├─ Roboto Regular 28sp
└─ Uso: Títulos de secciones

Headline Small
├─ Roboto Regular 24sp
└─ Uso: Subtítulos importantes

Title Large
├─ Roboto Medium 22sp
└─ Uso: Títulos de AppBar

Title Medium
├─ Roboto Medium 16sp
└─ Uso: Títulos de cards, listas

Title Small
├─ Roboto Medium 14sp
└─ Uso: Subtítulos en cards

Body Large
├─ Roboto Regular 16sp
└─ Uso: Texto principal en contenido

Body Medium
├─ Roboto Regular 14sp
└─ Uso: Texto de párrafos

Body Small
├─ Roboto Regular 12sp
└─ Uso: Texto de ayuda, metadatos

Label Large
├─ Roboto Medium 14sp
└─ Uso: Botones principales

Label Medium
├─ Roboto Medium 12sp
└─ Uso: Chips, badges

Label Small
├─ Roboto Medium 11sp
└─ Uso: Labels pequeños, timestamps
```

### 2.3 Espaciado (Material Design Grid)

```
📏 SISTEMA DE ESPACIADO

Base: 8dp grid system

Tamaños comunes:
├─ 4dp   (espaciado mínimo)
├─ 8dp   (espaciado pequeño)
├─ 12dp  (espaciado medio-pequeño)
├─ 16dp  (espaciado estándar) ⭐ más usado
├─ 24dp  (espaciado grande)
├─ 32dp  (espaciado extra-grande)
└─ 48dp  (separación de secciones)

Márgenes de pantalla:
├─ Horizontal: 16dp
└─ Vertical: 16dp

Altura de componentes:
├─ AppBar: 56dp
├─ Bottom Navigation: 56dp
├─ FAB (Floating Action Button): 56dp
├─ List Item: 48-72dp
├─ Button: 40dp
└─ TextField: 56dp
```

### 2.4 Elevaciones (Shadows)

```
🎭 ELEVACIONES MATERIAL DESIGN 3

Level 0: 0dp - Sin sombra (fondo de app)
Level 1: 1dp - Cards, bottom sheets en reposo
Level 2: 3dp - FAB en reposo, botones elevados
Level 3: 6dp - Cards elevados, menús
Level 4: 8dp - Modals, diálogos
Level 5: 12dp - Navigation drawer
```

### 2.5 Iconografía

**Familia**: Material Symbols (Outlined)
**Tamaño**: 24dp estándar

Iconos principales de la app:
```
🏠 home - Inicio
📊 dashboard - Dashboard
✓  check_circle - Asistencia
🏪 storefront - Aviva Tu Negocio
🎯 flag - Metas Comerciales
🏆 emoji_events - Ligas
📈 trending_up - Métricas
🎖️ military_tech - Badges
👤 person - Perfil
🔔 notifications - Notificaciones
👨‍💼 admin_panel_settings - Admin
🆘 help - Ayuda
📋 description - Trámites
```

---

## 3. Estructura de Pantallas

### 3.1 Arquitectura de Navegación

```
┌─────────────────────────────────────┐
│         MainActivity                │
│    (Bottom Navigation + AppBar)     │
└─────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌─────────┐  ┌─────────┐
│ Home   │  │Dashboard│  │ Profile │
└────────┘  └─────────┘  └─────────┘
    │            │            │
    ├─ Quick Actions       │
    ├─ News Feed           ├─ Mi Carrera
    └─ Stats Summary       ├─ Badges
                           └─ Settings
```

### 3.2 Pantallas Principales (54 pantallas totales)

#### 🔐 Autenticación (1 pantalla)
1. **LoginActivity**: Login con Google (@avivacredito.com)

#### 🏠 Home (3 pantallas)
2. **HomeFragment**: Dashboard inicial con accesos rápidos
3. **NotificationsFragment**: Centro de notificaciones
4. **ProfileFragment**: Perfil del usuario

#### 📊 Dashboard (2 pantallas)
5. **DashboardFragment**: Métricas en tiempo real
6. **TeamMapView** (solo gerentes): Mapa del equipo en vivo

#### ✅ Asistencia (4 pantallas)
7. **AttendanceFragment**: Check-in/Check-out
8. **AttendanceHistoryView**: Historial de asistencia
9. **AttendanceStatsView**: Estadísticas de asistencia
10. **LocationAlertDialog**: Alerta si está fuera del kiosko

#### 🏪 Aviva Tu Negocio (6 pantallas)
11. **AvivaTuNegocioFragment**: Lista de visitas
12. **RegistroFragment**: Formulario de nueva visita
13. **VisitDetailsDialog**: Detalles de visita
14. **ProspectosListDialog**: Lista de prospectos
15. **ProspectoOptionsDialog**: Opciones de prospecto
16. **StreetViewDialog**: Vista de Street View

#### 🎯 Metas Comerciales (3 pantallas)
17. **CommercialGoalsFragment**: Lista de metas asignadas
18. **GoalDetailsView**: Detalles de meta con progreso
19. **GoalProgressChart**: Gráfica de progreso

#### 🏆 Ligas (4 pantallas)
20. **LeaguesFragment**: Lista de ligas activas
21. **LeagueDetailsView**: Detalles de liga
22. **LeagueRankingView**: Tabla de posiciones
23. **LeaguePrizesView**: Premios disponibles

#### 📈 Métricas (3 pantallas)
24. **MetricsFragment**: Dashboard de métricas personales
25. **MetricsChartsView**: Gráficas de rendimiento
26. **ComparativeMetricsView**: Comparación con equipo

#### 🎖️ Badges & Logros (3 pantallas)
27. **BadgesFragment**: Badges conseguidos
28. **BadgeDetailsDialog**: Detalles de badge
29. **AchievementsView**: Logros desbloqueados

#### 👤 Perfil & Carrera (5 pantallas)
30. **ProfileFragment**: Perfil personal
31. **CareerFragment**: Desarrollo profesional
32. **MiCarreraFragment**: Mi trayectoria en Aviva
33. **CertificationsView**: Certificaciones obtenidas
34. **CareerLevelView**: Nivel de carrera actual

#### 🆘 Ayuda & Trámites (4 pantallas)
35. **HelpAssistantFragment**: Chat con IA
36. **TramitesFragment**: Solicitudes administrativas
37. **TimeOffRequestForm**: Solicitud de tiempo libre
38. **TramitesHistoryView**: Historial de solicitudes

#### 🔔 Notificaciones (2 pantallas)
39. **NotificationsFragment**: Lista de notificaciones
40. **NotificationDetailsDialog**: Detalles de notificación

#### 👨‍💼 Admin Panel (Solo Admins) (14 pantallas)
41. **AdminFragment**: Panel principal de admin
42. **UsersAdminFragment**: Gestión de usuarios
43. **UserFormDialog**: Formulario de usuario
44. **KiosksAdminFragment**: Gestión de kioscos
45. **KioskFormDialog**: Formulario de kiosko
46. **ProductsAdminFragment**: Gestión de productos
47. **ProductFormDialog**: Formulario de producto
48. **CitiesAdminFragment**: Gestión de ciudades
49. **CityFormDialog**: Formulario de ciudad
50. **HubSpotMetricsFragment**: Métricas de HubSpot
51. **AttendanceAdminFragment**: Asistencia del equipo
52. **VisitsAdminFragment**: Administración de visitas
53. **MetasBonoFragment**: Configuración de bonos
54. **ScorecardFragment**: Scorecard del equipo

---

## 4. Componentes Principales

### 4.1 Componentes de Navegación

#### Bottom Navigation Bar (Principal)
```
┌──────────────────────────────────────┐
│  [🏠]    [📊]    [✓]    [🏪]    [👤] │
│  Home   Dash   Check  Negocio  Perfil│
└──────────────────────────────────────┘

Especificaciones:
- Altura: 56dp
- 5 ítems máximo
- Color activo: #16B877 (primary)
- Color inactivo: #6B7280 (gray)
- Elevation: Level 3
- Iconos: 24dp
- Label: Roboto Medium 12sp
```

#### Top App Bar
```
┌──────────────────────────────────────┐
│ [←]  Título de Pantalla      [•••]   │
└──────────────────────────────────────┘

Especificaciones:
- Altura: 56dp
- Background: #16B877 (primary)
- Texto: #FFFFFF (on_primary)
- Título: Roboto Medium 20sp
- Iconos: 24dp
- Elevation: Level 2
```

### 4.2 Componentes de Contenido

#### Card de Visita
```
┌────────────────────────────────────┐
│ 🏪 Nombre del Negocio              │
│ Giro Comercial: Abarrotes          │
│ ---------------------------------- │
│ 📍 Calle 123, Col. Centro          │
│ 📞 555-1234                        │
│ ---------------------------------- │
│ Probabilidad: Alta  🟢             │
│ Distancia: 2.3 km                  │
│                                    │
│          [Ver más] [Navegar]       │
└────────────────────────────────────┘

Especificaciones:
- Padding: 16dp
- Radius: 12dp
- Elevation: Level 1
- Margin: 8dp horizontal, 4dp vertical
```

#### Card de Meta Comercial
```
┌────────────────────────────────────┐
│ 🎯 Meta de Llamadas - Noviembre    │
│ ---------------------------------- │
│ Progreso: 73/100 llamadas          │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 73%              │
│                                    │
│ Estado: On Track 🟢                │
│ Días restantes: 12                 │
└────────────────────────────────────┘

Especificaciones:
- Padding: 16dp
- Progress bar: altura 8dp
- Color progreso: #16B877
- Estado on track: #16B877
- Estado behind: #F59E0B
```

#### Card de Liga
```
┌────────────────────────────────────┐
│ 🏆 Liga Oro - Temporada 3          │
│ ---------------------------------- │
│ Tu Posición: #3                    │
│ Puntos: 1,245 pts                  │
│                                    │
│ 📊 Top 3 ascienden                 │
│ 📉 Bottom 2 descienden             │
│                                    │
│          [Ver tabla] [Detalles]    │
└────────────────────────────────────┘

Especificaciones:
- Color de liga según tier:
  - Oro: #FFD700
  - Plata: #C0C0C0
  - Bronce: #CD7F32
```

#### Badge Component
```
┌──────────────┐
│      🎖️      │
│              │
│  Vendedor    │
│   Estrella   │
│              │
│   Nivel 5    │
└──────────────┘

Especificaciones:
- Tamaño: 120dp x 160dp
- Badge icon: 64dp
- Background: #B0F5CD con gradiente
- Border radius: 12dp
```

### 4.3 Componentes de Formulario

#### Text Field (Material Design 3)
```
┌────────────────────────────────────┐
│ Nombre del negocio                 │
│ ┌────────────────────────────────┐ │
│ │ Abarrotes "La Esquina"         │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘

Especificaciones:
- Altura: 56dp
- Outlined variant
- Corner radius: 4dp
- Focus color: #16B877
- Error color: #EF4444
```

#### Button (Filled)
```
┌──────────────────────┐
│   REGISTRAR VISITA   │
└──────────────────────┘

Especificaciones:
- Altura: 40dp
- Min width: 88dp
- Padding: 16dp horizontal
- Background: #16B877
- Text: #FFFFFF, Roboto Medium 14sp
- Corner radius: 20dp
- Elevation: Level 2
```

#### FAB (Floating Action Button)
```
    ┌─────┐
    │  +  │
    └─────┘

Especificaciones:
- Tamaño: 56dp
- Background: #16B877
- Icon: 24dp, #FFFFFF
- Elevation: Level 3
- Position: 16dp from bottom/right
```

### 4.4 Componentes de Lista

#### List Item con Avatar
```
┌────────────────────────────────────┐
│ [👤] Juan Pérez                    │
│      Promotor - Kiosko Centro      │
│      🟢 Activo hoy                 │
└────────────────────────────────────┘

Especificaciones:
- Altura mínima: 72dp
- Avatar: 40dp circular
- Padding: 16dp
- Divider: 1dp, #B0F5CD
```

#### List Item de Notificación
```
┌────────────────────────────────────┐
│ 🔔 Nueva meta asignada             │
│    Se te asignó "Meta Noviembre"  │
│    Hace 2 horas                    │
└────────────────────────────────────┘

Especificaciones:
- Altura mínima: 64dp
- Badge: #EF4444 si no leída
- Timestamp: #6B7280, 12sp
```

### 4.5 Componentes de Diálogo

#### Alert Dialog
```
┌──────────────────────────────────┐
│ ⚠️  Fuera de ubicación           │
│                                  │
│ No estás en el área del kiosko  │
│ asignado. ¿Continuar de todos   │
│ modos?                           │
│                                  │
│        [CANCELAR]  [CONTINUAR]   │
└──────────────────────────────────┘

Especificaciones:
- Max width: 280dp
- Padding: 24dp
- Title: Roboto Medium 20sp
- Content: Roboto Regular 14sp
- Buttons: Label Large
```

#### Bottom Sheet
```
┌──────────────────────────────────┐
│ ═══ (handle)                     │
│                                  │
│ Opciones de Prospecto            │
│                                  │
│ ├─ 📞 Llamar                     │
│ ├─ 🗺️  Navegar                   │
│ ├─ ✏️  Editar                     │
│ └─ 🗑️  Eliminar                   │
│                                  │
└──────────────────────────────────┘

Especificaciones:
- Corner radius: 28dp (top)
- Handle: 32dp x 4dp, centrado
- Padding: 16dp
- Elevation: Level 5
```

---

## 5. Flujos de Usuario

### 5.1 Flujo de Login
```
┌──────────────┐
│ Splash Screen│
│   (Logo)     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Login Screen  │
│              │
│[Google Login]│
└──────┬───────┘
       │
       ▼
   Firebase Auth
       │
       ├─── Error ──→ [Mensaje de error]
       │
       ▼
   Cargar Usuario
   (Firestore)
       │
       ▼
 ┌─────────────┐
 │Determinar   │
 │   Rol       │
 └─────┬───────┘
       │
       ├─ ADMIN ────────→ [Admin Panel]
       ├─ GERENTE ──────→ [Dashboard con mapa]
       ├─ PROMOTOR ─────→ [Home Fragment]
       ├─ EMBAJADOR ────→ [Home Fragment]
       └─ PROMOTOR_CASA ─→ [Home Fragment]
```

### 5.2 Flujo de Registro de Visita
```
┌──────────────┐
│ Bottom Nav   │
│  [🏪 Aviva   │
│  Tu Negocio] │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│Lista de Visitas  │
│                  │
│ [FAB +]  ←───────┤ Click en +
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Formulario       │
│ Nueva Visita     │
│                  │
│ ├─ Nombre        │
│ ├─ Teléfono      │
│ ├─ Email         │
│ ├─ Giro          │
│ ├─ Ubicación GPS │
│ ├─ Foto          │
│ └─ Notas         │
│                  │
│ [GUARDAR]        │
└──────┬───────────┘
       │
       ▼
 Validar ubicación
       │
       ├─ Fuera de radio ──→ [⚠️ Alerta]
       │                         │
       │                         ├─ [Cancelar]
       │                         └─ [Continuar]
       ▼
 Guardar en Firestore
       │
       ▼
┌──────────────────┐
│ ✓ Visita         │
│   guardada       │
│                  │
│ Opciones:        │
│ ├─ Ver detalles  │
│ ├─ Nueva visita  │
│ └─ Volver        │
└──────────────────┘
```

### 5.3 Flujo de Check-in/Check-out
```
┌──────────────┐
│ Bottom Nav   │
│  [✓ Check]   │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Attendance       │
│ Fragment         │
│                  │
│ Estado: Sin      │
│ registrar        │
│                  │
│ [CHECK-IN]       │
└──────┬───────────┘
       │
       ▼
 Obtener ubicación GPS
       │
       ▼
 Verificar kiosko asignado
       │
       ├─ No asignado ──→ [⚠️ Sin kiosko asignado]
       │
       ├─ Fuera de radio ─→ [⚠️ Fuera de ubicación]
       │                        │
       │                        ├─ [Cancelar]
       │                        └─ [Registrar de todos modos]
       │
       ▼
 Registrar en Firestore
       │
       ▼
┌──────────────────┐
│ ✓ Check-in       │
│   registrado     │
│                  │
│ Hora: 08:30 AM   │
│ Ubicación: ✓     │
│                  │
│ [CHECK-OUT]      │
└──────┬───────────┘
       │
       │ (Al finalizar el día)
       │
       ▼
┌──────────────────┐
│ [CHECK-OUT]      │
└──────┬───────────┘
       │
       ▼
 Registrar salida
       │
       ▼
┌──────────────────┐
│ ✓ Jornada        │
│   completada     │
│                  │
│ Entrada: 08:30   │
│ Salida: 18:00    │
│ Total: 9h 30m    │
└──────────────────┘
```

### 5.4 Flujo de Ligas
```
┌──────────────┐
│ Bottom Nav   │
│  [🏆 Ligas]  │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Mis Ligas        │
│                  │
│ ┌──────────────┐ │
│ │🏆 Liga Oro   │ │
│ │Pos: #3       │ │
│ │1,245 pts     │ │
│ └──────────────┘ │
│                  │
│ ┌──────────────┐ │
│ │🥈 Liga Plata │ │
│ │Pos: #1       │ │
│ │890 pts       │ │
│ └──────────────┘ │
└──────┬───────────┘
       │
       ▼ Click en liga
┌──────────────────┐
│ Detalles Liga    │
│                  │
│ 🏆 Liga Oro      │
│ Temporada 3      │
│                  │
│ Tu posición: #3  │
│ Puntos: 1,245    │
│                  │
│ [Ver Tabla]      │
│ [Premios]        │
│ [Estadísticas]   │
└──────┬───────────┘
       │
       ▼ Ver Tabla
┌──────────────────┐
│ Tabla Posiciones │
│                  │
│ #1 🥇 Juan P.    │
│    1,500 pts     │
│ #2 🥈 María G.   │
│    1,380 pts     │
│ #3 🥉 TÚ         │
│    1,245 pts ←── │
│ #4 Carlos L.     │
│    1,100 pts     │
│ #5 Ana M.        │
│    980 pts       │
│ ...              │
│                  │
│ ↑ Top 3 ascienden│
│ ↓ Bottom 2       │
│   descienden     │
└──────────────────┘
```

### 5.5 Flujo de Metas Comerciales
```
┌──────────────┐
│ Bottom Nav   │
│  [🎯 Metas]  │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Metas Comerciales   │
│                     │
│ ┌─────────────────┐ │
│ │🎯 Llamadas Nov  │ │
│ │▓▓▓▓▓░░░ 73%    │ │
│ │73/100 llamadas  │ │
│ │On Track 🟢      │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │🎯 Colocación    │ │
│ │▓▓▓░░░░░ 45%    │ │
│ │9/20 créditos    │ │
│ │Behind 🟡        │ │
│ └─────────────────┘ │
└─────────┬───────────┘
          │
          ▼ Click en meta
┌─────────────────────┐
│ Detalle de Meta     │
│                     │
│ 🎯 Meta Llamadas    │
│ Noviembre 2026      │
│                     │
│ Objetivo: 100       │
│ Actual: 73          │
│ Progreso: 73%       │
│                     │
│ ┌─────────────────┐ │
│ │   [Gráfica]     │ │
│ │     📈          │ │
│ └─────────────────┘ │
│                     │
│ Sincronizado con    │
│ HubSpot ✓           │
│                     │
│ Días restantes: 12  │
│ Promedio diario: 6  │
│ Necesitas: 2.25/día │
│                     │
│ Estado: On Track 🟢 │
└─────────────────────┘
```

### 5.6 Flujo de Chat Asistente
```
┌──────────────┐
│ Menú Nav     │
│ [🆘 Ayuda]   │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Asistente de Ayuda  │
│                     │
│ ┌─────────────────┐ │
│ │ Hola! Soy tu    │ │
│ │ asistente Aviva │ │
│ │ ¿En qué puedo   │ │
│ │ ayudarte?       │ │
│ └─────────────────┘ │
│                     │
│                     │
│ [Escribe mensaje..] │
└─────────┬───────────┘
          │
          ▼ Usuario escribe
┌─────────────────────┐
│ Tu mensaje:         │
│ ┌─────────────────┐ │
│ │¿Cómo solicito   │ │
│ │tiempo libre?    │ │
│ └─────────────────┘ │
│                     │
│ Bot responde:       │
│ ┌─────────────────┐ │
│ │Para solicitar   │ │
│ │tiempo libre:    │ │
│ │1. Ve a Trámites │ │
│ │2. Selecciona    │ │
│ │   "Tiempo Libre"│ │
│ │3. Llena el      │ │
│ │   formulario    │ │
│ └─────────────────┘ │
│                     │
│ [Escribe mensaje..] │
└─────────────────────┘
```

### 5.7 Flujo de Navegación por Roles

```
        ┌──────────────┐
        │ Login exitoso│
        └──────┬───────┘
               │
        Cargar usuario
        Identificar rol
               │
               ▼
     ┌─────────────────┐
     │ Configurar      │
     │ Navegación      │
     └────────┬────────┘
              │
    ┌─────────┼─────────────────┐
    │         │                 │
    ▼         ▼                 ▼
ADMIN     GERENTE          PROMOTOR
    │         │                 │
    │         │                 │
    ▼         ▼                 ▼
┌──────┐  ┌──────┐         ┌──────┐
│Bottom│  │Bottom│         │Bottom│
│Nav:  │  │Nav:  │         │Nav:  │
│      │  │      │         │      │
│✓ Home│  │✓ Home│         │✓ Home│
│✓ Dash│  │✓ Dash│         │✓ Dash│
│✓ Check│ │✓ Check│        │✓ Check│
│✓ Aviva│ │✓ Aviva│        │✓ Aviva│
│✓ Admin│ │✓ Perfil│       │✓ Perfil│
└──────┘  └──────┘         └──────┘
    │         │                 │
    │         ▼                 │
    │    Dashboard:             │
    │    ✓ Mapa equipo          │
    │    ✓ Métricas              │
    │      del equipo           │
    │                           │
    ▼                           ▼
Menú Drawer:               Menú Drawer:
✓ Metas                    ✓ Metas
✓ Ligas                    ✓ Ligas
✓ Badges                   ✓ Badges
✓ Métricas                 ✓ Métricas
✓ Notificaciones           ✓ Notificaciones
✓ Ayuda                    ✓ Ayuda
✓ Trámites                 ✓ Trámites
✓ Config                   ✓ Perfil
✓ Admin Panel
```

---

## 6. Prototipado Interactivo

### 6.1 Configurar Interacciones en Figma

#### Transiciones Básicas
```
Tipo de transición recomendado:
├─ Navigation: Smart Animate (300ms)
├─ Modal/Dialog: Dissolve (200ms)
├─ Bottom Sheet: Move In (250ms)
└─ Tab Change: Instant
```

#### Navegación Bottom Bar
```
Frame: Home
  ├─ Tap en [📊 Dashboard]
  └─ → Navigate to: Dashboard
      └─ Animation: Instant
      └─ Scroll: Reset position

Frame: Dashboard
  ├─ Tap en [✓ Check]
  └─ → Navigate to: Attendance
      └─ Animation: Instant
```

#### FAB y Botones
```
Frame: AvivaTuNegocioFragment
  ├─ Tap en [FAB +]
  └─ → Open overlay: RegistroFragment
      └─ Animation: Move In (bottom)
      └─ Duration: 250ms
```

#### Diálogos y Modales
```
Frame: Home
  ├─ Tap en [Notificación]
  └─ → Open overlay: NotificationDetails
      └─ Animation: Dissolve
      └─ Duration: 200ms
      └─ Background: Dim 40%
```

### 6.2 Crear Variantes de Componentes

#### Bottom Navigation (5 estados)
```
Component: BottomNavItem
  ├─ Variant: Home-Active
  ├─ Variant: Home-Inactive
  ├─ Variant: Dashboard-Active
  ├─ Variant: Dashboard-Inactive
  └─ ... (continúa para cada ítem)

Interacción:
  ├─ Change to: Active
  └─ Animation: Smart Animate 150ms
```

#### Card de Visita (estados)
```
Component: VisitCard
  ├─ Variant: Default
  ├─ Variant: Pressed (scale 0.98)
  └─ Variant: Expanded (con detalles)

Interacción:
  ├─ While Pressing: Pressed
  ├─ On Tap: Navigate to Details
  └─ Animation: Smart Animate 200ms
```

### 6.3 Estados de Carga y Error

#### Loading State
```
Frame: CommercialGoals
  ├─ Initial State: Loading
  │   └─ Shows: Skeleton Cards
  │       └─ Animation: Pulse (loop)
  │
  └─ After 1500ms delay
      └─ Change to: Content
          └─ Animation: Dissolve 300ms
```

#### Empty State
```
Frame: LeaguesFragment (sin ligas)
  └─ Shows:
      ├─ 🏆 (icon 64dp)
      ├─ "No estás en una liga"
      ├─ "Completa más ventas..."
      └─ [Button: Ver Metas]
```

#### Error State
```
Frame: Dashboard (error)
  └─ Shows:
      ├─ ⚠️ (icon 48dp, #F59E0B)
      ├─ "Error al cargar datos"
      ├─ "Verifica tu conexión"
      └─ [Button: Reintentar]
```

### 6.4 Animaciones Avanzadas

#### Progress Bar Animado
```
Component: GoalProgressBar
  ├─ Frame 1: Progress 0%
  ├─ Frame 2: Progress 73%
  └─ Animation: Smart Animate 800ms
      └─ Easing: Ease Out
```

#### Badge Unlock Animation
```
Sequence:
  1. Badge aparece (scale 0 → 1)
     └─ Duration: 400ms, Ease Out Back
  2. Brillo/partículas (opcional)
     └─ Duration: 600ms
  3. Badge se posiciona
     └─ Duration: 300ms, Ease Out
```

#### Pull to Refresh
```
Frame: VisitsList
  ├─ Drag from top
  └─ → Show: RefreshIndicator
      └─ After release:
          ├─ Show loading spinner
          ├─ Delay 1000ms
          └─ Update content
```

### 6.5 Flujos Completos para Prototipar

#### Flujo 1: Registro de Visita (8 pantallas)
```
1. HomeFragment
   ↓ [Tap: Aviva Tu Negocio]
2. AvivaTuNegocioFragment
   ↓ [Tap: FAB +]
3. RegistroFragment (overlay)
   ↓ [Llenar formulario]
4. [Tap: Capturar Foto]
   ↓
5. CameraView (simular)
   ↓ [Foto capturada]
6. RegistroFragment (con foto)
   ↓ [Tap: GUARDAR]
7. LoadingOverlay (1s)
   ↓
8. SuccessDialog
   ↓ [Tap: ACEPTAR]
9. AvivaTuNegocioFragment (actualizado)
```

#### Flujo 2: Ver Liga y Tabla (4 pantallas)
```
1. HomeFragment
   ↓ [Tap: Menú → Ligas]
2. LeaguesFragment
   ↓ [Tap: Liga Oro]
3. LeagueDetailsView
   ↓ [Tap: Ver Tabla]
4. LeagueRankingView
   ↓ [Scroll para ver posiciones]
   ↓ [Tap: Volver]
5. LeaguesFragment
```

#### Flujo 3: Check-in con Error (5 pantallas)
```
1. HomeFragment
   ↓ [Tap: Bottom Nav → Check]
2. AttendanceFragment
   ↓ [Tap: CHECK-IN]
3. LocationCheckingDialog (1s)
   ↓
4. LocationAlertDialog (fuera de rango)
   ↓ [Tap: CONTINUAR]
5. AttendanceFragment (check-in exitoso)
```

### 6.6 Microinteracciones

#### Ripple Effect (Material)
```
En cualquier tappable element:
  └─ While Pressing:
      ├─ Show ripple overlay
      ├─ Color: #16B877 at 20% opacity
      ├─ Origin: Tap position
      └─ Animation: Expand from center
          └─ Duration: 300ms
```

#### Switch/Toggle
```
Component: Switch
  ├─ State: Off
  │   └─ Background: #6B7280
  │       Thumb position: Left
  │
  └─ State: On
      └─ Background: #16B877
          Thumb position: Right
          Animation: Smart Animate 200ms
```

#### Snackbar
```
Trigger: Acción completada
  └─ Show Snackbar:
      ├─ Position: Bottom + 72dp (above bottom nav)
      ├─ Animation: Move In from bottom
      ├─ Duration visible: 3000ms
      ├─ Animation out: Dissolve
      └─ Content: "Visita registrada ✓"
```

---

## 7. Recursos y Referencias

### 7.1 Material Design 3 Resources

**Sitio oficial**:
- https://m3.material.io/
- Componentes: https://m3.material.io/components
- Foundations: https://m3.material.io/foundations

**Figma Community**:
- "Material 3 Design Kit" (oficial de Google)
- "Material Design 3 Components"
- "Material Symbols Icons"

**Color Tool**:
- https://m3.material.io/theme-builder
- Usar #16B877 como color principal

### 7.2 Plugins de Figma Recomendados

1. **Material Theme Builder**
   - Genera paleta completa desde #16B877
   - Crea tokens de color automáticamente

2. **Android Resources Export**
   - Exporta assets para Android
   - Genera density buckets correctos

3. **Iconify**
   - Acceso a Material Symbols
   - Búsqueda rápida de iconos

4. **Lorem Ipsum**
   - Genera texto de prueba
   - Útil para nombres de usuarios/negocios

5. **Unsplash**
   - Fotos de prueba para visitas
   - Imágenes de negocios

### 7.3 Assets de la App Actual

#### Colores principales extraídos:
```
Primary: #16B877
Primary Dark: #074739
Primary Light: #B0F5CD
Background: #F0F5FA
```

#### Iconos usados (Material Symbols):
```
home, dashboard, check_circle, storefront,
flag, emoji_events, trending_up, military_tech,
person, notifications, admin_panel_settings,
help, description, phone, navigation, edit,
delete, camera, map, location_on, schedule
```

### 7.4 Estructura de Archivos en Figma

```
📁 Aviva App Comercial - Mobile
│
├─ 📄 Cover (portada del proyecto)
│
├─ 📄 Design System
│   ├─ 🎨 Colors
│   ├─ 📝 Typography
│   ├─ 📏 Spacing & Grid
│   ├─ 🎭 Elevation
│   ├─ 🔲 Components
│   │   ├─ Buttons
│   │   ├─ Cards
│   │   ├─ Text Fields
│   │   ├─ Lists
│   │   ├─ Navigation
│   │   └─ Dialogs
│   └─ 🎨 Icons Library
│
├─ 📄 Screens - Authentication
│   └─ LoginActivity
│
├─ 📄 Screens - Home & Navigation
│   ├─ MainActivity (con Bottom Nav)
│   ├─ HomeFragment
│   ├─ DashboardFragment
│   ├─ ProfileFragment
│   └─ NotificationsFragment
│
├─ 📄 Screens - Attendance
│   ├─ AttendanceFragment
│   ├─ AttendanceHistory
│   └─ LocationAlertDialog
│
├─ 📄 Screens - Aviva Tu Negocio
│   ├─ AvivaTuNegocioFragment
│   ├─ RegistroFragment
│   ├─ VisitDetailsDialog
│   └─ ProspectosListDialog
│
├─ 📄 Screens - Commercial Goals
│   ├─ CommercialGoalsFragment
│   ├─ GoalDetailsView
│   └─ GoalProgressChart
│
├─ 📄 Screens - Leagues
│   ├─ LeaguesFragment
│   ├─ LeagueDetailsView
│   ├─ LeagueRankingView
│   └─ LeaguePrizesView
│
├─ 📄 Screens - Metrics & Badges
│   ├─ MetricsFragment
│   ├─ BadgesFragment
│   └─ BadgeDetailsDialog
│
├─ 📄 Screens - Profile & Career
│   ├─ ProfileFragment
│   ├─ CareerFragment
│   └─ MiCarreraFragment
│
├─ 📄 Screens - Help & Tramites
│   ├─ HelpAssistantFragment
│   ├─ TramitesFragment
│   └─ TimeOffRequestForm
│
├─ 📄 Screens - Admin Panel
│   ├─ AdminFragment
│   ├─ UsersAdminFragment
│   ├─ KiosksAdminFragment
│   └─ [otros admin screens]
│
├─ 📄 Flows - User Flows
│   ├─ Flujo Login
│   ├─ Flujo Registro Visita
│   ├─ Flujo Check-in
│   ├─ Flujo Ligas
│   ├─ Flujo Metas
│   └─ Flujo Chat Asistente
│
└─ 📄 Prototype
    └─ [Pantallas conectadas para prototipo]
```

### 7.5 Checklist para Completar el Figma

#### Fase 1: Design System (1-2 días)
- [ ] Crear página de Design System
- [ ] Definir paleta de colores como estilos
- [ ] Crear estilos de texto (Typography)
- [ ] Documentar espaciado y grid
- [ ] Crear biblioteca de iconos
- [ ] Crear componentes base:
  - [ ] Buttons (5 variantes)
  - [ ] Text Fields (3 estados)
  - [ ] Cards (4 tipos)
  - [ ] List Items (3 tipos)
  - [ ] Bottom Navigation
  - [ ] Top App Bar
  - [ ] FAB
  - [ ] Dialogs (3 tipos)
  - [ ] Bottom Sheets

#### Fase 2: Pantallas Principales (2-3 días)
- [ ] Login
- [ ] Home con Bottom Navigation
- [ ] Dashboard
- [ ] Profile
- [ ] Attendance
- [ ] Aviva Tu Negocio (lista)
- [ ] Registro de Visita
- [ ] Commercial Goals
- [ ] Leagues
- [ ] Metrics
- [ ] Badges
- [ ] Help Assistant
- [ ] Notifications

#### Fase 3: Pantallas Secundarias (2-3 días)
- [ ] Todas las pantallas de Admin Panel
- [ ] Diálogos y Bottom Sheets
- [ ] Estados de carga
- [ ] Estados vacíos
- [ ] Estados de error
- [ ] Forms completos
- [ ] Vistas de detalles

#### Fase 4: Flujos (1 día)
- [ ] Crear página de Flows
- [ ] Diagramar 6 flujos principales
- [ ] Usar FigJam para wireflows
- [ ] Documentar casos especiales

#### Fase 5: Prototipado (2-3 días)
- [ ] Duplicar pantallas a página Prototype
- [ ] Conectar navegación Bottom Bar
- [ ] Conectar navegación principal
- [ ] Añadir transiciones Smart Animate
- [ ] Configurar overlays (modales, dialogs)
- [ ] Añadir microinteracciones
- [ ] Crear variantes de componentes
- [ ] Configurar estados (loading, empty, error)
- [ ] Prototipar 3 flujos completos:
  - [ ] Login → Home → Registro Visita
  - [ ] Home → Ligas → Ver Tabla
  - [ ] Home → Check-in → Success
- [ ] Probar prototipo en modo presentación
- [ ] Probar en Figma Mirror (mobile)

#### Fase 6: Documentación (1 día)
- [ ] Crear portada del proyecto
- [ ] Documentar componentes
- [ ] Añadir anotaciones de espaciado
- [ ] Documentar interacciones
- [ ] Crear guía de uso del prototipo
- [ ] Exportar specs para desarrollo

### 7.6 Tips Finales

#### Organización
- Usa prefijos en nombres de layers: `component/`, `screen/`, `icon/`
- Nombra frames descriptivamente: `HomeFragment - Estado Cargado`
- Agrupa elementos en frames lógicos
- Usa Auto Layout en todos los componentes

#### Componentización
- Crea componentes para elementos repetidos
- Usa variantes para diferentes estados
- Documenta props de componentes
- Mantén componentes simples y reutilizables

#### Performance
- Usa componentes en lugar de duplicar
- Optimiza imágenes grandes
- Limita efectos de sombra complejos
- Reduce uso de blur effects

#### Colaboración
- Comparte link del prototipo con equipo
- Permite comentarios en Figma
- Versiona cambios importantes
- Exporta PNG/PDF para documentación externa

---

## 🎯 Próximos Pasos

1. **Crear cuenta Figma** (si no tienes): https://figma.com
2. **Instalar plugins recomendados**
3. **Descargar Material Design 3 Kit** de Figma Community
4. **Crear proyecto** siguiendo estructura de archivos
5. **Empezar con Design System** (colores, tipografía, componentes base)
6. **Diseñar pantallas principales** (Home, Dashboard, Profile primero)
7. **Conectar prototipo** con navegación básica
8. **Iterar y mejorar** basándose en feedback

---

## 📚 Documentación Adicional

### Firestore Collections (para datos de prueba)
```
users, visits, kiosks, products, leagues,
leagueParticipants, goals, badges, attendance,
notifications, timeoffRequests
```

### Roles de Usuario (para prototipar navegación)
```
- SUPER_ADMIN
- ADMIN
- GERENTE_AVIVA_CONTIGO
- PROMOTOR_AVIVA_TU_NEGOCIO
- EMBAJADOR_AVIVA_TU_COMPRA
- PROMOTOR_AVIVA_TU_CASA
```

### Líneas de Producto
```
- AVIVA_TU_NEGOCIO
- AVIVA_CONTIGO
- AVIVA_TU_COMPRA
- AVIVA_TU_CASA
```

---

**¡Buena suerte con tu proyecto en Figma!** 🚀

Si tienes preguntas específicas sobre alguna pantalla o flujo, consulta esta guía o revisa la documentación de Material Design 3.
