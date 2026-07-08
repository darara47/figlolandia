/**
 * Typy dla REST API
 */

export interface BuildingDto {
  id: string;
  type: string;
  category: string;
  value: number;
}

export interface CardDto {
  id: string;
  name: string;
  buildingType: string;
  buildingCategory: string;
  buildingValue: number;
}

export interface PlayerDto {
  id: string;
  name: string;
  gold: number;
  buildings: BuildingDto[];
  cards: CardDto[];
  profession: string | null;
  joinOrder: number;
  order: number;
}

export interface GameConfigDto {
  maxRounds?: number;
  victoryThreshold?: number;
  eventFrequency?: number;
  minPlayers?: number;
  maxPlayers?: number;
}

export interface GameConfigResponseDto {
  maxRounds: number;
  victoryThreshold: number;
  eventFrequency: number;
  minPlayers: number;
  maxPlayers: number;
}

export interface GameStateDto {
  gameId: string;
  gamePin: string;
  phase: string;
  round: number;
  players: PlayerDto[];
  config: GameConfigResponseDto;
  winner: string | null;
}

export interface CreateGameResponseDto {
  gameId: string;
  gamePin: string;
  hostId: string;
  state: GameStateDto;
}

export interface JoinGameResponseDto {
  gameId: string;
  playerId: string;
  state: GameStateDto;
}

export interface StartGameResponseDto {
  gameId: string;
  state: GameStateDto;
}

