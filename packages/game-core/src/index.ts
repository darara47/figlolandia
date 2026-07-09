// Game Phases
export type GamePhase =
  | 'LOBBY'
  | 'PREP'
  | 'PLANNING'
  | 'RESOLUTION'
  | 'END';

// Building Categories
export type BuildingCategory =
  | 'education'
  | 'health'
  | 'finance'
  | 'administration'
  | 'entertainment';

// Building Types
export type BuildingType =
  // Edukacja
  | 'nursery' // Żłobek
  | 'kindergarten' // Przedszkole
  | 'school' // Szkoła
  | 'technical_school' // Technikum
  | 'high_school' // Liceum
  | 'university' // Uniwersytet
  // Zdrowie
  | 'pharmacy' // Apteka
  | 'clinic' // Przychodnia
  | 'nursing_home' // Dom opieki
  | 'medical_clinic' // Klinika
  | 'hospital' // Szpital
  | 'cemetery' // Cmentarz
  // Finanse
  | 'exchange_office' // Kantor
  | 'auction_house' // Dom aukcyjny
  | 'bank' // Bank
  | 'stock_exchange' // Giełda
  | 'mint' // Mennica
  // Administracja
  | 'city_archive' // Archiwum miejskie
  | 'police_station' // Komisariat
  | 'city_hall' // Urząd miasta
  | 'court' // Sąd
  | 'town_hall' // Ratusz
  // Rozrywka / Społeczeństwo
  | 'bar' // Bar
  | 'park' // Park
  | 'cinema' // Kino
  | 'theater' // Teatr
  | 'stadium'; // Stadion

// Professions
export type Profession =
  // Ekonomia
  | 'lucky' // Szczęściarz
  | 'opportunity_hunter' // Łowca okazji
  | 'investor' // Inwestor
  | 'accountant' // Księgowy
  // Budowa
  | 'builder' // Budowlaniec
  | 'architect' // Architekt
  | 'urbanist' // Urbanista
  // Interakcja
  | 'vandal' // Wandal
  | 'thief' // Złodziej
  | 'saboteur' // Sabotażysta
  | 'spy' // Szpieg
  // Władza / Obrona
  | 'politician' // Polityk
  | 'diplomat' // Dyplomata
  | 'inspector'; // Inspektor

// Player Types
export interface Player {
  id: string;
  name: string;
  gold: number;
  buildings: Building[];
  cards: Card[];
  profession: Profession | null;
  lastProfession: Profession | null; // dla losowania bez powtórzeń
  joinOrder: number; // stała kolejność dołączenia do sesji (niezmienna w trakcie gry)
  order: number; // kolejność w rundzie
  professionAbilityUsed: boolean; // czy zdolność zawodowa została użyta w tej rundzie
  protected: boolean; // czy gracz jest chroniony (Dyplomata)
  delayedBuildings: boolean; // czy budynki są opóźnione (Inspektor) w bieżącej rundzie
  deferredBuildActions: PlayerAction[]; // budowy odłożone przez Inspektora na następną rundę
  urbanistPendingBuildBoost: boolean; // Urbanista bez budynków: +1 do pierwszej budowy w rundzie
  buildingsBuiltThisRound: number; // liczba budynków wybudowanych w tej rundzie
}

export interface Building {
  id: string;
  type: BuildingType;
  category: BuildingCategory;
  value: number; // wartość = koszt budowy (1-5)
}

// Karty budynków
export interface Card {
  id: string;
  name: string;
  buildingType: BuildingType;
  buildingCategory: BuildingCategory;
  buildingValue: number; // wartość budynku (1-5) - zawsze wymagana
}

// Animation speed for resolution reveal
export type AnimationSpeed = 'full' | 'fast' | 'off';

// Game Configuration
export interface GameConfig {
  maxRounds: number;
  victoryThreshold: number; // próg zwycięstwa (suma złota + wartość budynków)
  eventFrequency: number; // 0-100, częstotliwość zdarzeń w procentach
  minPlayers: number;
  maxPlayers: number;
  animationSpeed: AnimationSpeed;
}

