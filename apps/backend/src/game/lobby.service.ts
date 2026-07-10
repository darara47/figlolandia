import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  GameState,
  Player,
  GameConfig,
  GamePhase,
  generateGameId,
  generatePlayerId,
  generateGamePin,
  Profession,
  BuildingType,
  BuildingCategory,
  Card,
  BUILDING_DATA,
  getAllProfessions,
} from '@figlolandia/game-core';
import { GameStateManager } from './game.state';
import { CreateGameParams, JoinGameParams, GameInstance } from './types';
import { SeededRNG } from '../utils/rng';
import { GameAudit } from '../audit/GameAudit';

/**
 * Serwis zarządzający lobby - tworzenie gier i dołączanie graczy
 */
@Injectable()
export class LobbyService {
  private readonly DEFAULT_CONFIG: GameConfig = {
    maxRounds: 10,
    victoryThreshold: 50,
    eventFrequency: 0,
    lastMoveGoldBonus: 0,
    minPlayers: 3,
    maxPlayers: 8,
    animationSpeed: 'full',
  };

  constructor(
    private readonly gameStateManager: GameStateManager,
    private readonly gameAudit: GameAudit,
  ) { }

  /** Rejestruje w audycie karty startowe gracza (LOBBY, runda 0). */
  private auditStartingCards(state: GameState, player: Player): void {
    for (const card of player.cards) {
      this.gameAudit.event({
        gameId: state.gameId,
        round: 0,
        type: 'CARD_DRAWN',
        phase: 'LOBBY',
        step: 'starting_cards',
        playerId: player.id,
        message: `${player.name}: karta startowa ${card.name} (${card.buildingValue})`,
        payload: {
          cardId: card.id,
          cardName: card.name,
          buildingType: card.buildingType,
          buildingCategory: card.buildingCategory,
          buildingValue: card.buildingValue,
          source: 'lobby',
        },
      });
    }
  }

  /**
   * Tworzy nową grę (z domyślnym config)
   */
  createGame(params: CreateGameParams): GameState {
    const gameId = generateGameId();
    const hostId = params.hostId || generatePlayerId();

    // Generuj unikalny 6-cyfrowy PIN
    const existingPins = new Set(
      this.gameStateManager.getAllGames().map((g) => g.state.gamePin)
    );
    const gamePin = generateGamePin(existingPins);

    // Użyj domyślnej konfiguracji (będzie można zmienić przy starcie)
    const config: GameConfig = {
      ...this.DEFAULT_CONFIG,
    };

    // Utwórz gracza-hosta (start z 4 złotkami i 2 kartami budynków)
    const rng = new SeededRNG(Date.now());
    const startingCards = Array.from({ length: 2 }, (_, idx) =>
      this.drawBuildingCard(rng, `card-start-${Date.now()}-${idx}`)
    );

    const host: Player = {
      id: hostId,
      name: params.hostName,
      gold: 4, // Start z 4 złotkami
      buildings: [],
      cards: startingCards,
      profession: null,
      lastProfession: null,
      joinOrder: 0,
      order: 0,
      professionAbilityUsed: false,
      protected: false,
      delayedBuildings: false,
      deferredBuildActions: [],
      urbanistPendingBuildBoost: false,
      buildingsBuiltThisRound: 0,
    };

    // Utwórz stan gry
    const state: GameState = {
      gameId,
      gamePin,
      phase: 'LOBBY',
      round: 0,
      players: [host],
      config,
      seed: Date.now(), // seed z timestampu
      winner: null,
      pendingActions: new Map(),
    };

    // Utwórz instancję gry
    const instance: GameInstance = {
      state,
      clients: new Set(),
      hostId,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.gameStateManager.createGame(instance);
    this.gameStateManager.mapPlayerToGame(hostId, gameId);

    this.gameAudit.gameCreated(state);
    this.gameAudit.playerJoined(state, hostId, params.hostName);
    this.auditStartingCards(state, host);

    return state;
  }

  /**
   * Dołącza gracza do gry (po gameId lub gamePin)
   */
  joinGame(params: JoinGameParams): GameState {
    let instance: any = null;
    let gameId: string | undefined = params.gameId;

    // Jeśli podano gameId, spróbuj znaleźć po nim
    if (gameId) {
      instance = this.gameStateManager.getGame(gameId);
    }

    // Jeśli nie znaleziono po gameId, spróbuj po PIN
    if (!instance && params.gamePin) {
      gameId = this.gameStateManager.getGameIdByPin(params.gamePin);
      if (gameId) {
        instance = this.gameStateManager.getGame(gameId);
      }
    }

    if (!instance || !gameId) {
      throw new NotFoundException(
        params.gamePin
          ? `Gra z PIN-em ${params.gamePin} nie istnieje`
          : `Gra ${params.gameId} nie istnieje`
      );
    }

    const { state } = instance;

    // Sprawdź fazę
    if (state.phase !== 'LOBBY') {
      throw new BadRequestException('Nie można dołączyć do gry w trakcie');
    }

    // Sprawdź liczbę graczy
    if (state.players.length >= state.config.maxPlayers) {
      throw new BadRequestException('Gra jest pełna');
    }

    // Sprawdź czy gracz już jest w grze
    if (state.players.some((p) => p.id === params.playerId)) {
      throw new BadRequestException('Gracz już jest w grze');
    }

    // Utwórz nowego gracza (start z 4 złotkami i 2 kartami budynków)
    const rng = new SeededRNG(Date.now() + state.players.length);
    const startingCards = Array.from({ length: 2 }, (_, idx) =>
      this.drawBuildingCard(rng, `card-start-${Date.now()}-${idx}`)
    );

    const newPlayer: Player = {
      id: params.playerId,
      name: params.playerName,
      gold: 4, // Start z 4 złotkami
      buildings: [],
      cards: startingCards,
      profession: null,
      lastProfession: null,
      joinOrder: state.players.length,
      order: state.players.length,
      professionAbilityUsed: false,
      protected: false,
      delayedBuildings: false,
      deferredBuildActions: [],
      urbanistPendingBuildBoost: false,
      buildingsBuiltThisRound: 0,
    };

    // Dodaj gracza
    state.players.push(newPlayer);
    this.gameStateManager.mapPlayerToGame(params.playerId, gameId);
    this.gameStateManager.updateGameState(gameId, state);

    this.gameAudit.playerJoined(state, newPlayer.id, newPlayer.name);
    this.auditStartingCards(state, newPlayer);

    return state;
  }

  /**
   * Sprawdza czy można rozpocząć grę
   */
  canStartGame(gameId: string): boolean {
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance) {
      return false;
    }

    const { state } = instance;
    return (
      state.phase === 'LOBBY' &&
      state.players.length >= state.config.minPlayers &&
      state.players.length <= state.config.maxPlayers
    );
  }

