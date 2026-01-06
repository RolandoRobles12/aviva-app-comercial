import { Timestamp } from 'firebase/firestore';
import type { HubSpotObjectType } from './hubspotProperty';

/**
 * Operadores para filtros
 */
export type HubSpotFilterOperator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'in';

/**
 * Tipo de cálculo para la métrica
 */
export type HubSpotCalculationType = 'COUNT' | 'SUM' | 'AVERAGE';

/**
 * Filtro individual para una métrica
 */
export interface HubSpotMetricFilter {
  id: string; // UUID para identificar el filtro en el form
  propertyId: string; // ID de la property en hubspotProperties collection
  operator: HubSpotFilterOperator;
  value: string | number | boolean; // Valor a comparar
}

/**
 * Filtro de rango de fechas
 */
export interface HubSpotDateRangeFilter {
  enabled: boolean;
  propertyId: string; // ID de la property de tipo fecha
  useLeagueDates: boolean; // Si true, usa startDate/endDate de la liga/meta
  customStartDate?: Date; // Fecha fija de inicio (si useLeagueDates = false)
  customEndDate?: Date; // Fecha fija de fin (si useLeagueDates = false)
}

/**
 * Métrica de HubSpot completamente configurable
 */
export interface HubSpotMetric {
  id: string;
  name: string; // "Ventas de Vida en 2024"
  description?: string; // Descripción opcional
  objectType: HubSpotObjectType; // deals, contacts, companies
  calculationType: HubSpotCalculationType; // COUNT, SUM, AVERAGE
  sumPropertyId?: string; // ID de property a sumar (si calculationType = SUM o AVERAGE)

  // Filtros
  filters: HubSpotMetricFilter[]; // Filtros personalizados
  dateRangeFilter?: HubSpotDateRangeFilter; // Filtro de fechas opcional

  // Filtros automáticos basados en usuario
  filterByOwnerId: boolean; // Si true, filtra por hubspot_owner_id del usuario
  ownerIdPropertyId?: string; // ID de la property que contiene el owner ID (normalmente hubspot_owner_id)

  filterByProductLine: boolean; // Si true, filtra por product_line del usuario
  productLinePropertyId?: string; // ID de la property que contiene la línea de producto

  // Metadata
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * DTO para formularios
 */
export interface HubSpotMetricFormData {
  name: string;
  description?: string;
  objectType: HubSpotObjectType;
  calculationType: HubSpotCalculationType;
  sumPropertyId?: string;
  filters: HubSpotMetricFilter[];
  dateRangeFilter?: HubSpotDateRangeFilter;
  filterByOwnerId: boolean;
  ownerIdPropertyId?: string;
  filterByProductLine: boolean;
  productLinePropertyId?: string;
  active: boolean;
}