// Game State
export interface GameState {
  gameId: string;
  gamePin: string; // 6-cyfrowy PIN do dołączania
  phase: GamePhase;
  round: number;
  players: Player[];
  config: GameConfig;
  seed: number; // seed dla RNG
  winner: string | null;
  pendingActions: Map<string, PlayerAction[]>; // playerId -> actions
  taxedCategory?: BuildingCategory; // kategoria opodatkowana przez Polityka (income +1 za budynek innych)
  spiedHands?: Map<string, Card[]>; // playerId -> cards peeked by spy (temporary, cleared after resolution)
  planningPhaseStartTime?: number; // timestamp startu fazy PLANNING (ustawiany raz na rundę)
}

// Player Actions
export interface PlayerAction {
  type: ActionType;
  target?: string; // playerId lub buildingId
  cardId?: string;
  buildingType?: BuildingType;
  buildingCategory?: BuildingCategory; // dla Architekta
  buildingValue?: number; // wartość budynku z karty
  professionAbility?: boolean; // czy używa zdolności zawodowej
  theftTarget?: 'gold' | 'card'; // dla Złodzieja
  inspectTarget?: string; // dla Szpiega
  taxedCategory?: BuildingCategory; // dla Polityka - kategoria opodatkowana
  plannedProfession?: Profession; // zawód z rundy planowania (dla odłożonych budów Inspektora)
}

export type ActionType =
  | 'build'
  | 'use_profession'
  | 'pass';

// Building Data
export const BUILDING_DATA: Record<
  BuildingType,
  { category: BuildingCategory; name: string; valueRange: [number, number] }
> = {
  // Edukacja
  nursery: { category: 'education', name: 'Żłobek', valueRange: [2, 3] },
  kindergarten: { category: 'education', name: 'Przedszkole', valueRange: [1, 3] },
  school: { category: 'education', name: 'Szkoła', valueRange: [1, 2] },
  technical_school: { category: 'education', name: 'Technikum', valueRange: [2, 4] },
  high_school: { category: 'education', name: 'Liceum', valueRange: [2, 4] },
  university: { category: 'education', name: 'Uniwersytet', valueRange: [4, 5] },
  // Zdrowie
  pharmacy: { category: 'health', name: 'Apteka', valueRange: [1, 3] },
  clinic: { category: 'health', name: 'Przychodnia', valueRange: [2, 3] },
  nursing_home: { category: 'health', name: 'Dom opieki', valueRange: [2, 4] },
  medical_clinic: { category: 'health', name: 'Klinika', valueRange: [4, 5] },
  hospital: { category: 'health', name: 'Szpital', valueRange: [2, 4] },
  cemetery: { category: 'health', name: 'Cmentarz', valueRange: [1, 2] },
  // Finanse
  exchange_office: { category: 'finance', name: 'Kantor', valueRange: [1, 2] },
  auction_house: { category: 'finance', name: 'Dom aukcyjny', valueRange: [1, 3] },
  bank: { category: 'finance', name: 'Bank', valueRange: [2, 4] },
  stock_exchange: { category: 'finance', name: 'Giełda', valueRange: [3, 5] },
  mint: { category: 'finance', name: 'Mennica', valueRange: [4, 5] },
  // Administracja
  city_archive: { category: 'administration', name: 'Archiwum miejskie', valueRange: [1, 2] },
  police_station: { category: 'administration', name: 'Komisariat', valueRange: [2, 3] },
  city_hall: { category: 'administration', name: 'Urząd miasta', valueRange: [2, 4] },
  court: { category: 'administration', name: 'Sąd', valueRange: [3, 4] },
  town_hall: { category: 'administration', name: 'Ratusz', valueRange: [3, 5] },
  // Rozrywka / Społeczeństwo
  bar: { category: 'entertainment', name: 'Bar', valueRange: [1, 2] },
  park: { category: 'entertainment', name: 'Park', valueRange: [1, 3] },
  cinema: { category: 'entertainment', name: 'Kino', valueRange: [2, 3] },
  theater: { category: 'entertainment', name: 'Teatr', valueRange: [3, 4] },
  stadium: { category: 'entertainment', name: 'Stadion', valueRange: [4, 5] },
};

// Profession Data
export const PROFESSION_DATA: Record<
  Profession,
  { name: string; category: string }
