/**
 * Typy specyficzne dla backendu (rozszerzają game-core)
 */
import { GameState, Player, GameConfig } from '@figlolandia/game-core';

export interface GameInstance {
  state: GameState;
  clients: Set<string>; // WebSocket client IDs
  hostId: string; // ID gracza-hosta
  createdAt: Date;
  lastActivity: Date;
}

export interface CreateGameParams {
  hostId: string;
  hostName: string;
}

export interface JoinGameParams {
  gameId?: string; // opcjonalne, jeśli podano gamePin
  gamePin?: string; // opcjonalne, jeśli podano gameId
  playerId: string;
  playerName: string;
}

