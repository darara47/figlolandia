export type GamePhase = 'LOBBY' | 'PREP' | 'PLANNING' | 'RESOLUTION' | 'END';
export type BuildingCategory = 'education' | 'health' | 'finance' | 'administration' | 'entertainment';
export type BuildingType = 'nursery' | 'kindergarten' | 'school' | 'technical_school' | 'high_school' | 'university' | 'pharmacy' | 'clinic' | 'nursing_home' | 'medical_clinic' | 'hospital' | 'cemetery' | 'exchange_office' | 'auction_house' | 'bank' | 'stock_exchange' | 'mint' | 'city_archive' | 'police_station' | 'city_hall' | 'court' | 'town_hall' | 'bar' | 'park' | 'cinema' | 'theater' | 'stadium';
export type Profession = 'lucky' | 'opportunity_hunter' | 'investor' | 'accountant' | 'builder' | 'architect' | 'urbanist' | 'vandal' | 'thief' | 'saboteur' | 'spy' | 'politician' | 'diplomat' | 'inspector';
export interface Player {
    id: string;
    name: string;
    gold: number;
    buildings: Building[];
    cards: Card[];
    profession: Profession | null;
    lastProfession: Profession | null;
    joinOrder: number;
    order: number;
    professionAbilityUsed: boolean;
    protected: boolean;
    delayedBuildings: boolean;
    deferredBuildActions: PlayerAction[];
    urbanistPendingBuildBoost: boolean;
    buildingsBuiltThisRound: number;
    /** Szczęściarz: ile złota przyznano w tej rundzie (do narracji / animacji). */
    luckyGoldGranted?: number;
}
export interface Building {
    id: string;
    type: BuildingType;
    category: BuildingCategory;
    value: number;
    pending?: boolean;
}
export interface Card {
    id: string;
    name: string;
    buildingType: BuildingType;
    buildingCategory: BuildingCategory;
    buildingValue: number;
}
export type AnimationSpeed = 'full' | 'fast' | 'off';
export interface GameConfig {
    maxRounds: number;
    victoryThreshold: number;
    eventFrequency: number;
    lastMoveGoldBonus: number;
    minPlayers: number;
    maxPlayers: number;
    animationSpeed: AnimationSpeed;
}
export interface GameState {
    gameId: string;
    gamePin: string;
    phase: GamePhase;
    round: number;
    players: Player[];
    config: GameConfig;
    seed: number;
    winner: string | null;
    pendingActions: Map<string, PlayerAction[]>;
    taxedCategory?: BuildingCategory;
    spiedHands?: Map<string, Card[]>;
    planningPhaseStartTime?: number;
}
export interface PlayerAction {
    type: ActionType;
    target?: string;
    cardId?: string;
    buildingType?: BuildingType;
    buildingCategory?: BuildingCategory;
    buildingValue?: number;
    professionAbility?: boolean;
    theftTarget?: 'gold' | 'card';
    inspectTarget?: string;
    taxedCategory?: BuildingCategory;
    plannedProfession?: Profession;
    buildingId?: string;
}
export type ActionType = 'build' | 'use_profession' | 'pass';
export declare const BUILDING_DATA: Record<BuildingType, {
    category: BuildingCategory;
    name: string;
    valueRange: [number, number];
}>;
export declare const PROFESSION_DATA: Record<Profession, {
    name: string;
    category: string;
}>;
export { AuditEmitter } from './audit/emitter';
export { EventCorrelation } from './audit/correlation';
export type { EventUid } from './audit/correlation';
export { RuleEvaluator } from './audit/rules';
export type { RuleEvaluationInput } from './audit/rules';
export { rulesBuildCost, rulesBuildSkip, rulesPoliticianTax, rulesProfessionSkip, rulesLuckyBonus, rulesAccountantBonus, rulesPoliticianCategory, rulesDiplomatProtection, rulesSaboteurBlock, rulesTheftGold, rulesTheftCard, rulesVandalism, rulesBaseIncome, rulesLastInOrderBonus, rulesRandomEvent, } from './audit/rules';
export type { AuditEventPayloadMap, AuditEventType, AuditEventPayload, AuditEventInput, AuditEventRecord, AuditGoldChangeInput, AuditGoldChangeRecord, AuditSnapshotInput, AuditSnapshotRecord, AuditSink, AuditPlayerBrief, AuditResolutionPlayerBrief, AuditFlagsPlayerBrief, SnapshotLabel, EventCorrelationLink, } from './audit/types';
export { RESOLUTION_TURN_MS, RESOLUTION_BUILD_AT, RESOLUTION_PROFESSION_AT, RESOLUTION_TURN_GAP_MS, GOLD_FLOAT_MS, goldFloatTotalMs, getResolutionTurnDurationMs, getResolutionAdvanceDelayMs, UI_ANIMATION_MS, } from './animationTiming';
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
export declare class RoundEngine {
    /**
     * Rozstrzyga akcje graczy w fazie RESOLUTION
     * Zwraca zaktualizowany stan gry
     */
    static resolveRound(state: GameState, actions: Map<string, PlayerAction[]>): GameState;
    /**
     * Zastosuj zdolności zawodowe przed akcjami.
     * Kolejność: Polityk → Dyplomata → Sabotażysta → pozostałe (lucky, inspector, spy, urbanist).
     */
    private static applyProfessionAbilities;
    /**
     * Zastosuj efekty końcowe zawodów
     */
    private static applyEndOfRoundAbilities;
    /**
     * Rozstrzyga zdarzenia losowe na początku rundy (faza PREP)
     * Zdarzenia są wywoływane przez serwer przed fazą PLANNING
     *
     * @param players Lista graczy
     * @param state Stan gry
     * @param rng SeededRNG - musi być przekazany z backendu
     */
    static resolveRandomEvents(players: Player[], state: GameState, rng: RandomSource): void;
    private static resolveBuildings;
    private static deferBuildAction;
    private static executeBuildActions;
    private static resolveTheft;
    private static resolveDestruction;
    /**
     * Sprawdza warunki zwycięstwa
     */
    static checkVictory(state: GameState): string | null;
}
export declare function generateGameId(): string;
export declare function generatePlayerId(): string;
/**
 * Generuje 6-cyfrowy PIN dla gry
 * @param existingPins Zbiór istniejących PIN-ów do uniknięcia kolizji
 */
export declare function generateGamePin(existingPins?: Set<string>): string;
/** Zawody tymczasowo wyłączone z losowania (niedokończone mechaniki) */
export declare const HIDDEN_PROFESSIONS: readonly Profession[];
/**
 * Pobiera wszystkie zawody (w tym ukryte)
 */
export declare function getAllProfessions(): Profession[];
/**
 * Pobiera zawody dostępne do losowania w grze
 */
export declare function getAssignableProfessions(): Profession[];
/**
 * Kolory kategorii budynków (hex)
 * Używane do stylizacji kart w UI
 */
export declare const CATEGORY_COLORS: Record<BuildingCategory, string>;
/**
 * Pobiera kolor kategorii budynku
 */
export declare function getCategoryColor(category: BuildingCategory): string;
/**
 * Pobiera wszystkie typy budynków w kategorii
 */
export declare function getBuildingsByCategory(category: BuildingCategory): BuildingType[];
