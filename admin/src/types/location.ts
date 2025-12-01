import { Timestamp, GeoPoint } from 'firebase/firestore';

/**
 * Tipo de validación de ubicación según productLine
 */
export type ValidationType = 'ROUTE_ONLY' | 'FIXED_LOCATION';

/**
 * Configuración de tracking de ubicación para un usuario
 */
export interface LocationConfig {
  id: string;
  userId: string;

  // Ubicación asignada (para vendedores estáticos)
  assignedLocation: GeoPoint | null;
  assignedLocationName: string | null;

  // Configuración de radio permitido (metros)
  allowedRadius: number; // Default: 150

  // Configuración de tracking
  trackingInterval: number; // Default: 15 * 60 * 1000 (15 minutos)
  minAccuracy: number; // Default: 100 metros

  // Tipo de validación según productLine
  validationType: ValidationType;

  // Estado
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Usuario que configuró
  configuredBy: string | null;
}

/**
 * Tipo de alerta de ubicación
 */
export type AlertType = 'OUT_OF_BOUNDS' | 'NO_CONFIG' | 'GPS_DISABLED';

/**
 * Severidad de la alerta
 */
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Estado de la alerta
 */
export type AlertStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED';

/**
 * Alerta de ubicación para vendedores estáticos fuera de su zona
 */
export interface LocationAlert {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;

  // Ubicación detectada
  detectedLocation: GeoPoint;
  detectedLocationAccuracy: number;

  // Ubicación asignada
  assignedLocation: GeoPoint;
  assignedLocationName: string | null;

  // Distancia
  distanceFromAssigned: number; // Metros
  allowedRadius: number;

  // Estado
  alertType: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;

  // Timestamps
  detectedAt: Timestamp;
  resolvedAt: Timestamp | null;
  resolvedBy: string | null;

  // Notas
  notes: string | null;
}

/**
 * Labels para mostrar en UI
 */
export const validationTypeLabels: Record<ValidationType, string> = {
  'ROUTE_ONLY': 'Solo rastreo de ruta',
  'FIXED_LOCATION': 'Ubicación fija asignada'
};

export const alertTypeLabels: Record<AlertType, string> = {
  'OUT_OF_BOUNDS': 'Fuera de ubicación',
  'NO_CONFIG': 'Sin configuración',
  'GPS_DISABLED': 'GPS desactivado'
};

export const alertSeverityLabels: Record<AlertSeverity, string> = {
  'INFO': 'Información',
  'WARNING': 'Advertencia',
  'CRITICAL': 'Crítico'
};

export const alertStatusLabels: Record<AlertStatus, string> = {
  'ACTIVE': 'Activa',
  'RESOLVED': 'Resuelta',
  'DISMISSED': 'Descartada'
};

/**
 * Calcula la distancia entre dos puntos GPS en metros usando la fórmula Haversine
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const earthRadius = 6371000; // Radio de la Tierra en metros

  const lat1Rad = (point1.latitude * Math.PI) / 180;
  const lat2Rad = (point2.latitude * Math.PI) / 180;
  const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

/**
 * Obtiene el tipo de validación según la línea de producto
 */
export function getValidationTypeForProductLine(
  productLine: 'AVIVA_TU_NEGOCIO' | 'AVIVA_CONTIGO' | 'AVIVA_TU_COMPRA' | 'AVIVA_TU_CASA'
): ValidationType {
  switch (productLine) {
    case 'AVIVA_TU_NEGOCIO':
    case 'AVIVA_TU_CASA':
      return 'ROUTE_ONLY';

    case 'AVIVA_TU_COMPRA':
    case 'AVIVA_CONTIGO':
      return 'FIXED_LOCATION';
  }
}