> = {
  // Ekonomia
  lucky: { name: 'Szczęściarz', category: 'Ekonomia' },
  opportunity_hunter: { name: 'Łowca okazji', category: 'Ekonomia' },
  investor: { name: 'Inwestor', category: 'Ekonomia' },
  accountant: { name: 'Księgowy', category: 'Ekonomia' },
  // Budowa
  builder: { name: 'Budowlaniec', category: 'Budowa' },
  architect: { name: 'Architekt', category: 'Budowa' },
  urbanist: { name: 'Urbanista', category: 'Budowa' },
  // Interakcja
  vandal: { name: 'Wandal', category: 'Interakcja' },
  thief: { name: 'Złodziej', category: 'Interakcja' },
  saboteur: { name: 'Sabotażysta', category: 'Interakcja' },
  spy: { name: 'Szpieg', category: 'Interakcja' },
  // Władza / Obrona
  politician: { name: 'Polityk', category: 'Władza / Obrona' },
  diplomat: { name: 'Dyplomata', category: 'Władza / Obrona' },
  inspector: { name: 'Inspektor', category: 'Władza / Obrona' },
};

import { ResolutionDebug } from './resolution-debug';

export { ResolutionDebug, isResolutionDebugEnabled } from './resolution-debug';
export type { GoldLedgerEntry, ResolutionDebugEvent, ResolutionDebugPhase } from './resolution-debug';

