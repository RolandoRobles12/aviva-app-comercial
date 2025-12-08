import { Timestamp } from 'firebase/firestore';

/**
 * Niveles de tier para sistema competitivo
 */
export type LeagueTier = 'BRONCE' | 'PLATA' | 'ORO' | 'PLATINO' | 'DIAMANTE' | 'MASTER' | 'LEYENDA';

/**
 * Valores de LeagueTier para uso en código
 */
export const LeagueTier = {
  BRONCE: 'BRONCE' as LeagueTier,
  PLATA: 'PLATA' as LeagueTier,
  ORO: 'ORO' as LeagueTier,
  PLATINO: 'PLATINO' as LeagueTier,
  DIAMANTE: 'DIAMANTE' as LeagueTier,
  MASTER: 'MASTER' as LeagueTier,
  LEYENDA: 'LEYENDA' as LeagueTier
};

/**
 * Configuración de un tier
 */
export interface TierConfig {
  tier: LeagueTier;
  displayName: string;
  colorHex: string;
  minPoints: number;
}

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
 * Modelo de Liga Unificado
 * Soporta tanto benchmarking simple como sistema competitivo completo
 */
export interface League {
  id: string;
  name: string;                    // Nombre de la liga
  description?: string;            // Descripción opcional

  // UI Configuration (para benchmarking simple)
  color?: string;                  // Color para UI (hex)
  icon?: string;                   // Emoji o ícono
  members: string[];               // Array de user IDs

  // Competitive System (opcional, para sistema de tiers)
  competitiveMode?: boolean;       // Si usa el sistema competitivo completo
  tier?: LeagueTier;               // Tier de la liga (BRONCE, PLATA, etc)
  season?: number;                 // Temporada actual

  // Dates (para sistema competitivo)
  startDate?: Timestamp;           // Fecha de inicio de temporada
  endDate?: Timestamp;             // Fecha de fin de temporada

  // Competition Settings
  maxParticipants?: number;        // Máximo de participantes
  promotionSpots?: number;         // Top N usuarios ascienden
  relegationSpots?: number;        // Bottom N usuarios descienden

  // Premios
  prizes?: LeaguePrize[];          // Premios configurables

  // Status
  active: boolean;                 // Si está activa (para benchmarking)
  status?: LeagueStatus;           // Estado detallado (para competitivo)

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

  // Competitive mode fields
  competitiveMode?: boolean;
  tier?: LeagueTier;
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
