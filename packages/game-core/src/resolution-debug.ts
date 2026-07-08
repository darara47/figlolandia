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

const isEnabled = (): boolean => process.env.DEBUG_RESOLUTION !== '0';

export class ResolutionDebug {
  private static gameId = '';
  private static round = 0;
  private static events: ResolutionDebugEvent[] = [];
  private static goldLedger: GoldLedgerEntry[] = [];

  static configure(gameId: string, round: number): void {
    if (!isEnabled()) return;
    ResolutionDebug.gameId = gameId;
    ResolutionDebug.round = round;
    ResolutionDebug.events = [];
    ResolutionDebug.goldLedger = [];
  }

  static log(
    phase: ResolutionDebugPhase,
    step: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    if (!isEnabled()) return;
    ResolutionDebug.events.push({ phase, step, message, data });
    const dataSuffix = data ? ` ${JSON.stringify(data)}` : '';
    console.log(
      `[FIGLO-DEBUG][${phase}][${step}] ${message}${dataSuffix}`,
    );
  }

  static logGoldChange(
    phase: ResolutionDebugPhase,
    step: string,
    player: { id: string; name: string },
    goldBefore: number,
    goldAfter: number,
    meta?: Record<string, unknown>,
  ): void {
    if (!isEnabled()) return;
    const delta = goldAfter - goldBefore;
    if (delta === 0) return;

    ResolutionDebug.goldLedger.push({
      phase,
      step,
      playerId: player.id,
      playerName: player.name,
      delta,
      goldBefore,
      goldAfter,
      meta,
    });

    ResolutionDebug.log(
      phase,
      step,
      `${player.name} (${player.id}): gold ${goldBefore}→${goldAfter} (${delta >= 0 ? '+' : ''}${delta})`,
      meta,
    );
  }

  static logGoldSnapshot(
    phase: ResolutionDebugPhase,
    step: string,
    players: { id: string; name: string; gold: number }[],
  ): void {
    if (!isEnabled()) return;
    const snapshot = Object.fromEntries(
      players.map((p) => [p.name, { id: p.id, gold: p.gold }]),
    );
    ResolutionDebug.log(phase, step, 'Gold snapshot', snapshot);
  }

  static flushSummary(label: string): void {
    if (!isEnabled()) return;

    const summary = {
      gameId: ResolutionDebug.gameId,
      round: ResolutionDebug.round,
      label,
      goldLedger: ResolutionDebug.goldLedger,
      events: ResolutionDebug.events,
    };

    console.log(
      `\n========== FIGLO DEBUG SUMMARY — ${label} — game ${ResolutionDebug.gameId} — round ${ResolutionDebug.round} ==========\n` +
      JSON.stringify(summary, null, 2) +
      '\n========== END FIGLO DEBUG SUMMARY ==========\n',
    );
  }
}

export const isResolutionDebugEnabled = isEnabled;
