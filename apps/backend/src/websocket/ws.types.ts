/**
 * Typy dla WebSocket komunikacji
 */

// Client → Server
export interface JoinGamePayload {
  gameId?: string; // opcjonalne, jeśli podano gamePin
  gamePin?: string; // opcjonalne, jeśli podano gameId
  playerName: string;
}

export interface SubmitActionsPayload {
  gameId: string;
  actions: Array<{
    type: string;
    target?: string;
    cardId?: string;
    buildingType?: string;
  }>;
}

// Server → Client
export interface GameStateUpdatePayload {
  gameId: string;
  gamePin: string;
  phase: string;
  round: number;
  players: Array<{
    id: string;
    name: string;
    gold: number;
    buildings: Array<{
      id: string;
      type: string;
      value: number;
    }>;
    cards: Array<{
      id: string;
      name: string;
      buildingType: string;
      buildingCategory: string;
      buildingValue: number;
    }>;
    profession: string | null;
    order: number;
  }>;
  winner: string | null;
  config: {
    maxRounds: number;
    victoryThreshold: number;
    eventFrequency: number;
  };
  submittedPlayers?: string[]; // Lista ID graczy, którzy zatwierdzili swoje ruchy (tylko w fazie PLANNING)
  planningPhaseStartTime?: number; // Timestamp rozpoczęcia fazy PLANNING (w milisekundach)
  narrativeEvents?: NarrativeEvent[]; // Wydarzenia narratora
}

// Wydarzenia narratora - klucze które frontend tłumaczy na tekst
export interface NarrativeEvent {
  type: string; // Typ wydarzenia: 'build', 'profession_ability', 'theft', 'vandal', 'architect', etc.
  playerId: string; // ID gracza który wykonał akcję
  playerName: string; // Nazwa gracza
  profession?: string; // Zawód gracza (jeśli dotyczy)
  data?: Record<string, any>; // Dodatkowe dane specyficzne dla typu wydarzenia
  timestamp: number; // Timestamp wydarzenia
}

export interface PhaseChangePayload {
  gameId: string;
  phase: string;
  round: number;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

// WebSocket Events
export enum ClientEvents {
  JOIN_GAME = 'JOIN_GAME',
  SUBMIT_ACTIONS = 'SUBMIT_ACTIONS',
}

export enum ServerEvents {
  GAME_STATE_UPDATE = 'GAME_STATE_UPDATE',
  PHASE_CHANGE = 'PHASE_CHANGE',
  ERROR = 'ERROR',
}

