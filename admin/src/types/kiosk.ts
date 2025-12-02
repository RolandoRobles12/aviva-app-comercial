import type { Timestamp, GeoPoint } from 'firebase/firestore';

/**
 * Estado del kiosco
 */
export type KioskStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'CLOSED';

/**
 * Tipos de producto disponibles
 */
export type ProductType =
  | 'bodega_aurrera'
  | 'aviva_contigo'
  | 'aviva_tu_negocio'
  | 'construrama'
  | 'disensa'
  | 'casa_marchand'
  | 'salauno'
  | 'elektra'
  | 'coppel'
  | 'famsa'
  | 'liverpool'
  | 'palacio_hierro'
  | 'sears'
  | 'suburbia'
  | 'home_depot'
  | 'office_depot'
  | 'soriana'
  | 'walmart'
  | 'chedraui'
  | 'heb'
  | 'comercial_mexicana'
  | 'sam_club'
  | 'costco'
  | 'otro';

/**
 * Días de la semana
 */
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/**
 * Horario de trabajo para un día específico
 */
export interface DailySchedule {
  isOpen: boolean;
  startHour: number;
  endHour: number;
}

/**
 * Horarios de trabajo por día de la semana
 */
export interface WeeklySchedule {
  monday: DailySchedule;
  tuesday: DailySchedule;
  wednesday: DailySchedule;
  thursday: DailySchedule;
  friday: DailySchedule;
  saturday: DailySchedule;
  sunday: DailySchedule;
}

/**
 * Modelo de Kiosko/Punto de Venta
 */
export interface Kiosk {
  id: string;
  name: string;
  productType: ProductType;

  // Ubicación
  coordinates: GeoPoint | null;
  address?: string;
  city: string;
  state: string;

  // Configuración de tracking
  radiusOverride: number; // Radio permitido en metros

  // Reglas de tiempo - DEPRECATED: usar weeklySchedule en su lugar
  workHoursStart?: number;
  workHoursEnd?: number;

  // Nuevo: Horarios por día de la semana
  weeklySchedule?: WeeklySchedule;

  requiresPresence: boolean;

  // Estado
  status: KioskStatus;

  // ID interno del kiosco (no es de HubSpot)
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

/**
 * Tipos de producto disponibles con sus labels
 */
export const PRODUCT_TYPES: Array<{ value: ProductType; label: string }> = [
  // Productos Aviva
  { value: 'aviva_contigo', label: 'Aviva Contigo' },
  { value: 'aviva_tu_negocio', label: 'Aviva Tu Negocio' },
  { value: 'construrama', label: 'Construrama' },
  { value: 'disensa', label: 'Disensa' },
  { value: 'casa_marchand', label: 'Casa Marchand' },
  { value: 'salauno', label: 'Salauno' },

  // Supermercados y Tiendas de Autoservicio
  { value: 'bodega_aurrera', label: 'Bodega Aurrera' },
  { value: 'walmart', label: 'Walmart' },
  { value: 'soriana', label: 'Soriana' },
  { value: 'chedraui', label: 'Chedraui' },
  { value: 'heb', label: 'HEB' },
  { value: 'comercial_mexicana', label: 'Comercial Mexicana' },

  // Clubes de Precio
  { value: 'sam_club', label: "Sam's Club" },
  { value: 'costco', label: 'Costco' },

  // Electrónica y Muebles
  { value: 'elektra', label: 'Elektra' },
  { value: 'coppel', label: 'Coppel' },
  { value: 'famsa', label: 'Famsa' },

  // Tiendas Departamentales
  { value: 'liverpool', label: 'Liverpool' },
  { value: 'palacio_hierro', label: 'El Palacio de Hierro' },
  { value: 'sears', label: 'Sears' },
  { value: 'suburbia', label: 'Suburbia' },

  // Ferreterías y Oficina
  { value: 'home_depot', label: 'Home Depot' },
  { value: 'office_depot', label: 'Office Depot' },

  // Otro
  { value: 'otro', label: 'Otro' }
];

/**
 * Estados de México
 */
export const MEXICAN_STATES = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas'
];

/**
 * Ciudades principales por estado (muestra)
 * TODO: Expandir esta lista según sea necesario
 */
export const MAJOR_CITIES: Record<string, string[]> = {
  'Ciudad de México': ['Ciudad de México', 'Iztapalapa', 'Gustavo A. Madero', 'Álvaro Obregón', 'Coyoacán'],
  'Estado de México': ['Toluca', 'Ecatepec', 'Naucalpan', 'Tlalnepantla', 'Nezahualcóyotl'],
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Puerto Vallarta'],
  'Nuevo León': ['Monterrey', 'San Pedro Garza García', 'San Nicolás de los Garza', 'Guadalupe', 'Apodaca'],
  'Puebla': ['Puebla', 'Tehuacán', 'San Martín Texmelucan', 'Atlixco', 'Cholula'],
  'Guanajuato': ['León', 'Irapuato', 'Celaya', 'Salamanca', 'Guanajuato'],
  'Veracruz': ['Veracruz', 'Xalapa', 'Coatzacoalcos', 'Córdoba', 'Poza Rica'],
  'Chihuahua': ['Chihuahua', 'Ciudad Juárez', 'Delicias', 'Cuauhtémoc', 'Parral'],
  'Querétaro': ['Querétaro', 'San Juan del Río', 'Corregidora', 'El Marqués'],
  'Yucatán': ['Mérida', 'Valladolid', 'Tizimín', 'Progreso', 'Umán']
};

/**
 * Días de la semana con sus labels en español
 */
export const DAYS_OF_WEEK: Array<{ value: DayOfWeek; label: string; shortLabel: string }> = [
  { value: 'monday', label: 'Lunes', shortLabel: 'Lun' },
  { value: 'tuesday', label: 'Martes', shortLabel: 'Mar' },
  { value: 'wednesday', label: 'Miércoles', shortLabel: 'Mié' },
  { value: 'thursday', label: 'Jueves', shortLabel: 'Jue' },
  { value: 'friday', label: 'Viernes', shortLabel: 'Vie' },
  { value: 'saturday', label: 'Sábado', shortLabel: 'Sáb' },
  { value: 'sunday', label: 'Domingo', shortLabel: 'Dom' }
];

/**
 * Horario por defecto (Lunes a Viernes 9AM - 7PM, Sábado 9AM - 2PM, Domingo cerrado)
 */
export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday: { isOpen: true, startHour: 9, endHour: 19 },
  tuesday: { isOpen: true, startHour: 9, endHour: 19 },
  wednesday: { isOpen: true, startHour: 9, endHour: 19 },
  thursday: { isOpen: true, startHour: 9, endHour: 19 },
  friday: { isOpen: true, startHour: 9, endHour: 19 },
  saturday: { isOpen: true, startHour: 9, endHour: 14 },
  sunday: { isOpen: false, startHour: 9, endHour: 19 }
};
