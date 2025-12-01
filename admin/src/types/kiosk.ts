import type { Timestamp, GeoPoint } from 'firebase/firestore';

/**
 * Estado del kiosco
 */
export type KioskStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'CLOSED';

/**
 * Modelo de Kiosko/Punto de Venta
 */
export interface Kiosk {
  id: string;
  name: string;
  productType: string; // "BA" = Bodega Aurrera, etc.

  // Ubicación
  coordinates: GeoPoint | null;
  city: string;
  state: string;

  // Configuración de tracking
  radiusOverride: number; // Radio permitido en metros

  // Reglas de tiempo
  workHoursStart: number; // Hora de inicio (ej: 9)
  workHoursEnd: number;   // Hora de fin (ej: 19)
  requiresPresence: boolean;

  // Estado
  status: KioskStatus;

  // Integración HubSpot
  hubId: string | null;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Estado de visita al kiosco
 */
export type VisitStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

/**
 * Registro de visita a un kiosco
 */
export interface KioskVisit {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;

  kioskId: string;
  kioskName: string;

  // Check-in
  checkInLocation: GeoPoint;
  checkInTime: Timestamp;
  checkInAccuracy: number;

  // Check-out
  checkOutLocation: GeoPoint | null;
  checkOutTime: Timestamp | null;
  checkOutAccuracy: number | null;

  // Estadísticas
  durationMinutes: number | null;
  distanceFromKiosk: number;

  // Estado
  status: VisitStatus;
}

/**
 * Labels para UI
 */
export const kioskStatusLabels: Record<KioskStatus, string> = {
  'ACTIVE': 'Activo',
  'INACTIVE': 'Inactivo',
  'MAINTENANCE': 'En mantenimiento',
  'CLOSED': 'Cerrado'
};

export const visitStatusLabels: Record<VisitStatus, string> = {
  'ACTIVE': 'En kiosco',
  'COMPLETED': 'Completada',
  'ABANDONED': 'Abandonada'
};

/**
 * Colores para estados
 */
export const kioskStatusColors: Record<KioskStatus, 'success' | 'default' | 'warning' | 'error'> = {
  'ACTIVE': 'success',
  'INACTIVE': 'default',
  'MAINTENANCE': 'warning',
  'CLOSED': 'error'
};

export const visitStatusColors: Record<VisitStatus, 'info' | 'success' | 'warning'> = {
  'ACTIVE': 'info',
  'COMPLETED': 'success',
  'ABANDONED': 'warning'
};
