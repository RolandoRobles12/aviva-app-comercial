import type { Timestamp, GeoPoint } from 'firebase/firestore';

/**
 * Estado de un vendedor en el mapa
 */
export type VendorStatus =
  | 'active_in_zone'      // Verde: Activo y en su zona asignada
  | 'out_of_zone'         // Rojo: Fuera de su zona asignada
  | 'in_transit'          // Azul: En movimiento entre zonas
  | 'inactive';           // Gris: Sin actividad reciente

/**
 * Tipo de vendedor según su configuración
 */
export type VendorType =
  | 'fixed_location'      // Vendedor fijo en sucursal
  | 'route';              // Vendedor en campo con ruta

/**
 * Información de vendedor para mostrar en el mapa
 */
export interface VendorMapData {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  photoUrl?: string;

  // Ubicación actual
  currentLocation: GeoPoint;
  lastLocationUpdate: Timestamp;
  locationAccuracy?: number;

  // Estado y tipo
  status: VendorStatus;
  vendorType: VendorType;

  // Información de producto y kiosco
  productType: string;
  productLine: string;
  assignedKioskId?: string;
  assignedKioskName?: string;

  // Ruta del día (para vendedores en campo)
  todayRoute?: RoutePoint[];

  // Validación de ubicación
  isInAllowedZone: boolean;
  distanceFromKiosk?: number; // metros
  allowedRadius?: number; // metros

  // Check-ins
  lastCheckIn?: Timestamp;
  checkInCount: number;

  // Información adicional
  role: string;
  isActive: boolean;
}

/**
 * Punto de ruta con timestamp
 */
export interface RoutePoint {
  location: GeoPoint;
  timestamp: Timestamp;
  accuracy?: number;
  activity?: 'STILL' | 'WALKING' | 'DRIVING' | 'UNKNOWN';
}

/**
 * Información de kiosco para mostrar en el mapa
 */
export interface KioskMapData {
  id: string;
  name: string;
  productType: string;

  // Ubicación
  location: GeoPoint;
  address: string;
  city: string;
  state: string;

  // Configuración
  radiusMeters: number;

  // Estado
  isActive: boolean;
  status: string;

  // Estadísticas
  assignedVendors: number;
  activeVendorsNow: number;
  averageCheckInsPerDay: number;
}

/**
 * Filtros para el mapa
 */
export interface MapFilters {
  // Filtros de producto
  productTypes: string[];

  // Filtros geográficos
  states: string[];
  cities: string[];

  // Filtros de estado
  vendorStatuses: VendorStatus[];
  showOnlyActive: boolean;

  // Filtros de tipo
  vendorTypes: VendorType[];

  // Filtros temporales
  dateRange: {
    start: Date;
    end: Date;
  } | null;
  showLiveData: boolean;

  // Filtros de visualización
  showKiosks: boolean;
  showRoutes: boolean;
  showRadiusCircles: boolean;

  // Búsqueda
  searchQuery: string;
}

/**
 * Configuración de colores para el mapa
 */
export interface MapColorConfig {
  vendorMarkers: {
    active_in_zone: string;    // Verde
    out_of_zone: string;       // Rojo
    in_transit: string;        // Azul
    inactive: string;          // Gris
  };
  kioskMarkers: string;        // Morado/Tienda
  routeLines: string;          // Azul claro
  radiusCircles: string;       // Verde transparente
}

/**
 * Estadísticas generales del mapa
 */
export interface MapStats {
  totalVendors: number;
  activeVendors: number;
  vendorsInZone: number;
  vendorsOutOfZone: number;
  inactiveVendors: number;
  totalKiosks: number;
  averageDistance: number;
  lastUpdate: Date;
}

/**
 * Configuración de colores por defecto
 */
export const DEFAULT_MAP_COLORS: MapColorConfig = {
  vendorMarkers: {
    active_in_zone: '#16b877',    // Verde Aviva
    out_of_zone: '#EF4444',       // Rojo
    in_transit: '#3B82F6',        // Azul
    inactive: '#9CA3AF',          // Gris
  },
  kioskMarkers: '#8B5CF6',        // Morado
  routeLines: '#60A5FA',          // Azul claro
  radiusCircles: 'rgba(22, 184, 119, 0.2)', // Verde transparente
};

/**
 * Labels para UI
 */
export const vendorStatusLabels: Record<VendorStatus, string> = {
  active_in_zone: 'Activo en zona',
  out_of_zone: 'Fuera de zona',
  in_transit: 'En tránsito',
  inactive: 'Inactivo',
};

export const vendorTypeLabels: Record<VendorType, string> = {
  fixed_location: 'Ubicación fija',
  route: 'Ruta',
};

/**
 * Iconos SVG para marcadores personalizados
 */
export const createVendorMarkerIcon = (status: VendorStatus, size: number = 40): string => {
  const color = DEFAULT_MAP_COLORS.vendorMarkers[status];
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${color}" opacity="0.3"/>
      <circle cx="20" cy="20" r="12" fill="${color}"/>
      <circle cx="20" cy="20" r="6" fill="white"/>
    </svg>
  `)}`;
};

export const createKioskMarkerIcon = (size: number = 50): string => {
  const color = DEFAULT_MAP_COLORS.kioskMarkers;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="${size}" height="${size}" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <path d="M25 5 L45 15 L45 35 L25 45 L5 35 L5 15 Z" fill="${color}" opacity="0.9"/>
      <path d="M15 20 L15 35 L35 35 L35 20 M20 20 L20 35 M30 20 L30 35 M15 27 L35 27"
            stroke="white" stroke-width="2" fill="none"/>
    </svg>
  `)}`;
};
