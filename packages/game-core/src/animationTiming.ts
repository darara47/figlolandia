type AnimSpeed = 'full' | 'fast' | 'off';

export const RESOLUTION_TURN_MS: Record<AnimSpeed, number> = {
  full: 6500,
  fast: 2000,
  off: 500,
};

/** When within a turn the first build is revealed (0–1). */
export const RESOLUTION_BUILD_AT = 0.28;

/** When within a turn profession / second build is revealed (0–1). */
export const RESOLUTION_PROFESSION_AT = 0.58;

/** Pause between player turns during RESOLUTION (ms). */
export const RESOLUTION_TURN_GAP_MS = 700;

export const GOLD_FLOAT_MS = {
  fadeIn: 300,
  hold: 2000,
  fadeOut: 1200,
} as const;

export const goldFloatTotalMs = (): number =>
  GOLD_FLOAT_MS.fadeIn + GOLD_FLOAT_MS.hold + GOLD_FLOAT_MS.fadeOut;

export const getResolutionTurnDurationMs = (
  speed: AnimSpeed,
  speedMultiplier = 1,
): number => Math.max(300, RESOLUTION_TURN_MS[speed] / speedMultiplier);

export const getResolutionAdvanceDelayMs = (
  playerCount: number,
  speed: AnimSpeed,
  speedMultiplier = 1,
): number => {
  if (playerCount <= 0) return 0;
  const turnMs = getResolutionTurnDurationMs(speed, speedMultiplier);
  const gaps = Math.max(0, playerCount - 1) * RESOLUTION_TURN_GAP_MS;
  return playerCount * turnMs + gaps;
};

export const UI_ANIMATION_MS = {
  goldCounter: 900,
  buildingEntrance: 750,
  buildingRotate: 500,
  cardTransition: 400,
  spotlightSpring: { tension: 50, friction: 12 },
} as const;
