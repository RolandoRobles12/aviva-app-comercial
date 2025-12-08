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
  position?: number;              // Posición específica (1 = 1er lugar)
  positionRangeStart?: number;    // Inicio de rango de posiciones
  positionRangeEnd?: number;      // Fin de rango de posiciones
  prizeType: PrizeType;
  prizeValue: string;
  description: string;
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
