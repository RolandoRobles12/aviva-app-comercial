# 📱 Mockups Visuales de Aviva App para Figma

Este directorio contiene mockups HTML/CSS de alta fidelidad de la Mobile App Android de Aviva, diseñados específicamente para ser capturados e importados a Figma.

## 🎯 ¿Qué incluye?

6 pantallas principales de la app:

1. **HomeFragment** - Pantalla principal con resumen y actividad
2. **DashboardFragment** - Dashboard con mapa del equipo (vista gerente)
3. **AttendanceFragment** - Check-in/Check-out
4. **Aviva Tu Negocio** - Lista de visitas a negocios
5. **Commercial Goals** - Metas comerciales con progreso
6. **LeaguesFragment** - Sistema de ligas y competencias

## 🚀 Cómo usar

### Método 1: Captura Manual (Recomendado para Figma)

1. **Abre el navegador de pantallas**:
   ```bash
   # Desde la raíz del proyecto
   cd figma-mockups
   open index.html  # Mac
   # o
   start index.html # Windows
   # o
   xdg-open index.html # Linux
   ```

2. **Haz clic en cualquier pantalla** para verla en tamaño completo (360x800px)

3. **Captura la pantalla del mockup**:
   - **Mac**: `Cmd + Shift + 4` (selecciona el área del frame Android)
   - **Windows**: `Windows + Shift + S` (selecciona el área)
   - **Linux**: `Shift + PrtSc` (selecciona el área)

4. **Importa a Figma**:
   - Arrastra la imagen capturada a tu proyecto de Figma
   - O usa `File > Place Image` en Figma

5. **Usa el mockup como**:
   - ✅ Referencia visual para diseñar encima
   - ✅ Base para tracing (calcar componentes)
   - ✅ Mockup temporal para presentaciones
   - ✅ Guía para extraer colores exactos

### Método 2: Abrir Archivos Directamente

Puedes abrir cualquier archivo HTML directamente en tu navegador:

```
01-home-fragment.html
02-dashboard-fragment.html
03-attendance-fragment.html
04-aviva-tu-negocio-fragment.html
05-commercial-goals-fragment.html
06-leagues-fragment.html
```

## 🎨 Especificaciones de Diseño

### Colores (Ya aplicados en los mockups)

```css
Primary: #16B877
Primary Dark: #074739
Primary Light: #B0F5CD

Secondary: #026149
Background: #F0F5FA

Success: #16B877
Warning: #F59E0B
Error: #EF4444
```

### Tipografía

- **Familia**: Roboto (cargada automáticamente desde Google Fonts)
- **Tamaños**: 12px, 14px, 16px, 18px, 20px, 24px
- **Pesos**: 400 (Regular), 500 (Medium), 700 (Bold)

### Dimensiones

- **Frame Android**: 360 x 800 dp
- **AppBar**: 56px de altura
- **Bottom Navigation**: 56px de altura
- **Cards**: Border radius 12px, padding 16px
- **Buttons**: Altura 40px, border radius 20px
- **FAB**: 56px circular

### Iconos

- **Familia**: Material Icons (cargados automáticamente)
- **Tamaño**: 24px (estándar)

## 💡 Tips para Figma

### 1. Extraer Colores
Usa el **Color Picker** (I) de Figma directamente sobre la imagen importada para obtener los colores exactos.

### 2. Crear Componentes
1. Importa el mockup como referencia
2. Reduce la opacidad al 50%
3. Diseña componentes Material Design 3 encima
4. Elimina la referencia cuando termines

### 3. Usar Auto Layout
Los mockups están diseñados con espaciado consistente (8dp grid):
- Usa Auto Layout en Figma con gaps de 8px, 16px, 24px
- Los paddings siguen el sistema: 4, 8, 12, 16, 24, 32, 48px

### 4. Crear Design System
1. Importa **todas las pantallas**
2. Identifica componentes repetidos (cards, buttons, etc.)
3. Crea componentes de Figma basados en los mockups
4. Construye tu biblioteca de componentes

## 📊 Elementos Clave por Pantalla

### HomeFragment
- User summary card con avatar
- Grid 2x2 de acciones rápidas
- Lista de actividad reciente
- Bottom navigation (5 items)

### DashboardFragment
- Stats grid 3 columnas
- Mapa simulado con markers
- Filtros con chips
- Lista de vendedores con avatares

### AttendanceFragment
- Status card grande (centrado)
- Kiosko info card
- Botón de acción principal (CHECK-IN)
- Sección de historial

### Aviva Tu Negocio
- Filtros con chips
- Cards de visitas con:
  - Icono de negocio
  - Información de contacto
  - Badge de probabilidad (Alta/Media/Baja)
  - Botones de acción
- FAB para nueva visita

### Commercial Goals
- Cards de metas con:
  - Icono y título
  - Progress bar animada
  - Porcentaje de completado
  - Status badge (On Track/Behind/Ahead)
  - Días restantes

### LeaguesFragment
- Cards de ligas con:
  - Emoji/icono de liga
  - Borde de color según tier
  - Posición y puntos
  - Reglas de ascenso/descenso
  - Participantes y fechas

## 🛠️ Tecnologías Usadas

- **HTML5** - Estructura
- **CSS3** - Estilos (Material Design 3)
- **Google Fonts** - Roboto
- **Material Icons** - Iconografía

## 📁 Estructura de Archivos

```
figma-mockups/
├── index.html                          # Navegador de pantallas
├── README.md                          # Esta documentación
├── 00-base-styles.css                 # Estilos compartidos
├── 01-home-fragment.html              # Home
├── 02-dashboard-fragment.html         # Dashboard
├── 03-attendance-fragment.html        # Asistencia
├── 04-aviva-tu-negocio-fragment.html  # Visitas
├── 05-commercial-goals-fragment.html  # Metas
└── 06-leagues-fragment.html           # Ligas
```

## 🎯 Próximos Pasos

1. ✅ Abre `index.html` en tu navegador
2. ✅ Captura las pantallas que necesites
3. ✅ Importa a Figma
4. ✅ Usa como referencia o base
5. ✅ Diseña tu prototipo interactivo en Figma

## 📚 Recursos Adicionales

- **Guía completa de Figma**: Ver `../GUIA_FIGMA_MOBILE_APP.md`
- **Ejemplos visuales**: Ver `../EJEMPLOS_PANTALLAS_FIGMA.md`
- **Material Design 3**: https://m3.material.io/

## ❓ FAQ

**P: ¿Por qué HTML en lugar de archivos de Figma?**
R: Figma no permite crear archivos `.fig` mediante código. Estos mockups HTML te permiten ver exactamente cómo se verán las pantallas, capturarlas e importarlas a Figma como base.

**P: ¿Necesito editar el HTML?**
R: No, solo ábrelos en el navegador y captura las pantallas. Si quieres personalizarlos, puedes editar los archivos HTML/CSS.

**P: ¿Funcionan en todos los navegadores?**
R: Sí, están probados en Chrome, Firefox, Safari y Edge. Se recomienda Chrome para mejor fidelidad.

**P: ¿Puedo usar estas pantallas en presentaciones?**
R: Sí, son completamente libres de usar dentro del proyecto Aviva.

**P: ¿Están exactas las dimensiones?**
R: Sí, están diseñadas a 360x800px (dimensiones estándar de Android). En Figma, asegúrate de no escalar las imágenes al importar.

---

**¡Listo para empezar a diseñar en Figma!** 🚀

Si tienes dudas o sugerencias, revisa la documentación completa en:
- `GUIA_FIGMA_MOBILE_APP.md`
- `EJEMPLOS_PANTALLAS_FIGMA.md`
