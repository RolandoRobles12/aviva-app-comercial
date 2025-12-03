import { Timestamp } from 'firebase/firestore';

/**
 * Modelo de Liga
 * Para agrupar promotores y hacer benchmarking
 */
export interface League {
  id: string;
  name: string;                    // Nombre de la liga (ej: "Liga Plata Norte")
  description?: string;            // Descripción opcional
  color?: string;                  // Color para UI (hex)
  icon?: string;                   // Emoji o ícono
  members: string[];               // Array de user IDs
  active: boolean;                 // Si está activa
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