// Round Engine - główna logika rozstrzygania
export class RoundEngine {
  /**
   * Rozstrzyga akcje graczy w fazie RESOLUTION
   * Zwraca zaktualizowany stan gry
   */
  static resolveRound(
    state: GameState,
    actions: Map<string, PlayerAction[]>
  ): GameState {
    const newState = { ...state };
    const players = [...newState.players];

    // Sortuj graczy według kolejności rozstrzygania
    const sortedPlayers = [...players].sort((a, b) => a.order - b.order);

    ResolutionDebug.configure(state.gameId, state.round);
    ResolutionDebug.log(
      'RESOLUTION',
      'start',
      `Rozpoczęcie rozstrzygania rundy ${state.round}`,
      {
        players: sortedPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          profession: p.profession,
          gold: p.gold,
          order: p.order,
          deferredBuilds: p.deferredBuildActions.length,
        })),
        actions: Object.fromEntries(
          [...actions.entries()].map(([playerId, playerActions]) => [
            playerId,
            playerActions,
          ]),
        ),
      },
    );
    ResolutionDebug.logGoldSnapshot('RESOLUTION', 'start', sortedPlayers);

    // Reset flag bieżącej rundy (deferredBuildActions przetrwa do wykonania w kroku budowy)
    sortedPlayers.forEach((p) => {
      p.professionAbilityUsed = false;
      p.protected = false;
      p.delayedBuildings = false;
      p.urbanistPendingBuildBoost = false;
      p.buildingsBuiltThisRound = 0;
    });

    // Uwaga: Zdarzenia losowe są teraz rozstrzygane w fazie PREP, przed PLANNING

    // 2. Zdolności zawodowe (Polityk → Dyplomata → Sabotażysta → reszta)
    this.applyProfessionAbilities(sortedPlayers, actions, newState);
    ResolutionDebug.logGoldSnapshot('RESOLUTION', 'after_abilities', sortedPlayers);

    // 3. Kradzieże
    this.resolveTheft(sortedPlayers, actions, newState);
    ResolutionDebug.logGoldSnapshot('RESOLUTION', 'after_theft', sortedPlayers);

    // 4. Niszczenie budynków
    this.resolveDestruction(sortedPlayers, actions, newState);

    // 5. Budowy (najniższy priorytet)
    this.resolveBuildings(sortedPlayers, actions, newState);
    ResolutionDebug.logGoldSnapshot('RESOLUTION', 'after_builds', sortedPlayers);

    // 6. Zastosuj efekty końcowe zawodów (np. Księgowy)
    this.applyEndOfRoundAbilities(sortedPlayers, newState);
    ResolutionDebug.logGoldSnapshot('RESOLUTION', 'after_end_abilities', sortedPlayers);

    ResolutionDebug.log(
      'RESOLUTION',
      'flags',
      'Stan flag po rozstrzygnięciu',
      {
        players: sortedPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          profession: p.profession,
          professionAbilityUsed: p.professionAbilityUsed,
          protected: p.protected,
          delayedBuildings: p.delayedBuildings,
          urbanistPendingBuildBoost: p.urbanistPendingBuildBoost,
          deferredBuildActions: p.deferredBuildActions.length,
          buildingsBuiltThisRound: p.buildingsBuiltThisRound,
        })),
        taxedCategory: newState.taxedCategory,
      },
    );

    newState.players = sortedPlayers;
    ResolutionDebug.flushSummary(`RESOLUTION round ${state.round}`);
    return newState;
  }

  /**
   * Zastosuj zdolności zawodowe przed akcjami.
   * Kolejność: Polityk → Dyplomata → Sabotażysta → pozostałe (lucky, inspector, spy, urbanist).
   */
  private static applyProfessionAbilities(
    players: Player[],
    actions: Map<string, PlayerAction[]>,
    state: GameState
  ): void {
    const findProfessionAction = (playerId: string) => {
      const playerActions = actions.get(playerId) || [];
      return playerActions.find(
        (a) => a.type === 'use_profession' && a.professionAbility
      );
    };

    // 1. Polityk — ustawia opodatkowaną kategorię przed fazą budowy
    const politicianPlayer = players.find((p) => p.profession === 'politician');
    if (politicianPlayer) {
      const politicianAction = findProfessionAction(politicianPlayer.id);
      if (politicianAction?.taxedCategory) {
        state.taxedCategory = politicianAction.taxedCategory;
        politicianPlayer.professionAbilityUsed = true;
        ResolutionDebug.log(
          'RESOLUTION',
          'abilities.politician',
          `${politicianPlayer.name}: opodatkowana kategoria = ${politicianAction.taxedCategory}`,
        );
      } else {
        ResolutionDebug.log(
          'RESOLUTION',
          'abilities.politician',
          `${politicianPlayer.name}: brak akcji lub brak taxedCategory — pominięto`,
          { action: politicianAction ?? null },
        );
      }
    }

    // 2. Dyplomata — najwyższy priorytet obrony
    for (const player of players) {
      if (player.profession !== 'diplomat' || player.professionAbilityUsed) continue;

      const professionAction = findProfessionAction(player.id);
      if (!professionAction) {
        ResolutionDebug.log(
          'RESOLUTION',
          'abilities.diplomat',
          `${player.name}: brak akcji use_profession — pominięto`,
        );
        continue;
      }

      player.protected = true;
      player.professionAbilityUsed = true;
      ResolutionDebug.log(
        'RESOLUTION',
        'abilities.diplomat',
        `${player.name}: protected=true`,
      );
    }

    // 3. Sabotażysta — blokuje zdolność zawodową celu
    for (const player of players) {
      if (player.profession !== 'saboteur' || player.professionAbilityUsed) continue;

      const professionAction = findProfessionAction(player.id);
      if (!professionAction?.target) {
        ResolutionDebug.log(
          'RESOLUTION',
          'abilities.saboteur',
          `${player.name}: brak celu — pominięto`,
          { action: professionAction ?? null },
        );
        continue;
      }

      const target = players.find((p) => p.id === professionAction.target);
      if (target && !target.protected) {
        target.professionAbilityUsed = true;
        ResolutionDebug.log(
          'RESOLUTION',
          'abilities.saboteur',
          `${player.name} → ${target.name}: professionAbilityUsed=true (cel zablokowany)`,
        );
      } else {
        ResolutionDebug.log(
          'RESOLUTION',
          'abilities.saboteur',
          `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony (protected)'} — brak blokady`,
        );
      }
      player.professionAbilityUsed = true;
    }

    // 4. Pozostałe zdolności pre-action
    for (const player of players) {
      if (
        player.profession === 'politician' ||
        player.profession === 'diplomat' ||
        player.profession === 'saboteur' ||
        player.professionAbilityUsed
      ) {
        if (
          player.profession &&
          !['politician', 'diplomat', 'saboteur'].includes(player.profession) &&
          player.professionAbilityUsed
        ) {
          ResolutionDebug.log(
            'RESOLUTION',
            'abilities.skip',
            `${player.name} (${player.profession}): pominięto — professionAbilityUsed=true (np. przez Sabotażystę)`,
          );
        }
        continue;
      }

      const professionAction = findProfessionAction(player.id);
      if (!professionAction || !player.profession) {
        ResolutionDebug.log(
          'RESOLUTION',
          'abilities.skip',
          `${player.name} (${player.profession ?? 'brak'}): brak akcji use_profession — pominięto`,
        );
        continue;
      }

      switch (player.profession) {
        case 'lucky': {
          const goldBefore = player.gold;
          player.gold += 2;
          ResolutionDebug.logGoldChange(
            'RESOLUTION',
            'abilities.lucky',
            player,
            goldBefore,
            player.gold,
          );
          break;
        }

        case 'inspector':
          if (professionAction.target) {
            const target = players.find((p) => p.id === professionAction.target);
            if (target && !target.protected) {
              target.delayedBuildings = true;
              ResolutionDebug.log(
                'RESOLUTION',
                'abilities.inspector',
                `${player.name} → ${target.name}: delayedBuildings=true`,
              );
            } else {
              ResolutionDebug.log(
                'RESOLUTION',
                'abilities.inspector',
                `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony'} — brak opóźnienia`,
              );
            }
          } else {
            ResolutionDebug.log(
              'RESOLUTION',
              'abilities.inspector',
              `${player.name}: brak celu — pominięto`,
            );
          }
          break;

        case 'spy':
          if (professionAction.target) {
            const target = players.find((p) => p.id === professionAction.target);
            if (target && !target.protected) {
              if (!state.spiedHands) {
                state.spiedHands = new Map();
              }
              state.spiedHands.set(
                player.id,
                target.cards.map((card) => ({ ...card }))
              );
              ResolutionDebug.log(
                'RESOLUTION',
                'abilities.spy',
                `${player.name} → ${target.name}: podgląd ${target.cards.length} kart`,
              );
            } else {
              ResolutionDebug.log(
                'RESOLUTION',
                'abilities.spy',
                `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony'} — pominięto`,
              );
            }
          }
          break;

        case 'urbanist':
          if (player.buildings.length > 0) {
            const lowestBuilding = player.buildings.reduce((lowest, current) =>
              current.value < lowest.value ? current : lowest
            );
            const valueBefore = lowestBuilding.value;
            lowestBuilding.value = Math.min(5, lowestBuilding.value + 1);
            ResolutionDebug.log(
              'RESOLUTION',
              'abilities.urbanist',
              `${player.name}: ${lowestBuilding.type} wartość ${valueBefore}→${lowestBuilding.value}`,
            );
          } else {
            player.urbanistPendingBuildBoost = true;
            ResolutionDebug.log(
              'RESOLUTION',
              'abilities.urbanist',
              `${player.name}: brak budynków — urbanistPendingBuildBoost=true`,
            );
          }
          break;

        default:
          ResolutionDebug.log(
            'RESOLUTION',
            'abilities.other',
            `${player.name} (${player.profession}): zdolność rozstrzygana w innym kroku`,
          );
          break;
      }

      player.professionAbilityUsed = true;
    }
  }

  /**
   * Zastosuj efekty końcowe zawodów
   */
  private static applyEndOfRoundAbilities(
    players: Player[],
    state: GameState
  ): void {
    for (const player of players) {
      if (!player.profession) continue;

      switch (player.profession) {
        case 'accountant':
          // Księgowy: jeśli na koniec rundy ma mniej niż 2 złotki, otrzymuje +2
          if (player.gold < 2) {
            const goldBefore = player.gold;
            player.gold += 2;
            ResolutionDebug.logGoldChange(
              'RESOLUTION',
              'end.accountant',
              player,
              goldBefore,
              player.gold,
            );
          } else {
            ResolutionDebug.log(
              'RESOLUTION',
              'end.accountant',
              `${player.name}: gold=${player.gold} (>=2) — brak bonusu`,
            );
          }
          break;
      }
    }
  }

  /**
   * Rozstrzyga zdarzenia losowe na początku rundy (faza PREP)
   * Zdarzenia są wywoływane przez serwer przed fazą PLANNING
   * 
   * @param players Lista graczy
   * @param state Stan gry
   * @param rng SeededRNG - musi być przekazany z backendu
   */
  static resolveRandomEvents(
    players: Player[],
    state: GameState,
    rng: any // SeededRNG - przekazywany z backendu (nie możemy importować z backendu)
  ): void {
    const roll = rng.random();
    const threshold = state.config.eventFrequency / 100;

    if (roll >= threshold) {
      ResolutionDebug.log(
        'PREP',
        'random_event',
        `Brak zdarzenia losowego (roll=${roll.toFixed(4)}, threshold=${threshold})`,
      );
      return;
    }

    const randomPlayer = rng.randomChoice(players);
    const bonus = rng.randomInt(1, 3);
    const goldBefore = randomPlayer.gold;
    randomPlayer.gold += bonus;
    ResolutionDebug.logGoldChange(
      'PREP',
      'random_event',
      randomPlayer,
      goldBefore,
      randomPlayer.gold,
      { roll, threshold, bonus },
    );
  }

  private static resolveBuildings(
    players: Player[],
    actions: Map<string, PlayerAction[]>,
    state: GameState
  ): void {
    const politicianPlayer = players.find((p) => p.profession === 'politician');

    // Najpierw wykonaj budowy odłożone przez Inspektora w poprzedniej rundzie
    for (const player of players) {
      if (player.deferredBuildActions.length === 0) continue;

      ResolutionDebug.log(
        'RESOLUTION',
        'build.deferred',
        `${player.name}: wykonuję ${player.deferredBuildActions.length} odłożonych budów`,
        { actions: player.deferredBuildActions },
      );
      this.executeBuildActions(
        player,
        player.deferredBuildActions,
        state,
        politicianPlayer,
        'deferred',
      );
      player.deferredBuildActions = [];
    }

    // Budowa budynków zaplanowanych na bieżącą rundę
    for (const player of players) {
      const playerActions = actions.get(player.id) || [];
      const maxBuildings =
        player.profession === 'builder' && !player.professionAbilityUsed ? 2 : 1;
      const buildActions = playerActions
        .filter((a) => a.type === 'build')
        .slice(0, maxBuildings);

      if (player.delayedBuildings) {
        player.deferredBuildActions.push(
          ...buildActions.map((action) => ({
            ...action,
            plannedProfession: player.profession ?? undefined,
          })),
        );
        ResolutionDebug.log(
          'RESOLUTION',
          'build.delayed',
          `${player.name}: opóźniono ${buildActions.length} budów (Inspektor) → deferredBuildActions`,
          { actions: buildActions },
        );
        continue;
      }

      this.executeBuildActions(player, buildActions, state, politicianPlayer, 'current');

      // Architekt: może zmienić kategorię budynku
      if (player.profession === 'architect') {
        const architectAction = playerActions.find(
          (a) =>
            a.type === 'use_profession' &&
            a.professionAbility &&
            a.buildingCategory
        );
        if (architectAction?.buildingType) {
          const lastBuilding = player.buildings[player.buildings.length - 1];
          if (lastBuilding && architectAction.buildingCategory) {
            const oldCategory = lastBuilding.category;
            lastBuilding.category = architectAction.buildingCategory;
            ResolutionDebug.log(
              'RESOLUTION',
              'build.architect',
              `${player.name}: ${lastBuilding.type} kategoria ${oldCategory}→${architectAction.buildingCategory}`,
            );
          }
        }
      }
    }
  }

  private static executeBuildActions(
    player: Player,
    buildActions: PlayerAction[],
    state: GameState,
    politicianPlayer: Player | undefined,
    source: 'current' | 'deferred',
  ): void {
    for (const buildAction of buildActions) {
      if (!buildAction.buildingType) continue;

      const buildingData = BUILDING_DATA[buildAction.buildingType];
      if (!buildingData) continue;

      const card = buildAction.cardId
        ? player.cards.find((c) => c.id === buildAction.cardId)
        : null;
      const baseValue =
        buildAction.buildingValue ||
        (card ? card.buildingValue : null) ||
        buildingData.valueRange[0];
      const buildProfession =
        buildAction.plannedProfession ?? player.profession;
      const opportunityHunterDiscount =
        buildProfession === 'opportunity_hunter' && !player.professionAbilityUsed;
      let cost = baseValue;

      if (opportunityHunterDiscount) {
        cost = Math.max(0, cost - 2);
      }

      if (player.gold < cost) {
        const skipMessage =
          `[RoundEngine] Budowa pominięta: gracz ${player.name} (${player.id}) próbował wybudować ` +
          `"${buildAction.buildingType}" za ${cost} złota, ale ma tylko ${player.gold}.`;
        console.warn(skipMessage);
        ResolutionDebug.log(
          'RESOLUTION',
          'build.skip',
          skipMessage,
          { source, baseValue, cost, profession: buildProfession },
        );
        continue;
      }

      const goldBefore = player.gold;
      player.gold -= cost;
      ResolutionDebug.logGoldChange(
        'RESOLUTION',
        `build.cost.${source}`,
        player,
        goldBefore,
        player.gold,
        {
          buildingType: buildAction.buildingType,
          baseValue,
          cost,
          opportunityHunter: opportunityHunterDiscount,
          professionAbilityBlocked: player.professionAbilityUsed,
          plannedProfession: buildAction.plannedProfession,
        },
      );

      let buildingValue = baseValue;

      if (player.urbanistPendingBuildBoost && player.buildingsBuiltThisRound === 0) {
        buildingValue = Math.min(5, buildingValue + 1);
        player.urbanistPendingBuildBoost = false;
        ResolutionDebug.log(
          'RESOLUTION',
          'build.urbanist_boost',
          `${player.name}: +1 wartość pierwszego budynku w rundzie (${baseValue}→${buildingValue})`,
        );
      }

      const buildingId = `building-${Date.now()}-${Math.random()}`;
      player.buildings.push({
        id: buildingId,
        type: buildAction.buildingType,
        category: buildingData.category,
        value: buildingValue,
      });
      player.buildingsBuiltThisRound++;

      ResolutionDebug.log(
        'RESOLUTION',
        `build.success.${source}`,
        `${player.name}: wybudowano ${buildAction.buildingType} (wartość=${buildingValue}, kategoria=${buildingData.category})`,
      );

      if (
        politicianPlayer &&
        player.id !== politicianPlayer.id &&
        state.taxedCategory === buildingData.category
      ) {
        const politicianGoldBefore = politicianPlayer.gold;
        politicianPlayer.gold += 1;
        ResolutionDebug.logGoldChange(
          'RESOLUTION',
          'build.politician_tax',
          politicianPlayer,
          politicianGoldBefore,
          politicianPlayer.gold,
          {
            builder: player.name,
            buildingType: buildAction.buildingType,
            taxedCategory: state.taxedCategory,
          },
        );
      }
    }
  }

  private static resolveTheft(
    players: Player[],
    actions: Map<string, PlayerAction[]>,
    state: GameState
  ): void {
    // Złodziej: kradnie 2 złotki lub kartę budynku
    for (const player of players) {
      if (player.profession !== 'thief') continue;

      const playerActions = actions.get(player.id) || [];
      const professionAction = playerActions.find(
        (a) => a.type === 'use_profession' && a.professionAbility
      );

      if (!professionAction || !professionAction.target) {
        ResolutionDebug.log(
          'RESOLUTION',
          'theft.skip',
          `${player.name}: brak akcji lub celu — pominięto`,
        );
        continue;
      }

      const target = players.find((p) => p.id === professionAction.target);
      if (!target || target.protected) {
        ResolutionDebug.log(
          'RESOLUTION',
          'theft.skip',
          `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony'} — pominięto`,
        );
        continue;
      }

      if (professionAction.theftTarget === 'gold') {
        const stolen = Math.min(target.gold, 2);
        const targetGoldBefore = target.gold;
        const thiefGoldBefore = player.gold;
        target.gold -= stolen;
        player.gold += stolen;
        ResolutionDebug.logGoldChange(
          'RESOLUTION',
          'theft.gold',
          target,
          targetGoldBefore,
          target.gold,
          { thief: player.name, stolen },
        );
        ResolutionDebug.logGoldChange(
          'RESOLUTION',
          'theft.gold',
          player,
          thiefGoldBefore,
          player.gold,
          { target: target.name, stolen },
        );
      } else if (professionAction.theftTarget === 'card') {
        if (target.cards.length > 0) {
          const stolenCard = target.cards.pop()!;
          player.cards.push(stolenCard);
          ResolutionDebug.log(
            'RESOLUTION',
            'theft.card',
            `${player.name} → ${target.name}: skradziono kartę ${stolenCard.name}`,
          );
        } else {
          ResolutionDebug.log(
            'RESOLUTION',
            'theft.card',
            `${player.name} → ${target.name}: cel nie ma kart — pominięto`,
          );
        }
      }
    }
  }

  private static resolveDestruction(
    players: Player[],
    actions: Map<string, PlayerAction[]>,
    state: GameState
  ): void {
    // Wandal: niszczy wartość budynku przeciwnika o 2
    for (const player of players) {
      if (player.profession !== 'vandal') continue;

      const playerActions = actions.get(player.id) || [];
      const professionAction = playerActions.find(
        (a) => a.type === 'use_profession' && a.professionAbility
      );

      if (!professionAction || !professionAction.target) {
        ResolutionDebug.log(
          'RESOLUTION',
          'vandal.skip',
          `${player.name}: brak akcji lub celu — pominięto`,
        );
        continue;
      }

      const target = players.find((p) => p.id === professionAction.target);
      if (!target || target.protected || target.buildings.length === 0) {
        ResolutionDebug.log(
          'RESOLUTION',
          'vandal.skip',
          `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : target.protected ? 'chroniony' : 'bez budynków'} — pominięto`,
        );
        continue;
      }

      const building = target.buildings.reduce((best, current) =>
        current.value > best.value ? current : best
      );

      const valueBefore = building.value;
      building.value = Math.max(0, building.value - 2);
      ResolutionDebug.log(
        'RESOLUTION',
        'vandal',
        `${player.name} → ${target.name}: ${building.type} wartość ${valueBefore}→${building.value}`,
      );
    }
  }

  /**
   * Sprawdza warunki zwycięstwa
   */
  static checkVictory(state: GameState): string | null {
    const { players, config } = state;

    for (const player of players) {
      const totalValue =
        player.gold +
        player.buildings.reduce((sum, b) => sum + b.value, 0);

      if (totalValue >= config.victoryThreshold) {
        return player.id;
      }
    }

    // Sprawdź czy osiągnięto max rund
    if (state.round >= config.maxRounds) {
      // Zwróć gracza z najwyższą wartością
      const winner = players.reduce((best, current) => {
        const currentValue =
          current.gold +
          current.buildings.reduce((sum, b) => sum + b.value, 0);
        const bestValue =
          best.gold + best.buildings.reduce((sum, b) => sum + b.value, 0);
        return currentValue > bestValue ? current : best;
      });
      return winner.id;
    }

    return null;
  }
}

