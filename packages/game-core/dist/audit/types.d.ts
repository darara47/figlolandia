import type { BuildingCategory, BuildingType, GameConfig, GamePhase, GameState, PlayerAction, Profession } from '../index';
/** Etykiety pełnych snapshotów stanu gry zapisywanych w trakcie rundy. */
export type SnapshotLabel = 'BEFORE_PREPARATION' | 'AFTER_PREPARATION' | 'AFTER_ABILITIES' | 'AFTER_BUILD' | 'AFTER_THEFT' | 'AFTER_END_ABILITIES' | 'END_ROUND';
/** Skrócony opis gracza używany w payloadach zdarzeń. */
export interface AuditPlayerBrief {
    id: string;
    name: string;
    gold: number;
    profession: Profession | null;
}
export interface AuditResolutionPlayerBrief extends AuditPlayerBrief {
    order: number;
    deferredBuilds: number;
}
export interface AuditFlagsPlayerBrief {
    id: string;
    name: string;
    profession: Profession | null;
    professionAbilityUsed: boolean;
    protected: boolean;
    delayedBuildings: boolean;
    urbanistPendingBuildBoost: boolean;
    deferredBuildActions: number;
    buildingsBuiltThisRound: number;
}
/**
 * Mapa: typ zdarzenia -> typ payloadu.
 * Każde zdarzenie audytowe ma dokładnie zdefiniowany, typowany payload (bez any).
 */
export interface AuditEventPayloadMap {
    GAME_CREATED: {
        gamePin: string;
        hostId: string;
        hostName: string;
        config: GameConfig;
    };
    PLAYER_JOINED: {
        playerName: string;
        joinOrder: number;
    };
    GAME_STARTED: {
        config: GameConfig;
        players: {
            id: string;
            name: string;
        }[];
    };
    ROUND_STARTED: {
        players: {
            id: string;
            name: string;
            gold: number;
            profession: Profession | null;
            deferredBuilds: number;
        }[];
    };
    PROFESSION_ASSIGNED: {
        profession: Profession;
    };
    BASE_INCOME: {
        amount: number;
    };
    LAST_IN_ORDER_BONUS: {
        order: number;
        bonus: number;
    };
    RANDOM_EVENT: {
        roll: number;
        threshold: number;
        bonus: number | null;
    };
    CARD_DRAWN: {
        cardId: string;
        cardName: string;
        buildingType: BuildingType;
        buildingCategory: BuildingCategory;
        buildingValue: number;
        source: 'lobby' | 'prep' | 'theft';
    };
    CARD_REMOVED: {
        cardId: string;
        cardName: string | null;
        reason: 'used' | 'stolen';
    };
    TURN_ORDER: {
        order: {
            playerId: string;
            name: string;
            order: number;
        }[];
    };
    PLANNING_CONFIRMED: {
        profession: Profession | null;
        buildConfirmed: boolean;
        abilityConfirmed: boolean;
        buildActions: PlayerAction[];
        abilityActions: PlayerAction[];
        autoInjected: boolean;
        skipped: boolean;
    };
    PLANNING_TIMEOUT: {
        skippedPlayerIds: string[];
    };
    RESOLUTION_STARTED: {
        players: AuditResolutionPlayerBrief[];
        actions: Record<string, PlayerAction[]>;
    };
    PROFESSION_USED: {
        profession: Profession;
        targetId?: string;
        targetName?: string;
        taxedCategory?: BuildingCategory;
        theftTarget?: 'gold' | 'card';
        cardsSeen?: number;
        buildingId?: string;
        buildingType?: BuildingType;
        valueBefore?: number;
        valueAfter?: number;
        effect: string;
    };
    PROFESSION_SKIPPED: {
        profession: Profession | null;
        reason: string;
        targetId?: string;
    };
    PROTECTION: {
        profession: Profession;
    };
    TAX_CATEGORY_SET: {
        taxedCategory: BuildingCategory;
    };
    TAX_APPLIED: {
        builderId: string;
        builderName: string;
        buildingType: BuildingType;
        taxedCategory: BuildingCategory;
    };
    BUILDING_STARTED: {
        buildingId: string;
        buildingType: BuildingType;
        buildingCategory: BuildingCategory;
        baseValue: number;
        cost: number;
        opportunityHunter: boolean;
    };
    BUILDING_FINISHED: {
        buildingId: string | null;
        buildingType: BuildingType;
        buildingCategory: BuildingCategory;
        value: number;
        baseValue: number;
        cost: number;
        opportunityHunter: boolean;
        urbanistBoost: boolean;
        source: 'current' | 'deferred';
    };
    BUILD_SKIPPED: {
        buildingType: BuildingType | null;
        buildingId?: string;
        baseValue?: number;
        cost?: number;
        gold?: number;
        profession?: Profession | null;
        source: 'current' | 'deferred' | 'delayed';
        reason: string;
    };
    BUILD_BOOSTED: {
        buildingType: BuildingType;
        valueBefore: number;
        valueAfter: number;
        source: 'current' | 'deferred';
    };
    DELAYED_BUILD: {
        targetId?: string;
        targetName?: string;
        buildingId?: string;
        buildingType?: BuildingType;
        cost?: number;
        count?: number;
        kind: 'inspector_delay' | 'build_deferred' | 'deferred_execution';
    };
    VANDALISM: {
        targetId: string;
        targetName: string;
        buildingId: string;
        buildingType: BuildingType;
        valueBefore: number;
        valueAfter: number;
    };
    THEFT: {
        mode: 'gold' | 'card';
        thiefId: string;
        thiefName: string;
        victimId: string;
        victimName: string;
        amount?: number;
        cardId?: string;
        cardName?: string;
        role: 'thief' | 'victim' | 'summary';
    };
    GOLD_CHANGED: {
        note: string | null;
    };
    RESOLUTION_FLAGS: {
        players: AuditFlagsPlayerBrief[];
        taxedCategory: BuildingCategory | null;
    };
    VICTORY_POINTS: {
        points: number;
        gold: number;
        buildingsValue: number;
        buildingsCount: number;
    };
    ROUND_FINISHED: {
        winnerId: string | null;
    };
    GAME_FINISHED: {
        winnerId: string;
        winnerName: string | null;
        points: number | null;
        rounds: number;
    };
    INVALID_ACTION: {
        action: string;
        reason: string;
    };
}
export type AuditEventType = keyof AuditEventPayloadMap;
export type AuditEventPayload = AuditEventPayloadMap[AuditEventType];
/** Zdarzenie emitowane przez silnik gry (bez kontekstu gameId/round). */
export interface AuditEventInput<T extends AuditEventType = AuditEventType> {
    type: T;
    phase: GamePhase;
    step: string;
    message: string;
    playerId?: string | null;
    payload: AuditEventPayloadMap[T];
}
/**
 * Zmiana złota. Sink zapisuje JEDNO zdarzenie o podanym typie
 * oraz powiązany wiersz w Gold Ledger (before/delta/after/reason).
 */
