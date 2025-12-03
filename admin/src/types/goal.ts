import { Timestamp } from 'firebase/firestore';

/**
 * Tipos de metas
 */
export type GoalPeriod = 'weekly' | 'monthly';
export type GoalTargetType = 'kiosk' | 'seller' | 'all';

/**
 * Métricas de una meta
 */
export interface GoalMetrics {
  llamadas: number;      // Meta de llamadas/deals creados
  colocacion: number;    // Meta de colocación en pesos (amount)
}

/**
 * Modelo de Meta Comercial
 */
export interface Goal {
  id: string;
  name: string;                    // Nombre descriptivo (ej: "Meta Semanal - Enero 2025")
  period: GoalPeriod;              // 'weekly' o 'monthly'
  targetType: GoalTargetType;      // 'kiosk', 'seller', o 'all'
  targetId?: string;               // ID del kiosco o vendedor (null si targetType='all')
  targetName?: string;             // Nombre del kiosco o vendedor (para UI)
  metrics: GoalMetrics;            // Metas numéricas
  startDate: Timestamp;            // Fecha de inicio
  endDate: Timestamp;              // Fecha de fin
  active: boolean;                 // Si está activa
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;               // User ID que creó la meta
}

/**
 * DTO para crear/actualizar meta
 */
export interface GoalFormData {
  name: string;
  period: GoalPeriod;
  targetType: GoalTargetType;
  targetId?: string;
  targetName?: string;
  metrics: {
    llamadas: string;    // String para input form
    colocacion: string;  // String para input form
  };
  startDate: string;     // ISO date string
  endDate: string;       // ISO date string
  active: boolean;
}

/**
 * Progreso de una meta
 */
export interface GoalProgress {
  goalId: string;
  userId?: string;
  userName?: string;
  current: {
    llamadas: number;
    colocacion: number;
  };
  target: GoalMetrics;
  percentage: {
    llamadas: number;
    colocacion: number;
  };
  onTrack: boolean;
  updatedAt: Timestamp;
}
