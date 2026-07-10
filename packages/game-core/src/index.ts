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
  /** Szczęściarz: ile złota przyznano w tej rundzie (do narracji / animacji). */
  luckyGoldGranted?: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  category: BuildingCategory;
  value: number; // wartość = koszt budowy (1-5)
  pending?: boolean; // budynek w trakcie budowy (opóźniony przez Inspektora)
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
  lastMoveGoldBonus: number; // złoto dla gracza rozstrzygniętego jako ostatni w rundzie
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
  buildingId?: string; // ID budynku pending po opóźnieniu przez Inspektora
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

import { AuditEmitter } from './audit/emitter';
import {
  rulesAccountantBonus,
  rulesBuildCost,
  rulesBuildSkip,
  rulesDiplomatProtection,
  rulesLuckyBonus,
  rulesPoliticianCategory,
  rulesPoliticianTax,
  rulesProfessionSkip,
  rulesRandomEvent,
  rulesSaboteurBlock,
  rulesTheftCard,
  rulesTheftGold,
  rulesVandalism,
} from './audit/rules';

export { AuditEmitter } from './audit/emitter';
export { EventCorrelation } from './audit/correlation';
export type { EventUid } from './audit/correlation';
export { RuleEvaluator } from './audit/rules';
export type { RuleEvaluationInput } from './audit/rules';
export {
  rulesBuildCost,
  rulesBuildSkip,
  rulesPoliticianTax,
  rulesProfessionSkip,
  rulesLuckyBonus,
  rulesAccountantBonus,
  rulesPoliticianCategory,
  rulesDiplomatProtection,
  rulesSaboteurBlock,
  rulesTheftGold,
  rulesTheftCard,
  rulesVandalism,
  rulesBaseIncome,
  rulesLastInOrderBonus,
  rulesRandomEvent,
} from './audit/rules';
export type {
  AuditEventPayloadMap,
  AuditEventType,
  AuditEventPayload,
  AuditEventInput,
  AuditEventRecord,
  AuditGoldChangeInput,
  AuditGoldChangeRecord,
  AuditSnapshotInput,
  AuditSnapshotRecord,
  AuditSink,
  AuditPlayerBrief,
  AuditResolutionPlayerBrief,
  AuditFlagsPlayerBrief,
  SnapshotLabel,
  EventCorrelationLink,
} from './audit/types';
export {
  RESOLUTION_TURN_MS,
  RESOLUTION_BUILD_AT,
  RESOLUTION_PROFESSION_AT,
  RESOLUTION_TURN_GAP_MS,
  GOLD_FLOAT_MS,
  goldFloatTotalMs,
  getResolutionTurnDurationMs,
  getResolutionAdvanceDelayMs,
  UI_ANIMATION_MS,
} from './animationTiming';

/**
 * Minimalny kontrakt RNG wymagany przez RoundEngine.
 * Backendowy SeededRNG spełnia go strukturalnie.
 */
