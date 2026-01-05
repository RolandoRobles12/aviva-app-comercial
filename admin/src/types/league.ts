import { Timestamp } from 'firebase/firestore';

/**
 * Estados de una liga
 */
export type LeagueStatus = 'PENDING' | 'ACTIVE' | 'FINISHED';

/**
 * Valores de LeagueStatus para uso en código
 */
export const LeagueStatus = {
  PENDING: 'PENDING' as LeagueStatus,
  ACTIVE: 'ACTIVE' as LeagueStatus,
  FINISHED: 'FINISHED' as LeagueStatus
};

/**
 * Tipos de premios
 */
export type PrizeType = 'PUNTOS' | 'DINERO' | 'BONO' | 'PRODUCTO' | 'RECONOCIMIENTO';

/**
 * Valores de PrizeType para uso en código
 */
export const PrizeType = {
  PUNTOS: 'PUNTOS' as PrizeType,
  DINERO: 'DINERO' as PrizeType,
  BONO: 'BONO' as PrizeType,
  PRODUCTO: 'PRODUCTO' as PrizeType,
  RECONOCIMIENTO: 'RECONOCIMIENTO' as PrizeType
};

/**
 * Premio de liga
 */
export interface LeaguePrize {
  position?: number;         // Posición (1 = 1er lugar, 2 = 2do lugar, etc.)
  description: string;       // Descripción del premio
  amount?: number;          // Monto opcional del premio
}

/**
 * Tipo de fuente de datos para criterios
 */
export type CriteriaSource = 'VISITS' | 'CUSTOM_FIELD' | 'MANUAL';

/**
 * Criterio de puntuación personalizable
 */
export interface LeagueCriteria {
  id: string;                      // ID único del criterio
  name: string;                    // Nombre del criterio (ej: "Visitas Realizadas")
  description?: string;            // Descripción del criterio

  // Fuente de datos
  source: CriteriaSource;          // De dónde se obtienen los datos
  firestoreCollection?: string;    // Colección de Firestore (si source = CUSTOM_FIELD)
  firestoreField?: string;         // Campo a contar/sumar
  firestoreUserField?: string;     // Campo que identifica al usuario (ej: "userId", "promotorId")

  // Cálculo
  pointsPerUnit: number;           // Puntos otorgados por cada unidad
  calculationType: 'COUNT' | 'SUM' | 'AVERAGE';  // Tipo de cálculo

  // Filtros opcionales
  whereField?: string;             // Campo para filtrar (ej: "status")
  whereOperator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
  whereValue?: any;                // Valor del filtro (ej: "completed")

  enabled: boolean;                // Si el criterio está activo
}

/**
 * Modelo de Liga Simplificado
 * Sistema simple y amigable de benchmarking y competencias
 */
export interface League {
  id: string;
  name: string;                    // Nombre personalizable de la liga
  description?: string;            // Descripción opcional

  // UI Configuration
  color?: string;                  // Color para UI (hex)
  icon?: string;                   // Emoji o ícono
  members: string[];               // Array de user IDs

  // Configuración de temporada (opcional)
  season?: number;                 // Número de temporada
  startDate?: Timestamp;           // Fecha de inicio
  endDate?: Timestamp;             // Fecha de fin

  // Configuración de competencia (opcional)
  maxParticipants?: number;        // Máximo de participantes
  promotionSpots?: number;         // Top N usuarios ascienden
  relegationSpots?: number;        // Bottom N usuarios descienden

  // Premios (opcional)
  prizes?: LeaguePrize[];          // Premios configurables

  // ✨ NUEVO: Criterios personalizables
  criteria?: LeagueCriteria[];     // Criterios de puntuación

  // Status
  active: boolean;                 // Si está activa
  status?: LeagueStatus;           // Estado detallado

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;               // User ID que creó la liga
}

/**
 * DTO para crear/actualizar liga
 */
export interface LeagueFormData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  members: string[];
  active: boolean;

  // Campos opcionales de competencia
  season?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  maxParticipants?: number;
  promotionSpots?: number;
  relegationSpots?: number;
  prizes?: LeaguePrize[];
  criteria?: LeagueCriteria[];
  status?: LeagueStatus;
}

/**
 * Miembro de una liga con información extendida
 */
export interface LeagueMember {
  userId: string;
  displayName: string;
  email: string;
  leagueId: string;
  leagueName: string;
  joinedAt: Timestamp;
}

/**
 * Estadísticas de una liga
 */
export interface LeagueStats {
  leagueId: string;
  leagueName: string;
  memberCount: number;
  averageMetrics: {
    llamadas: number;
    colocacion: number;
    tasaCierre: number;
  };
  topPerformers: Array<{
    userId: string;
    userName: string;
    metrics: {
      llamadas: number;
      colocacion: number;
      tasaCierre: number;
    };
    rank: number;
  }>;
  updatedAt: Timestamp;
}