  /**
   * Pobiera stan gry
   */
  getGameState(gameId: string): GameState | null {
    const instance = this.gameStateManager.getGame(gameId);
    return instance?.state || null;
  }

  /**
   * Losuje kartę budynku zgodnie z nową logiką:
   * 1. Losuje wartość 1-5 (równe szanse)
   * 2. Losuje kategorię budynku
   * 3. Znajduje budynki z tą wartością w przedziale I z tą kategorią
   * 4. Losuje jeden z tych budynków
   */
  private drawBuildingCard(
    rng: SeededRNG,
    cardId: string
  ): Card {
    // 1. Losuj wartość 1-5 (równe szanse)
    const value = rng.randomInt(1, 5);

    // 2. Losuj kategorię budynku
    const categories: BuildingCategory[] = [
      'education',
      'health',
      'finance',
      'administration',
      'entertainment',
    ];
    const category = rng.randomChoice(categories);

    // 3. Znajdź wszystkie budynki, które mają tę wartość w przedziale I z tą kategorią
    const allBuildingTypes = Object.keys(BUILDING_DATA) as BuildingType[];
    const availableBuildings = allBuildingTypes.filter((type) => {
      const buildingData = BUILDING_DATA[type];
      const hasValueInRange =
        value >= buildingData.valueRange[0] && value <= buildingData.valueRange[1];
      const hasCategory = buildingData.category === category;
      return hasValueInRange && hasCategory;
    });

    // 4. Losuj jeden z dostępnych budynków
    if (availableBuildings.length === 0) {
      // Fallback: jeśli nie ma budynków spełniających warunki, losuj z wszystkich
      const fallbackBuildings = allBuildingTypes.filter((type) => {
        const buildingData = BUILDING_DATA[type];
        return value >= buildingData.valueRange[0] && value <= buildingData.valueRange[1];
      });
      const buildingType = rng.randomChoice(fallbackBuildings);
      const buildingData = BUILDING_DATA[buildingType];
      return {
        id: cardId,
        name: buildingData.name,
        buildingType,
        buildingCategory: buildingData.category,
        buildingValue: value,
      };
    }

    const buildingType = rng.randomChoice(availableBuildings);
    const buildingData = BUILDING_DATA[buildingType];

    return {
      id: cardId,
      name: buildingData.name,
      buildingType,
      buildingCategory: buildingData.category,
      buildingValue: value,
    };
  }
}

