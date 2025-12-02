# 🗺️ Mapa de Vendedores en Vivo

## Descripción

El Mapa de Vendedores es una herramienta en tiempo real para visualizar la ubicación de todos los vendedores, sus rutas del día, y su estado actual. Diseñado con una interfaz moderna y amigable.

## ✨ Características

### 📍 Visualización en Tiempo Real
- **Actualización automática** cada 15 minutos
- **Marcadores codificados por color** según el estado del vendedor:
  - 🟢 **Verde**: Vendedor activo en su zona asignada
  - 🔴 **Rojo**: Vendedor fuera de su zona (con animación de rebote)
  - 🔵 **Azul**: Vendedor en tránsito entre zonas
  - ⚪ **Gris**: Vendedor inactivo (sin actualización en 30+ minutos)

### 🏪 Kioscos y Zonas
- Marcadores de kioscos con ícono personalizado
- Círculos de radio permitido (configurable por kiosko)
- Información detallada al hacer clic

### 📈 Estadísticas en Tiempo Real
- Total de vendedores activos
- Vendedores en zona vs fuera de zona
- Vendedores en tránsito
- Distancia promedio del kiosco asignado

### 🎯 Rutas del Día
- Líneas que muestran el recorrido completo del vendedor
- Puntos de ubicación con timestamp
- Visualización de patrones de movimiento

### 🔍 Filtros Avanzados
- **Por producto**: Bodega Aurrera, Aviva Contigo, Construrama
- **Por estado**: Estado del vendedor (activo, inactivo, etc.)
- **Por tipo**: Ubicación fija vs ruta
- **Geográficos**: Estado y ciudad
- **Búsqueda**: Por nombre, email o kiosco

### 📱 Panel Lateral Interactivo
- Lista completa de vendedores
- Avatar con indicador de estado en tiempo real
- Click para centrar el mapa en el vendedor
- Información rápida (kiosco, estado, última actualización)

### 💡 Controles del Mapa
- **Refrescar**: Actualizar datos manualmente
- **Centrar**: Auto-centrar en todos los vendedores visibles
- **Filtros**: Mostrar/ocultar panel de filtros
- **Zoom y navegación** estándar de Google Maps

### 🔔 Info Windows Detallados
Al hacer clic en un marcador se muestra:
- **Vendedor**: Foto, nombre, email, estado, kiosco asignado, distancia, última actualización
- **Kiosco**: Nombre, dirección, ciudad/estado, radio permitido

## 🚀 Configuración

### 1. Obtener API Key de Google Maps

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un proyecto nuevo o selecciona uno existente
3. Habilita las siguientes APIs:
   - Maps JavaScript API
   - Places API
   - Geometry API
4. Crea credenciales (API Key)
5. Configura restricciones (opcional pero recomendado):
   - Restricción de aplicación: HTTP referrers
   - Agrega tu dominio (ej: `your-domain.com/*`)

### 2. Configurar Variable de Entorno

Crea un archivo `.env` en la carpeta `admin/`:

```bash
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

### 3. Instalar Dependencias

```bash
cd admin
npm install
```

Las dependencias necesarias ya están en `package.json`:
- `@react-google-maps/api`: Componentes de React para Google Maps
- `@types/google.maps`: TypeScript types para Google Maps

### 4. Ejecutar en Desarrollo

```bash
npm run dev
```

## 📊 Estructura de Datos

### VendorMapData
```typescript
interface VendorMapData {
  id: string;
  displayName: string;
  email: string;
  currentLocation: GeoPoint;
  status: 'active_in_zone' | 'out_of_zone' | 'in_transit' | 'inactive';
  vendorType: 'fixed_location' | 'route';
  productType: string;
  assignedKioskId?: string;
  distanceFromKiosk?: number;
  todayRoute?: RoutePoint[];
  // ... más campos
}
```

### KioskMapData
```typescript
interface KioskMapData {
  id: string;
  name: string;
  location: GeoPoint;
  radiusMeters: number;
  productType: string;
  // ... más campos
}
```

## 🎨 Personalización de Colores

Los colores están definidos en `src/types/map.ts`:

```typescript
export const DEFAULT_MAP_COLORS: MapColorConfig = {
  vendorMarkers: {
    active_in_zone: '#16b877',    // Verde Aviva
    out_of_zone: '#EF4444',       // Rojo
    in_transit: '#3B82F6',        // Azul
    inactive: '#9CA3AF',          // Gris
  },
  kioskMarkers: '#8B5CF6',        // Morado
  routeLines: '#60A5FA',          // Azul claro
  radiusCircles: 'rgba(22, 184, 119, 0.2)',
};
```

## 🔧 Configuración del Mapa

Personaliza las opciones del mapa en `MapaVendedores.tsx`:

```typescript
const MAP_CENTER = { lat: 19.4326, lng: -99.1332 }; // Ciudad de México
const MAP_OPTIONS: google.maps.MapOptions = {
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  // ... más opciones
};
```

## 📝 Requisitos de Firestore

### Colecciones Necesarias

#### `users`
- `lastLocation`: GeoPoint
- `lastLocationUpdate`: Timestamp
- `isActive`: boolean
- `status`: 'ACTIVE' | 'INACTIVE'
- `role`: string
- `assignedKioskId`: string (opcional)
- `productTypes`: string[]

#### `kiosks`
- `location` o `coordinates`: GeoPoint
- `name`: string
- `address`: string
- `city`: string
- `state`: string
- `radiusMeters`: number
- `productType`: string
- `isActive`: boolean

#### `locationHistory` (opcional, para rutas)
- `userId`: string
- `location`: GeoPoint
- `timestamp`: Timestamp
- `accuracy`: number

## 🎯 Casos de Uso

### 1. Supervisión en Tiempo Real
- Ver quién está trabajando ahora
- Identificar vendedores fuera de zona
- Monitorear cobertura geográfica

### 2. Análisis de Rutas
- Ver patrones de movimiento
- Optimizar rutas de vendedores
- Identificar zonas con poca cobertura

### 3. Alertas y Seguimiento
- Detectar vendedores fuera de zona
- Verificar check-ins
- Validar cumplimiento de horarios

### 4. Planificación
- Asignar nuevos kioscos
- Re-distribuir territorios
- Optimizar cobertura

## 🚨 Troubleshooting

### El mapa no carga
- Verifica que `VITE_GOOGLE_MAPS_API_KEY` esté configurada
- Revisa la consola del navegador para errores
- Confirma que las APIs estén habilitadas en Google Cloud

### No se ven vendedores
- Verifica que los usuarios tengan `lastLocation` en Firestore
- Confirma que los roles sean correctos
- Revisa los filtros aplicados

### Los marcadores no tienen colores
- Verifica que los SVG se estén generando correctamente
- Revisa la consola para errores de CORS

### Performance lento
- Reduce la frecuencia de actualización
- Implementa paginación para muchos vendedores
- Usa clustering de marcadores (próxima feature)

## 🔮 Próximas Mejoras

- [ ] Clustering de marcadores para mejor performance
- [ ] Heatmap de actividad
- [ ] Histórico de rutas (selector de fecha)
- [ ] Exportar rutas a PDF/Excel
- [ ] Notificaciones push cuando vendedor sale de zona
- [ ] Comparación de rutas entre fechas
- [ ] Métricas de eficiencia de ruta
- [ ] Integración con Google Directions API

## 📞 Soporte

Para preguntas o issues, contacta al equipo de desarrollo.

## 📄 Licencia

© 2024 Aviva Crédito - Todos los derechos reservados
