import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  GameState,
  GameConfig,
  AnimationSpeed,
  Player,
  PlayerAction,
  RoundEngine,
  BuildingType,
  BuildingCategory,
  Card,
  BUILDING_DATA,
  getAssignableProfessions,
  getResolutionAdvanceDelayMs,
} from '@figlolandia/game-core';
import { GameStateManager } from './game.state';
import { SeededRNG } from '../utils/rng';
import { NarrativeService } from './narrative.service';
import { NarrativeEvent } from '../websocket/ws.types';
import { GameAudit } from '../audit/GameAudit';

type PlanningStep = {
  buildConfirmed: boolean;
  abilityConfirmed: boolean;
  buildActions: PlayerAction[];
  abilityActions: PlayerAction[];
};

type ResolutionPending = {
  resolvedState: GameState;
  narrativeEvents: NarrativeEvent[];
};

/**
 * Główny serwis zarządzający logiką gry i fazami
 * Używa game-core do rozstrzygania rund
 */
@Injectable()
export class GameService {
  static readonly PLANNING_PHASE_TIMEOUT_MS = 600000; // 10 minut
  private readonly PLANNING_TIMEOUT = GameService.PLANNING_PHASE_TIMEOUT_MS;
  private planningTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // gameId -> playerId -> planning step
  private planningStepsByGame: Map<string, Map<string, PlanningStep>> = new Map();
  private resolutionPendingByGame: Map<string, ResolutionPending> = new Map();
  private skipResolutionVotesByGame: Map<string, Set<string>> = new Map();
  private resolutionSkippedByGame: Map<string, boolean> = new Map();

  constructor(
    private readonly gameStateManager: GameStateManager,
    private readonly narrativeService: NarrativeService,
    private readonly gameAudit: GameAudit,
  ) { }

  /** JSON clone traci Map — przywraca pendingActions i spiedHands przed użyciem stanu gry. */
  private hydrateGameState(raw: GameState): GameState {
    const state = raw;

    if (!(state.pendingActions instanceof Map)) {
      const entries = Object.entries(
        (state.pendingActions as unknown as Record<string, PlayerAction[]>) ?? {},
      );
      state.pendingActions = new Map(entries);
    }

    if (state.spiedHands && !(state.spiedHands instanceof Map)) {
      state.spiedHands = new Map(
        Object.entries(state.spiedHands as unknown as Record<string, Card[]>),
      );
    }

    return state;
  }

  private cloneGameState(state: GameState): GameState {
    return this.hydrateGameState(JSON.parse(JSON.stringify(state)) as GameState);
  }

  /**
   * Rozpoczyna grę (przechodzi z LOBBY do PREP) z konfiguracją
   */
  startGame(gameId: string, configOverride?: Partial<GameConfig>): GameState {
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance) {
      throw new NotFoundException(`Gra ${gameId} nie istnieje`);
    }

    const { state } = instance;

    if (state.phase !== 'LOBBY') {
      throw new BadRequestException('Gra już się rozpoczęła');
    }

    // Zastosuj konfigurację jeśli podana
    if (configOverride) {
      state.config = {
        ...state.config,
        ...configOverride,
      };

      // Walidacja konfiguracji
      if (state.config.minPlayers < 3 || state.config.maxPlayers > 8) {
        throw new BadRequestException(
          'Liczba graczy musi być między 3 a 8'
        );
      }

      if (state.config.maxRounds < 1) {
        throw new BadRequestException('Liczba rund musi być większa od 0');
      }

      if (state.config.victoryThreshold < 1) {
        throw new BadRequestException('Próg zwycięstwa musi być większy od 0');
      }

      if (state.config.eventFrequency < 0 || state.config.eventFrequency > 100) {
        throw new BadRequestException(
          'Częstotliwość zdarzeń musi być między 0 a 100'
        );
      }

      if (state.config.lastMoveGoldBonus < 0) {
        throw new BadRequestException(
          'Bonus złota za ostatni ruch nie może być ujemny'
        );
      }

      const validSpeeds = ['full', 'fast', 'off'] as const;
      if (!validSpeeds.includes(state.config.animationSpeed)) {
        throw new BadRequestException(
          'Tempo animacji musi być: full, fast lub off'
        );
      }
    }

    if (state.players.length < state.config.minPlayers) {
      throw new BadRequestException(
        `Wymagane minimum ${state.config.minPlayers} graczy`
      );
    }

    // Przejdź do fazy PREP
    state.phase = 'PREP';
    state.round = 1;

    this.gameAudit.gameStarted(state);

    // Wykonaj przygotowanie rundy
    this.prepareRound(state);

