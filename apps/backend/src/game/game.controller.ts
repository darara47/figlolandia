import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { LobbyService } from './lobby.service';
import { GameService } from './game.service';
import { GameStateManager } from './game.state';
import { GameGateway } from './game.gateway';
import { generatePlayerId, GameState, CATEGORY_COLORS } from '@figlolandia/game-core';
import { CreateGameDto } from './dto/create-game.dto';
import { JoinGameDto } from './dto/join-game.dto';
import { StartGameDto } from './dto/start-game.dto';
import {
  CreateGameResponseDto,
  JoinGameResponseDto,
  StartGameResponseDto,
  GameStateDto,
  GameListItemDto,
  PlayersListResponseDto,
} from './dto/response.dto';

/**
 * REST API Controller dla gry
 * Endpointy HTTP do zarządzania grami
 */
@ApiTags('games')
@Controller('games')
export class GameController {
  constructor(
    private readonly lobbyService: LobbyService,
    private readonly gameService: GameService,
    private readonly gameStateManager: GameStateManager,
    private readonly gameGateway: GameGateway,
  ) { }

  /**
   * POST /games
   * Tworzy nową grę (z domyślnym config)
   */
  @Post()
  @ApiOperation({ summary: 'Tworzy nową grę' })
  @ApiResponse({
    status: 201,
    description: 'Gra została utworzona',
    type: CreateGameResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Nieprawidłowe dane wejściowe',
  })
  createGame(@Body() createGameDto: CreateGameDto): CreateGameResponseDto {
    const hostId = generatePlayerId();
    const gameState = this.lobbyService.createGame({
      hostId,
      hostName: createGameDto.hostName,
    });

    return {
      gameId: gameState.gameId,
      gamePin: gameState.gamePin,
      hostId,
      state: this.serializeGameState(gameState),
    };
  }

  /**
   * GET /games
   * Pobiera listę aktywnych gier
   */
  @Get()
  @ApiOperation({ summary: 'Pobiera listę aktywnych gier' })
  @ApiResponse({
    status: 200,
    description: 'Lista aktywnych gier',
    type: [GameListItemDto],
  })
  listGames(): GameListItemDto[] {
    const games = this.gameStateManager.getAllGames();
    return games.map((instance) => ({
      gameId: instance.state.gameId,
      gamePin: instance.state.gamePin,
      phase: instance.state.phase,
      round: instance.state.round,
      playersCount: instance.state.players.length,
      maxPlayers: instance.state.config.maxPlayers,
      hostId: instance.hostId,
      createdAt: instance.createdAt,
      lastActivity: instance.lastActivity,
    }));
  }

  /**
   * POST /games/join-by-pin
   * Dołącza gracza do gry używając PIN-u
   * MUSI być przed :gameId route'ami
   */
  @Post('join-by-pin')
  @ApiOperation({ summary: 'Dołącza gracza do gry używając PIN-u' })
  @ApiResponse({
    status: 201,
    description: 'Gracz został dodany do gry',
    type: JoinGameResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Nieprawidłowe dane',
  })
  @ApiResponse({
    status: 404,
    description: 'Gra nie istnieje',
  })
  joinGameByPin(@Body() joinGameDto: JoinGameDto): JoinGameResponseDto {
    if (!joinGameDto.gamePin) {
      throw new BadRequestException('gamePin jest wymagane');
    }

    const playerId = generatePlayerId();
    const gameState = this.lobbyService.joinGame({
      gamePin: joinGameDto.gamePin,
      playerId,
      playerName: joinGameDto.playerName,
    });

    return {
      gameId: gameState.gameId,
      playerId,
      state: this.serializeGameState(gameState),
    };
  }

  /**
   * POST /games/:gameId/start
   * Rozpoczyna grę (tylko host) z konfiguracją
   * MUSI być przed :gameId route'em
   */
  @Post(':gameId/start')
  @ApiOperation({ summary: 'Rozpoczyna grę (tylko host) z konfiguracją' })
  @ApiParam({ name: 'gameId', description: 'ID gry' })
  @ApiResponse({
    status: 200,
    description: 'Gra została rozpoczęta',
    type: StartGameResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Nieprawidłowa konfiguracja lub gra już się rozpoczęła',
  })
  @ApiResponse({
    status: 404,
    description: 'Gra nie istnieje',
  })
  startGame(
    @Param('gameId') gameId: string,
    @Body() startGameDto: StartGameDto,
  ): StartGameResponseDto {
    const gameState = this.gameService.startGame(
      gameId,
      startGameDto.config,
    );

    // Emituj aktualizację przez WebSocket
    this.gameGateway.emitGameStateUpdate(gameId, gameState);
    this.gameGateway.emitPhaseChange(gameId, gameState.phase, gameState.round);

    // Automatycznie przejdź do PLANNING po PREP (jeśli to PREP)
    if (gameState.phase === 'PREP') {
      setTimeout(() => {
        const planningState = this.gameService.enterPlanningPhase(gameId);
        this.gameGateway.emitGameStateUpdate(gameId, planningState);
        this.gameGateway.emitPhaseChange(gameId, planningState.phase, planningState.round);
        this.gameGateway.schedulePlanningPhaseTimeout(gameId);
      }, 2000); // 2 sekundy na PREP
    }

    return {
      gameId: gameState.gameId,
      state: this.serializeGameState(gameState),
    };
  }