// Utility functions
export function generateGameId(): string {
  return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generatePlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generuje 6-cyfrowy PIN dla gry
 * @param existingPins Zbiór istniejących PIN-ów do uniknięcia kolizji
 */
export function generateGamePin(existingPins?: Set<string>): string {
  let pin: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    // Generuj 6-cyfrowy PIN (100000-999999)
    pin = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;

    // Jeśli przekroczono limit prób, użyj timestamp jako fallback
    if (attempts >= maxAttempts) {
      pin = (Date.now() % 900000 + 100000).toString();
      break;
    }
  } while (existingPins && existingPins.has(pin));

  return pin;
}

/** Zawody tymczasowo wyłączone z losowania (niedokończone mechaniki) */
export const HIDDEN_PROFESSIONS: readonly Profession[] = ['architect', 'spy'];

/**
 * Pobiera wszystkie zawody (w tym ukryte)
 */
export function getAllProfessions(): Profession[] {
  return Object.keys(PROFESSION_DATA) as Profession[];
}

/**
 * Pobiera zawody dostępne do losowania w grze
 */
export function getAssignableProfessions(): Profession[] {
  const hidden = new Set(HIDDEN_PROFESSIONS);
  return getAllProfessions().filter((profession) => !hidden.has(profession));
}

/**
 * Kolory kategorii budynków (hex)
 * Używane do stylizacji kart w UI
 */
export const CATEGORY_COLORS: Record<BuildingCategory, string> = {
  education: '#4C8DFF',
  health: '#FF5C72',
  finance: '#F0B429',
  administration: '#A66BFF',
  entertainment: '#2DD4BF',
};

/**
 * Pobiera kolor kategorii budynku
 */
export function getCategoryColor(category: BuildingCategory): string {
  return CATEGORY_COLORS[category] || '#6B7280'; // Gray fallback
}

/**
 * Pobiera wszystkie typy budynków w kategorii
 */
export function getBuildingsByCategory(
  category: BuildingCategory
): BuildingType[] {
  return Object.entries(BUILDING_DATA)
    .filter(([_, data]) => data.category === category)
    .map(([type, _]) => type as BuildingType);
}
