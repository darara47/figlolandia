type AnimSpeed = 'full' | 'fast' | 'off';
export declare const RESOLUTION_TURN_MS: Record<AnimSpeed, number>;
/** When within a turn the first build is revealed (0–1). */
export declare const RESOLUTION_BUILD_AT = 0.28;
/** When within a turn profession / second build is revealed (0–1). */
export declare const RESOLUTION_PROFESSION_AT = 0.58;
/** Pause between player turns during RESOLUTION (ms). */
export declare const RESOLUTION_TURN_GAP_MS = 700;
export declare const GOLD_FLOAT_MS: {
    readonly fadeIn: 300;
    readonly hold: 2000;
    readonly fadeOut: 1200;
};
export declare const goldFloatTotalMs: () => number;
export declare const getResolutionTurnDurationMs: (speed: AnimSpeed, speedMultiplier?: number) => number;
export declare const getResolutionAdvanceDelayMs: (playerCount: number, speed: AnimSpeed, speedMultiplier?: number) => number;
export declare const UI_ANIMATION_MS: {
    readonly goldCounter: 900;
    readonly buildingEntrance: 750;
    readonly buildingRotate: 500;
    readonly cardTransition: 400;
    readonly spotlightSpring: {
        readonly tension: 50;
        readonly friction: 12;
    };
};
export {};
