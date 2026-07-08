import { create } from 'zustand';
import { GameStateUpdatePayload, NarrativeEvent } from '@/types/websocket';
import { GameStateDto, PlayerDto } from '@/types/api';
import { mergeNarrativeEvents } from '@/src/utils/narrative';

interface PlayerAction {
  type: 'build' | 'use_profession' | 'pass';
  target?: string;
  cardId?: string;
  buildingType?: string;
  buildingCategory?: string;
  buildingValue?: number;
  professionAbility?: boolean;
  theftTarget?: 'gold' | 'card';
  inspectTarget?: string;
  taxedCategory?: string;
}

interface GameStore {
  gameId: string | null;
  phase: string;
  round: number;
  players: PlayerDto[];
  me: PlayerDto | null;
  pendingActions: PlayerAction[];
  submittedPlayers: Set<string>; // Set ID graczy, którzy zatwierdzili swoje ruchy
  planningStatus: Record<string, { buildConfirmed: boolean; abilityConfirmed: boolean }>;
  planningPhaseStartTime: number | null; // Timestamp rozpoczęcia fazy PLANNING
  winner: string | null;
  narrativeLog: NarrativeEvent[]; // Pełna historia logów narratora
  narrativeEvents: NarrativeEvent[]; // Ostatnia paczka z serwera (animacje)
  config: {
    maxRounds: number;
    victoryThreshold: number;
    eventFrequency: number;
  };

  // Actions
  updateFromServer: (payload: GameStateUpdatePayload, playerId: string) => void;
  addAction: (action: PlayerAction) => void;
  removeAction: (index: number) => void;
  clearActions: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameId: null,
  phase: 'LOBBY',
  round: 0,
  players: [],
  me: null,
  pendingActions: [],
  submittedPlayers: new Set<string>(),
  planningStatus: {},
  planningPhaseStartTime: null,
  winner: null,
  narrativeLog: [],
  narrativeEvents: [],
  config: {
    maxRounds: 10,
    victoryThreshold: 50,
    eventFrequency: 0,
  },

  updateFromServer: (payload, playerId) => {
    const sortedPlayers = [...payload.players].sort(
      (a, b) =>
        (a.joinOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.joinOrder ?? Number.MAX_SAFE_INTEGER),
    );
    const me = sortedPlayers.find((p) => p.id === playerId) || null;

    set((state) => ({
      gameId: payload.gameId,
      phase: payload.phase,
      round: payload.round,
      players: sortedPlayers,
      me,
      winner: payload.winner,
      submittedPlayers: new Set(payload.submittedPlayers || []),
      planningStatus: payload.planningStatus || {},
      planningPhaseStartTime: payload.planningPhaseStartTime || null,
      narrativeLog: mergeNarrativeEvents(state.narrativeLog, payload.narrativeEvents),
      narrativeEvents:
        payload.narrativeEvents && payload.narrativeEvents.length > 0
          ? payload.narrativeEvents
          : state.narrativeEvents,
      config: {
        maxRounds: payload.config.maxRounds,
        victoryThreshold: payload.config.victoryThreshold,
        eventFrequency: payload.config.eventFrequency,
      },
    }));
  },

  addAction: (action) => {
    set((state) => ({
      pendingActions: [...state.pendingActions, action],
    }));
  },

  removeAction: (index) => {
    set((state) => ({
      pendingActions: state.pendingActions.filter((_, i) => i !== index),
    }));
  },

  clearActions: () => {
    set({ pendingActions: [] });
  },

  reset: () => {
    set({
      gameId: null,
      phase: 'LOBBY',
      round: 0,
      players: [],
      me: null,
      pendingActions: [],
      submittedPlayers: new Set<string>(),
      planningStatus: {},
      planningPhaseStartTime: null,
      winner: null,
      narrativeLog: [],
      narrativeEvents: [],
      config: {
        maxRounds: 10,
        victoryThreshold: 50,
        eventFrequency: 0,
      },
    });
  },
}));