    this.gameStateManager.updateGameState(gameId, state);
    return state;
  }

  /**
   * Faza PREP: przygotowanie rundy
   */
  private prepareRound(state: GameState): void {
    const rng = new SeededRNG(state.seed + state.round);
    // Otwiera rundę w audycie: wiersz w rounds, event ROUND_STARTED,
    // snapshot BEFORE_PREPARATION i kontekst emittera dla RoundEngine.
    this.gameAudit.beginRound(state);

    // Reset stanów zawodów
    state.players.forEach((player) => {
      player.professionAbilityUsed = false;
      player.protected = false;
      player.delayedBuildings = false;
      player.buildingsBuiltThisRound = 0;
      player.luckyGoldGranted = undefined;
    });

    // 1. Losuj zawody (bez powtórzenia z poprzedniej rundy i bez duplikatów w tej samej rundzie)
    const allProfessions = getAssignableProfessions();
    const assignedProfessions: Set<string> = new Set();

    state.players.forEach((player) => {
      const availableProfessions = allProfessions.filter(
        (p) => p !== player.lastProfession && !assignedProfessions.has(p)
      );

      // Jeśli nie ma dostępnych zawodów (np. za mało zawodów dla liczby graczy),
      // pozwól na powtórzenie, ale unikaj duplikatów w tej samej rundzie
      if (availableProfessions.length === 0) {
        const fallbackProfessions = allProfessions.filter(
          (p) => !assignedProfessions.has(p)
        );
        if (fallbackProfessions.length > 0) {
          player.profession = rng.randomChoice(fallbackProfessions);
        } else {
          // Ostatnia deska ratunku: losuj z wszystkich (nie powinno się zdarzyć)
          player.profession = rng.randomChoice(allProfessions);
        }
      } else {
        player.profession = rng.randomChoice(availableProfessions);
      }

      if (player.profession) {
        assignedProfessions.add(player.profession);
        player.lastProfession = player.profession;
        this.gameAudit.event({
          gameId: state.gameId,
          round: state.round,
          type: 'PROFESSION_ASSIGNED',
          phase: 'PREP',
          step: 'profession',
          playerId: player.id,
          message: `${player.name}: przypisano zawód ${player.profession}`,
          payload: { profession: player.profession },
        });
      }
    });

    // 2. Rozdaj złotki: każdy gracz otrzymuje 2 złotki
    state.players.forEach((player) => {
      const goldBefore = player.gold;
      player.gold += 2;
      this.gameAudit.goldChange({
        gameId: state.gameId,
        round: state.round,
        type: 'BASE_INCOME',
        phase: 'PREP',
        step: 'base_income',
        player,
        before: goldBefore,
        after: player.gold,
        delta: player.gold - goldBefore,
        reason: 'base_income',
        payload: { amount: 2 },
      });
    });

    // 3. Rozdaj karty budynków: każdy gracz otrzymuje 1 kartę budynku
    // Inwestor otrzymuje +1 kartę (łącznie 2)
    // Dla pierwszych trzech kart w całej grze: nie mogą się powtarzać budynki i muszą być co najmniej 2 kategorie
    state.players.forEach((player) => {
      const cardsToDraw = player.profession === 'investor' ? 2 : 1;

      // Dla pierwszych trzech kart: śledź wylosowane typy budynków i kategorie
      const drawnBuildingTypes = new Set<BuildingType>();
      const drawnCategories = new Set<BuildingCategory>();

      // Dodaj już istniejące karty do zestawów (dla pierwszych trzech kart)
      player.cards.forEach(card => {
        drawnBuildingTypes.add(card.buildingType);
        drawnCategories.add(card.buildingCategory);
      });

      for (let i = 0; i < cardsToDraw; i++) {
        // Sprawdź czy to jest jedna z pierwszych trzech kart w całej grze
        const totalCardsAfterThis = player.cards.length + i;
        const isFirstThreeCards = totalCardsAfterThis < 3;

        const card = this.drawBuildingCard(
          rng,
          `card-${Date.now()}-${Math.random()}-${i}`,
          player,
          isFirstThreeCards ? drawnBuildingTypes : undefined,
          isFirstThreeCards ? drawnCategories : undefined
        );

        // Dodaj do zestawów jeśli to pierwsze trzy karty
        if (isFirstThreeCards) {
          drawnBuildingTypes.add(card.buildingType);
          drawnCategories.add(card.buildingCategory);
        }

        player.cards.push(card);

        this.gameAudit.event({
          gameId: state.gameId,
          round: state.round,
          type: 'CARD_DRAWN',
          phase: 'PREP',
          step: 'card_draw',
          playerId: player.id,
          message: `${player.name}: dobrano kartę ${card.name} (${card.buildingValue})`,
          payload: {
            cardId: card.id,
            cardName: card.name,
            buildingType: card.buildingType,
            buildingCategory: card.buildingCategory,
            buildingValue: card.buildingValue,
            source: 'prep',
          },
        });
      }
    });

    // 4. Ustal kolejność rozstrzygania (losowa)
    const playerIds = state.players.map((p) => p.id);
    const shuffledIds = rng.shuffle(playerIds);
    state.players.forEach((player) => {
      player.order = shuffledIds.indexOf(player.id);
    });

    // 5. Gracz rozstrzygany jako ostatni otrzymuje bonus złota (konfigurowalny w lobby)
    const lastMoveGoldBonus = state.config.lastMoveGoldBonus ?? 0;
    if (lastMoveGoldBonus > 0) {
      const lastPlayer = state.players.find(
        (p) => p.order === state.players.length - 1
      );
      if (lastPlayer) {
        const goldBefore = lastPlayer.gold;
        lastPlayer.gold += lastMoveGoldBonus;
        this.gameAudit.goldChange({
          gameId: state.gameId,
          round: state.round,
          type: 'LAST_IN_ORDER_BONUS',
          phase: 'PREP',
          step: 'last_in_order',
          player: lastPlayer,
          before: goldBefore,
          after: lastPlayer.gold,
          delta: lastPlayer.gold - goldBefore,
          reason: 'last_in_order_bonus',
          payload: { order: lastPlayer.order, bonus: lastMoveGoldBonus },
        });
      }
    }

    this.gameAudit.turnOrderSet(state);

    // 6. Rozstrzygnij zdarzenia losowe (przed fazą PLANNING)
    // UWAGA: Zdarzenia losowe mogą dać bonus złota (1-3) losowemu graczowi,
    // co może powodować różnice w złocie między graczami
    RoundEngine.resolveRandomEvents(state.players, state, rng);

    // Reset opodatkowanej kategorii (Polityk)
    state.taxedCategory = undefined;

    // Wyczyść podglądnięte ręce (Szpieg)
    if (state.spiedHands) {
      state.spiedHands.clear();
    }

    // Wyczyść poprzednie akcje
    state.pendingActions.clear();

    this.gameAudit.snapshotState(
      state.gameId,
      state.round,
      'PREP',
      'AFTER_PREPARATION',
      state,
    );
  }

  /**
   * Przechodzi do fazy PLANNING
   */
  enterPlanningPhase(gameId: string): GameState {
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance) {
      throw new NotFoundException(`Gra ${gameId} nie istnieje`);
    }

    const { state } = instance;

    if (state.phase !== 'PREP') {
      throw new BadRequestException('Nie można przejść do PLANNING z fazy ' + state.phase);
    }

    state.phase = 'PLANNING';

    // Zapisz czas startu fazy PLANNING w autorytatywnym stanie gry.
    // Ustawiany dokładnie raz na rundę, więc timer resetuje się tylko przy nowej rundzie.
    state.planningPhaseStartTime = Date.now();

    // Reset kroki PLANNING (separacja "Buduj" i "Zatwierdź zdolność").
    // Dla części zawodów zdolność nie wymaga wyboru celu -> auto-potwierdzenie.
    const autoAbilityProfessions = new Set(['lucky', 'diplomat', 'urbanist']);
    const planningSteps = new Map<string, PlanningStep>();
    for (const player of state.players) {
      const profession = player.profession;
      const abilityRequiresPlayerTarget =
        profession === 'saboteur' ||
        profession === 'vandal' ||
        profession === 'thief' ||
        profession === 'inspector' ||
        profession === 'spy';
      // Polityk nie wskazuje gracza, ale musi wybrać opodatkowaną kategorię,
      // więc jego zdolność również wymaga jawnego zatwierdzenia.
      const abilityRequiresChoice =
        abilityRequiresPlayerTarget || profession === 'politician';

      const autoAbilityAction =
        profession && autoAbilityProfessions.has(profession)
          ? [{ type: 'use_profession' as const, professionAbility: true }]
          : [];

      planningSteps.set(player.id, {
        buildConfirmed: false,
        abilityConfirmed: !abilityRequiresChoice,
        buildActions: [],
        abilityActions: autoAbilityAction,
      });
    }
    this.planningStepsByGame.set(gameId, planningSteps);

    // Na starcie PLANNING wyczyść akcje do rozstrzygnięcia.
    state.pendingActions.clear();
    this.gameStateManager.updateGameState(gameId, state);

    // Timeout jest zarządzany przez GameGateway, aby móc emitować aktualizacje do klientów
    // this.setPlanningTimeout(gameId);

    return state;
  }

  /**
   * Potwierdzenie wyboru budowy (PLANNING).
   * Zapisuje build step, ale nie kończy rundy dopóki nie ma też potwierdzenia zdolności.
   */
  confirmBuild(
    gameId: string,
    playerId: string,
    buildActions: PlayerAction[],
  ): GameState {
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance) {
      throw new NotFoundException(`Gra ${gameId} nie istnieje`);
    }

    const { state } = instance;
    if (state.phase !== 'PLANNING') {
      throw new BadRequestException('Nie można wysłać budowy w fazie ' + state.phase);
    }

    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new NotFoundException('Gracz nie jest w grze');
    }

    // Waliduj tylko budowę (jeśli puste, to oznacza pominięcie budowy).
    this.validateActions(player, buildActions, state);

    const planningSteps = this.planningStepsByGame.get(gameId);
    if (!planningSteps) {
      throw new BadRequestException('Nie zainicjalizowano kroków PLANNING');
    }

    const step = planningSteps.get(playerId);
    if (!step) {
      throw new BadRequestException('Nie znaleziono kroku PLANNING gracza');
    }

    step.buildConfirmed = true;
    step.buildActions = buildActions;

    const combinedActions = [...step.buildActions, ...step.abilityActions];
    state.pendingActions.set(playerId, combinedActions);
    this.gameStateManager.updateGameState(gameId, state);

    if (this.allPlayersSubmitted(gameId, state)) {
      return this.enterResolutionPhase(gameId);
    }

    return state;
  }

  /**
   * Potwierdzenie zdolności specjalnej (PLANNING).
   */
  confirmAbility(
    gameId: string,
    playerId: string,
    abilityAction: PlayerAction,
  ): GameState {
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance) {
      throw new NotFoundException(`Gra ${gameId} nie istnieje`);
    }

    const { state } = instance;
    if (state.phase !== 'PLANNING') {
      throw new BadRequestException('Nie można wysłać zdolności w fazie ' + state.phase);
    }

    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new NotFoundException('Gracz nie jest w grze');
    }

    this.validateActions(player, [abilityAction], state);

    const planningSteps = this.planningStepsByGame.get(gameId);
    if (!planningSteps) {
      throw new BadRequestException('Nie zainicjalizowano kroków PLANNING');
    }

    const step = planningSteps.get(playerId);
    if (!step) {
      throw new BadRequestException('Nie znaleziono kroku PLANNING gracza');
    }

    step.abilityConfirmed = true;
    step.abilityActions = [abilityAction];

    const combinedActions = [...step.buildActions, ...step.abilityActions];
    state.pendingActions.set(playerId, combinedActions);
    this.gameStateManager.updateGameState(gameId, state);

    if (this.allPlayersSubmitted(gameId, state)) {
      return this.enterResolutionPhase(gameId);
    }

    return state;
  }

  /**
   * Statusy PLANNING dla każdego gracza (dla UI).
   */
  getPlanningStatus(gameId: string): Record<string, { buildConfirmed: boolean; abilityConfirmed: boolean }> {
    const planningSteps = this.planningStepsByGame.get(gameId);
    const result: Record<string, { buildConfirmed: boolean; abilityConfirmed: boolean }> = {};
    if (!planningSteps) return result;

    planningSteps.forEach((step, playerId) => {
      result[playerId] = {
        buildConfirmed: step.buildConfirmed,
        abilityConfirmed: step.abilityConfirmed,
      };
    });

    return result;
  }

  /**
   * Zapisuje akcje gracza (faza PLANNING)
   */
  submitActions(
    gameId: string,
    playerId: string,
    actions: PlayerAction[]
  ): GameState {
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance) {
      throw new NotFoundException(`Gra ${gameId} nie istnieje`);
    }

    const { state } = instance;

    if (state.phase !== 'PLANNING') {
      throw new BadRequestException('Nie można wysłać akcji w fazie ' + state.phase);
    }

    // Walidacja gracza
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new NotFoundException('Gracz nie jest w grze');
    }

    // Walidacja akcji (dla kompatybilności ze starym protokołem SUBMIT_ACTIONS)
    this.validateActions(player, actions, state);

    const planningSteps = this.planningStepsByGame.get(gameId);
    if (!planningSteps) {
      throw new BadRequestException('Nie zainicjalizowano kroków PLANNING');
    }
    const step = planningSteps.get(playerId);
    if (!step) {
      throw new BadRequestException('Nie znaleziono kroku PLANNING gracza');
    }

    const buildActions = actions.filter((a) => a.type === 'build');
    const abilityActions = actions.filter(
      (a) => a.type === 'use_profession' && a.professionAbility,
    );

    // SUBMIT_ACTIONS historycznie traktował kliknięcie jako "zapisz i zamknij".
    // Dla kompatybilności:
    // - buildConfirmed ustawiamy, jeśli są buildActions albo jeśli build nie był jeszcze potwierdzony.
    // - abilityConfirmed ustawiamy, jeśli payload zawiera use_profession.
    if (buildActions.length > 0 || !step.buildConfirmed) {
      step.buildConfirmed = true;
      step.buildActions = buildActions;
    }

    if (abilityActions.length > 0) {
      step.abilityConfirmed = true;
      // W MVP zakładamy 0..1 zdolności na krok (wysyłana jedna).
      step.abilityActions = abilityActions.slice(0, 1);
    }

    const combinedActions = [...step.buildActions, ...step.abilityActions];
    state.pendingActions.set(playerId, combinedActions);
    this.gameStateManager.updateGameState(gameId, state);

    if (this.allPlayersSubmitted(gameId, state)) {
      return this.enterResolutionPhase(gameId);
    }

    return state;
  }

  /**
   * Waliduje akcje gracza
   */
  private validateActions(player: Player, actions: PlayerAction[], state: GameState): void {
    // Limit budynków na rundę: Budowlaniec może wybudować +1 (2), pozostali 1.
    const maxBuildings = player.profession === 'builder' ? 2 : 1;
    const buildCount = actions.filter((a) => a.type === 'build').length;
    if (buildCount > maxBuildings) {
      throw new BadRequestException(
        `Możesz wybudować maksymalnie ${maxBuildings} ${maxBuildings === 1 ? 'budynek' : 'budynki'} w tej rundzie`,
      );
    }

    for (const action of actions) {
      // Sprawdź czy gracz ma kartę (jeśli wymagana)
      if (action.cardId) {
        const hasCard = player.cards.some((c) => c.id === action.cardId);
        if (!hasCard) {
          throw new BadRequestException('Gracz nie ma karty ' + action.cardId);
        }
      }

      // Waliduj tylko poprawność typu budynku.
      // Koszt/złoto NIE jest twardo walidowany tutaj: jeśli gracza nie stać,
      // budowa jest pomijana z fallbackiem (i logiem) w RoundEngine.resolveBuildings.
      if (action.type === 'build' && action.buildingType) {
        const buildingData = BUILDING_DATA[action.buildingType];
        if (!buildingData) {
          throw new BadRequestException('Nieprawidłowy typ budynku');
        }
      }

      // Walidacja zdolności zawodowych
      if (action.type === 'use_profession' && action.professionAbility) {
        if (player.professionAbilityUsed) {
          throw new BadRequestException('Zdolność zawodowa już została użyta');
        }

        // Specyficzne walidacje dla zawodów
        if (player.profession === 'thief' && !action.target) {
          throw new BadRequestException('Złodziej wymaga celu');
        }
        if (player.profession === 'vandal' && !action.target) {
          throw new BadRequestException('Wandal wymaga celu');
        }
        if (player.profession === 'saboteur' && !action.target) {
          throw new BadRequestException('Sabotażysta wymaga celu');
        }
        if (player.profession === 'inspector' && !action.target) {
          throw new BadRequestException('Inspektor wymaga celu');
        }
        if (player.profession === 'politician' && !action.taxedCategory) {
          throw new BadRequestException('Polityk wymaga wyboru kategorii');
        }
        if (player.profession === 'spy' && !action.target) {
          throw new BadRequestException('Szpieg wymaga celu');
        }
        if (player.profession === 'urbanist' && action.type === 'use_profession') {
          // Urbanista musi wskazać budynek którego wartość zwiększa się o 1
          // To jest opcjonalne - jeśli nie wskaże, zdolność nie zadziała
        }
      }
    }
  }

  /**
   * Sprawdza czy wszyscy gracze wysłali akcje
   */
  private allPlayersSubmitted(gameId: string, state: GameState): boolean {
    const planningSteps = this.planningStepsByGame.get(gameId);

    // Fallback (np. jeśli kroki nie zostały zainicjalizowane)
    if (!planningSteps) {
      return state.players.every((player) => state.pendingActions.has(player.id));
    }

    return state.players.every((player) => {
      const step = planningSteps.get(player.id);
      return !!step && step.buildConfirmed && step.abilityConfirmed;
    });
  }

  /**
   * Pozostały czas fazy PLANNING (ms), na podstawie autorytatywnego startu rundy.
   */
  getPlanningPhaseRemainingMs(gameId: string): number | null {
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance || instance.state.phase !== 'PLANNING') {
      return null;
    }

    const startTime = instance.state.planningPhaseStartTime;
    if (!startTime) {
      return this.PLANNING_TIMEOUT;
    }

    return Math.max(0, this.PLANNING_TIMEOUT - (Date.now() - startTime));
  }

  /**
   * Przechodzi do fazy RESOLUTION i rozstrzyga rundę
   */
  enterResolutionPhase(
    gameId: string,
    options?: { skipIncompletePlayers?: boolean },
  ): GameState {
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance) {
      throw new NotFoundException(`Gra ${gameId} nie istnieje`);
    }

    const { state } = instance;

    if (state.phase !== 'PLANNING') {
      throw new BadRequestException('Nie można przejść do RESOLUTION z fazy ' + state.phase);
    }

    // Przebuduj pendingActions z potwierdzonych kroków PLANNING.
    // Dzięki temu RoundEngine dostaje kompletne akcje (build + ability) niezależnie od kolejności kliknięć.
    const planningSteps = this.planningStepsByGame.get(gameId);
    if (planningSteps) {
      const autoAbilityProfessions = new Set(['lucky', 'diplomat', 'urbanist']);
      state.pendingActions.clear();
      for (const p of state.players) {
        const step = planningSteps.get(p.id);
        const fullySubmitted =
          !!step && step.buildConfirmed && step.abilityConfirmed;

        if (options?.skipIncompletePlayers && !fullySubmitted) {
          state.pendingActions.set(p.id, []);
          this.gameAudit.event({
            gameId: state.gameId,
            round: state.round,
            type: 'PLANNING_CONFIRMED',
            phase: 'RESOLUTION',
            step: 'planning_input',
            playerId: p.id,
            message: `${p.name}: pominięto — brak pełnego zatwierdzenia przed timeoutem`,
            payload: {
              profession: p.profession,
              buildConfirmed: step?.buildConfirmed ?? false,
              abilityConfirmed: step?.abilityConfirmed ?? false,
              buildActions: [],
              abilityActions: [],
              autoInjected: false,
              skipped: true,
            },
          });
          continue;
        }

        let abilityActions = step?.abilityActions || [];
        const autoInjected =
          step?.abilityConfirmed &&
          abilityActions.length === 0 &&
          !!p.profession &&
          autoAbilityProfessions.has(p.profession);
        if (autoInjected) {
          abilityActions = [{ type: 'use_profession', professionAbility: true }];
        }
        const combined = [...(step?.buildActions || []), ...abilityActions];
        state.pendingActions.set(p.id, combined);

        this.gameAudit.event({
          gameId: state.gameId,
          round: state.round,
          type: 'PLANNING_CONFIRMED',
          phase: 'RESOLUTION',
          step: 'planning_input',
          playerId: p.id,
          message: `${p.name}: akcje wejściowe do RoundEngine`,
          payload: {
            profession: p.profession,
            buildConfirmed: step?.buildConfirmed ?? false,
            abilityConfirmed: step?.abilityConfirmed ?? false,
            buildActions: step?.buildActions ?? [],
            abilityActions,
            autoInjected: !!autoInjected,
            skipped: false,
          },
        });
      }
    } else {
      this.gameAudit.event({
        gameId: state.gameId,
        round: state.round,
        type: 'INVALID_ACTION',
        phase: 'RESOLUTION',
        step: 'planning_input',
        message: 'Brak planningSteps — używam istniejących pendingActions',
        payload: {
          action: 'planning_input',
          reason: 'missing_planning_steps_fallback',
        },
      });
    }

    // Zapisz stan przed rozstrzygnięciem (dla narratora)
    const beforeState = JSON.parse(JSON.stringify(state));

    state.phase = 'RESOLUTION';

    // Użyj game-core do rozstrzygnięcia rundy
    const resolvedState = RoundEngine.resolveRound(
      state,
      state.pendingActions
    );

    // Usuń użyte karty
    resolvedState.players.forEach((player) => {
      const actions = resolvedState.pendingActions.get(player.id) || [];
      actions.forEach((action) => {
        if (action.cardId) {
          const cardIndex = player.cards.findIndex((c) => c.id === action.cardId);
          if (cardIndex !== -1) {
            const removedCard = player.cards[cardIndex];
            player.cards.splice(cardIndex, 1);
            this.gameAudit.event({
              gameId: resolvedState.gameId,
              round: resolvedState.round,
              type: 'CARD_REMOVED',
              phase: 'RESOLUTION',
              step: 'card_used',
              playerId: player.id,
              message: `${player.name}: zużyto kartę ${removedCard.name}`,
              payload: {
                cardId: removedCard.id,
                cardName: removedCard.name,
                reason: 'used',
              },
            });
          }
        }
      });
    });

    // Wyczyść podglądnięte ręce (Szpieg) po rozstrzygnięciu
    if (resolvedState.spiedHands) {
      resolvedState.spiedHands.clear();
    }

    // Punkty zwycięstwa po rozstrzygnięciu (spójne ze snapshotem END_ROUND)
    resolvedState.players.forEach((player) => {
      const buildingsValue = player.buildings.reduce(
        (sum, b) => sum + b.value,
        0,
      );
      this.gameAudit.event({
        gameId: resolvedState.gameId,
        round: resolvedState.round,
        type: 'VICTORY_POINTS',
        phase: 'RESOLUTION',
        step: 'victory_points',
        playerId: player.id,
        message: `${player.name}: ${player.gold + buildingsValue} pkt (złoto ${player.gold} + budynki ${buildingsValue})`,
        payload: {
          points: player.gold + buildingsValue,
          gold: player.gold,
          buildingsValue,
          buildingsCount: player.buildings.length,
        },
      });
    });

    this.gameAudit.snapshotState(
      resolvedState.gameId,
      resolvedState.round,
      'RESOLUTION',
      'END_ROUND',
      resolvedState,
    );

    // Generuj wydarzenia narratora
    const pendingActionsSnapshot = new Map(state.pendingActions);
    const narrativeEvents = this.narrativeService.generateNarrativeEvents(
      beforeState,
      resolvedState,
      pendingActionsSnapshot,
    );

    const winner = RoundEngine.checkVictory(resolvedState);
    const pendingResolved = this.cloneGameState(resolvedState);
    if (winner) {
      pendingResolved.winner = winner;
      pendingResolved.phase = 'END';
    } else {
      pendingResolved.round += 1;
      pendingResolved.phase = 'PREP';
    }

    this.resolutionPendingByGame.set(gameId, {
      resolvedState: pendingResolved,
      narrativeEvents,
    });
    this.skipResolutionVotesByGame.set(gameId, new Set());
    this.resolutionSkippedByGame.delete(gameId);

    const displayState = this.cloneGameState(beforeState);
    displayState.phase = 'RESOLUTION';
    (displayState as GameState & { narrativeEvents?: NarrativeEvent[] }).narrativeEvents =
      narrativeEvents;

    this.gameStateManager.updateGameState(gameId, displayState);
    this.planningStepsByGame.delete(gameId);
    return displayState;
  }

  getSkipResolutionVotes(gameId: string): string[] {
    return [...(this.skipResolutionVotesByGame.get(gameId) ?? [])];
  }

  wasResolutionSkipped(gameId: string): boolean {
    return this.resolutionSkippedByGame.get(gameId) ?? false;
  }

  getResolutionAdvanceDelayMs(gameId: string): number {
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance) return 0;
    const playerCount = instance.state.players.length;
    const speed: AnimationSpeed = instance.state.config.animationSpeed ?? 'full';
    return getResolutionAdvanceDelayMs(playerCount, speed);
  }

  voteSkipResolution(
    gameId: string,
    playerId: string,
  ): { allVoted: boolean; state: GameState } {
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance) {
      throw new NotFoundException(`Gra ${gameId} nie istnieje`);
    }
    if (instance.state.phase !== 'RESOLUTION') {
      throw new BadRequestException('Głosowanie możliwe tylko w fazie RESOLUTION');
    }

    const votes = this.skipResolutionVotesByGame.get(gameId) ?? new Set<string>();
    votes.add(playerId);
    this.skipResolutionVotesByGame.set(gameId, votes);

    const allVoted = votes.size >= instance.state.players.length;
    if (allVoted) {
      const state = this.advanceFromResolution(gameId, { resolutionSkipped: true });
      return { allVoted: true, state };
    }

    return { allVoted: false, state: instance.state };
  }

  advanceFromResolution(
    gameId: string,
    options?: { resolutionSkipped?: boolean },
  ): GameState {
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance) {
      throw new NotFoundException(`Gra ${gameId} nie istnieje`);
    }
    if (instance.state.phase !== 'RESOLUTION') {
      throw new BadRequestException('Gra nie jest w fazie RESOLUTION');
    }

    const pending = this.resolutionPendingByGame.get(gameId);
    if (!pending) {
      throw new BadRequestException('Brak oczekującego rozstrzygnięcia');
    }

    if (options?.resolutionSkipped) {
      this.resolutionSkippedByGame.set(gameId, true);
    }

    // Numer właśnie zakończonej rundy (stan display'owy trzyma stary numer).
    const finishedRound = instance.state.round;

    const finalState = this.cloneGameState(pending.resolvedState);
    (finalState as GameState & { narrativeEvents?: NarrativeEvent[] }).narrativeEvents =
      pending.narrativeEvents;

    // Domknięcie audytu rundy: flush do SQLite + automatyczna walidacja.
    this.gameAudit.endRound(
      gameId,
      finishedRound,
      pending.resolvedState.taxedCategory ?? null,
      finalState.winner ?? null,
    );

    if (finalState.phase === 'END') {
      this.gameAudit.gameFinished(finalState, finishedRound);
    }

    if (finalState.phase === 'PREP') {
      this.prepareRound(finalState);
    }

    this.gameStateManager.updateGameState(gameId, finalState);
    this.resolutionPendingByGame.delete(gameId);
    this.skipResolutionVotesByGame.delete(gameId);

    return finalState;
  }

  clearResolutionSession(gameId: string): void {
    this.resolutionPendingByGame.delete(gameId);
    this.skipResolutionVotesByGame.delete(gameId);
    this.resolutionSkippedByGame.delete(gameId);
  }

  /**
   * Ustawia timeout dla fazy PLANNING
   */
  private setPlanningTimeout(gameId: string): void {
    // Usuń poprzedni timeout jeśli istnieje
    this.clearPlanningTimeout(gameId);

    const timeout = setTimeout(() => {
      // Automatycznie przejdź do RESOLUTION po timeout
      try {
        this.enterResolutionPhase(gameId);
      } catch (error) {
        // Ignoruj błędy (gra może już nie istnieć)
      }
    }, this.PLANNING_TIMEOUT);

    this.planningTimeouts.set(gameId, timeout);
  }

  /**
   * Usuwa timeout dla fazy PLANNING
   */
  private clearPlanningTimeout(gameId: string): void {
    const timeout = this.planningTimeouts.get(gameId);
    if (timeout) {
      clearTimeout(timeout);
      this.planningTimeouts.delete(gameId);
    }
  }

  /**
   * Pobiera koszt budynku (wartość z karty lub minimalna wartość)
   */
  private getBuildingCost(type: BuildingType, cardValue?: number): number {
    const buildingData = BUILDING_DATA[type];
    if (!buildingData) {
      return 1; // fallback
    }
    return cardValue || buildingData.valueRange[0];
  }

  /**
   * Pobiera stan gry
   */
  getGameState(gameId: string): GameState | null {
    const instance = this.gameStateManager.getGame(gameId);
    return instance?.state || null;
  }

  /**
   * Losuje kartę budynku zgodnie z zaawansowaną logiką:
   * 1. Losuje wartość 1-5 (równe szanse)
   * 2. Losuje kategorię budynku (z uwzględnieniem ograniczeń)
   * 3. Znajduje budynki z tą wartością w przedziale I z tą kategorią
   * 4. Filtruje budynki które nie są już wybudowane
   * 5. Jeśli dla kategorii i wartości jest tylko jeden budynek i jest wybudowany, losuj kategorię ponownie
   * 6. Losuje jeden z dostępnych budynków
   * 
   * Reguły:
   * - Nie można wylosować budynku który jest już wybudowany
   * - Jeśli gracz ma >=3 karty i połowa+ jest z jednej kategorii, nie można jej wylosować
   * - Dla pierwszych trzech kart: nie mogą się powtarzać budynki i muszą być co najmniej 2 kategorie
   */
  private drawBuildingCard(
    rng: SeededRNG,
    cardId: string,
    player: Player,
    excludeBuildingTypes?: Set<BuildingType>, // Dla pierwszych trzech kart
    drawnCategories?: Set<BuildingCategory> // Dla pierwszych trzech kart
  ): Card {
    // Pobierz wszystkie wybudowane budynki gracza
    const builtBuildingTypes = new Set(player.buildings.map(b => b.type));

    // Pobierz karty w ręce gracza (niewybudowane budynki)
    const handCards = player.cards;

    // Sprawdź czy gracz ma >=3 karty i połowa+ jest z jednej kategorii
    const categoryCounts = new Map<BuildingCategory, number>();
    handCards.forEach(card => {
      const count = categoryCounts.get(card.buildingCategory) || 0;
      categoryCounts.set(card.buildingCategory, count + 1);
    });

    const forbiddenCategories = new Set<BuildingCategory>();
    if (handCards.length >= 3) {
      const halfCards = Math.ceil(handCards.length / 2);
      categoryCounts.forEach((count, category) => {
        if (count >= halfCards) {
          forbiddenCategories.add(category);
        }
      });
    }

    // 1. Losuj wartość 1-5 (równe szanse)
    const value = rng.randomInt(1, 5);

    // 2. Losuj kategorię budynku (z uwzględnieniem ograniczeń)
    const allCategories: BuildingCategory[] = [
      'education',
      'health',
      'finance',
      'administration',
      'entertainment',
    ];

    // Filtruj kategorie: usuń zabronione (gdy gracz ma za dużo kart z jednej kategorii)
    let availableCategories = allCategories.filter(cat => !forbiddenCategories.has(cat));

    // Dla pierwszych trzech kart: jeśli już mamy 2 kategorie, możemy losować dowolną
    // Jeśli mamy tylko 1 kategorię, musimy losować inną
    if (drawnCategories && drawnCategories.size === 1) {
      availableCategories = availableCategories.filter(cat => !drawnCategories.has(cat));
      // Jeśli nie ma dostępnych kategorii, pozwól na powtórzenie (lepsze niż brak karty)
      if (availableCategories.length === 0) {
        availableCategories = allCategories.filter(cat => !forbiddenCategories.has(cat));
      }
    }

    if (availableCategories.length === 0) {
      availableCategories = allCategories; // Fallback
    }

    // Próbuj losować kategorię (maksymalnie 10 prób, aby uniknąć nieskończonej pętli)
    let category: BuildingCategory | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (!category && attempts < maxAttempts) {
      attempts++;
      const candidateCategory = rng.randomChoice(availableCategories);

      // 3. Znajdź wszystkie budynki, które mają tę wartość w przedziale I z tą kategorią
      const allBuildingTypes = Object.keys(BUILDING_DATA) as BuildingType[];
      let candidateBuildings = allBuildingTypes.filter((type) => {
        const buildingData = BUILDING_DATA[type];
        const hasValueInRange =
          value >= buildingData.valueRange[0] && value <= buildingData.valueRange[1];
        const hasCategory = buildingData.category === candidateCategory;
        return hasValueInRange && hasCategory;
      });

      // 4. Filtruj budynki które nie są już wybudowane
      candidateBuildings = candidateBuildings.filter(type => !builtBuildingTypes.has(type));

      // 5. Dla pierwszych trzech kart: usuń już wylosowane typy budynków
      if (excludeBuildingTypes) {
        candidateBuildings = candidateBuildings.filter(type => !excludeBuildingTypes.has(type));
      }

      // Jeśli dla kategorii i wartości jest tylko jeden budynek i jest wybudowany/wylosowany, spróbuj inną kategorię
      if (candidateBuildings.length === 0) {
        // Usuń tę kategorię z dostępnych i spróbuj ponownie
        availableCategories = availableCategories.filter(cat => cat !== candidateCategory);
        if (availableCategories.length === 0) {
          // Jeśli nie ma dostępnych kategorii, użyj fallback
          break;
        }
        continue;
      }

      // Jeśli jest tylko jeden budynek i jest wybudowany, losuj kategorię ponownie
      if (candidateBuildings.length === 1 && builtBuildingTypes.has(candidateBuildings[0])) {
        availableCategories = availableCategories.filter(cat => cat !== candidateCategory);
        if (availableCategories.length === 0) {
          break;
        }
        continue;
      }

      category = candidateCategory;
    }

    // Fallback: jeśli nie udało się znaleźć kategorii, użyj losowej
    if (!category) {
      category = rng.randomChoice(allCategories);
    }

    // Znajdź dostępne budynki dla wybranej kategorii
    const allBuildingTypes = Object.keys(BUILDING_DATA) as BuildingType[];
    let availableBuildings = allBuildingTypes.filter((type) => {
      const buildingData = BUILDING_DATA[type];
      const hasValueInRange =
        value >= buildingData.valueRange[0] && value <= buildingData.valueRange[1];
      const hasCategory = buildingData.category === category;
      return hasValueInRange && hasCategory;
    });

    // Filtruj budynki które nie są już wybudowane
    availableBuildings = availableBuildings.filter(type => !builtBuildingTypes.has(type));

    // Dla pierwszych trzech kart: usuń już wylosowane typy budynków
    if (excludeBuildingTypes) {
      availableBuildings = availableBuildings.filter(type => !excludeBuildingTypes.has(type));
    }

    // 6. Losuj jeden z dostępnych budynków
    if (availableBuildings.length === 0) {
      // Fallback: jeśli nie ma budynków spełniających warunki, losuj z wszystkich (bez wybudowanych)
      const fallbackBuildings = allBuildingTypes.filter((type) => {
        const buildingData = BUILDING_DATA[type];
        const hasValueInRange = value >= buildingData.valueRange[0] && value <= buildingData.valueRange[1];
        const notBuilt = !builtBuildingTypes.has(type);
        return hasValueInRange && notBuilt;
      });

      if (fallbackBuildings.length === 0) {
        // Ostatnia deska ratunku: losuj z wszystkich (może być wybudowany, ale lepsze niż brak karty)
        const emergencyBuildings = allBuildingTypes.filter((type) => {
          const buildingData = BUILDING_DATA[type];
          return value >= buildingData.valueRange[0] && value <= buildingData.valueRange[1];
        });
        const buildingType = rng.randomChoice(emergencyBuildings);
        const buildingData = BUILDING_DATA[buildingType];
        return {
          id: cardId,
          name: buildingData.name,
          buildingType,
          buildingCategory: buildingData.category,
          buildingValue: value,
        };
      }

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

