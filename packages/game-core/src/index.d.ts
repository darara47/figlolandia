export type GamePhase = 'LOBBY' | 'PREP' | 'PLANNING' | 'RESOLUTION' | 'END';
export interface Player {
    id: string;
    name: string;
    gold: number;
    buildings: Building[];
    cards: Card[];
    profession: Profession | null;
    lastProfession: Profession | null;
    order: number;
}
export interface Building {
    id: string;
    type: BuildingType;
    value: number;
}
export type BuildingType = 'house' | 'shop' | 'factory' | 'palace';
export interface Card {
    id: string;
    type: CardType;
    name: string;
}
export type CardType = 'building' | 'sabotage' | 'theft' | 'destruction' | 'event';
export type Profession = 'builder' | 'thief' | 'saboteur' | 'merchant' | 'guard';
export interface GameConfig {
    maxRounds: number;
    victoryThreshold: number;
    eventFrequency: number;
    minPlayers: number;
    maxPlayers: number;
}
export interface GameState {
    gameId: string;
    phase: GamePhase;
    round: number;
    players: Player[];
    config: GameConfig;
    seed: number;
    winner: string | null;
    pendingActions: Map<string, PlayerAction[]>;
}
export interface PlayerAction {
    type: ActionType;
    target?: string;
    cardId?: string;
    buildingType?: BuildingType;
}
export type ActionType = 'build' | 'sabotage' | 'theft' | 'destroy' | 'play_event' | 'pass';
export declare class RoundEngine {
    static resolveRound(state: GameState, actions: Map<string, PlayerAction[]>): GameState;
    private static resolveEvents;
    private static resolveSabotage;
    private static resolveTheft;
    private static resolveDestruction;
    private static resolveBuildings;
    private static getBuildingCost;
    private static getBuildingValue;
    static checkVictory(state: GameState): string | null;
}
export declare function generateGameId(): string;
export declare function generatePlayerId(): string;
