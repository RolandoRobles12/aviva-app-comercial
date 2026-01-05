import { Timestamp } from 'firebase/firestore';

/**
 * Método de cálculo de HubSpot
 */
export type HubSpotCalculationMethod =
  | 'calculateGoalProgress'
  | 'calculateClosureRate';

/**
 * Campo que se puede extraer de cada método
 */
export type HubSpotExtractField =
  | 'llamadas'
  | 'colocacion'
  | 'tasaCierre';

/**
 * Métrica de HubSpot configurable
 */
export interface HubSpotMetric {
  id: string;
  name: string;
  description: string;

  // Configuración del cálculo
  calculationMethod: HubSpotCalculationMethod;
  extractField: HubSpotExtractField;

  // Opciones
  usesProductLine: boolean;  // Si filtra por productLine del usuario
  usesDateRange: boolean;     // Si usa el rango de fechas de la liga

  // Estado
  active: boolean;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * DTO para crear/editar métrica
 */
export interface HubSpotMetricFormData {
  name: string;
  description: string;
  calculationMethod: HubSpotCalculationMethod;
  extractField: HubSpotExtractField;
  usesProductLine: boolean;
  usesDateRange: boolean;
  active: boolean;
}

/**
 * Configuración de métricas predefinidas
 */
export const DEFAULT_HUBSPOT_METRICS: Omit<HubSpotMetric, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  {
    name: 'Llamadas (Deals Creados)',
    description: 'Número de deals creados en el período. Usa el campo createdate de HubSpot.',
    calculationMethod: 'calculateGoalProgress',
    extractField: 'llamadas',
    usesProductLine: true,
    usesDateRange: true,
    active: true
  },
  {
    name: 'Colocación (Monto Desembolsado)',
    description: 'Monto total de deals desembolsados en el período. Usa campos de disbursement específicos por producto.',
    calculationMethod: 'calculateGoalProgress',
    extractField: 'colocacion',
    usesProductLine: true,
    usesDateRange: true,
    active: true
  },
  {
    name: 'Tasa de Cierre (%)',
    description: 'Porcentaje de deals desembolsados vs aprobados. Calcula (desembolsados / aprobados) × 100.',
    calculationMethod: 'calculateClosureRate',
    extractField: 'tasaCierre',
    usesProductLine: true,
    usesDateRange: true,
    active: true
  }
];
