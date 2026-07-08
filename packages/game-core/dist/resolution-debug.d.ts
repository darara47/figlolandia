export type ResolutionDebugPhase = 'PREP' | 'RESOLUTION';
export type GoldLedgerEntry = {
    phase: ResolutionDebugPhase;
    step: string;
    playerId: string;
    playerName: string;
    delta: number;
    goldBefore: number;
    goldAfter: number;
    meta?: Record<string, unknown>;
};
export type ResolutionDebugEvent = {
    phase: ResolutionDebugPhase;
    step: string;
    message: string;
    data?: Record<string, unknown>;
};
export declare class ResolutionDebug {
    private static gameId;
    private static round;
    private static events;
    private static goldLedger;
    static configure(gameId: string, round: number): void;
    static log(phase: ResolutionDebugPhase, step: string, message: string, data?: Record<string, unknown>): void;
    static logGoldChange(phase: ResolutionDebugPhase, step: string, player: {
        id: string;
        name: string;
    }, goldBefore: number, goldAfter: number, meta?: Record<string, unknown>): void;
    static logGoldSnapshot(phase: ResolutionDebugPhase, step: string, players: {
        id: string;
        name: string;
        gold: number;
    }[]): void;
    static flushSummary(label: string): void;
}
export declare const isResolutionDebugEnabled: () => boolean;