export interface AuditGoldChangeInput<T extends AuditEventType = AuditEventType> {
    type: T;
    phase: GamePhase;
    step: string;
    player: {
        id: string;
        name: string;
    };
    before: number;
    after: number;
    reason: string;
    message?: string;
    payload: AuditEventPayloadMap[T];
}
export interface AuditSnapshotInput {
    phase: GamePhase;
    label: SnapshotLabel;
    state: GameState;
}
/** Pola korelacji — łączenie eventów w operacje silnika. */
export type EventCorrelationLink = {
    eventUid: string;
    parentEventUid: string | null;
    correlationId: string | null;
};
/** Rekordy przekazywane do sinka — kontekst gry już rozwiązany. */
export interface AuditEventRecord extends AuditEventInput, EventCorrelationLink {
    gameId: string;
    round: number;
}
export interface AuditGoldChangeRecord extends AuditGoldChangeInput, EventCorrelationLink {
    gameId: string;
    round: number;
    delta: number;
}
export interface AuditSnapshotRecord extends AuditSnapshotInput {
    gameId: string;
    round: number;
}
/**
 * Kontrakt odbiorcy zdarzeń audytowych.
 * Backend rejestruje implementację (GameAudit) przy starcie;
 * na froncie brak sinka = no-op.
 */
export interface AuditSink {
    event(record: AuditEventRecord): void;
    goldChange(record: AuditGoldChangeRecord): void;
    snapshot(record: AuditSnapshotRecord): void;
}
