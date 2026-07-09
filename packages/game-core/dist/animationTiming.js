"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UI_ANIMATION_MS = exports.getResolutionAdvanceDelayMs = exports.getResolutionTurnDurationMs = exports.goldFloatTotalMs = exports.GOLD_FLOAT_MS = exports.RESOLUTION_TURN_GAP_MS = exports.RESOLUTION_PROFESSION_AT = exports.RESOLUTION_BUILD_AT = exports.RESOLUTION_TURN_MS = void 0;
exports.RESOLUTION_TURN_MS = {
    full: 6500,
    fast: 2000,
    off: 500,
};
/** When within a turn the first build is revealed (0–1). */
exports.RESOLUTION_BUILD_AT = 0.28;
/** When within a turn profession / second build is revealed (0–1). */
exports.RESOLUTION_PROFESSION_AT = 0.58;
/** Pause between player turns during RESOLUTION (ms). */
exports.RESOLUTION_TURN_GAP_MS = 700;
exports.GOLD_FLOAT_MS = {
    fadeIn: 300,
    hold: 2000,
    fadeOut: 1200,
};
const goldFloatTotalMs = () => exports.GOLD_FLOAT_MS.fadeIn + exports.GOLD_FLOAT_MS.hold + exports.GOLD_FLOAT_MS.fadeOut;
exports.goldFloatTotalMs = goldFloatTotalMs;
const getResolutionTurnDurationMs = (speed, speedMultiplier = 1) => Math.max(300, exports.RESOLUTION_TURN_MS[speed] / speedMultiplier);
exports.getResolutionTurnDurationMs = getResolutionTurnDurationMs;
const getResolutionAdvanceDelayMs = (playerCount, speed, speedMultiplier = 1) => {
    if (playerCount <= 0)
        return 0;
    const turnMs = (0, exports.getResolutionTurnDurationMs)(speed, speedMultiplier);
    const gaps = Math.max(0, playerCount - 1) * exports.RESOLUTION_TURN_GAP_MS;
    return playerCount * turnMs + gaps;
};
exports.getResolutionAdvanceDelayMs = getResolutionAdvanceDelayMs;
exports.UI_ANIMATION_MS = {
    goldCounter: 900,
    buildingEntrance: 750,
    buildingRotate: 500,
    cardTransition: 400,
    spotlightSpring: { tension: 50, friction: 12 },
};
