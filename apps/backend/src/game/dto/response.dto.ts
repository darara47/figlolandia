import { ApiProperty } from '@nestjs/swagger';

export class BuildingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  value: number;
}

export class CardDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  buildingType: string;

  @ApiProperty()
  buildingCategory: string;

  @ApiProperty()
  buildingValue: number;
}

export class PlayerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  gold: number;

  @ApiProperty({ type: [BuildingDto] })
  buildings: BuildingDto[];

  @ApiProperty({ type: [CardDto] })
  cards: CardDto[];

  @ApiProperty({ nullable: true })
  profession: string | null;

  @ApiProperty()
  order: number;
}

export class GameConfigResponseDto {
  @ApiProperty({ example: 10 })
  maxRounds: number;

  @ApiProperty({ example: 50 })
  victoryThreshold: number;

  @ApiProperty({ example: 0, description: 'Częstotliwość zdarzeń (0-100%)' })
  eventFrequency: number;

  @ApiProperty({ example: 3 })
  minPlayers: number;

  @ApiProperty({ example: 8 })
  maxPlayers: number;
}

export class GameStateDto {
  @ApiProperty()
  gameId: string;

  @ApiProperty({ description: '6-cyfrowy PIN gry', example: '123456' })
  gamePin: string;

  @ApiProperty({ example: 'LOBBY' })
  phase: string;

  @ApiProperty({ example: 0 })
  round: number;

  @ApiProperty({ type: [PlayerDto] })
  players: PlayerDto[];

  @ApiProperty({ type: GameConfigResponseDto })
  config: GameConfigResponseDto;

  @ApiProperty({ nullable: true })
  winner: string | null;
}

export class CreateGameResponseDto {
  @ApiProperty()
  gameId: string;

  @ApiProperty({ description: '6-cyfrowy PIN gry' })
  gamePin: string;

  @ApiProperty()
  hostId: string;

  @ApiProperty({ type: GameStateDto })
  state: GameStateDto;
}

export class JoinGameResponseDto {
  @ApiProperty()
  gameId: string;

  @ApiProperty()
  playerId: string;

  @ApiProperty({ type: GameStateDto })
  state: GameStateDto;
}

export class StartGameResponseDto {
  @ApiProperty()
  gameId: string;

  @ApiProperty({ type: GameStateDto })
  state: GameStateDto;
}

export class GameListItemDto {
  @ApiProperty()
  gameId: string;

  @ApiProperty({ description: '6-cyfrowy PIN gry' })
  gamePin: string;

  @ApiProperty()
  phase: string;

  @ApiProperty()
  round: number;

  @ApiProperty()
  playersCount: number;

  @ApiProperty()
  maxPlayers: number;

  @ApiProperty()
  hostId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  lastActivity: Date;
}

export class PlayerListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  gold: number;

  @ApiProperty()
  buildingsCount: number;

  @ApiProperty()
  cardsCount: number;

  @ApiProperty({ nullable: true })
  profession: string | null;

  @ApiProperty()
  order: number;
}

export class PlayersListResponseDto {
  @ApiProperty({ type: [PlayerListItemDto] })
  players: PlayerListItemDto[];
}

