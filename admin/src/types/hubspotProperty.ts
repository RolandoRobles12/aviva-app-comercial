import { Timestamp } from 'firebase/firestore';

/**
 * Tipos de objetos en HubSpot
 */
export type HubSpotObjectType = 'deals' | 'contacts' | 'companies';

/**
 * Tipos de datos para properties de HubSpot
 */
export type HubSpotDataType = 'text' | 'number' | 'date' | 'enum' | 'boolean';

/**
 * Representa una property (campo) de HubSpot
 * Esta es la definición del campo que se usa en el catálogo
 */
export interface HubSpotProperty {
  id: string;
  name: string; // Nombre amigable: "Fecha Venta Vida"
  internalName: string; // Internal name en HubSpot: "fecha_venta_vida"
  objectType: HubSpotObjectType; // En qué objeto existe: deals, contacts, companies
  dataType: HubSpotDataType; // Tipo de dato
  description?: string; // Descripción opcional
  active: boolean; // Si está disponible para usar
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * DTO para formularios (sin campos auto-generados)
 */
export interface HubSpotPropertyFormData {
  name: string;
  internalName: string;
  objectType: HubSpotObjectType;
  dataType: HubSpotDataType;
  description?: string;
  active: boolean;
}

/**
 * Properties predefinidas comunes
 */
export const DEFAULT_HUBSPOT_PROPERTIES = [
  // Deals
  {
    name: 'Monto del Deal',
    internalName: 'amount',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'number' as HubSpotDataType,
    description: 'Monto total del deal',
    active: true
  },
  {
    name: 'Stage del Deal',
    internalName: 'dealstage',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'enum' as HubSpotDataType,
    description: 'Etapa actual del deal',
    active: true
  },
  {
    name: 'Fecha de Creación',
    internalName: 'createdate',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'date' as HubSpotDataType,
    description: 'Fecha en que se creó el deal',
    active: true
  },
  {
    name: 'Fecha de Cierre',
    internalName: 'closedate',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'date' as HubSpotDataType,
    description: 'Fecha en que se cerró el deal',
    active: true
  },
  {
    name: 'Owner ID',
    internalName: 'hubspot_owner_id',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'ID del propietario del deal',
    active: true
  },
  {
    name: 'Línea de Producto',
    internalName: 'product_line',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'Línea de producto asociada al deal',
    active: true
  },
  {
    name: 'Fecha Venta Vida',
    internalName: 'fecha_venta_vida',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'date' as HubSpotDataType,
    description: 'Fecha de venta de seguro de vida',
    active: true
  },
  {
    name: 'Fecha Venta Ahorro',
    internalName: 'fecha_venta_ahorro',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'date' as HubSpotDataType,
    description: 'Fecha de venta de seguro de ahorro',
    active: true
  },
  // Contacts
  {
    name: 'Email',
    internalName: 'email',
    objectType: 'contacts' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'Email del contacto',
    active: true
  },
  {
    name: 'Teléfono',
    internalName: 'phone',
    objectType: 'contacts' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'Teléfono del contacto',
    active: true
  },
  {
    name: 'Fecha de Creación',
    internalName: 'createdate',
    objectType: 'contacts' as HubSpotObjectType,
    dataType: 'date' as HubSpotDataType,
    description: 'Fecha en que se creó el contacto',
    active: true
  }
];
