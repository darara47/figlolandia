import { create } from 'zustand';
import { GameStateDto, GameConfigDto } from '../types/api';

interface LobbyStore {
  gameId: string | null;
  gamePin: string | null;
  playerId: string | null;
  playerName: string | null;
  isHost: boolean;
  gameState: GameStateDto | null;
  config: GameConfigDto;

  // Actions
  setGame: (gameId: string, gamePin: string, playerId: string, playerName: string, isHost: boolean) => void;
  setGameState: (state: GameStateDto) => void;
  updateConfig: (config: Partial<GameConfigDto>) => void;
  reset: () => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  gameId: null,
  gamePin: null,
  playerId: null,
  playerName: null,
  isHost: false,
  gameState: null,
  config: {
    maxRounds: 10,
    victoryThreshold: 50,
    eventFrequency: 0,
    minPlayers: 3,
    maxPlayers: 8,
  },

  setGame: (gameId, gamePin, playerId, playerName, isHost) => {
    set({
      gameId,
      gamePin,
      playerId,
      playerName,
      isHost,
    });
  },

  setGameState: (state) => {
    // Deduplikuj graczy po ID, aby uniknąć duplikacji
    if (state?.players && Array.isArray(state.players)) {
      const uniquePlayers = state.players.filter((player, index, self) =>
        index === self.findIndex((p) => p.id === player.id)
      );
      set({ gameState: { ...state, players: uniquePlayers } });
    } else {
      set({ gameState: state });
    }
  },

  updateConfig: (config) => {
    set((state) => ({
      config: { ...state.config, ...config },
    }));
  },

  reset: () => {
    set({
      gameId: null,
      gamePin: null,
      playerId: null,
      playerName: null,
      isHost: false,
      gameState: null,
      config: {
        maxRounds: 10,
        victoryThreshold: 50,
        eventFrequency: 0,
        minPlayers: 3,
        maxPlayers: 8,
      },
    });
  },
}));

