import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import {
  GameState,
  GameConfig,
  Player,
  PlayerAction,
  RoundEngine,
  BuildingType,
  BuildingCategory,
  Card,
  BUILDING_DATA,
  getAssignableProfessions,
  ResolutionDebug,
} from '@figlolandia/game-core';
import { GameStateManager } from './game.state';
import { SeededRNG } from '../utils/rng';
import { NarrativeService } from './narrative.service';

type PlanningStep = {
  buildConfirmed: boolean;
  abilityConfirmed: boolean;
  buildActions: PlayerAction[];
  abilityActions: PlayerAction[];
};

/**
 * Główny serwis zarządzający logiką gry i fazami
 * Używa game-core do rozstrzygania rund
 */
@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private readonly PLANNING_TIMEOUT = 600000; // 10 minut (600000 ms)
  private planningTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // gameId -> playerId -> planning step
  private planningStepsByGame: Map<string, Map<string, PlanningStep>> = new Map();

  constructor(
    private readonly gameStateManager: GameStateManager,
    private readonly narrativeService: NarrativeService,
  ) { }

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
    }

    if (state.players.length < state.config.minPlayers) {
      throw new BadRequestException(
        `Wymagane minimum ${state.config.minPlayers} graczy`
      );
    }

    // Przejdź do fazy PREP
    state.phase = 'PREP';
    state.round = 1;

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
    ResolutionDebug.configure(state.gameId, state.round);
    ResolutionDebug.log(
      'PREP',
      'start',
      `Przygotowanie rundy ${state.round}`,
      {
        players: state.players.map((p) => ({
          id: p.id,
          name: p.name,
          gold: p.gold,
          profession: p.profession,
          deferredBuilds: p.deferredBuildActions.length,
        })),
      },
    );

    // Reset stanów zawodów
    state.players.forEach((player) => {
      player.professionAbilityUsed = false;
      player.protected = false;
      player.delayedBuildings = false;
      player.buildingsBuiltThisRound = 0;
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
        ResolutionDebug.log(
          'PREP',
          'profession',
          `${player.name}: przypisano zawód ${player.profession}`,
        );
      }
    });

    // 2. Rozdaj złotki: każdy gracz otrzymuje 2 złotki
    state.players.forEach((player) => {
      const goldBefore = player.gold;
      player.gold += 2;
      ResolutionDebug.logGoldChange(
        'PREP',
        'base_income',
        player,
        goldBefore,
        player.gold,
      );
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
      }
    });

    // 4. Ustal kolejność rozstrzygania (losowa)
    const playerIds = state.players.map((p) => p.id);
    const shuffledIds = rng.shuffle(playerIds);
    state.players.forEach((player) => {
      player.order = shuffledIds.indexOf(player.id);
    });

    // 5. Gracz rozstrzygany jako ostatni otrzymuje +1 złotko
    const lastPlayer = state.players.find(
      (p) => p.order === state.players.length - 1
    );
    if (lastPlayer) {
      const goldBefore = lastPlayer.gold;
      lastPlayer.gold += 1;
      ResolutionDebug.logGoldChange(
        'PREP',
        'last_in_order',
        lastPlayer,
        goldBefore,
        lastPlayer.gold,
        { order: lastPlayer.order },
      );
    }

    ResolutionDebug.log(
      'PREP',
      'order',
      'Kolejność rozstrzygania',
      {
        players: state.players
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((p) => ({ name: p.name, id: p.id, order: p.order })),
      },
    );

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

    ResolutionDebug.logGoldSnapshot('PREP', 'end', state.players);
    ResolutionDebug.flushSummary(`PREP round ${state.round}`);
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

      planningSteps.set(player.id, {
        buildConfirmed: false,
        abilityConfirmed: !abilityRequiresChoice,
        buildActions: [],
        abilityActions: [],
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
   * Przechodzi do fazy RESOLUTION i rozstrzyga rundę
   */
  enterResolutionPhase(gameId: string): GameState {
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

        ResolutionDebug.configure(state.gameId, state.round);
        ResolutionDebug.log(
          'RESOLUTION',
          'planning_input',
          `${p.name}: akcje wejściowe do RoundEngine`,
          {
            profession: p.profession,
            buildConfirmed: step?.buildConfirmed ?? false,
            abilityConfirmed: step?.abilityConfirmed ?? false,
            buildActions: step?.buildActions ?? [],
            abilityActionsBeforeInject: step?.abilityActions ?? [],
            autoInjected,
            combined,
          },
        );
      }
    } else {
      ResolutionDebug.configure(state.gameId, state.round);
      ResolutionDebug.log(
        'RESOLUTION',
        'planning_input',
        'Brak planningSteps — używam istniejących pendingActions',
        {
          actions: Object.fromEntries([...state.pendingActions.entries()]),
        },
      );
    }

    this.logger.log(
      `Rozpoczynam RESOLUTION gry ${gameId}, runda ${state.round}`,
    );

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
            player.cards.splice(cardIndex, 1);
          }
        }
      });
    });

    // Wyczyść podglądnięte ręce (Szpieg) po rozstrzygnięciu
    if (resolvedState.spiedHands) {
      resolvedState.spiedHands.clear();
    }

    // Generuj wydarzenia narratora
    const narrativeEvents = this.narrativeService.generateNarrativeEvents(
      beforeState,
      resolvedState,
      state.pendingActions
    );
    (resolvedState as any).narrativeEvents = narrativeEvents;

    // Sprawdź warunki zwycięstwa
    const winner = RoundEngine.checkVictory(resolvedState);
    if (winner) {
      resolvedState.winner = winner;
      resolvedState.phase = 'END';
    } else {
      // Przejdź do następnej rundy
      resolvedState.round++;
      resolvedState.phase = 'PREP';
      this.prepareRound(resolvedState);
    }

    this.gameStateManager.updateGameState(gameId, resolvedState);
    this.planningStepsByGame.delete(gameId);
    return resolvedState;
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