export interface RandomSource {
  random(): number;
  randomInt(min: number, max: number): number;
  randomChoice<T>(items: T[]): T;
  shuffle<T>(items: T[]): T[];
}

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

    AuditEmitter.configure(state.gameId, state.round);
    AuditEmitter.event({
      type: 'RESOLUTION_STARTED',
      phase: 'RESOLUTION',
      step: 'start',
      message: `Rozpoczęcie rozstrzygania rundy ${state.round}`,
      payload: {
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
    });

    // Reset flag bieżącej rundy (deferredBuildActions przetrwa do wykonania w kroku budowy)
    sortedPlayers.forEach((p) => {
      p.professionAbilityUsed = false;
      p.protected = false;
      p.delayedBuildings = false;
      p.urbanistPendingBuildBoost = false;
      p.buildingsBuiltThisRound = 0;
      p.luckyGoldGranted = undefined;
    });

    // Uwaga: Zdarzenia losowe są teraz rozstrzygane w fazie PREP, przed PLANNING

    // 2. Zdolności zawodowe (Polityk → Dyplomata → Sabotażysta → reszta)
    this.applyProfessionAbilities(sortedPlayers, actions, newState);
    AuditEmitter.snapshot({
      phase: 'RESOLUTION',
      label: 'AFTER_ABILITIES',
      state: { ...newState, players: sortedPlayers },
    });

    // 3. Niszczenie budynków
    this.resolveDestruction(sortedPlayers, actions, newState);

    // 4. Budowy
    this.resolveBuildings(sortedPlayers, actions, newState);
    AuditEmitter.snapshot({
      phase: 'RESOLUTION',
      label: 'AFTER_BUILD',
      state: { ...newState, players: sortedPlayers },
    });

    // 5. Kradzieże (Złodziej — po budowach, żeby cel najpierw wydał złoto na budowę)
    this.resolveTheft(sortedPlayers, actions, newState);
    AuditEmitter.snapshot({
      phase: 'RESOLUTION',
      label: 'AFTER_THEFT',
      state: { ...newState, players: sortedPlayers },
    });

    // 6. Zastosuj efekty końcowe zawodów (np. Księgowy)
    this.applyEndOfRoundAbilities(sortedPlayers, newState);
    AuditEmitter.snapshot({
      phase: 'RESOLUTION',
      label: 'AFTER_END_ABILITIES',
      state: { ...newState, players: sortedPlayers },
    });

    AuditEmitter.event({
      type: 'RESOLUTION_FLAGS',
      phase: 'RESOLUTION',
      step: 'flags',
      message: 'Stan flag po rozstrzygnięciu',
      payload: {
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
        taxedCategory: newState.taxedCategory ?? null,
      },
    });

    newState.players = sortedPlayers;
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
        rulesPoliticianCategory({
          hasCategory: true,
          category: politicianAction.taxedCategory,
        });
        AuditEmitter.beginOperation('politician_category');
        AuditEmitter.event({
          type: 'PROFESSION_USED',
          phase: 'RESOLUTION',
          step: 'abilities.politician',
          playerId: politicianPlayer.id,
          message: `${politicianPlayer.name}: opodatkowana kategoria = ${politicianAction.taxedCategory}`,
          payload: {
            profession: 'politician',
            taxedCategory: politicianAction.taxedCategory,
            effect: 'tax_category_set',
          },
        });
        AuditEmitter.event({
          type: 'TAX_CATEGORY_SET',
          phase: 'RESOLUTION',
          step: 'abilities.politician',
          playerId: politicianPlayer.id,
          message: `Opodatkowana kategoria: ${politicianAction.taxedCategory}`,
          payload: { taxedCategory: politicianAction.taxedCategory },
        });
        AuditEmitter.endOperation();
      } else {
        rulesPoliticianCategory({ hasCategory: false });
        AuditEmitter.event({
          type: 'PROFESSION_SKIPPED',
          phase: 'RESOLUTION',
          step: 'abilities.politician',
          playerId: politicianPlayer.id,
          message: `${politicianPlayer.name}: brak akcji lub brak taxedCategory — pominięto`,
          payload: { profession: 'politician', reason: 'no_action_or_category' },
        });
      }
    }

    // 2. Dyplomata
    for (const player of players) {
      if (player.profession !== 'diplomat' || player.professionAbilityUsed) continue;

      const professionAction = findProfessionAction(player.id);
      if (!professionAction) {
        rulesProfessionSkip({ profession: 'diplomat', reason: 'no_action' });
        AuditEmitter.event({
          type: 'PROFESSION_SKIPPED',
          phase: 'RESOLUTION',
          step: 'abilities.diplomat',
          playerId: player.id,
          message: `${player.name}: brak akcji use_profession — pominięto`,
          payload: { profession: 'diplomat', reason: 'no_action' },
        });
        continue;
      }

      player.protected = true;
      player.professionAbilityUsed = true;
      rulesDiplomatProtection();
      AuditEmitter.event({
        type: 'PROFESSION_USED',
        phase: 'RESOLUTION',
        step: 'abilities.diplomat',
        playerId: player.id,
        message: `${player.name}: protected=true`,
        payload: { profession: 'diplomat', effect: 'protection' },
      });
      AuditEmitter.event({
        type: 'PROTECTION',
        phase: 'RESOLUTION',
        step: 'abilities.diplomat',
        playerId: player.id,
        message: `${player.name} jest chroniony w tej rundzie`,
        payload: { profession: 'diplomat' },
      });
    }

    // 3. Sabotażysta — blokuje zdolność zawodową celu
    for (const player of players) {
      if (player.profession !== 'saboteur' || player.professionAbilityUsed) continue;

      const professionAction = findProfessionAction(player.id);
      if (!professionAction?.target) {
        AuditEmitter.event({
          type: 'PROFESSION_SKIPPED',
          phase: 'RESOLUTION',
          step: 'abilities.saboteur',
          playerId: player.id,
          message: `${player.name}: brak celu — pominięto`,
          payload: { profession: 'saboteur', reason: 'no_target' },
        });
        continue;
      }

      const target = players.find((p) => p.id === professionAction.target);
      if (target && !target.protected) {
        target.professionAbilityUsed = true;
        rulesSaboteurBlock({
          targetExists: true,
          targetProtected: false,
          blocked: true,
        });
        AuditEmitter.event({
          type: 'PROFESSION_USED',
          phase: 'RESOLUTION',
          step: 'abilities.saboteur',
          playerId: player.id,
          message: `${player.name} → ${target.name}: professionAbilityUsed=true (cel zablokowany)`,
          payload: {
            profession: 'saboteur',
            targetId: target.id,
            targetName: target.name,
            effect: 'target_blocked',
          },
        });
      } else {
        rulesSaboteurBlock({
          targetExists: !!target,
          targetProtected: target?.protected ?? false,
          blocked: false,
        });
        AuditEmitter.event({
          type: 'PROFESSION_USED',
          phase: 'RESOLUTION',
          step: 'abilities.saboteur',
          playerId: player.id,
          message: `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony (protected)'} — brak blokady`,
          payload: {
            profession: 'saboteur',
            targetId: professionAction.target,
            effect: !target ? 'target_missing' : 'target_protected',
          },
        });
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
          rulesProfessionSkip({
            profession: player.profession,
            reason: 'ability_blocked',
            saboteurBlocked: true,
          });
          AuditEmitter.event({
            type: 'PROFESSION_SKIPPED',
            phase: 'RESOLUTION',
            step: 'abilities.skip',
            playerId: player.id,
            message: `${player.name} (${player.profession}): pominięto — professionAbilityUsed=true (np. przez Sabotażystę)`,
            payload: { profession: player.profession, reason: 'ability_blocked' },
          });
        }
        continue;
      }

      const professionAction = findProfessionAction(player.id);
      if (!professionAction || !player.profession) {
        AuditEmitter.event({
          type: 'PROFESSION_SKIPPED',
          phase: 'RESOLUTION',
          step: 'abilities.skip',
          playerId: player.id,
          message: `${player.name} (${player.profession ?? 'brak'}): brak akcji use_profession — pominięto`,
          payload: { profession: player.profession ?? null, reason: 'no_action' },
        });
        continue;
      }

      switch (player.profession) {
        case 'lucky': {
          const goldBefore = player.gold;
          player.gold += 2;
          player.luckyGoldGranted = 2;
          rulesLuckyBonus({ goldBefore });
          AuditEmitter.goldChange({
            type: 'PROFESSION_USED',
            phase: 'RESOLUTION',
            step: 'abilities.lucky',
            player,
            before: goldBefore,
            after: player.gold,
            reason: 'lucky_bonus',
            payload: { profession: 'lucky', effect: 'gold_bonus' },
          });
          break;
        }

        case 'inspector':
          if (professionAction.target) {
            const target = players.find((p) => p.id === professionAction.target);
            if (target && !target.protected) {
              target.delayedBuildings = true;
              AuditEmitter.event({
                type: 'PROFESSION_USED',
                phase: 'RESOLUTION',
                step: 'abilities.inspector',
                playerId: player.id,
                message: `${player.name} → ${target.name}: delayedBuildings=true`,
                payload: {
                  profession: 'inspector',
                  targetId: target.id,
                  targetName: target.name,
                  effect: 'buildings_delayed',
                },
              });
              AuditEmitter.event({
                type: 'DELAYED_BUILD',
                phase: 'RESOLUTION',
                step: 'abilities.inspector',
                playerId: target.id,
                message: `Budowy gracza ${target.name} opóźnione przez Inspektora`,
                payload: {
                  targetId: target.id,
                  targetName: target.name,
                  kind: 'inspector_delay',
                },
              });
            } else {
              AuditEmitter.event({
                type: 'PROFESSION_USED',
                phase: 'RESOLUTION',
                step: 'abilities.inspector',
                playerId: player.id,
                message: `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony'} — brak opóźnienia`,
                payload: {
                  profession: 'inspector',
                  targetId: professionAction.target,
                  effect: !target ? 'target_missing' : 'target_protected',
                },
              });
            }
          } else {
            AuditEmitter.event({
              type: 'PROFESSION_SKIPPED',
              phase: 'RESOLUTION',
              step: 'abilities.inspector',
              playerId: player.id,
              message: `${player.name}: brak celu — pominięto`,
              payload: { profession: 'inspector', reason: 'no_target' },
            });
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
              AuditEmitter.event({
                type: 'PROFESSION_USED',
                phase: 'RESOLUTION',
                step: 'abilities.spy',
                playerId: player.id,
                message: `${player.name} → ${target.name}: podgląd ${target.cards.length} kart`,
                payload: {
                  profession: 'spy',
                  targetId: target.id,
                  targetName: target.name,
                  cardsSeen: target.cards.length,
                  effect: 'hand_peeked',
                },
              });
            } else {
              AuditEmitter.event({
                type: 'PROFESSION_USED',
                phase: 'RESOLUTION',
                step: 'abilities.spy',
                playerId: player.id,
                message: `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony'} — pominięto`,
                payload: {
                  profession: 'spy',
                  targetId: professionAction.target,
                  effect: !target ? 'target_missing' : 'target_protected',
                },
              });
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
            AuditEmitter.event({
              type: 'PROFESSION_USED',
              phase: 'RESOLUTION',
              step: 'abilities.urbanist',
              playerId: player.id,
              message: `${player.name}: ${lowestBuilding.type} wartość ${valueBefore}→${lowestBuilding.value}`,
              payload: {
                profession: 'urbanist',
                buildingId: lowestBuilding.id,
                buildingType: lowestBuilding.type,
                valueBefore,
                valueAfter: lowestBuilding.value,
                effect: 'building_value_increased',
              },
            });
          } else {
            player.urbanistPendingBuildBoost = true;
            AuditEmitter.event({
              type: 'PROFESSION_USED',
              phase: 'RESOLUTION',
              step: 'abilities.urbanist',
              playerId: player.id,
              message: `${player.name}: brak budynków — urbanistPendingBuildBoost=true`,
              payload: {
                profession: 'urbanist',
                effect: 'pending_build_boost',
              },
            });
          }
          break;

        default:
          AuditEmitter.event({
            type: 'PROFESSION_SKIPPED',
            phase: 'RESOLUTION',
            step: 'abilities.other',
            playerId: player.id,
            message: `${player.name} (${player.profession}): zdolność rozstrzygana w innym kroku`,
            payload: {
              profession: player.profession,
              reason: 'resolved_in_other_step',
            },
          });
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
            rulesAccountantBonus({ gold: goldBefore });
            AuditEmitter.goldChange({
              type: 'PROFESSION_USED',
              phase: 'RESOLUTION',
              step: 'end.accountant',
              player,
              before: goldBefore,
              after: player.gold,
              reason: 'accountant_bonus',
              payload: { profession: 'accountant', effect: 'low_gold_bonus' },
            });
          } else {
            rulesAccountantBonus({ gold: player.gold });
            AuditEmitter.event({
              type: 'PROFESSION_SKIPPED',
              phase: 'RESOLUTION',
              step: 'end.accountant',
              playerId: player.id,
              message: `${player.name}: gold=${player.gold} (>=2) — brak bonusu`,
              payload: { profession: 'accountant', reason: 'gold_above_threshold' },
            });
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
    rng: RandomSource // SeededRNG - przekazywany z backendu (nie możemy importować z backendu)
  ): void {
    const roll = rng.random();
    const threshold = state.config.eventFrequency / 100;

    if (roll >= threshold) {
      rulesRandomEvent({ roll, threshold, fired: false });
      AuditEmitter.event({
        type: 'RANDOM_EVENT',
        phase: 'PREP',
        step: 'random_event',
        message: `Brak zdarzenia losowego (roll=${roll.toFixed(4)}, threshold=${threshold})`,
        payload: { roll, threshold, bonus: null },
      });
      return;
    }

    const randomPlayer = rng.randomChoice(players);
    const bonus = rng.randomInt(1, 3);
    const goldBefore = randomPlayer.gold;
    randomPlayer.gold += bonus;
    rulesRandomEvent({
      roll,
      threshold,
      fired: true,
      playerName: randomPlayer.name,
      bonus,
    });
    AuditEmitter.goldChange({
      type: 'RANDOM_EVENT',
      phase: 'PREP',
      step: 'random_event',
      player: randomPlayer,
      before: goldBefore,
      after: randomPlayer.gold,
      reason: 'random_event',
      payload: { roll, threshold, bonus },
    });
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

      AuditEmitter.event({
        type: 'DELAYED_BUILD',
        phase: 'RESOLUTION',
        step: 'build.deferred',
        playerId: player.id,
        message: `${player.name}: wykonuję ${player.deferredBuildActions.length} odłożonych budów`,
        payload: {
          targetId: player.id,
          targetName: player.name,
          count: player.deferredBuildActions.length,
          kind: 'deferred_execution',
        },
      });
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
        for (const buildAction of buildActions) {
          this.deferBuildAction(player, buildAction, state, politicianPlayer);
        }
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
            AuditEmitter.event({
              type: 'PROFESSION_USED',
              phase: 'RESOLUTION',
              step: 'build.architect',
              playerId: player.id,
              message: `${player.name}: ${lastBuilding.type} kategoria ${oldCategory}→${architectAction.buildingCategory}`,
              payload: {
                profession: 'architect',
                buildingId: lastBuilding.id,
                buildingType: lastBuilding.type,
                effect: `category_changed:${oldCategory}->${architectAction.buildingCategory}`,
              },
            });
          }
        }
      }
    }
  }

  private static deferBuildAction(
    player: Player,
    buildAction: PlayerAction,
    state: GameState,
    politicianPlayer: Player | undefined,
  ): void {
    if (!buildAction.buildingType) return;

    const buildingData = BUILDING_DATA[buildAction.buildingType];
    if (!buildingData) return;

    const card = buildAction.cardId
      ? player.cards.find((c) => c.id === buildAction.cardId)
      : null;
    const baseValue =
      buildAction.buildingValue ||
      (card ? card.buildingValue : null) ||
      buildingData.valueRange[0];
    const buildProfession = player.profession;
    const opportunityHunterDiscount =
      buildProfession === 'opportunity_hunter' && !player.professionAbilityUsed;
    let cost = baseValue;

    if (opportunityHunterDiscount) {
      cost = Math.max(0, cost - 2);
    }

    if (player.gold < cost) {
      const skipMessage =
        `Budowa opóźniona pominięta: gracz ${player.name} (${player.id}) próbował wybudować ` +
        `"${buildAction.buildingType}" za ${cost} złota, ale ma tylko ${player.gold}.`;
      rulesBuildSkip({
        buildingType: buildAction.buildingType,
        baseValue,
        cost,
        gold: player.gold,
        reason: 'insufficient_gold',
      });
      AuditEmitter.event({
        type: 'BUILD_SKIPPED',
        phase: 'RESOLUTION',
        step: 'build.delayed.skip',
        playerId: player.id,
        message: skipMessage,
        payload: {
          buildingType: buildAction.buildingType,
          baseValue,
          cost,
          gold: player.gold,
          profession: buildProfession,
          source: 'delayed',
          reason: 'insufficient_gold',
        },
      });
      return;
    }

    const goldBefore = player.gold;
    player.gold -= cost;

    AuditEmitter.beginOperation('delayed_build');

    const buildingId = `building-${Date.now()}-${Math.random()}`;
    const startedPayload = {
      buildingId,
      buildingType: buildAction.buildingType,
      buildingCategory: buildingData.category,
      baseValue,
      cost,
      opportunityHunter: opportunityHunterDiscount,
    };

    if (cost > 0) {
      rulesBuildCost({
        buildingType: buildAction.buildingType,
        baseValue,
        discount: opportunityHunterDiscount ? Math.min(2, baseValue) : 0,
        cost,
        gold: goldBefore,
        opportunityHunter: opportunityHunterDiscount,
        source: 'delayed',
      });
      AuditEmitter.goldChange({
        type: 'BUILDING_STARTED',
        phase: 'RESOLUTION',
        step: 'build.delayed.cost',
        player,
        before: goldBefore,
        after: player.gold,
        reason: 'delayed_build_cost',
        payload: startedPayload,
      });
    } else {
      AuditEmitter.event({
        type: 'BUILDING_STARTED',
        phase: 'RESOLUTION',
        step: 'build.delayed.cost',
        playerId: player.id,
        message: `${player.name}: rozpoczęto budowę ${buildAction.buildingType} (koszt=0)`,
        payload: startedPayload,
      });
    }

    player.buildings.push({
      id: buildingId,
      type: buildAction.buildingType,
      category: buildingData.category,
      value: 0,
      pending: true,
    });

    player.deferredBuildActions.push({
      ...buildAction,
      buildingId,
      plannedProfession: player.profession ?? undefined,
    });

    AuditEmitter.event({
      type: 'DELAYED_BUILD',
      phase: 'RESOLUTION',
      step: 'build.delayed',
      playerId: player.id,
      message: `${player.name}: opóźniono budowę ${buildAction.buildingType} (pending, koszt=${cost})`,
      payload: {
        targetId: player.id,
        targetName: player.name,
        buildingId,
        buildingType: buildAction.buildingType,
        cost,
        kind: 'build_deferred',
      },
    });
    AuditEmitter.endOperation();
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

      if (source === 'deferred' && buildAction.buildingId) {
        const pendingBuilding = player.buildings.find(
          (b) => b.id === buildAction.buildingId && b.pending,
        );
        if (!pendingBuilding) {
          AuditEmitter.event({
            type: 'BUILD_SKIPPED',
            phase: 'RESOLUTION',
            step: 'build.deferred.skip',
            playerId: player.id,
            message: `${player.name}: brak pending budynku ${buildAction.buildingId}`,
            payload: {
              buildingType: buildAction.buildingType ?? null,
              buildingId: buildAction.buildingId,
              source: 'deferred',
              reason: 'pending_building_missing',
            },
          });
          continue;
        }

        const card = buildAction.cardId
          ? player.cards.find((c) => c.id === buildAction.cardId)
          : null;
        const baseValue =
          buildAction.buildingValue ||
          (card ? card.buildingValue : null) ||
          buildingData.valueRange[0];

        let buildingValue = baseValue;

        AuditEmitter.beginOperation('build');

        let urbanistBoost = false;
        if (player.urbanistPendingBuildBoost && player.buildingsBuiltThisRound === 0) {
          buildingValue = Math.min(5, buildingValue + 1);
          player.urbanistPendingBuildBoost = false;
          urbanistBoost = true;
          AuditEmitter.event({
            type: 'BUILD_BOOSTED',
            phase: 'RESOLUTION',
            step: 'build.urbanist_boost',
            playerId: player.id,
            message: `${player.name}: +1 wartość odłożonego budynku (${baseValue}→${buildingValue})`,
            payload: {
              buildingType: buildAction.buildingType,
              valueBefore: baseValue,
              valueAfter: buildingValue,
              source: 'deferred',
            },
          });
        }

        pendingBuilding.value = buildingValue;
        pendingBuilding.pending = false;
        player.buildingsBuiltThisRound++;

        AuditEmitter.event({
          type: 'BUILDING_FINISHED',
          phase: 'RESOLUTION',
          step: `build.success.${source}`,
          playerId: player.id,
          message: `${player.name}: ukończono odłożony ${buildAction.buildingType} (wartość=${buildingValue})`,
          payload: {
            buildingId: pendingBuilding.id,
            buildingType: buildAction.buildingType,
            buildingCategory: buildingData.category,
            value: buildingValue,
            baseValue,
            cost: 0,
            opportunityHunter: false,
            urbanistBoost,
            source: 'deferred',
          },
        });

        if (
          politicianPlayer &&
          player.id !== politicianPlayer.id &&
          state.taxedCategory === buildingData.category
        ) {
          const politicianGoldBefore = politicianPlayer.gold;
          politicianPlayer.gold += 1;
          rulesPoliticianTax({
            taxedCategory: state.taxedCategory,
            buildingCategory: buildingData.category,
            builderId: player.id,
            politicianId: politicianPlayer.id,
          });
          AuditEmitter.goldChange({
            type: 'TAX_APPLIED',
            phase: 'RESOLUTION',
            step: 'build.politician_tax',
            player: politicianPlayer,
            before: politicianGoldBefore,
            after: politicianPlayer.gold,
            reason: 'politician_tax',
            payload: {
              builderId: player.id,
              builderName: player.name,
              buildingType: buildAction.buildingType,
              taxedCategory: state.taxedCategory,
            },
          });
        }
        AuditEmitter.endOperation();
        continue;
      }

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
          `Budowa pominięta: gracz ${player.name} (${player.id}) próbował wybudować ` +
          `"${buildAction.buildingType}" za ${cost} złota, ale ma tylko ${player.gold}.`;
        rulesBuildSkip({
          buildingType: buildAction.buildingType,
          baseValue,
          cost,
          gold: player.gold,
          reason: 'insufficient_gold',
        });
        AuditEmitter.event({
          type: 'BUILD_SKIPPED',
          phase: 'RESOLUTION',
          step: 'build.skip',
          playerId: player.id,
          message: skipMessage,
          payload: {
            buildingType: buildAction.buildingType,
            baseValue,
            cost,
            gold: player.gold,
            profession: buildProfession ?? null,
            source,
            reason: 'insufficient_gold',
          },
        });
        continue;
      }

      const goldBefore = player.gold;
      player.gold -= cost;

      AuditEmitter.beginOperation('build');

      let buildingValue = baseValue;
      let urbanistBoost = false;

      if (player.urbanistPendingBuildBoost && player.buildingsBuiltThisRound === 0) {
        buildingValue = Math.min(5, buildingValue + 1);
        player.urbanistPendingBuildBoost = false;
        urbanistBoost = true;
        AuditEmitter.event({
          type: 'BUILD_BOOSTED',
          phase: 'RESOLUTION',
          step: 'build.urbanist_boost',
          playerId: player.id,
          message: `${player.name}: +1 wartość pierwszego budynku w rundzie (${baseValue}→${buildingValue})`,
          payload: {
            buildingType: buildAction.buildingType,
            valueBefore: baseValue,
            valueAfter: buildingValue,
            source,
          },
        });
      }

      const buildingId = `building-${Date.now()}-${Math.random()}`;
      player.buildings.push({
        id: buildingId,
        type: buildAction.buildingType,
        category: buildingData.category,
        value: buildingValue,
      });
      player.buildingsBuiltThisRound++;

      const finishedPayload = {
        buildingId,
        buildingType: buildAction.buildingType,
        buildingCategory: buildingData.category,
        value: buildingValue,
        baseValue,
        cost,
        opportunityHunter: opportunityHunterDiscount,
        urbanistBoost,
        source,
      };
      const finishedMessage =
        `${player.name}: wybudowano ${buildAction.buildingType} (wartość=${buildingValue}, kategoria=${buildingData.category})`;

      if (cost > 0) {
        rulesBuildCost({
          buildingType: buildAction.buildingType,
          baseValue,
          discount: opportunityHunterDiscount ? Math.min(2, baseValue) : 0,
          cost,
          gold: goldBefore,
          opportunityHunter: opportunityHunterDiscount,
          urbanistBoost,
          source,
        });
        AuditEmitter.goldChange({
          type: 'BUILDING_FINISHED',
          phase: 'RESOLUTION',
          step: `build.cost.${source}`,
          player,
          before: goldBefore,
          after: player.gold,
          reason: 'build_cost',
          message: finishedMessage,
          payload: finishedPayload,
        });
      } else {
        AuditEmitter.event({
          type: 'BUILDING_FINISHED',
          phase: 'RESOLUTION',
          step: `build.success.${source}`,
          playerId: player.id,
          message: finishedMessage,
          payload: finishedPayload,
        });
      }

      if (
        politicianPlayer &&
        player.id !== politicianPlayer.id &&
        state.taxedCategory === buildingData.category
      ) {
        const politicianGoldBefore = politicianPlayer.gold;
        politicianPlayer.gold += 1;
        rulesPoliticianTax({
          taxedCategory: state.taxedCategory,
          buildingCategory: buildingData.category,
          builderId: player.id,
          politicianId: politicianPlayer.id,
        });
        AuditEmitter.goldChange({
          type: 'TAX_APPLIED',
          phase: 'RESOLUTION',
          step: 'build.politician_tax',
          player: politicianPlayer,
          before: politicianGoldBefore,
          after: politicianPlayer.gold,
          reason: 'politician_tax',
          payload: {
            builderId: player.id,
            builderName: player.name,
            buildingType: buildAction.buildingType,
            taxedCategory: state.taxedCategory,
          },
        });
      }
      AuditEmitter.endOperation();
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

      if (player.professionAbilityUsed) {
        rulesProfessionSkip({
          profession: 'thief',
          reason: 'ability_blocked',
          saboteurBlocked: true,
        });
        AuditEmitter.event({
          type: 'PROFESSION_SKIPPED',
          phase: 'RESOLUTION',
          step: 'theft.skip',
          playerId: player.id,
          message: `${player.name}: zablokowany przez Sabotażystę — pominięto`,
          payload: { profession: 'thief', reason: 'ability_blocked' },
        });
        continue;
      }

      const playerActions = actions.get(player.id) || [];
      const professionAction = playerActions.find(
        (a) => a.type === 'use_profession' && a.professionAbility
      );

      if (!professionAction || !professionAction.target) {
        rulesProfessionSkip({ profession: 'thief', reason: 'no_action_or_target' });
        AuditEmitter.event({
          type: 'PROFESSION_SKIPPED',
          phase: 'RESOLUTION',
          step: 'theft.skip',
          playerId: player.id,
          message: `${player.name}: brak akcji lub celu — pominięto`,
          payload: { profession: 'thief', reason: 'no_action_or_target' },
        });
        continue;
      }

      const target = players.find((p) => p.id === professionAction.target);
      if (!target || target.protected) {
        rulesProfessionSkip({
          profession: 'thief',
          reason: !target ? 'target_missing' : 'target_protected',
          targetId: professionAction.target,
          targetProtected: target?.protected,
        });
        AuditEmitter.event({
          type: 'PROFESSION_SKIPPED',
          phase: 'RESOLUTION',
          step: 'theft.skip',
          playerId: player.id,
          message: `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : 'jest chroniony'} — pominięto`,
          payload: {
            profession: 'thief',
            reason: !target ? 'target_missing' : 'target_protected',
            targetId: professionAction.target,
          },
        });
        continue;
      }

      if (professionAction.theftTarget === 'gold') {
        const stolen = Math.min(target.gold, 2);
        const targetGoldBefore = target.gold;
        const thiefGoldBefore = player.gold;
        target.gold -= stolen;
        player.gold += stolen;
        rulesTheftGold({
          thiefName: player.name,
          targetName: target.name,
          targetGold: targetGoldBefore,
          targetProtected: false,
          abilityBlocked: false,
          stolen,
        });
        AuditEmitter.beginOperation('theft');
        AuditEmitter.goldChange({
          type: 'THEFT',
          phase: 'RESOLUTION',
          step: 'theft.gold',
          player: target,
          before: targetGoldBefore,
          after: target.gold,
          reason: 'theft_gold_victim',
          payload: {
            mode: 'gold',
            thiefId: player.id,
            thiefName: player.name,
            victimId: target.id,
            victimName: target.name,
            amount: stolen,
            role: 'victim',
          },
        });
        AuditEmitter.goldChange({
          type: 'THEFT',
          phase: 'RESOLUTION',
          step: 'theft.gold',
          player,
          before: thiefGoldBefore,
          after: player.gold,
          reason: 'theft_gold_thief',
          payload: {
            mode: 'gold',
            thiefId: player.id,
            thiefName: player.name,
            victimId: target.id,
            victimName: target.name,
            amount: stolen,
            role: 'thief',
          },
        });
        AuditEmitter.endOperation();
      } else if (professionAction.theftTarget === 'card') {
        if (target.cards.length > 0) {
          const stolenCard = target.cards.pop()!;
          player.cards.push(stolenCard);
          rulesTheftCard({
            targetName: target.name,
            cardsAvailable: target.cards.length + 1,
            success: true,
          });
          AuditEmitter.beginOperation('theft_card');
          AuditEmitter.event({
            type: 'THEFT',
            phase: 'RESOLUTION',
            step: 'theft.card',
            playerId: player.id,
            message: `${player.name} → ${target.name}: skradziono kartę ${stolenCard.name}`,
            payload: {
              mode: 'card',
              thiefId: player.id,
              thiefName: player.name,
              victimId: target.id,
              victimName: target.name,
              cardId: stolenCard.id,
              cardName: stolenCard.name,
              role: 'summary',
            },
          });
          AuditEmitter.event({
            type: 'CARD_REMOVED',
            phase: 'RESOLUTION',
            step: 'theft.card',
            playerId: target.id,
            message: `${target.name}: karta ${stolenCard.name} skradziona przez ${player.name}`,
            payload: {
              cardId: stolenCard.id,
              cardName: stolenCard.name,
              reason: 'stolen',
            },
          });
          AuditEmitter.event({
            type: 'CARD_DRAWN',
            phase: 'RESOLUTION',
            step: 'theft.card',
            playerId: player.id,
            message: `${player.name}: otrzymuje skradzioną kartę ${stolenCard.name}`,
            payload: {
              cardId: stolenCard.id,
              cardName: stolenCard.name,
              buildingType: stolenCard.buildingType,
              buildingCategory: stolenCard.buildingCategory,
              buildingValue: stolenCard.buildingValue,
              source: 'theft',
            },
          });
          AuditEmitter.endOperation();
        } else {
          rulesTheftCard({
            targetName: target.name,
            cardsAvailable: 0,
            success: false,
          });
          AuditEmitter.event({
            type: 'PROFESSION_SKIPPED',
            phase: 'RESOLUTION',
            step: 'theft.card',
            playerId: player.id,
            message: `${player.name} → ${target.name}: cel nie ma kart — pominięto`,
            payload: {
              profession: 'thief',
              reason: 'target_has_no_cards',
              targetId: target.id,
            },
          });
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

      if (player.professionAbilityUsed) {
        rulesProfessionSkip({
          profession: 'vandal',
          reason: 'ability_blocked',
          saboteurBlocked: true,
        });
        AuditEmitter.event({
          type: 'PROFESSION_SKIPPED',
          phase: 'RESOLUTION',
          step: 'vandal.skip',
          playerId: player.id,
          message: `${player.name}: zablokowany przez Sabotażystę — pominięto`,
          payload: { profession: 'vandal', reason: 'ability_blocked' },
        });
        continue;
      }

      const playerActions = actions.get(player.id) || [];
      const professionAction = playerActions.find(
        (a) => a.type === 'use_profession' && a.professionAbility
      );

      if (!professionAction || !professionAction.target) {
        rulesProfessionSkip({ profession: 'vandal', reason: 'no_action_or_target' });
        AuditEmitter.event({
          type: 'PROFESSION_SKIPPED',
          phase: 'RESOLUTION',
          step: 'vandal.skip',
          playerId: player.id,
          message: `${player.name}: brak akcji lub celu — pominięto`,
          payload: { profession: 'vandal', reason: 'no_action_or_target' },
        });
        continue;
      }

      const target = players.find((p) => p.id === professionAction.target);
      if (!target || target.protected || target.buildings.length === 0) {
        const reason = !target
          ? 'target_missing'
          : target.protected
            ? 'target_protected'
            : 'target_has_no_buildings';
        rulesProfessionSkip({
          profession: 'vandal',
          reason,
          targetId: professionAction.target,
          targetProtected: target?.protected,
        });
        AuditEmitter.event({
          type: 'PROFESSION_SKIPPED',
          phase: 'RESOLUTION',
          step: 'vandal.skip',
          playerId: player.id,
          message: `${player.name}: cel ${professionAction.target} ${!target ? 'nie istnieje' : target.protected ? 'chroniony' : 'bez budynków'} — pominięto`,
          payload: {
            profession: 'vandal',
            reason: !target
              ? 'target_missing'
              : target.protected
                ? 'target_protected'
                : 'target_has_no_buildings',
            targetId: professionAction.target,
          },
        });
        continue;
      }

      const building = target.buildings.reduce((best, current) =>
        current.value > best.value ? current : best
      );

      const valueBefore = building.value;
      building.value = Math.max(0, building.value - 2);
      rulesVandalism({
        targetName: target.name,
        targetProtected: false,
        abilityBlocked: false,
        buildingsCount: target.buildings.length,
        buildingType: building.type,
        valueBefore,
        valueAfter: building.value,
      });
      AuditEmitter.beginOperation('vandal');
      AuditEmitter.event({
        type: 'VANDALISM',
        phase: 'RESOLUTION',
        step: 'vandal',
        playerId: player.id,
        message: `${player.name} → ${target.name}: ${building.type} wartość ${valueBefore}→${building.value}`,
        payload: {
          targetId: target.id,
          targetName: target.name,
          buildingId: building.id,
          buildingType: building.type,
          valueBefore,
          valueAfter: building.value,
        },
      });
      AuditEmitter.endOperation();
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
