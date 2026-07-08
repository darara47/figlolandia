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
    order: number;
    professionAbilityUsed: boolean;
    protected: boolean;
    delayedBuildings: boolean;
    buildingsBuiltThisRound: number;
}
export interface Building {
    id: string;
    type: BuildingType;
    category: BuildingCategory;
    value: number;
}
export interface Card {
    id: string;
    name: string;
    buildingType: BuildingType;
    buildingCategory: BuildingCategory;
    buildingValue: number;
}
export interface GameConfig {
    maxRounds: number;
    victoryThreshold: number;
    eventFrequency: number;
    minPlayers: number;
    maxPlayers: number;
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
    cheaperCategory?: BuildingCategory;
    spiedHands?: Map<string, Card[]>;
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
    cheaperCategory?: BuildingCategory;
    increasedValueBuildingId?: string;
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
export declare class RoundEngine {
    /**
     * Rozstrzyga akcje graczy w fazie RESOLUTION
     * Zwraca zaktualizowany stan gry
     */
    static resolveRound(state: GameState, actions: Map<string, PlayerAction[]>): GameState;
    /**
     * Zastosuj zdolności zawodowe przed akcjami
     * WAŻNE: Polityk musi być rozstrzygany jako pierwszy (według kolejności),
     * aby zniżka była dostępna dla wszystkich graczy podczas budowy
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
    static resolveRandomEvents(players: Player[], state: GameState, rng: any): void;
    private static resolveSabotage;
    private static resolveTheft;
    private static resolveDestruction;
    private static resolveBuildings;
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
/**
 * Pobiera wszystkie zawody
 */
export declare function getAllProfessions(): Profession[];
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