  /**
   * POST /games/:gameId/join
   * Dołącza gracza do gry
   * MUSI być przed :gameId route'em
   */
  @Post(':gameId/join')
  @ApiOperation({ summary: 'Dołącza gracza do gry' })
  @ApiParam({ name: 'gameId', description: 'ID gry' })
  @ApiResponse({
    status: 201,
    description: 'Gracz został dodany do gry',
    type: JoinGameResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Nieprawidłowe dane',
  })
  @ApiResponse({
    status: 404,
    description: 'Gra nie istnieje',
  })
  joinGame(
    @Param('gameId') gameId: string,
    @Body() joinGameDto: JoinGameDto,
  ): JoinGameResponseDto {
    const playerId = generatePlayerId();
    const gameState = this.lobbyService.joinGame({
      gameId: gameId || undefined,
      gamePin: joinGameDto.gamePin,
      playerId,
      playerName: joinGameDto.playerName,
    });

    return {
      gameId: gameState.gameId,
      playerId,
      state: this.serializeGameState(gameState),
    };
  }


  /**
   * GET /games/:gameId/players
   * Pobiera listę graczy w grze
   * MUSI być przed :gameId route'em
   */
  @Get(':gameId/players')
  @ApiOperation({ summary: 'Pobiera listę graczy w grze' })
  @ApiParam({ name: 'gameId', description: 'ID gry' })
  @ApiResponse({
    status: 200,
    description: 'Lista graczy',
    type: PlayersListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Gra nie istnieje',
  })
  getPlayers(@Param('gameId') gameId: string): PlayersListResponseDto {
    const gameState = this.lobbyService.getGameState(gameId);
    if (!gameState) {
      throw new NotFoundException(`Gra ${gameId} nie istnieje`);
    }

    return {
      players: gameState.players.map((player) => ({
        id: player.id,
        name: player.name,
        gold: player.gold,
        buildingsCount: player.buildings.length,
        cardsCount: player.cards.length,
        profession: player.profession,
        order: player.order,
      })),
    };
  }

  /**
   * GET /games/:gameId/state
   * Pobiera pełny stan gry (alias dla GET /games/:gameId)
   * MUSI być przed :gameId route'em
   */
  @Get(':gameId/state')
  @ApiOperation({ summary: 'Pobiera pełny stan gry' })
  @ApiParam({ name: 'gameId', description: 'ID gry' })
  @ApiResponse({
    status: 200,
    description: 'Pełny stan gry',
    type: GameStateDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Gra nie istnieje',
  })
  getGameState(@Param('gameId') gameId: string): { gameId: string; state: GameStateDto } {
    return this.getGame(gameId);
  }

  /**
   * GET /games/:gameId
   * Pobiera stan gry
   * MUSI być na końcu, po wszystkich specyficznych route'ach
   */
  @Get(':gameId')
  @ApiOperation({ summary: 'Pobiera stan gry' })
  @ApiParam({ name: 'gameId', description: 'ID gry' })
  @ApiResponse({
    status: 200,
    description: 'Stan gry',
    type: GameStateDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Gra nie istnieje',
  })
  getGame(@Param('gameId') gameId: string): { gameId: string; state: GameStateDto } {
    const gameState = this.lobbyService.getGameState(gameId);
    if (!gameState) {
      throw new NotFoundException(`Gra ${gameId} nie istnieje`);
    }

    return {
      gameId: gameState.gameId,
      state: this.serializeGameState(gameState),
    };
  }

  /**
   * GET /games/category-colors
   * Zwraca kolory kategorii budynków
   */
  @Get('category-colors')
  @ApiOperation({ summary: 'Pobiera kolory kategorii budynków' })
  @ApiResponse({
    status: 200,
    description: 'Kolory kategorii budynków',
  })
  getCategoryColors(): Record<string, string> {
    return CATEGORY_COLORS;
  }

  /**
   * Serializuje stan gry do formatu odpowiedzi API
   */
  private serializeGameState(state: GameState): GameStateDto {
    return {
      gameId: state.gameId,
      gamePin: state.gamePin,
      phase: state.phase,
      round: state.round,
      players: state.players.map((player) => ({
        id: player.id,
        name: player.name,
        gold: player.gold,
        buildings: player.buildings.map((building) => ({
          id: building.id,
          type: building.type,
          category: building.category,
          value: building.value,
        })),
        cards: player.cards.map((card) => ({
          id: card.id,
          name: card.name,
          buildingType: card.buildingType,
          buildingCategory: card.buildingCategory,
          buildingValue: card.buildingValue,
        })),
        profession: player.profession,
        order: player.order,
      })),
      config: {
        maxRounds: state.config.maxRounds,
        victoryThreshold: state.config.victoryThreshold,
        eventFrequency: state.config.eventFrequency,
        minPlayers: state.config.minPlayers,
        maxPlayers: state.config.maxPlayers,
      },
      winner: state.winner,
    };
  }
}
