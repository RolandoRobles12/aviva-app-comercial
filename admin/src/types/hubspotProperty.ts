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
 * Estas son las properties que actualmente se usan en el sistema
 */
export const DEFAULT_HUBSPOT_PROPERTIES = [
  // ========== DEALS - Información Básica ==========
  {
    name: 'Nombre del Deal',
    internalName: 'dealname',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'Nombre o título del deal',
    active: true
  },
  {
    name: 'Monto del Deal',
    internalName: 'amount',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'number' as HubSpotDataType,
    description: 'Monto total del deal en pesos',
    active: true
  },
  {
    name: 'Stage del Deal',
    internalName: 'dealstage',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'enum' as HubSpotDataType,
    description: 'Etapa actual del deal en el pipeline',
    active: true
  },
  {
    name: 'Pipeline',
    internalName: 'pipeline',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'Pipeline al que pertenece el deal',
    active: true
  },
  {
    name: 'Prioridad',
    internalName: 'hs_priority',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'enum' as HubSpotDataType,
    description: 'Prioridad del deal (high, medium, low)',
    active: true
  },

  // ========== DEALS - Fechas ==========
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
    name: 'Fecha Disbursement Aviva Tu Compra',
    internalName: 'hs_v2_date_entered_146336009',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'date' as HubSpotDataType,
    description: 'Fecha de desembolso para Aviva Tu Compra',
    active: true
  },
  {
    name: 'Fecha Disbursement Otros Productos',
    internalName: 'hs_v2_date_entered_33823866',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'date' as HubSpotDataType,
    description: 'Fecha de desembolso para Vida, Contigo, Tu Casa',
    active: true
  },

  // ========== DEALS - Producto y Owner ==========
  {
    name: 'Owner ID',
    internalName: 'hubspot_owner_id',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'ID del propietario/vendedor del deal',
    active: true
  },
  {
    name: 'Producto Aviva',
    internalName: 'producto_aviva',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'enum' as HubSpotDataType,
    description: 'Producto Aviva (aviva_atn, aviva_contigo, aviva_tucompra, aviva_tucasa, etc.)',
    active: true
  },
  {
    name: 'Cross Selling AOS',
    internalName: 'aos_cross_selling',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'Indicador de cross-selling con AOS',
    active: true
  },
  {
    name: 'Kiosk ID',
    internalName: 'kiosk_id',
    objectType: 'deals' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'ID del kiosko asociado al deal',
    active: true
  },

  // ========== CONTACTS - Información Básica ==========
  {
    name: 'Nombre',
    internalName: 'firstname',
    objectType: 'contacts' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'Nombre del contacto',
    active: true
  },
  {
    name: 'Apellido',
    internalName: 'lastname',
    objectType: 'contacts' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'Apellido del contacto',
    active: true
  },
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
    name: 'Empresa',
    internalName: 'company',
    objectType: 'contacts' as HubSpotObjectType,
    dataType: 'text' as HubSpotDataType,
    description: 'Nombre de la empresa del contacto',
    active: true
  },

  // ========== CONTACTS - Ciclo de Vida ==========
  {
    name: 'Fecha de Creación',
    internalName: 'createdate',
    objectType: 'contacts' as HubSpotObjectType,
    dataType: 'date' as HubSpotDataType,
    description: 'Fecha en que se creó el contacto',
    active: true
  },
  {
    name: 'Lifecycle Stage',
    internalName: 'lifecyclestage',
    objectType: 'contacts' as HubSpotObjectType,
    dataType: 'enum' as HubSpotDataType,
    description: 'Etapa del ciclo de vida (lead, customer, etc.)',
    active: true
  },
  {
    name: 'Lead Status',
    internalName: 'hs_lead_status',
    objectType: 'contacts' as HubSpotObjectType,
    dataType: 'enum' as HubSpotDataType,
    description: 'Estado del lead (NEW, OPEN, IN_PROGRESS, etc.)',
    active: true
  }
];
